import net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

interface VNCProxySession {
  wsServer: WebSocketServer;
  tcpSocket: net.Socket | null;
  wsClient: WebSocket | null;
  wsPort: number;
  generation: number;
}

export class VNCProxy {
  private sessions: Map<string, VNCProxySession> = new Map();
  private generationCounter = 0;

  async startProxy(sessionId: string, host: string, vncPort: number): Promise<{ wsPort: number; generation: number }> {
    // Clean up any existing session with this ID
    this.forceStopProxy(sessionId);
    const generation = ++this.generationCounter;

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
          generation,
        };
        this.sessions.set(sessionId, session);

        console.log(`[VNC Proxy] Session ${sessionId} (gen ${generation}): WS listening on 127.0.0.1:${wsPort} → ${host}:${vncPort}`);
        resolve({ wsPort, generation });
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
        let tcpBytesReceived = 0;
        tcpSocket.on('data', (data: Buffer) => {
          tcpBytesReceived += data.length;
          if (tcpBytesReceived <= 64) {
            console.log(`[VNC Proxy] Session ${sessionId}: TCP→WS ${data.length} bytes (total ${tcpBytesReceived}), first bytes: ${data.subarray(0, Math.min(32, data.length)).toString('hex')} ascii: ${data.subarray(0, Math.min(32, data.length)).toString('ascii').replace(/[^\x20-\x7e]/g, '.')}`);
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        // WebSocket → TCP
        let wsBytesReceived = 0;
        ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
          const buf = Buffer.isBuffer(data) ? data : data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.concat(data);
          wsBytesReceived += buf.length;
          if (wsBytesReceived <= 64) {
            console.log(`[VNC Proxy] Session ${sessionId}: WS→TCP ${buf.length} bytes (total ${wsBytesReceived}), first bytes: ${buf.subarray(0, Math.min(32, buf.length)).toString('hex')} ascii: ${buf.subarray(0, Math.min(32, buf.length)).toString('ascii').replace(/[^\x20-\x7e]/g, '.')}`);
          }
          if (tcpSocket.writable) {
            tcpSocket.write(buf);
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

  // Stop only if generation matches (prevents StrictMode race condition)
  stopProxy(sessionId: string, generation?: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    // If generation is provided and doesn't match, skip — a newer session took over
    if (generation !== undefined && session.generation !== generation) return;

    this.doStop(sessionId, session);
  }

  // Force stop regardless of generation (used internally by startProxy)
  private forceStopProxy(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.doStop(sessionId, session);
  }

  private doStop(sessionId: string, session: VNCProxySession): void {
    console.log(`[VNC Proxy] Stopping session ${sessionId} (gen ${session.generation})`);
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
      this.forceStopProxy(id);
    }
  }
}
