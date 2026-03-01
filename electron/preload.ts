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

  // SSH list window
  openSSHListWindow: () => ipcRenderer.invoke('ssh:openListWindow'),

  // Safe close for terminal/child windows: cleanup first, then destroy
  closeChildWindow: (terminalId?: string) =>
    ipcRenderer.send('window:closeChild', terminalId),

  // Remote Desktop (VNC/RDP)
  openRemoteWindow: (opts: {
    sessionId: string;
    type: 'vnc' | 'rdp';
    host: string;
    port: number;
    title: string;
    username?: string;
    password?: string;
    domain?: string;
    encryption?: 'auto' | 'none' | 'encrypted';
  }) => ipcRenderer.invoke('remote:openWindow', opts),

  vncConnect: (sessionId: string, host: string, port: number, password?: string) =>
    ipcRenderer.invoke('remote:vncConnect', sessionId, host, port, password),
  vncDisconnect: (sessionId: string, generation?: number) =>
    ipcRenderer.invoke('remote:vncDisconnect', sessionId, generation),

  rdpConnect: (sessionId: string, host: string, port: number, username: string, password: string, domain: string | undefined, screenWidth: number, screenHeight: number) =>
    ipcRenderer.invoke('remote:rdpConnect', sessionId, host, port, username, password, domain, screenWidth, screenHeight),
  rdpDisconnect: (sessionId: string) =>
    ipcRenderer.invoke('remote:rdpDisconnect', sessionId),
  rdpSendMouse: (sessionId: string, x: number, y: number, button: number, isPressed: boolean) =>
    ipcRenderer.send('remote:rdpMouse', sessionId, x, y, button, isPressed),
  rdpSendKey: (sessionId: string, scancode: number, isPressed: boolean, isExtended: boolean) =>
    ipcRenderer.send('remote:rdpKey', sessionId, scancode, isPressed, isExtended),
  rdpSendWheel: (sessionId: string, x: number, y: number, step: number, isNegative: boolean, isHorizontal: boolean) =>
    ipcRenderer.send('remote:rdpWheel', sessionId, x, y, step, isNegative, isHorizontal),

  onRdpConnected: (callback: (sessionId: string) => void) => {
    const handler = (_event: any, sessionId: string) => callback(sessionId);
    ipcRenderer.on('rdp:connected', handler);
    return () => ipcRenderer.removeListener('rdp:connected', handler);
  },
  onRdpBitmap: (callback: (sessionId: string, bitmap: any) => void) => {
    const handler = (_event: any, sessionId: string, bitmap: any) => callback(sessionId, bitmap);
    ipcRenderer.on('rdp:bitmap', handler);
    return () => ipcRenderer.removeListener('rdp:bitmap', handler);
  },
  onRdpClosed: (callback: (sessionId: string) => void) => {
    const handler = (_event: any, sessionId: string) => callback(sessionId);
    ipcRenderer.on('rdp:closed', handler);
    return () => ipcRenderer.removeListener('rdp:closed', handler);
  },
  onRdpError: (callback: (sessionId: string, error: string) => void) => {
    const handler = (_event: any, sessionId: string, error: string) => callback(sessionId, error);
    ipcRenderer.on('rdp:error', handler);
    return () => ipcRenderer.removeListener('rdp:error', handler);
  },

  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
});
