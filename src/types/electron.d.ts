import { ITool, ICategory } from './tool';
import { ISSHConnectionConfig } from './ssh';

export interface ElectronAPI {
  getTools: () => Promise<ITool[]>;
  getToolsByCategory: (category: string) => Promise<ITool[]>;
  searchTools: (query: string) => Promise<ITool[]>;
  getCategories: () => Promise<ICategory[]>;

  ptyCreate: (terminalId: string, command?: string) => Promise<{ pid: number }>;
  ptyWrite: (terminalId: string, data: string) => void;
  ptyResize: (terminalId: string, cols: number, rows: number) => void;
  ptyKill: (terminalId: string) => Promise<void>;
  ptyGetBuffer: (terminalId: string) => Promise<string>;
  sshGetBuffer: (terminalId: string) => Promise<string>;
  onPtyData: (callback: (terminalId: string, data: string) => void) => () => void;
  onPtyExit: (callback: (terminalId: string, exitCode: number) => void) => () => void;

  sshConnect: (config: ISSHConnectionConfig) => Promise<boolean>;
  sshDisconnect: (connectionId: string) => Promise<void>;
  sshOpenShell: (connectionId: string, terminalId: string) => Promise<void>;
  sshWriteToShell: (connectionId: string, terminalId: string, data: string) => void;
  sshResizeShell: (connectionId: string, terminalId: string, cols: number, rows: number) => void;
  sshGetSaved: () => Promise<ISSHConnectionConfig[]>;
  sshDeleteSaved: (id: string) => Promise<void>;
  sshIsConnected: (id: string) => Promise<boolean>;
  onSSHDisconnected: (callback: (connectionId: string) => void) => () => void;

  openTerminalWindow: (opts: {
    terminalId: string;
    title?: string;
    command?: string;
    sshConnectionId?: string;
  }) => Promise<void>;

  openSSHListWindow: () => Promise<void>;

  closeChildWindow: (terminalId?: string) => void;

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
  }) => Promise<void>;

  vncConnect: (sessionId: string, host: string, port: number, password?: string) => Promise<{ wsPort: number; generation: number }>;
  vncDisconnect: (sessionId: string, generation?: number) => Promise<void>;

  rdpConnect: (sessionId: string, host: string, port: number, username: string, password: string, domain: string | undefined, screenWidth: number, screenHeight: number) => Promise<void>;
  rdpDisconnect: (sessionId: string) => Promise<void>;
  rdpSendMouse: (sessionId: string, x: number, y: number, button: number, isPressed: boolean) => void;
  rdpSendKey: (sessionId: string, scancode: number, isPressed: boolean, isExtended: boolean) => void;
  rdpSendWheel: (sessionId: string, x: number, y: number, step: number, isNegative: boolean, isHorizontal: boolean) => void;

  onRdpConnected: (callback: (sessionId: string) => void) => () => void;
  onRdpBitmap: (callback: (sessionId: string, bitmap: {
    destTop: number;
    destLeft: number;
    width: number;
    height: number;
    rgba: Uint8Array;
  }) => void) => () => void;
  onRdpClosed: (callback: (sessionId: string) => void) => () => void;
  onRdpError: (callback: (sessionId: string, error: string) => void) => () => void;

  // SFTP
  sftpList: (connectionId: string, remotePath: string) => Promise<SftpFileEntry[]>;
  sftpMkdir: (connectionId: string, remotePath: string) => Promise<void>;
  sftpDelete: (connectionId: string, remotePath: string, isDir: boolean) => Promise<void>;
  sftpRename: (connectionId: string, oldPath: string, newPath: string) => Promise<void>;
  sftpDownload: (connectionId: string, remotePath: string) => Promise<boolean>;
  sftpUpload: (connectionId: string, remoteDir: string) => Promise<string | null>;

  dockTerminal: (opts: { terminalId: string; title: string; command?: string; sshConnectionId?: string }) => void;
  onTerminalDocked: (callback: (opts: { terminalId: string; title: string; command?: string; sshConnectionId?: string }) => void) => () => void;

  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
}

export interface SftpFileEntry {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  modifyTime: number;
  permissions: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
