import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Tools
  getTools: () => ipcRenderer.invoke('tools:getAll'),
  getToolsByCategory: (category: string) => ipcRenderer.invoke('tools:byCategory', category),
  searchTools: (query: string) => ipcRenderer.invoke('tools:search', query),
  getCategories: () => ipcRenderer.invoke('tools:categories'),

  // PTY
  ptyCreate: (terminalId: string, command?: string) =>
    ipcRenderer.invoke('pty:create', terminalId, command),
  ptyWrite: (terminalId: string, data: string) =>
    ipcRenderer.send('pty:write', terminalId, data),
  ptyResize: (terminalId: string, cols: number, rows: number) =>
    ipcRenderer.send('pty:resize', terminalId, cols, rows),
  ptyKill: (terminalId: string) =>
    ipcRenderer.invoke('pty:kill', terminalId),
  onPtyData: (callback: (terminalId: string, data: string) => void) => {
    const handler = (_event: any, terminalId: string, data: string) =>
      callback(terminalId, data);
    ipcRenderer.on('pty:data', handler);
    return () => ipcRenderer.removeListener('pty:data', handler);
  },
  onPtyExit: (callback: (terminalId: string, exitCode: number) => void) => {
    const handler = (_event: any, terminalId: string, exitCode: number) =>
      callback(terminalId, exitCode);
    ipcRenderer.on('pty:exit', handler);
    return () => ipcRenderer.removeListener('pty:exit', handler);
  },

  // SSH
  sshConnect: (config: any) => ipcRenderer.invoke('ssh:connect', config),
  sshDisconnect: (connectionId: string) => ipcRenderer.invoke('ssh:disconnect', connectionId),
  sshOpenShell: (connectionId: string, terminalId: string) =>
    ipcRenderer.invoke('ssh:openShell', connectionId, terminalId),
  sshWriteToShell: (connectionId: string, terminalId: string, data: string) =>
    ipcRenderer.send('ssh:writeToShell', connectionId, terminalId, data),
  sshResizeShell: (connectionId: string, terminalId: string, cols: number, rows: number) =>
    ipcRenderer.send('ssh:resizeShell', connectionId, terminalId, cols, rows),
  sshGetSaved: () => ipcRenderer.invoke('ssh:getSaved'),
  sshDeleteSaved: (id: string) => ipcRenderer.invoke('ssh:deleteSaved', id),
  sshIsConnected: (id: string) => ipcRenderer.invoke('ssh:isConnected', id),
  onSSHDisconnected: (callback: (connectionId: string) => void) => {
    const handler = (_event: any, connectionId: string) => callback(connectionId);
    ipcRenderer.on('ssh:disconnected', handler);
    return () => ipcRenderer.removeListener('ssh:disconnected', handler);
  },

  // Terminal window
  openTerminalWindow: (opts: {
    terminalId: string;
    title?: string;
    command?: string;
    sshConnectionId?: string;
  }) => ipcRenderer.invoke('terminal:openWindow', opts),

  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
});
