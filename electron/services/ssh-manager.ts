import { Client, ClientChannel, SFTPWrapper } from 'ssh2';
import { BrowserWindow } from 'electron';

export interface SSHConnectionConfig {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  password?: string;
  privateKeyPath?: string;
}

export interface SftpFileEntry {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  modifyTime: number;
  permissions: number;
}

interface SSHSession {
  client: Client;
  config: SSHConnectionConfig;
  shells: Map<string, ClientChannel>;
  sftpClient?: SFTPWrapper;
}

export class SSHManager {
  private sessions: Map<string, SSHSession> = new Map();
  private senders: Map<string, Electron.WebContents> = new Map();
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  registerSender(terminalId: string, sender: Electron.WebContents) {
    this.senders.set(terminalId, sender);
  }

  unregisterSender(terminalId: string) {
    this.senders.delete(terminalId);
  }

  private getSender(terminalId: string): Electron.WebContents | null {
    const sender = this.senders.get(terminalId);
    if (sender && !sender.isDestroyed()) return sender;
    if (this.mainWindow && !this.mainWindow.isDestroyed()) return this.mainWindow.webContents;
    return null;
  }

  async connect(config: SSHConnectionConfig): Promise<void> {
    if (this.sessions.has(config.id)) {
      throw new Error(`Already connected: ${config.id}`);
    }

    const client = new Client();

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        console.log(`[SSH] Connected to ${config.host}:${config.port}`);
        this.sessions.set(config.id, {
          client,
          config,
          shells: new Map(),
        });
        resolve();
      });

      client.on('error', (err) => {
        console.error(`[SSH] Connection error: ${err.message}`);
        reject(err);
      });

      client.on('close', () => {
        console.log(`[SSH] Connection closed: ${config.id}`);
        this.sessions.delete(config.id);
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('ssh:disconnected', config.id);
        }
      });

      const connectConfig: any = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: 10000,
        hostVerifier: () => true,
        algorithms: {
          kex: [
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group1-sha1',
          ],
          serverHostKey: [
            'ssh-ed25519',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'rsa-sha2-512',
            'rsa-sha2-256',
            'ssh-rsa',
          ],
        },
      };

      if (config.authMethod === 'password') {
        connectConfig.password = config.password;
      } else if (config.authMethod === 'key' && config.privateKeyPath) {
        const fs = require('node:fs');
        connectConfig.privateKey = fs.readFileSync(config.privateKeyPath);
      }

      client.connect(connectConfig);
    });
  }

  async openShell(connectionId: string, terminalId: string): Promise<void> {
    const session = this.sessions.get(connectionId);
    if (!session) {
      throw new Error(`Not connected: ${connectionId}`);
    }

    return new Promise((resolve, reject) => {
      session.client.shell(
        { term: 'xterm-256color', cols: 80, rows: 30 },
        (err, stream) => {
          if (err) {
            return reject(err);
          }

          session.shells.set(terminalId, stream);

          stream.on('data', (data: Buffer) => {
            const sender = this.getSender(terminalId);
            if (sender) {
              sender.send('pty:data', terminalId, data.toString());
            }
          });

          stream.on('close', () => {
            session.shells.delete(terminalId);
            this.senders.delete(terminalId);
            const sender = this.getSender(terminalId);
            if (sender) {
              sender.send('pty:exit', terminalId, 0);
            }
          });

          resolve();
        }
      );
    });
  }

  writeToShell(connectionId: string, terminalId: string, data: string): void {
    const session = this.sessions.get(connectionId);
    const stream = session?.shells.get(terminalId);
    if (stream) {
      stream.write(data);
    }
  }

  resizeShell(connectionId: string, terminalId: string, cols: number, rows: number): void {
    const session = this.sessions.get(connectionId);
    const stream = session?.shells.get(terminalId);
    if (stream) {
      stream.setWindow(rows, cols, 0, 0);
    }
  }

  disconnect(connectionId: string): void {
    const session = this.sessions.get(connectionId);
    if (session) {
      for (const [termId] of session.shells) {
        this.senders.delete(termId);
      }
      for (const stream of session.shells.values()) {
        stream.close();
      }
      session.client.end();
      this.sessions.delete(connectionId);
    }
  }

  // ── SFTP ──────────────────────────────────────────────

  private async getSftp(connectionId: string): Promise<SFTPWrapper> {
    const session = this.sessions.get(connectionId);
    if (!session) throw new Error(`Not connected: ${connectionId}`);
    if (session.sftpClient) return session.sftpClient;

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) return reject(err);
        session.sftpClient = sftp;
        resolve(sftp);
      });
    });
  }

  async sftpList(connectionId: string, remotePath: string): Promise<SftpFileEntry[]> {
    const sftp = await this.getSftp(connectionId);
    return new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (err, list) => {
        if (err) return reject(err);
        const entries: SftpFileEntry[] = list.map((item) => {
          let type: SftpFileEntry['type'] = 'file';
          if (item.attrs.isDirectory()) type = 'directory';
          else if (item.attrs.isSymbolicLink()) type = 'symlink';
          return {
            name: item.filename,
            type,
            size: item.attrs.size,
            modifyTime: item.attrs.mtime * 1000,
            permissions: item.attrs.mode & 0o7777,
          };
        });
        entries.sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        });
        resolve(entries);
      });
    });
  }

  async sftpMkdir(connectionId: string, remotePath: string): Promise<void> {
    const sftp = await this.getSftp(connectionId);
    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async sftpDelete(connectionId: string, remotePath: string, isDir: boolean): Promise<void> {
    const sftp = await this.getSftp(connectionId);
    return new Promise((resolve, reject) => {
      const cb = (err: any) => { if (err) reject(err); else resolve(); };
      if (isDir) sftp.rmdir(remotePath, cb);
      else sftp.unlink(remotePath, cb);
    });
  }

  async sftpRename(connectionId: string, oldPath: string, newPath: string): Promise<void> {
    const sftp = await this.getSftp(connectionId);
    return new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async sftpDownload(connectionId: string, remotePath: string, localPath: string): Promise<void> {
    const sftp = await this.getSftp(connectionId);
    return new Promise((resolve, reject) => {
      sftp.fastGet(remotePath, localPath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async sftpUpload(connectionId: string, localPath: string, remotePath: string): Promise<void> {
    const sftp = await this.getSftp(connectionId);
    return new Promise((resolve, reject) => {
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  getConnections(): string[] {
    return Array.from(this.sessions.keys());
  }

  isConnected(connectionId: string): boolean {
    return this.sessions.has(connectionId);
  }

  disconnectAll(): void {
    for (const id of this.sessions.keys()) {
      this.disconnect(id);
    }
  }
}
