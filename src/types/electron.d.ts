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

  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
