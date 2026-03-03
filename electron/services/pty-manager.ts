import * as pty from '@lydell/node-pty';
import { BrowserWindow } from 'electron';
const MAX_SCROLLBACK = 100_000;

interface PtySession {
  terminalId: string;
  process: pty.IPty;
  outputBuffer: string;
}

export class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
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

  private sendToRenderer(terminalId: string, channel: string, ...args: any[]): void {
    const sender = this.senders.get(terminalId);
    if (sender && !sender.isDestroyed()) {
      sender.send(channel, ...args);
    } else if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  getOutputBuffer(terminalId: string): string {
    return this.sessions.get(terminalId)?.outputBuffer || '';
  }

  hasSession(terminalId: string): boolean {
    return this.sessions.has(terminalId);
  }

  create(terminalId: string, command?: string): { pid: number; reused: boolean } {
    // If session already exists (dock scenario), reuse it
    const existing = this.sessions.get(terminalId);
    if (existing) {
      return { pid: existing.process.pid, reused: true };
    }

    const isWin = process.platform === 'win32';
    const shell = isWin
      ? (process.env.COMSPEC || 'cmd.exe')
      : (process.env.SHELL || '/bin/bash');

    const cwd = process.env.HOME || process.env.USERPROFILE || '/';

    const args: string[] = [];
    // If a command was provided, run it in the shell
    if (command) {
      if (isWin) {
        args.push('/c', command);
      } else {
        args.push('-c', command);
      }
    }

    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd,
      env: process.env as { [key: string]: string },
    });

    const session: PtySession = {
      terminalId,
      process: ptyProcess,
      outputBuffer: '',
    };

    this.sessions.set(terminalId, session);

    ptyProcess.onData((data: string) => {
      // Append to ring buffer
      session.outputBuffer += data;
      if (session.outputBuffer.length > MAX_SCROLLBACK) {
        session.outputBuffer = session.outputBuffer.slice(-MAX_SCROLLBACK);
      }
      this.sendToRenderer(terminalId, 'pty:data', terminalId, data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      this.sendToRenderer(terminalId, 'pty:exit', terminalId, exitCode);
      this.sessions.delete(terminalId);
      this.senders.delete(terminalId);
    });

    return { pid: ptyProcess.pid, reused: false };
  }

  write(terminalId: string, data: string): void {
    const session = this.sessions.get(terminalId);
    if (!session) return;
    session.process.write(data);
  }

  resize(terminalId: string, cols: number, rows: number): void {
    const session = this.sessions.get(terminalId);
    if (!session) return;
    try {
      session.process.resize(cols, rows);
    } catch {
      // Process may have already exited
    }
  }

  kill(terminalId: string): void {
    const session = this.sessions.get(terminalId);
    if (session) {
      try {
        session.process.kill();
      } catch {
        // Already dead
      }
      this.sessions.delete(terminalId);
      this.senders.delete(terminalId);
    }
  }

  killAll(): void {
    for (const session of this.sessions.values()) {
      try {
        session.process.kill();
      } catch {
        // ignore
      }
    }
    this.sessions.clear();
    this.senders.clear();
  }
}
