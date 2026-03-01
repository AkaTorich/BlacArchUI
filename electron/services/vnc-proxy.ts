import net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

interface VNCProxySession {
  wsServer: WebSocketServer;
  tcpSocket: net.Socket | null;
  wsClient: WebSocket | null;
  wsPort: number;
}

export class VNCProxy {
  private sessions: Map<string, VNCProxySession> = new Map();

  async startProxy(sessionId: string, host: string, vncPort: number): Promise<number> {
    // Clean up any existing session with this ID
    this.stopProxy(sessionId);

    return new Promise((resolve, reject) => {
      const wsServer = new WebSocketServer({ port: 0, host: '127.0.0.1' });

      wsServer.on('listening', () => {
        const addr = wsServer.address();
        const wsPort = typeof addr === 'object' && addr ? addr.port : 0;
        if (!wsPort) {
          wsServer.close();
          return reject(new Error('Failed to bind WebSocket server'));
        }

        const session: VNCProxySession = {
          wsServer,
          tcpSocket: null,
          wsClient: null,
          wsPort,
        };
        this.sessions.set(sessionId, session);

        console.log(`[VNC Proxy] Session ${sessionId}: WS listening on 127.0.0.1:${wsPort} → ${host}:${vncPort}`);
        resolve(wsPort);
      });

      wsServer.on('connection', (ws) => {
        const session = this.sessions.get(sessionId);
        if (!session) {
          ws.close();
          return;
        }

        console.log(`[VNC Proxy] Session ${sessionId}: WebSocket client connected, connecting to VNC server...`);
        session.wsClient = ws;

        // Create TCP connection to VNC server
        const tcpSocket = net.createConnection({ host, port: vncPort }, () => {
          console.log(`[VNC Proxy] Session ${sessionId}: Connected to VNC server ${host}:${vncPort}`);
        });
        session.tcpSocket = tcpSocket;

        // TCP → WebSocket
        tcpSocket.on('data', (data: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        // WebSocket → TCP
        ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
          if (tcpSocket.writable) {
            if (Buffer.isBuffer(data)) {
              tcpSocket.write(data);
            } else if (data instanceof ArrayBuffer) {
              tcpSocket.write(Buffer.from(data));
            } else if (Array.isArray(data)) {
              tcpSocket.write(Buffer.concat(data));
            }
          }
        });

        tcpSocket.on('error', (err) => {
          console.error(`[VNC Proxy] Session ${sessionId}: TCP error:`, err.message);
          ws.close();
        });

        tcpSocket.on('close', () => {
          console.log(`[VNC Proxy] Session ${sessionId}: TCP connection closed`);
          ws.close();
        });

        ws.on('close', () => {
          console.log(`[VNC Proxy] Session ${sessionId}: WebSocket closed`);
          tcpSocket.destroy();
        });

        ws.on('error', (err) => {
          console.error(`[VNC Proxy] Session ${sessionId}: WS error:`, err.message);
          tcpSocket.destroy();
        });
      });

      wsServer.on('error', (err) => {
        console.error(`[VNC Proxy] Session ${sessionId}: Server error:`, err.message);
        reject(err);
      });
    });
  }

  stopProxy(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`[VNC Proxy] Stopping session ${sessionId}`);
    if (session.tcpSocket) {
      session.tcpSocket.destroy();
    }
    if (session.wsClient && session.wsClient.readyState === WebSocket.OPEN) {
      session.wsClient.close();
    }
    session.wsServer.close();
    this.sessions.delete(sessionId);
  }

  stopAll(): void {
    for (const id of this.sessions.keys()) {
      this.stopProxy(id);
    }
  }
}
