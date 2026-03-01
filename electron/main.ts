import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { ToolDatabase } from './services/tool-database';
import { PtyManager } from './services/pty-manager';
import { SSHManager } from './services/ssh-manager';
import { ConnectionStore } from './services/connection-store';
import { VNCProxy } from './services/vnc-proxy';
import { RDPManager } from './services/rdp-manager';
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
const vncProxy = new VNCProxy();
const rdpManager = new RDPManager();

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
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

  // When main window closes, close all child windows and quit
  mainWindow.on('closed', () => {
    console.log('[Window] mainWindow CLOSED event fired');
    isQuitting = true;
    mainWindow = null;
    for (const win of terminalWindows.values()) {
      if (!win.isDestroyed()) win.destroy();
    }
    terminalWindows.clear();
    for (const win of remoteWindows.values()) {
      if (!win.isDestroyed()) win.destroy();
    }
    remoteWindows.clear();
    if (sshListWindow && !sshListWindow.isDestroyed()) {
      sshListWindow.destroy();
      sshListWindow = null;
    }
    vncProxy.stopAll();
    rdpManager.disconnectAll();
    app.quit();
  });
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
    console.log(`[Window] terminal window CLOSED: ${opts.terminalId}`);
    terminalWindows.delete(opts.terminalId);
    if (isQuitting) return;
    try {
      if (opts.sshConnectionId) {
        sshManager.unregisterSender(opts.terminalId);
      } else {
        ptyManager.kill(opts.terminalId);
      }
    } catch (err) {
      console.error('Error cleaning up terminal window:', err);
    }
  });
}

let sshListWindow: BrowserWindow | null = null;

function createSSHListWindow() {
  // If already open, focus it
  if (sshListWindow && !sshListWindow.isDestroyed()) {
    sshListWindow.focus();
    return;
  }

  sshListWindow = new BrowserWindow({
    width: 420,
    height: 500,
    minWidth: 320,
    minHeight: 300,
    frame: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const params = new URLSearchParams();
  params.set('sshListWindow', '1');

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    sshListWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?${params.toString()}`);
  } else {
    sshListWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { search: params.toString() }
    );
  }

  sshListWindow.on('closed', () => {
    sshListWindow = null;
  });
}

const remoteWindows = new Map<string, BrowserWindow>();

function createRemoteDesktopWindow(opts: {
  sessionId: string;
  type: 'vnc' | 'rdp';
  host: string;
  port: number;
  title: string;
  username?: string;
  password?: string;
  domain?: string;
}) {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 640,
    minHeight: 480,
    frame: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  remoteWindows.set(opts.sessionId, win);

  const params = new URLSearchParams();
  params.set('remoteDesktop', '1');
  params.set('type', opts.type);
  params.set('sessionId', opts.sessionId);
  params.set('host', opts.host);
  params.set('port', String(opts.port));
  params.set('title', opts.title);
  if (opts.username) params.set('username', opts.username);
  if (opts.password) params.set('password', opts.password);
  if (opts.domain) params.set('domain', opts.domain);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?${params.toString()}`);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { search: params.toString() }
    );
  }

  win.on('closed', () => {
    console.log(`[Window] remote desktop window CLOSED: ${opts.sessionId}`);
    remoteWindows.delete(opts.sessionId);
    if (isQuitting) return;
    try {
      if (opts.type === 'vnc') {
        vncProxy.stopProxy(opts.sessionId);
      } else {
        rdpManager.disconnect(opts.sessionId);
      }
    } catch (_) { /* ignore */ }
  });
}

app.whenReady().then(async () => {
  await toolDb.load();
  createWindow();
  ptyManager.setMainWindow(mainWindow!);
  sshManager.setMainWindow(mainWindow!);
  registerIpcHandlers(toolDb, ptyManager, sshManager, connectionStore, vncProxy, rdpManager);

  // Terminal window handler
  ipcMain.handle('terminal:openWindow', (_event, opts: {
    terminalId: string;
    title?: string;
    command?: string;
    sshConnectionId?: string;
  }) => {
    createTerminalWindow(opts);
  });

  // SSH list window handler
  ipcMain.handle('ssh:openListWindow', () => {
    createSSHListWindow();
  });

  // Remote desktop window handler
  ipcMain.handle('remote:openWindow', (_event, opts: {
    sessionId: string;
    type: 'vnc' | 'rdp';
    host: string;
    port: number;
    title: string;
    username?: string;
    password?: string;
    domain?: string;
  }) => {
    createRemoteDesktopWindow(opts);
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
  // Safe close for child windows: cleanup first, then destroy (no renderer teardown)
  ipcMain.on('window:closeChild', (event, terminalId?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win === mainWindow) return;

    // Cleanup pty/ssh before destroying
    if (terminalId) {
      try {
        const opts = [...terminalWindows.entries()].find(([, w]) => w === win);
        if (opts) {
          terminalWindows.delete(opts[0]);
        }
        ptyManager.kill(terminalId);
        sshManager.unregisterSender(terminalId);
      } catch (_) { /* ignore */ }
    }

    // Cleanup remote desktop sessions
    try {
      const remoteEntry = [...remoteWindows.entries()].find(([, w]) => w === win);
      if (remoteEntry) {
        const [sessionId] = remoteEntry;
        remoteWindows.delete(sessionId);
        vncProxy.stopProxy(sessionId);
        rdpManager.disconnect(sessionId);
      }
    } catch (_) { /* ignore */ }

    // Destroy immediately — no renderer cleanup, no crash
    win.destroy();
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.close();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('[Window] window-all-closed event fired');
});

app.on('before-quit', () => {
  console.log('[Window] before-quit event fired');
});
