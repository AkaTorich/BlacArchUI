import React, { useRef, useEffect, useState, useCallback } from 'react';

interface RDPViewerProps {
  sessionId: string;
  host: string;
  port: number;
  username: string;
  password: string;
  domain?: string;
}

// Map DOM mouse buttons to RDP button flags
function getMouseButton(e: React.MouseEvent | MouseEvent): number {
  switch (e.button) {
    case 0: return 1; // left
    case 1: return 3; // middle
    case 2: return 2; // right
    default: return 0;
  }
}

// Map DOM key codes to RDP scancodes
const KEY_TO_SCANCODE: Record<string, [number, boolean]> = {
  Escape: [0x01, false],
  Digit1: [0x02, false], Digit2: [0x03, false], Digit3: [0x04, false],
  Digit4: [0x05, false], Digit5: [0x06, false], Digit6: [0x07, false],
  Digit7: [0x08, false], Digit8: [0x09, false], Digit9: [0x0A, false],
  Digit0: [0x0B, false],
  Minus: [0x0C, false], Equal: [0x0D, false],
  Backspace: [0x0E, false], Tab: [0x0F, false],
  KeyQ: [0x10, false], KeyW: [0x11, false], KeyE: [0x12, false],
  KeyR: [0x13, false], KeyT: [0x14, false], KeyY: [0x15, false],
  KeyU: [0x16, false], KeyI: [0x17, false], KeyO: [0x18, false],
  KeyP: [0x19, false],
  BracketLeft: [0x1A, false], BracketRight: [0x1B, false],
  Enter: [0x1C, false],
  ControlLeft: [0x1D, false],
  KeyA: [0x1E, false], KeyS: [0x1F, false], KeyD: [0x20, false],
  KeyF: [0x21, false], KeyG: [0x22, false], KeyH: [0x23, false],
  KeyJ: [0x24, false], KeyK: [0x25, false], KeyL: [0x26, false],
  Semicolon: [0x27, false], Quote: [0x28, false], Backquote: [0x29, false],
  ShiftLeft: [0x2A, false],
  Backslash: [0x2B, false],
  KeyZ: [0x2C, false], KeyX: [0x2D, false], KeyC: [0x2E, false],
  KeyV: [0x2F, false], KeyB: [0x30, false], KeyN: [0x31, false],
  KeyM: [0x32, false],
  Comma: [0x33, false], Period: [0x34, false], Slash: [0x35, false],
  ShiftRight: [0x36, false],
  AltLeft: [0x38, false],
  Space: [0x39, false],
  CapsLock: [0x3A, false],
  F1: [0x3B, false], F2: [0x3C, false], F3: [0x3D, false],
  F4: [0x3E, false], F5: [0x3F, false], F6: [0x40, false],
  F7: [0x41, false], F8: [0x42, false], F9: [0x43, false],
  F10: [0x44, false], F11: [0x57, false], F12: [0x58, false],
  // Extended keys
  ControlRight: [0x1D, true],
  AltRight: [0x38, true],
  Insert: [0x52, true], Delete: [0x53, true],
  Home: [0x47, true], End: [0x4F, true],
  PageUp: [0x49, true], PageDown: [0x51, true],
  ArrowUp: [0x48, true], ArrowDown: [0x50, true],
  ArrowLeft: [0x4B, true], ArrowRight: [0x4D, true],
  NumLock: [0x45, false],
  MetaLeft: [0x5B, true], MetaRight: [0x5C, true],
};

function measureContainer(el: HTMLElement): { w: number; h: number } {
  const rect = el.getBoundingClientRect();
  // Use even dimensions (RDP protocol requires this)
  return {
    w: Math.floor(rect.width / 2) * 2 || 1280,
    h: Math.floor(rect.height / 2) * 2 || 800,
  };
}

