import React from 'react';
import { Minus, Square, X, Terminal as TerminalIcon } from 'lucide-react';
import { TerminalPanel } from './TerminalPanel';

interface TerminalWindowProps {
  terminalId: string;
  title: string;
  command?: string;
  sshConnectionId?: string;
}

export function TerminalWindow({ terminalId, title, command, sshConnectionId }: TerminalWindowProps) {
  return (
    <div style={styles.container}>
      <div style={styles.titleBar}>
        <div style={styles.dragRegion}>
          <TerminalIcon size={14} color="#00ff41" />
          <span style={styles.title}>{title}</span>
        </div>
        <div style={styles.controls}>
          <button style={styles.controlBtn} onClick={() => window.electronAPI.windowMinimize()}>
            <Minus size={14} />
          </button>
          <button style={styles.controlBtn} onClick={() => window.electronAPI.windowMaximize()}>
            <Square size={12} />
          </button>
          <button style={{ ...styles.controlBtn, ...styles.closeBtn }} onClick={() => window.electronAPI.windowClose()}>
            <X size={14} />
          </button>
        </div>
      </div>
      <div style={styles.terminalArea}>
        <TerminalPanel
          terminalId={terminalId}
          command={command}
          sshConnectionId={sshConnectionId}
          isActive={true}
        />
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
  terminalArea: {
    flex: 1,
    overflow: 'hidden',
  },
};
