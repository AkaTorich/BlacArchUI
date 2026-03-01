import React, { useRef, useEffect, useState } from 'react';
import RFB from '@novnc/novnc/lib/rfb';

interface VNCViewerProps {
  sessionId: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  encryption?: 'auto' | 'none' | 'encrypted';
}

export function VNCViewer({ sessionId, host, port, username, password, encryption = 'auto' }: VNCViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    let rfb: any = null;
    let proxyGeneration: number | undefined;

    async function connect() {
      try {
        const result = await window.electronAPI.vncConnect(sessionId, host, port, password);
        proxyGeneration = result.generation;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;

        console.log(`[VNC] Container size: ${container.offsetWidth}x${container.offsetHeight}`);

        const wsUrl = `ws://127.0.0.1:${result.wsPort}`;
        console.log(`[VNC] Connecting via noVNC to ${wsUrl}`);

        const credentials: Record<string, string> = {};
        if (username) credentials.username = username;
        if (password) credentials.password = password;

        rfb = new RFB(container, wsUrl, {
          credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
        });

        rfbRef.current = rfb;

        rfb.securityFilter = encryption;
        rfb.scaleViewport = true;
        rfb.resizeSession = true;
        rfb.clipViewport = false;
        rfb.background = '#000';
        rfb.qualityLevel = 6;
        rfb.compressionLevel = 2;

        rfb.addEventListener('connect', () => {
          console.log('[VNC] noVNC connected!');
          if (!cancelled) {
            setStatus('connected');
            rfb.focus();
            // Force rescale after connection to fill the container
            setTimeout(() => {
              rfb.scaleViewport = false;
              rfb.scaleViewport = true;
            }, 100);
          }
        });

        rfb.addEventListener('disconnect', (e: any) => {
          console.log('[VNC] noVNC disconnected, clean:', e.detail.clean);
          if (!cancelled) {
            setStatus(e.detail.clean ? 'disconnected' : 'error');
            if (!e.detail.clean) setErrorMsg('Соединение потеряно');
          }
        });

        let credAttempts = 0;
        rfb.addEventListener('credentialsrequired', (e: any) => {
          credAttempts++;
          console.log('[VNC] Credentials required:', e.detail.types, '(attempt', credAttempts + ')');
          if (credAttempts > 2) {
            console.error('[VNC] Too many credential attempts, stopping');
            if (!cancelled) {
              setStatus('error');
              setErrorMsg('Неверные учётные данные');
            }
            try { rfb.disconnect(); } catch (_) {}
            return;
          }
          const creds: Record<string, string> = {};
          if (username) creds.username = username;
          if (password) creds.password = password;
          console.log('[VNC] Sending credentials:', { username: !!username, password: !!password });
          if (Object.keys(creds).length > 0) {
            rfb.sendCredentials(creds);
          } else {
            setStatus('error');
            setErrorMsg('Сервер требует учётные данные');
          }
        });

        rfb.addEventListener('securityfailure', (e: any) => {
          console.error('[VNC] Security failure:', e.detail);
          if (!cancelled) {
            setStatus('error');
            setErrorMsg(e.detail.reason || 'Ошибка аутентификации');
          }
        });

        rfb.addEventListener('desktopname', (e: any) => {
          console.log('[VNC] Desktop name:', e.detail.name);
        });

      } catch (err: any) {
        console.error('[VNC] Connect error:', err);
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(err.message);
        }
      }
    }

    connect();

    // ResizeObserver to rescale noVNC when window/container is resized
    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        const r = rfbRef.current;
        if (r && r.scaleViewport) {
          r.scaleViewport = false;
          r.scaleViewport = true;
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (rfb) {
        try { rfb.disconnect(); } catch (_) {}
      }
      rfbRef.current = null;
      window.electronAPI.vncDisconnect(sessionId, proxyGeneration).catch(() => {});
    };
  }, [sessionId, host, port, password]);

  return (
    <div style={styles.wrapper}>
      {/* noVNC target container — noVNC creates _screen div + canvas inside */}
      <div ref={containerRef} style={styles.rfbTarget} />
      {/* Status overlays — rendered on top when not connected */}
      {status === 'connecting' && (
        <div style={styles.overlay}>
          <span style={styles.statusText}>Подключение к VNC {host}:{port}...</span>
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#000',
  },
  rfbTarget: {
    // noVNC's _screen div uses width:100%, height:100%, display:flex
    // so this container must have explicit dimensions for it to work
    width: '100%',
    height: '100%',
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
    pointerEvents: 'none',
  },
  statusText: {
    color: 'var(--accent-cyan)',
    fontSize: 14,
    fontFamily: 'var(--font-mono)',
  },
};
