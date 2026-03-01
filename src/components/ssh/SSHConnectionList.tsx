import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Plus, Trash2, Server } from 'lucide-react';
import { ISSHConnectionConfig } from '../../types/ssh';
import { SSHConnectionDialog } from './SSHConnectionDialog';

export function SSHConnectionList() {
  const [connections, setConnections] = useState<ISSHConnectionConfig[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [showDialog, setShowDialog] = useState(false);

  const loadConnections = async () => {
    const saved = await window.electronAPI.sshGetSaved();
    setConnections(saved);

    const statuses = new Set<string>();
    for (const conn of saved) {
      const connected = await window.electronAPI.sshIsConnected(conn.id);
      if (connected) statuses.add(conn.id);
    }
    setConnectedIds(statuses);
  };

  useEffect(() => {
    loadConnections();

    const cleanup = window.electronAPI.onSSHDisconnected((id) => {
      setConnectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });

    return cleanup;
  }, []);

  const handleConnect = (config: ISSHConnectionConfig) => {
    setShowDialog(false);
    setConnectedIds((prev) => new Set(prev).add(config.id));
    loadConnections();

    // Open SSH terminal tab
    const addTab = (window as any).__addTerminalTab;
    if (addTab) {
      addTab({
        sshConnectionId: config.id,
        title: `SSH: ${config.label}`,
      });
    }
  };

  const handleDisconnect = async (id: string) => {
    await window.electronAPI.sshDisconnect(id);
    setConnectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (connectedIds.has(id)) {
      await window.electronAPI.sshDisconnect(id);
    }
    await window.electronAPI.sshDeleteSaved(id);
    loadConnections();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerText}>SSH</span>
        <button style={styles.addBtn} onClick={() => setShowDialog(true)} title="Новое подключение">
          <Plus size={13} />
        </button>
      </div>

      <div style={styles.list}>
        {connections.length === 0 ? (
          <div style={styles.empty}>
            <Server size={14} color="var(--text-muted)" />
            <span style={styles.emptyText}>Нет подключений</span>
          </div>
        ) : (
          connections.map((conn) => {
            const isConnected = connectedIds.has(conn.id);
            return (
              <div key={conn.id} style={styles.item}>
                <div style={styles.itemInfo}>
                  <span style={{
                    ...styles.dot,
                    background: isConnected ? 'var(--accent-green)' : 'var(--text-muted)',
                    boxShadow: isConnected ? 'var(--glow-green)' : 'none',
                  }} />
                  <span style={styles.itemLabel}>{conn.label}</span>
                </div>
                <div style={styles.itemActions}>
                  {isConnected ? (
                    <button
                      style={styles.actionBtn}
                      onClick={() => handleDisconnect(conn.id)}
                      title="Отключиться"
                    >
                      <WifiOff size={12} color="var(--accent-red)" />
                    </button>
                  ) : null}
                  <button
                    style={styles.actionBtn}
                    onClick={() => handleDelete(conn.id)}
                    title="Удалить"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showDialog && (
        <SSHConnectionDialog
          onClose={() => setShowDialog(false)}
          onConnect={handleConnect}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: '1px solid var(--border-color)',
    padding: '0 0 4px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px 4px',
  },
  headerText: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '1.5px',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 2,
    borderRadius: 4,
  },
  list: {
    padding: '0 8px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
  },
  emptyText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-muted)',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 'var(--font-size-xs)',
  },
  itemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    overflow: 'hidden',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  itemLabel: {
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemActions: {
    display: 'flex',
    gap: 2,
    flexShrink: 0,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 3,
    borderRadius: 3,
  },
};