export function RDPViewer({ sessionId, host, port, username, password, domain }: RDPViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [screenSize, setScreenSize] = useState<{ w: number; h: number } | null>(null);

  // Measure container and watch for resize — debounced reconnect on size change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial measurement
    setScreenSize(measureContainer(el));

    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const newSize = measureContainer(el);
        setScreenSize(prev => {
          if (prev && prev.w === newSize.w && prev.h === newSize.h) return prev;
          return newSize;
        });
      }, 500);
    });
    observer.observe(el);

    return () => {
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, []);

  // Connect to RDP once we know the screen size; reconnect on size change
  useEffect(() => {
    if (!screenSize) return;
    let cancelled = false;
    let ctx: CanvasRenderingContext2D | null = null;

    // Bitmap batching — collect updates, paint in one rAF
    type BitmapUpdate = { destLeft: number; destTop: number; width: number; height: number; rgba: Uint8Array };
    const pendingBitmaps: BitmapUpdate[] = [];
    let paintRaf = 0;

    const flushBitmaps = () => {
      paintRaf = 0;
      if (!ctx) {
        const canvas = canvasRef.current;
        if (canvas) ctx = canvas.getContext('2d');
      }
      if (!ctx) return;

      for (let i = 0; i < pendingBitmaps.length; i++) {
        const b = pendingBitmaps[i];
        const imgData = new ImageData(
          new Uint8ClampedArray(b.rgba.buffer, b.rgba.byteOffset, b.width * b.height * 4),
          b.width, b.height
        );
        ctx.putImageData(imgData, b.destLeft, b.destTop);
      }
      pendingBitmaps.length = 0;
    };

    setStatus('connecting');

    const cleanupConnected = window.electronAPI.onRdpConnected((sid) => {
      if (sid === sessionId && !cancelled) setStatus('connected');
    });

    const cleanupBitmap = window.electronAPI.onRdpBitmap((sid, bitmap) => {
      if (sid !== sessionId || cancelled) return;
      pendingBitmaps.push(bitmap);
      if (!paintRaf) paintRaf = requestAnimationFrame(flushBitmaps);
    });

    const cleanupClosed = window.electronAPI.onRdpClosed((sid) => {
      if (sid === sessionId && !cancelled) setStatus('disconnected');
    });

    const cleanupError = window.electronAPI.onRdpError((sid, error) => {
      if (sid === sessionId && !cancelled) {
        setStatus('error');
        setErrorMsg(error);
      }
    });

    window.electronAPI.rdpConnect(sessionId, host, port, username, password, domain, screenSize.w, screenSize.h)
      .catch((err: any) => {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(err.message || 'Не удалось подключиться');
        }
      });

    return () => {
      cancelled = true;
      if (paintRaf) cancelAnimationFrame(paintRaf);
      cleanupConnected();
      cleanupBitmap();
      cleanupClosed();
      cleanupError();
      window.electronAPI.rdpDisconnect(sessionId).catch(() => {});
    };
  }, [sessionId, host, port, username, password, domain, screenSize]);

  const getScaledCoords = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Scale from CSS pixels to canvas pixels (handles DPI/fractional sizing)
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * sx),
      y: Math.round((e.clientY - rect.top) * sy),
    };
  }, []);

  const mouseMoveRaf = useRef<number>(0);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (status !== 'connected') return;
    const { x, y } = getScaledCoords(e);
    if (mouseMoveRaf.current) return;
    mouseMoveRaf.current = requestAnimationFrame(() => {
      mouseMoveRaf.current = 0;
      window.electronAPI.rdpSendMouse(sessionId, x, y, 0, false);
    });
  }, [sessionId, status, getScaledCoords]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (status !== 'connected') return;
    e.preventDefault();
    const { x, y } = getScaledCoords(e);
    window.electronAPI.rdpSendMouse(sessionId, x, y, getMouseButton(e), true);
  }, [sessionId, status, getScaledCoords]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (status !== 'connected') return;
    const { x, y } = getScaledCoords(e);
    window.electronAPI.rdpSendMouse(sessionId, x, y, getMouseButton(e), false);
  }, [sessionId, status, getScaledCoords]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (status !== 'connected') return;
    const { x, y } = getScaledCoords(e);
    const step = Math.abs(e.deltaY) > 0 ? 120 : 0;
    const isNegative = e.deltaY > 0;
    window.electronAPI.rdpSendWheel(sessionId, x, y, step, isNegative, false);
  }, [sessionId, status, getScaledCoords]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (status !== 'connected') return;
    e.preventDefault();
    const mapping = KEY_TO_SCANCODE[e.code];
    if (mapping) {
      window.electronAPI.rdpSendKey(sessionId, mapping[0], true, mapping[1]);
    }
  }, [sessionId, status]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (status !== 'connected') return;
    e.preventDefault();
    const mapping = KEY_TO_SCANCODE[e.code];
    if (mapping) {
      window.electronAPI.rdpSendKey(sessionId, mapping[0], false, mapping[1]);
    }
  }, [sessionId, status]);

  return (
    <div ref={containerRef} style={styles.container}>
      {status === 'connecting' && (
        <div style={styles.overlay}>
          <span style={styles.statusText}>Подключение к RDP {host}:{port}...</span>
        </div>
      )}
      {status === 'error' && (
        <div style={styles.overlay}>
          <span style={{ ...styles.statusText, color: 'var(--accent-red)' }}>
            Ошибка: {errorMsg}
          </span>
        </div>
      )}
      {status === 'disconnected' && (
        <div style={styles.overlay}>
          <span style={{ ...styles.statusText, color: 'var(--accent-amber)' }}>
            Отключено
          </span>
        </div>
      )}
      {screenSize && (
        <canvas
          ref={canvasRef}
          width={screenSize.w}
          height={screenSize.h}
          style={styles.canvas}
          tabIndex={0}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: '#000',
    overflow: 'hidden',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
    outline: 'none',
    cursor: 'default',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10, 10, 15, 0.9)',
    zIndex: 10,
  },
  statusText: {
    color: 'var(--accent-cyan)',
    fontSize: 14,
    fontFamily: 'var(--font-mono)',
  },
};
