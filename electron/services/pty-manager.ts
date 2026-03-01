import { exec } from 'node:child_process';
import { BrowserWindow } from 'electron';
import * as os from 'node:os';
import * as path from 'node:path';

interface PtySession {
  terminalId: string;
  cwd: string;
  inputBuffer: string;
  running: boolean;
  env: Record<string, string>;
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

  private send(terminalId: string, data: string): void {
    const sender = this.senders.get(terminalId);
    if (sender && !sender.isDestroyed()) {
      sender.send('pty:data', terminalId, data);
    } else if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('pty:data', terminalId, data);
    }
  }

  private getPrompt(session: PtySession): string {
    const isWin = process.platform === 'win32';
    if (isWin) {
      return `\x1b[32m${session.cwd}>\x1b[0m `;
    }
    const user = os.userInfo().username;
    const hostname = os.hostname();
    const home = os.homedir();
    let displayCwd = session.cwd;
    if (displayCwd.startsWith(home)) {
      displayCwd = '~' + displayCwd.slice(home.length);
    }
    return `\x1b[32m${user}@${hostname}\x1b[0m:\x1b[34m${displayCwd}\x1b[0m$ `;
  }

  create(terminalId: string, command?: string): { pid: number } {
    const cwd = process.env.HOME || process.env.USERPROFILE || '/';

    const session: PtySession = {
      terminalId,
      cwd,
      inputBuffer: '',
      running: false,
      env: { ...process.env } as Record<string, string>,
    };

    this.sessions.set(terminalId, session);

    // Show welcome banner and prompt
    const isWin = process.platform === 'win32';
    const shellName = isWin ? 'BlacArchUI Terminal (cmd)' : 'BlacArchUI Terminal (bash)';
    this.send(terminalId, `\x1b[36m${shellName}\x1b[0m\r\n`);
    this.send(terminalId, this.getPrompt(session));

    // If a command was provided, execute it
    if (command) {
      setTimeout(() => {
        session.inputBuffer = command;
        this.send(terminalId, command);
        this.executeCommand(session);
      }, 100);
    }

    return { pid: process.pid };
  }

  write(terminalId: string, data: string): void {
    const session = this.sessions.get(terminalId);
    if (!session || session.running) return;

    for (const char of data) {
      const code = char.charCodeAt(0);

      if (char === '\r' || char === '\n') {
        // Enter pressed — execute command
        this.send(terminalId, '\r\n');
        this.executeCommand(session);
      } else if (code === 127 || code === 8) {
        // Backspace
        if (session.inputBuffer.length > 0) {
          session.inputBuffer = session.inputBuffer.slice(0, -1);
          this.send(terminalId, '\b \b');
        }
      } else if (code === 3) {
        // Ctrl+C
        session.inputBuffer = '';
        this.send(terminalId, '^C\r\n');
        this.send(terminalId, this.getPrompt(session));
      } else if (code === 12) {
        // Ctrl+L — clear screen
        session.inputBuffer = '';
        this.send(terminalId, '\x1b[2J\x1b[H');
        this.send(terminalId, this.getPrompt(session));
      } else if (code >= 32) {
        // Printable character
        session.inputBuffer += char;
        this.send(terminalId, char);
      }
    }
  }

  private executeCommand(session: PtySession): void {
    const cmd = session.inputBuffer.trim();
    session.inputBuffer = '';

    if (!cmd) {
      this.send(session.terminalId, this.getPrompt(session));
      return;
    }

    // Handle built-in cd command
    const cdMatch = cmd.match(/^cd\s+(.*)/);
    if (cdMatch || cmd === 'cd') {
      const target = cdMatch ? cdMatch[1].replace(/^["']|["']$/g, '').trim() : (os.homedir());
      let newPath: string;

      if (path.isAbsolute(target)) {
        newPath = target;
      } else if (target === '~') {
        newPath = os.homedir();
      } else if (target.startsWith('~' + path.sep) || target.startsWith('~/')) {
        newPath = path.join(os.homedir(), target.slice(2));
      } else {
        newPath = path.resolve(session.cwd, target);
      }

      try {
        const fs = require('node:fs');
        if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
          session.cwd = newPath;
        } else {
          this.send(session.terminalId, `\x1b[31mcd: нет такого каталога: ${target}\x1b[0m\r\n`);
        }
      } catch {
        this.send(session.terminalId, `\x1b[31mcd: ошибка: ${target}\x1b[0m\r\n`);
      }
      this.send(session.terminalId, this.getPrompt(session));
      return;
    }

    // Handle clear/cls
    if (cmd === 'clear' || cmd === 'cls') {
      this.send(session.terminalId, '\x1b[2J\x1b[H');
      this.send(session.terminalId, this.getPrompt(session));
      return;
    }

    // Handle exit
    if (cmd === 'exit') {
      this.send(session.terminalId, '\r\n\x1b[90m[Сессия завершена]\x1b[0m\r\n');
      const sender = this.senders.get(session.terminalId);
      if (sender && !sender.isDestroyed()) {
        sender.send('pty:exit', session.terminalId, 0);
      } else if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('pty:exit', session.terminalId, 0);
      }
      this.sessions.delete(session.terminalId);
      this.senders.delete(session.terminalId);
      return;
    }

    // Execute external command
    session.running = true;
    const isWin = process.platform === 'win32';
    exec(cmd, {
      cwd: session.cwd,
      env: session.env,
      shell: isWin ? 'cmd.exe' : '/bin/bash',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    }, (error, stdout, stderr) => {
      if (stdout) {
        // Convert \n to \r\n for xterm
        const output = stdout.replace(/\r?\n/g, '\r\n');
        this.send(session.terminalId, output);
        if (!output.endsWith('\r\n')) {
          this.send(session.terminalId, '\r\n');
        }
      }
      if (stderr) {
        const errOutput = stderr.replace(/\r?\n/g, '\r\n');
        this.send(session.terminalId, `\x1b[31m${errOutput}\x1b[0m`);
        if (!errOutput.endsWith('\r\n')) {
          this.send(session.terminalId, '\r\n');
        }
      }
      if (error && !stdout && !stderr) {
        const msg = error.message.replace(/\r?\n/g, '\r\n');
        this.send(session.terminalId, `\x1b[31m${msg}\x1b[0m\r\n`);
      }
      session.running = false;
      this.send(session.terminalId, this.getPrompt(session));
    });
  }

  resize(_terminalId: string, _cols: number, _rows: number): void {
    // No resize support in this mode
  }

  kill(terminalId: string): void {
    this.sessions.delete(terminalId);
    this.senders.delete(terminalId);
  }

  killAll(): void {
    this.sessions.clear();
    this.senders.clear();
  }
}
