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
    screenWidth: number,
    screenHeight: number,
    sender: Electron.WebContents
  ): void {
    // Clean up existing
    this.disconnect(sessionId);

    const w = screenWidth || 1280;
    const h = screenHeight || 800;

    const rdpjs = require('@electerm/rdpjs');
    const client = rdpjs.createClient({
      userName: username,
      password: password,
      domain: domain || '',
      enablePerf: true,
      autoLogin: true,
      decompress: true,
      screen: { width: w, height: h },
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
      if (bitmap.isCompress) return;

      const src = bitmap.data;
      const pixelCount = bitmap.width * bitmap.height;
      const bpp = (bitmap.decompressed && src.length >= pixelCount * 4)
        ? 32 : bitmap.bitsPerPixel;

      // Convert to RGBA using Uint32Array — ~4x faster than byte-by-byte
      const rgba = Buffer.allocUnsafe(pixelCount * 4);
      const dst32 = new Uint32Array(rgba.buffer, rgba.byteOffset, pixelCount);

      if (bpp === 32 && bitmap.decompressed) {
        // RLE outputs RGBX — read as uint32, set alpha byte
        const src32 = new Uint32Array(src.buffer, src.byteOffset, pixelCount);
        for (let i = 0; i < pixelCount; i++) {
          dst32[i] = (src32[i] & 0x00FFFFFF) | 0xFF000000;
        }
      } else if (bpp === 32) {
        // Raw BGRX → RGBA — swap R↔B via uint32
        const src32 = new Uint32Array(src.buffer, src.byteOffset, pixelCount);
        for (let i = 0; i < pixelCount; i++) {
          const p = src32[i];
          // BGRX in LE: byte0=B, byte1=G, byte2=R, byte3=X → need RGBA: byte0=R, byte1=G, byte2=B, byte3=A
          dst32[i] = ((p & 0x00FF0000) >> 16) | (p & 0x0000FF00) | ((p & 0x000000FF) << 16) | 0xFF000000;
        }
      } else if (bpp === 24) {
        for (let i = 0; i < pixelCount; i++) {
          const si = i * 3;
          dst32[i] = src[si + 2] | (src[si + 1] << 8) | (src[si] << 16) | 0xFF000000;
        }
      } else if (bpp === 16) {
        const src16 = new Uint16Array(src.buffer, src.byteOffset, pixelCount);
        for (let i = 0; i < pixelCount; i++) {
          const p = src16[i];
          dst32[i] = (((p >> 11) & 0x1F) * 255 / 31)
            | ((((p >> 5) & 0x3F) * 255 / 63) << 8)
            | (((p & 0x1F) * 255 / 31) << 16)
            | 0xFF000000;
        }
      } else if (bpp === 15) {
        const src16 = new Uint16Array(src.buffer, src.byteOffset, pixelCount);
        for (let i = 0; i < pixelCount; i++) {
          const p = src16[i];
          dst32[i] = (((p >> 10) & 0x1F) * 255 / 31)
            | ((((p >> 5) & 0x1F) * 255 / 31) << 8)
            | (((p & 0x1F) * 255 / 31) << 16)
            | 0xFF000000;
        }
      }

      sender.send('rdp:bitmap', sessionId, {
        destTop: bitmap.destTop,
        destLeft: bitmap.destLeft,
        width: bitmap.width,
        height: bitmap.height,
        rgba: rgba,
      });
    });

    client.on('close', () => {
      // Only delete if this client is still the active one for this session
      const current = this.sessions.get(sessionId);
      if (current?.client === client) {
        console.log(`[RDP] Session ${sessionId}: Connection closed`);
        this.sessions.delete(sessionId);
        if (!sender.isDestroyed()) {
          sender.send('rdp:closed', sessionId);
        }
      }
    });

    client.on('error', (err: Error) => {
      const current = this.sessions.get(sessionId);
      if (current?.client === client) {
        console.error(`[RDP] Session ${sessionId}: Error:`, err.message);
        if (!sender.isDestroyed()) {
          sender.send('rdp:error', sessionId, err.message);
        }
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
      // Force close underlying socket (close() doesn't work if not yet connected)
      try {
        session.client.bufferLayer?.socket?.destroy();
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
