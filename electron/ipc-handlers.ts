import { ipcMain } from 'electron';
import { ToolDatabase } from './services/tool-database';
import { PtyManager } from './services/pty-manager';
import { SSHManager, SSHConnectionConfig } from './services/ssh-manager';
import { ConnectionStore } from './services/connection-store';

export function registerIpcHandlers(
  toolDb: ToolDatabase,
  ptyManager: PtyManager,
  sshManager: SSHManager,
  connectionStore: ConnectionStore
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
    sshManager.registerSender(terminalId, event.sender);
    await sshManager.openShell(connectionId, terminalId);
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
}
