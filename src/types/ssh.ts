export interface ISSHConnectionConfig {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  password?: string;
  privateKeyPath?: string;
}
