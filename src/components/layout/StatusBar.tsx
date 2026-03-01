import React from 'react';
import { Monitor, Database } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export function StatusBar() {
  const { state } = useAppContext();

  return (
    <div style={styles.statusBar}>
      <div style={styles.left}>
        <div style={styles.item}>
          <Monitor size={12} color="var(--accent-green)" />
          <span style={styles.dot} />
          <span>Локальный режим</span>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.item}>
          <Database size={12} color="var(--accent-cyan)" />
          <span>{state.tools.length} утилит загружено</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 'var(--statusbar-height)',
    padding: '0 12px',
    background: '#08080d',
    borderTop: '1px solid var(--border-color)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent-green)',
    boxShadow: 'var(--glow-green)',
  },
};
