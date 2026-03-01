import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VNCViewerProps {
  sessionId: string;
  host: string;
  port: number;
  password?: string;
}

// DES encryption for VNC authentication (RFB 3.x password challenge)
function vncEncrypt(challenge: Uint8Array, password: string): Uint8Array {
  const key = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    const c = i < password.length ? password.charCodeAt(i) : 0;
    key[i] = ((c & 0x01) << 7) | ((c & 0x02) << 5) | ((c & 0x04) << 3) |
             ((c & 0x08) << 1) | ((c & 0x10) >> 1) | ((c & 0x20) >> 3) |
             ((c & 0x40) >> 5) | ((c & 0x80) >> 7);
  }
  const result = new Uint8Array(16);
  desEncryptBlock(key, challenge.subarray(0, 8), result, 0);
  desEncryptBlock(key, challenge.subarray(8, 16), result, 8);
  return result;
}

// Minimal DES ECB for VNC auth
function desEncryptBlock(key: Uint8Array, input: Uint8Array, output: Uint8Array, outOffset: number): void {
  const PC1 = [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4];
  const PC2 = [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32];
  const IP_TABLE = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
  const FP_TABLE = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25];
  const E_TABLE = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1];
  const P_TABLE = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25];
  const S_BOXES = [
    [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
    [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
    [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
    [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
    [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
    [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
    [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
    [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,2,0,14,9,11,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,11,14,1,7,4,0,9,12,14,2,3,5,10,11,13,6,15,8]
  ];
  const SHIFTS = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];

  const getBit = (data: Uint8Array, pos: number) => (data[pos >> 3] >> (7 - (pos & 7))) & 1;
  const setBit = (data: Uint8Array, pos: number, val: number) => {
    const byte = pos >> 3, bit = 7 - (pos & 7);
    if (val) data[byte] |= (1 << bit); else data[byte] &= ~(1 << bit);
  };

  const cd = new Uint8Array(7);
  for (let i = 0; i < 56; i++) setBit(cd, i, getBit(key, PC1[i] - 1));

  let c = 0, d = 0;
  for (let i = 0; i < 28; i++) { c |= getBit(cd, i) << (27 - i); d |= getBit(cd, i + 28) << (27 - i); }

  const subkeys: Uint8Array[] = [];
  for (let round = 0; round < 16; round++) {
    for (let s = 0; s < SHIFTS[round]; s++) {
      c = ((c << 1) | (c >> 27)) & 0x0FFFFFFF;
      d = ((d << 1) | (d >> 27)) & 0x0FFFFFFF;
    }
    const cdT = new Uint8Array(7);
    for (let i = 0; i < 28; i++) { setBit(cdT, i, (c >> (27 - i)) & 1); setBit(cdT, i + 28, (d >> (27 - i)) & 1); }
    const sk = new Uint8Array(6);
    for (let i = 0; i < 48; i++) setBit(sk, i, getBit(cdT, PC2[i] - 1));
    subkeys.push(sk);
  }

  const block = new Uint8Array(8);
  for (let i = 0; i < 64; i++) setBit(block, i, getBit(input, IP_TABLE[i] - 1));

  let left = 0, right = 0;
  for (let i = 0; i < 32; i++) { left |= getBit(block, i) << (31 - i); right |= getBit(block, i + 32) << (31 - i); }

  for (let round = 0; round < 16; round++) {
    const rb = new Uint8Array(4);
    for (let i = 0; i < 32; i++) setBit(rb, i, (right >> (31 - i)) & 1);
    const expanded = new Uint8Array(6);
    for (let i = 0; i < 48; i++) setBit(expanded, i, getBit(rb, E_TABLE[i] - 1));
    for (let i = 0; i < 6; i++) expanded[i] ^= subkeys[round][i];

    let sResult = 0;
    for (let i = 0; i < 8; i++) {
      const o = i * 6;
      const row = (getBit(expanded, o) << 1) | getBit(expanded, o + 5);
      const col = (getBit(expanded, o + 1) << 3) | (getBit(expanded, o + 2) << 2) |
                  (getBit(expanded, o + 3) << 1) | getBit(expanded, o + 4);
      sResult |= S_BOXES[i][row * 16 + col] << (28 - i * 4);
    }

    const sB = new Uint8Array(4);
    for (let i = 0; i < 32; i++) setBit(sB, i, (sResult >> (31 - i)) & 1);
    let pResult = 0;
    for (let i = 0; i < 32; i++) pResult |= getBit(sB, P_TABLE[i] - 1) << (31 - i);

    const newRight = left ^ pResult;
    left = right;
    right = newRight;
  }

  const pre = new Uint8Array(8);
  for (let i = 0; i < 32; i++) { setBit(pre, i, (right >> (31 - i)) & 1); setBit(pre, i + 32, (left >> (31 - i)) & 1); }
  for (let i = 0; i < 64; i++) {
    const val = getBit(pre, FP_TABLE[i] - 1);
    const byteIdx = i >> 3, bitIdx = 7 - (i & 7);
    if (val) output[outOffset + byteIdx] |= (1 << bitIdx);
    else output[outOffset + byteIdx] &= ~(1 << bitIdx);
  }
}

export function VNCViewer({ sessionId, host, port, password }: VNCViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [resolution, setResolution] = useState({ w: 1024, h: 768 });
  const scaleRef = useRef({ sx: 1, sy: 1 });
  const bufferRef = useRef<Uint8Array>(new Uint8Array(0));
  const stateRef = useRef<string>('handshake');
  const fbSizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    async function connect() {
      try {
        const { wsPort } = await window.electronAPI.vncConnect(sessionId, host, port, password);
        if (cancelled) { window.electronAPI.vncDisconnect(sessionId); return; }

        ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;
        stateRef.current = 'handshake';
        bufferRef.current = new Uint8Array(0);

        ws.onmessage = (event) => {
          const incoming = new Uint8Array(event.data);
          const prev = bufferRef.current;
          const combined = new Uint8Array(prev.length + incoming.length);
          combined.set(prev);
          combined.set(incoming, prev.length);
          bufferRef.current = combined;
          processBuffer();
        };

        ws.onerror = () => { if (!cancelled) { setStatus('error'); setErrorMsg('WebSocket ошибка'); } };
        ws.onclose = () => { if (!cancelled) setStatus('disconnected'); };
      } catch (err: any) {
        if (!cancelled) { setStatus('error'); setErrorMsg(err.message); }
      }
    }

    function sendBytes(data: Uint8Array) { ws?.send(data); }

    function requestUpdate(incremental: boolean) {
      const msg = new Uint8Array(10);
      const dv = new DataView(msg.buffer);
      msg[0] = 3;
      msg[1] = incremental ? 1 : 0;
      dv.setUint16(2, 0);
      dv.setUint16(4, 0);
      dv.setUint16(6, fbSizeRef.current.w);
      dv.setUint16(8, fbSizeRef.current.h);
      sendBytes(msg);
    }

    function processBuffer() {
      const buf = bufferRef.current;
      const state = stateRef.current;

      if (state === 'handshake') {
        if (buf.length < 12) return;
        sendBytes(new TextEncoder().encode('RFB 003.008\n'));
        bufferRef.current = buf.subarray(12);
        stateRef.current = 'security';
        processBuffer();
      } else if (state === 'security') {
        if (buf.length < 1) return;
        const n = buf[0];
        if (n === 0) {
          if (buf.length < 5) return;
          const rLen = new DataView(buf.buffer, buf.byteOffset + 1, 4).getUint32(0);
          if (buf.length < 5 + rLen) return;
          setStatus('error');
          setErrorMsg(new TextDecoder().decode(buf.subarray(5, 5 + rLen)));
          return;
        }
        if (buf.length < 1 + n) return;
        const types = Array.from(buf.subarray(1, 1 + n));
        if (types.includes(1) && !password) {
          sendBytes(new Uint8Array([1]));
          stateRef.current = 'authResult';
        } else if (types.includes(2)) {
          sendBytes(new Uint8Array([2]));
          stateRef.current = 'auth';
        } else if (types.includes(1)) {
          sendBytes(new Uint8Array([1]));
          stateRef.current = 'authResult';
        } else {
          setStatus('error'); setErrorMsg('Нет поддерживаемых типов аутентификации'); return;
        }
        bufferRef.current = buf.subarray(1 + n);
        processBuffer();
      } else if (state === 'auth') {
        if (buf.length < 16) return;
        sendBytes(vncEncrypt(buf.subarray(0, 16), password || ''));
        bufferRef.current = buf.subarray(16);
        stateRef.current = 'authResult';
        processBuffer();
      } else if (state === 'authResult') {
        if (buf.length < 4) return;
        if (new DataView(buf.buffer, buf.byteOffset, 4).getUint32(0) !== 0) {
          setStatus('error'); setErrorMsg('Ошибка аутентификации VNC'); return;
        }
        sendBytes(new Uint8Array([1])); // ClientInit shared=1
        bufferRef.current = buf.subarray(4);
        stateRef.current = 'serverInit';
        processBuffer();
      } else if (state === 'serverInit') {
        if (buf.length < 24) return;
        const dv = new DataView(buf.buffer, buf.byteOffset);
        const w = dv.getUint16(0), h = dv.getUint16(2);
        const nameLen = dv.getUint32(20);
        if (buf.length < 24 + nameLen) return;

        fbSizeRef.current = { w, h };
        setResolution({ w, h });
        if (!cancelled) setStatus('connected');

        // Set pixel format: 32bpp RGBX
        const pf = new Uint8Array(20);
        pf[0] = 0; // SetPixelFormat
        pf[4] = 32; pf[5] = 24; pf[6] = 0; pf[7] = 1;
        pf[8] = 0; pf[9] = 0xFF; pf[10] = 0; pf[11] = 0xFF; pf[12] = 0; pf[13] = 0xFF;
        pf[14] = 16; pf[15] = 8; pf[16] = 0;
        sendBytes(pf);

        // Set encodings: Raw, CopyRect
        const enc = new Uint8Array(12);
        enc[0] = 2; enc[3] = 2;
        sendBytes(enc);

        requestUpdate(false);

        bufferRef.current = buf.subarray(24 + nameLen);
        stateRef.current = 'normal';
        processBuffer();
      } else if (state === 'normal') {
        processNormal();
      }
    }

    function processNormal() {
      const buf = bufferRef.current;
      if (buf.length < 1) return;

      const t = buf[0];
      if (t === 0) { // FramebufferUpdate
        if (buf.length < 4) return;
        const numRects = new DataView(buf.buffer, buf.byteOffset + 2, 2).getUint16(0);
        let off = 4;
        for (let i = 0; i < numRects; i++) {
          if (buf.length < off + 12) return;
          const dv = new DataView(buf.buffer, buf.byteOffset + off);
          const x = dv.getUint16(0), y = dv.getUint16(2), w = dv.getUint16(4), h = dv.getUint16(6);
          const enc = dv.getInt32(8);
          off += 12;
          if (enc === 0) { // Raw
            const len = w * h * 4;
            if (buf.length < off + len) return;
            drawRect(x, y, w, h, buf.subarray(off, off + len));
            off += len;
          } else if (enc === 1) { // CopyRect
            if (buf.length < off + 4) return;
            const sx = new DataView(buf.buffer, buf.byteOffset + off, 2).getUint16(0);
            const sy = new DataView(buf.buffer, buf.byteOffset + off + 2, 2).getUint16(0);
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) { const img = ctx.getImageData(sx, sy, w, h); ctx.putImageData(img, x, y); }
            }
            off += 4;
          }
        }
        bufferRef.current = buf.subarray(off);
        requestUpdate(true);
        processBuffer();
      } else if (t === 1) { // SetColourMap
        if (buf.length < 6) return;
        const n = new DataView(buf.buffer, buf.byteOffset + 4, 2).getUint16(0);
        const total = 6 + n * 6;
        if (buf.length < total) return;
        bufferRef.current = buf.subarray(total);
        processBuffer();
      } else if (t === 2) { // Bell
        bufferRef.current = buf.subarray(1);
        processBuffer();
      } else if (t === 3) { // ServerCutText
        if (buf.length < 8) return;
        const len = new DataView(buf.buffer, buf.byteOffset + 4, 4).getUint32(0);
        if (buf.length < 8 + len) return;
        bufferRef.current = buf.subarray(8 + len);
        processBuffer();
      }
    }

    function drawRect(x: number, y: number, w: number, h: number, pixels: Uint8Array) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imgData = ctx.createImageData(w, h);
      // Server sends RGBX (R at shift 16, G at shift 8, B at shift 0 in 32bit LE = B,G,R,X in bytes)
      for (let i = 0; i < w * h; i++) {
        imgData.data[i * 4] = pixels[i * 4 + 2];
        imgData.data[i * 4 + 1] = pixels[i * 4 + 1];
        imgData.data[i * 4 + 2] = pixels[i * 4];
        imgData.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(imgData, x, y);
    }

    connect();
    return () => {
      cancelled = true;
      if (ws) try { ws.close(); } catch (_) {}
      window.electronAPI.vncDisconnect(sessionId).catch(() => {});
    };
  }, [sessionId, host, port, password]);

  useEffect(() => {
    const update = () => {
      const c = canvasRef.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      scaleRef.current = { sx: c.width / r.width, sy: c.height / r.height };
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [resolution]);

  const getCoords = useCallback((e: React.MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: Math.round((e.clientX - r.left) * scaleRef.current.sx), y: Math.round((e.clientY - r.top) * scaleRef.current.sy) };
  }, []);

  const btnMask = useRef(0);
  const sendPointer = useCallback((x: number, y: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || stateRef.current !== 'normal') return;
    const msg = new Uint8Array(6);
    const dv = new DataView(msg.buffer);
    msg[0] = 5; msg[1] = btnMask.current; dv.setUint16(2, x); dv.setUint16(4, y);
    ws.send(msg);
  }, []);

  const onMove = useCallback((e: React.MouseEvent) => { const { x, y } = getCoords(e); sendPointer(x, y); }, [getCoords, sendPointer]);
  const onDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); btnMask.current |= (e.button === 0 ? 1 : e.button === 1 ? 2 : 4); const { x, y } = getCoords(e); sendPointer(x, y); }, [getCoords, sendPointer]);
  const onUp = useCallback((e: React.MouseEvent) => { btnMask.current &= ~(e.button === 0 ? 1 : e.button === 1 ? 2 : 4); const { x, y } = getCoords(e); sendPointer(x, y); }, [getCoords, sendPointer]);
  const onWheel = useCallback((e: React.WheelEvent) => { const { x, y } = getCoords(e); const bit = e.deltaY < 0 ? 8 : 16; btnMask.current |= bit; sendPointer(x, y); btnMask.current &= ~bit; sendPointer(x, y); }, [getCoords, sendPointer]);

  const sendKey = useCallback((keysym: number, down: boolean) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || stateRef.current !== 'normal') return;
    const msg = new Uint8Array(8);
    msg[0] = 4; msg[1] = down ? 1 : 0;
    new DataView(msg.buffer).setUint32(4, keysym);
    ws.send(msg);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => { e.preventDefault(); const k = domKeyToKeysym(e); if (k) sendKey(k, true); }, [sendKey]);
  const onKeyUp = useCallback((e: React.KeyboardEvent) => { e.preventDefault(); const k = domKeyToKeysym(e); if (k) sendKey(k, false); }, [sendKey]);

  return (
    <div style={styles.container}>
      {status === 'connecting' && <div style={styles.overlay}><span style={styles.statusText}>Подключение к VNC {host}:{port}...</span></div>}
      {status === 'error' && <div style={styles.overlay}><span style={{ ...styles.statusText, color: 'var(--accent-red)' }}>Ошибка: {errorMsg}</span></div>}
      {status === 'disconnected' && <div style={styles.overlay}><span style={{ ...styles.statusText, color: 'var(--accent-amber)' }}>Отключено</span></div>}
      <canvas ref={canvasRef} width={resolution.w} height={resolution.h} style={styles.canvas} tabIndex={0}
        onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp} onWheel={onWheel}
        onKeyDown={onKeyDown} onKeyUp={onKeyUp} onContextMenu={e => e.preventDefault()} />
    </div>
  );
}

