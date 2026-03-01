import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { ToolDatabase } from './services/tool-database';
import { PtyManager } from './services/pty-manager';
import { SSHManager } from './services/ssh-manager';
import { ConnectionStore } from './services/connection-store';
import { registerIpcHandlers } from './ipc-handlers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
import squirrelStartup from 'electron-squirrel-startup';
if (squirrelStartup) {
  app.quit();
}

const toolDb = new ToolDatabase();
const ptyManager = new PtyManager();
const sshManager = new SSHManager();
const connectionStore = new ConnectionStore();

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
const terminalWindows = new Map<string, BrowserWindow>();

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

function createTerminalWindow(opts: {
  terminalId: string;
  title?: string;
  command?: string;
  sshConnectionId?: string;
}) {
  const win = new BrowserWindow({
    width: 800,
    height: 500,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  terminalWindows.set(opts.terminalId, win);

  const params = new URLSearchParams();
  params.set('terminalWindow', '1');
  params.set('terminalId', opts.terminalId);
  if (opts.title) params.set('title', opts.title);
  if (opts.command) params.set('command', opts.command);
  if (opts.sshConnectionId) params.set('sshConnectionId', opts.sshConnectionId);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?${params.toString()}`);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { search: params.toString() }
    );
  }

  win.on('closed', () => {
    terminalWindows.delete(opts.terminalId);
    // Kill the terminal process when window closes
    if (opts.sshConnectionId) {
      // For SSH, just close the shell (not the connection)
      sshManager.unregisterSender(opts.terminalId);
    } else {
      ptyManager.kill(opts.terminalId);
    }
  });
}

app.whenReady().then(async () => {
  await toolDb.load();
  createWindow();
  ptyManager.setMainWindow(mainWindow!);
  sshManager.setMainWindow(mainWindow!);
  registerIpcHandlers(toolDb, ptyManager, sshManager, connectionStore);

  // Terminal window handler
  ipcMain.handle('terminal:openWindow', (_event, opts: {
    terminalId: string;
    title?: string;
    command?: string;
    sshConnectionId?: string;
  }) => {
    createTerminalWindow(opts);
  });

  // Window control handlers — use event.sender to support multiple windows
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
