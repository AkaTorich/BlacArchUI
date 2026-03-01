import React from 'react';
import { Minus, Square, X, Monitor } from 'lucide-react';
import { VNCViewer } from './VNCViewer';
import { RDPViewer } from './RDPViewer';

interface RemoteDesktopWindowProps {
  sessionId: string;
  type: 'vnc' | 'rdp';
  host: string;
  port: number;
  title: string;
  username?: string;
  password?: string;
  domain?: string;
  encryption?: 'auto' | 'none' | 'encrypted';
}

export function RemoteDesktopWindow({
  sessionId, type, host, port, title, username, password, domain, encryption,
}: RemoteDesktopWindowProps) {
  return (
    <div style={styles.container}>
      <div style={styles.titleBar}>
        <div style={styles.dragRegion}>
          <Monitor size={14} color={type === 'vnc' ? '#b347d9' : '#2196f3'} />
          <span style={styles.badge}>{type.toUpperCase()}</span>
          <span style={styles.title}>{title}</span>
        </div>
        <div style={styles.controls}>
          <button style={styles.controlBtn} onClick={() => window.electronAPI.windowMinimize()}>
            <Minus size={14} />
          </button>
          <button style={styles.controlBtn} onClick={() => window.electronAPI.windowMaximize()}>
            <Square size={12} />
          </button>
          <button
            style={{ ...styles.controlBtn, ...styles.closeBtn }}
            onClick={() => window.electronAPI.closeChildWindow()}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div style={styles.viewerArea}>
        {type === 'vnc' ? (
          <VNCViewer
            sessionId={sessionId}
            host={host}
            port={port}
            username={username}
            password={password}
            encryption={encryption}
          />
        ) : (
          <RDPViewer
            sessionId={sessionId}
            host={host}
            port={port}
            username={username || ''}
            password={password || ''}
            domain={domain}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    background: '#0a0a0f',
    overflow: 'hidden',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    minHeight: 32,
    background: '#08080d',
    borderBottom: '1px solid var(--border-color)',
    userSelect: 'none',
    WebkitAppRegion: 'drag' as any,
  },
  dragRegion: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: 3,
    background: 'rgba(255,255,255,0.08)',
    color: '#8888a0',
    fontFamily: "'JetBrains Mono', monospace",
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: '#8888a0',
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    WebkitAppRegion: 'no-drag' as any,
  },
  controlBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 32,
    border: 'none',
    background: 'transparent',
    color: '#8888a0',
    cursor: 'pointer',
  },
  closeBtn: {
    color: '#8888a0',
  },
  viewerArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0,
  },
};
