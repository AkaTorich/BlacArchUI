import { BrowserWindow } from 'electron';

interface RDPSession {
  client: any;
  sender: Electron.WebContents;
}

export class RDPManager {
  private sessions: Map<string, RDPSession> = new Map();

  connect(
    sessionId: string,
    host: string,
    port: number,
    username: string,
    password: string,
    domain: string,
    sender: Electron.WebContents
  ): void {
    // Clean up existing
    this.disconnect(sessionId);

    const rdpjs = require('@electerm/rdpjs');
    const client = rdpjs.createClient({
      userName: username,
      password: password,
      domain: domain || '',
      enablePerf: true,
      autoLogin: true,
      screen: { width: 1280, height: 800 },
      logLevel: 'ERROR',
    });

    this.sessions.set(sessionId, { client, sender });

    client.on('connect', () => {
      console.log(`[RDP] Session ${sessionId}: Connected to ${host}:${port}`);
      if (!sender.isDestroyed()) {
        sender.send('rdp:connected', sessionId);
      }
    });

    client.on('bitmap', (bitmap: any) => {
      if (sender.isDestroyed()) return;
      // Convert bitmap data to transferable format
      const data = {
        destTop: bitmap.destTop,
        destLeft: bitmap.destLeft,
        destRight: bitmap.destRight,
        destBottom: bitmap.destBottom,
        width: bitmap.width,
        height: bitmap.height,
        bitsPerPixel: bitmap.bitsPerPixel,
        data: bitmap.data instanceof Buffer
          ? Array.from(bitmap.data)
          : Array.from(bitmap.data as Uint8Array),
      };
      sender.send('rdp:bitmap', sessionId, data);
    });

    client.on('close', () => {
      console.log(`[RDP] Session ${sessionId}: Connection closed`);
      this.sessions.delete(sessionId);
      if (!sender.isDestroyed()) {
        sender.send('rdp:closed', sessionId);
      }
    });

    client.on('error', (err: Error) => {
      console.error(`[RDP] Session ${sessionId}: Error:`, err.message);
      if (!sender.isDestroyed()) {
        sender.send('rdp:error', sessionId, err.message);
      }
    });

    console.log(`[RDP] Session ${sessionId}: Connecting to ${host}:${port}...`);
    client.connect(host, port);
  }

  sendMouse(sessionId: string, x: number, y: number, button: number, isPressed: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session?.client?.connected) {
      session.client.sendPointerEvent(x, y, button, isPressed);
    }
  }

  sendKeyboard(sessionId: string, scancode: number, isPressed: boolean, isExtended: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session?.client?.connected) {
      session.client.sendKeyEventScancode(scancode, isPressed, isExtended);
    }
  }

  sendWheel(sessionId: string, x: number, y: number, step: number, isNegative: boolean, isHorizontal: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session?.client?.connected) {
      session.client.sendWheelEvent(x, y, step, isNegative, isHorizontal);
    }
  }

  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(`[RDP] Disconnecting session ${sessionId}`);
      try {
        session.client.close();
      } catch (_) { /* ignore */ }
      this.sessions.delete(sessionId);
    }
  }

  disconnectAll(): void {
    for (const id of this.sessions.keys()) {
      this.disconnect(id);
    }
  }
}
