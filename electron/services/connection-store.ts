import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { SSHConnectionConfig } from './ssh-manager';

export class ConnectionStore {
  private filePath: string;
  private connections: Omit<SSHConnectionConfig, 'password'>[] = [];

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'ssh-connections.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.connections = JSON.parse(data);
      }
    } catch {
      this.connections = [];
    }
  }

  private save(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.connections, null, 2));
  }

  getAll(): Omit<SSHConnectionConfig, 'password'>[] {
    return this.connections;
  }

  add(config: SSHConnectionConfig): void {
    // Don't store passwords on disk
    const { password, ...safeConfig } = config;
    const existing = this.connections.findIndex((c) => c.id === config.id);
    if (existing >= 0) {
      this.connections[existing] = safeConfig;
    } else {
      this.connections.push(safeConfig);
    }
    this.save();
  }

  remove(id: string): void {
    this.connections = this.connections.filter((c) => c.id !== id);
    this.save();
  }
}