function domKeyToKeysym(e: React.KeyboardEvent): number | null {
  const map: Record<string, number> = {
    Backspace: 0xFF08, Tab: 0xFF09, Enter: 0xFF0D, Escape: 0xFF1B, Delete: 0xFFFF,
    Home: 0xFF50, End: 0xFF57, PageUp: 0xFF55, PageDown: 0xFF56,
    ArrowLeft: 0xFF51, ArrowUp: 0xFF52, ArrowRight: 0xFF53, ArrowDown: 0xFF54,
    Insert: 0xFF63, F1: 0xFFBE, F2: 0xFFBF, F3: 0xFFC0, F4: 0xFFC1,
    F5: 0xFFC2, F6: 0xFFC3, F7: 0xFFC4, F8: 0xFFC5, F9: 0xFFC6, F10: 0xFFC7, F11: 0xFFC8, F12: 0xFFC9,
    ShiftLeft: 0xFFE1, ShiftRight: 0xFFE2, ControlLeft: 0xFFE3, ControlRight: 0xFFE4,
    AltLeft: 0xFFE9, AltRight: 0xFFEA, MetaLeft: 0xFFEB, MetaRight: 0xFFEC,
    CapsLock: 0xFFE5, NumLock: 0xFF7F, ScrollLock: 0xFF14, Space: 0x0020,
    Shift: 0xFFE1, Control: 0xFFE3, Alt: 0xFFE9, Meta: 0xFFEB,
  };
  if (map[e.code]) return map[e.code];
  if (map[e.key]) return map[e.key];
  if (e.key.length === 1) return e.key.charCodeAt(0);
  return null;
}

const styles: Record<string, React.CSSProperties> = {
  container: { position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' },
  canvas: { width: '100%', height: '100%', objectFit: 'contain', outline: 'none', cursor: 'default' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,15,0.9)', zIndex: 10 },
  statusText: { color: 'var(--accent-cyan)', fontSize: 14, fontFamily: 'var(--font-mono)' },
};
