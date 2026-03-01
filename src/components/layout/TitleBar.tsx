import React from 'react';
import { Shield, Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  return (
    <div style={styles.titleBar}>
      <div style={styles.dragRegion}>
        <div style={styles.logo}>
          <Shield size={16} color="#00ff41" />
          <span style={styles.title}>BlacArch<span style={styles.titleAccent}>UI</span></span>
        </div>
      </div>
      <div style={styles.controls}>
        <button
          style={styles.controlBtn}
          onClick={() => window.electronAPI.windowMinimize()}
          title="Свернуть"
        >
          <Minus size={14} />
        </button>
        <button
          style={styles.controlBtn}
          onClick={() => window.electronAPI.windowMaximize()}
          title="Развернуть"
        >
          <Square size={12} />
        </button>
        <button
          style={{ ...styles.controlBtn, ...styles.closeBtn }}
          onClick={() => window.electronAPI.windowClose()}
          title="Закрыть"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 'var(--titlebar-height)',
    background: '#08080d',
    borderBottom: '1px solid var(--border-color)',
    userSelect: 'none',
    WebkitAppRegion: 'drag' as any,
  },
  dragRegion: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 12,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '0.5px',
  },
  titleAccent: {
    color: 'var(--accent-green)',
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
    width: 46,
    height: 'var(--titlebar-height)',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  },
  closeBtn: {
    color: 'var(--text-secondary)',
  },
};
