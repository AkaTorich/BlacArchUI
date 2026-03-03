import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'node:path';
import { ToolDatabase } from './services/tool-database';
import { PtyManager } from './services/pty-manager';
import { SSHManager, SSHConnectionConfig } from './services/ssh-manager';
import { ConnectionStore } from './services/connection-store';
import { VNCProxy } from './services/vnc-proxy';
import { RDPManager } from './services/rdp-manager';

export function registerIpcHandlers(
  toolDb: ToolDatabase,
  ptyManager: PtyManager,
  sshManager: SSHManager,
  connectionStore: ConnectionStore,
  vncProxy: VNCProxy,
  rdpManager: RDPManager
): void {
  // Tools
  ipcMain.handle('tools:getAll', () => toolDb.getAll());
  ipcMain.handle('tools:byCategory', (_event, category: string) =>
    toolDb.byCategory(category)
  );
  ipcMain.handle('tools:search', (_event, query: string) =>
    toolDb.search(query)
  );
  ipcMain.handle('tools:categories', () => toolDb.getCategories());

  // PTY
  ipcMain.handle('pty:create', (event, terminalId: string, command?: string) => {
    ptyManager.registerSender(terminalId, event.sender);
    return ptyManager.create(terminalId, command);
  });
  ipcMain.on('pty:write', (_event, terminalId: string, data: string) =>
    ptyManager.write(terminalId, data)
  );
  ipcMain.on('pty:resize', (_event, terminalId: string, cols: number, rows: number) =>
    ptyManager.resize(terminalId, cols, rows)
  );
  ipcMain.handle('pty:kill', (_event, terminalId: string) =>
    ptyManager.kill(terminalId)
  );
  ipcMain.handle('pty:getBuffer', (_event, terminalId: string) =>
    ptyManager.getOutputBuffer(terminalId)
  );
  ipcMain.handle('ssh:getBuffer', (_event, terminalId: string) =>
    sshManager.getOutputBuffer(terminalId)
  );

  // SSH
  ipcMain.handle('ssh:connect', async (_event, config: SSHConnectionConfig) => {
    await sshManager.connect(config);
    connectionStore.add(config);
    return true;
  });
  ipcMain.handle('ssh:disconnect', (_event, connectionId: string) => {
    sshManager.disconnect(connectionId);
  });
  ipcMain.handle('ssh:openShell', async (event, connectionId: string, terminalId: string) => {
    const existed = sshManager.hasShell(connectionId, terminalId);
    sshManager.registerSender(terminalId, event.sender);
    await sshManager.openShell(connectionId, terminalId);
    return { reused: existed };
  });
  ipcMain.on('ssh:writeToShell', (_event, connectionId: string, terminalId: string, data: string) => {
    sshManager.writeToShell(connectionId, terminalId, data);
  });
  ipcMain.on('ssh:resizeShell', (_event, connectionId: string, terminalId: string, cols: number, rows: number) => {
    sshManager.resizeShell(connectionId, terminalId, cols, rows);
  });
  ipcMain.handle('ssh:getSaved', () => connectionStore.getAll());
  ipcMain.handle('ssh:deleteSaved', (_event, id: string) => {
    connectionStore.remove(id);
  });
  ipcMain.handle('ssh:isConnected', (_event, id: string) =>
    sshManager.isConnected(id)
  );

  // VNC
  ipcMain.handle('remote:vncConnect', async (_event, sessionId: string, host: string, port: number, _password?: string) => {
    return await vncProxy.startProxy(sessionId, host, port);
  });
  ipcMain.handle('remote:vncDisconnect', (_event, sessionId: string, generation?: number) => {
    vncProxy.stopProxy(sessionId, generation);
  });

  // RDP
  ipcMain.handle('remote:rdpConnect', (event, sessionId: string, host: string, port: number, username: string, password: string, domain: string | undefined, screenWidth: number, screenHeight: number) => {
    rdpManager.connect(sessionId, host, port, username, password, domain || '', screenWidth, screenHeight, event.sender);
  });
  ipcMain.handle('remote:rdpDisconnect', (_event, sessionId: string) => {
    rdpManager.disconnect(sessionId);
  });
  ipcMain.on('remote:rdpMouse', (_event, sessionId: string, x: number, y: number, button: number, isPressed: boolean) => {
    rdpManager.sendMouse(sessionId, x, y, button, isPressed);
  });
  ipcMain.on('remote:rdpKey', (_event, sessionId: string, scancode: number, isPressed: boolean, isExtended: boolean) => {
    rdpManager.sendKeyboard(sessionId, scancode, isPressed, isExtended);
  });
  ipcMain.on('remote:rdpWheel', (_event, sessionId: string, x: number, y: number, step: number, isNegative: boolean, isHorizontal: boolean) => {
    rdpManager.sendWheel(sessionId, x, y, step, isNegative, isHorizontal);
  });

  // SFTP
  ipcMain.handle('sftp:list', async (_event, connectionId: string, remotePath: string) => {
    return await sshManager.sftpList(connectionId, remotePath);
  });

  ipcMain.handle('sftp:mkdir', async (_event, connectionId: string, remotePath: string) => {
    await sshManager.sftpMkdir(connectionId, remotePath);
  });

  ipcMain.handle('sftp:delete', async (_event, connectionId: string, remotePath: string, isDir: boolean) => {
    await sshManager.sftpDelete(connectionId, remotePath, isDir);
  });

  ipcMain.handle('sftp:rename', async (_event, connectionId: string, oldPath: string, newPath: string) => {
    await sshManager.sftpRename(connectionId, oldPath, newPath);
  });

  ipcMain.handle('sftp:download', async (event, connectionId: string, remotePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: path.basename(remotePath),
      title: 'Сохранить файл',
    });
    if (result.canceled || !result.filePath) return false;
    await sshManager.sftpDownload(connectionId, remotePath, result.filePath);
    return true;
  });

  ipcMain.handle('sftp:upload', async (event, connectionId: string, remoteDir: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: 'Загрузить файл на сервер',
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const localPath = result.filePaths[0];
    const remotePath = remoteDir + '/' + path.basename(localPath);
    await sshManager.sftpUpload(connectionId, localPath, remotePath);
    return path.basename(localPath);
  });
}
