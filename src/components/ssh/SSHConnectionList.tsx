import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Plus, Trash2, Server, Terminal, ExternalLink, Monitor } from 'lucide-react';
import { ISSHConnectionConfig } from '../../types/ssh';
import { SSHConnectionDialog } from './SSHConnectionDialog';
import { RemoteConnectionDialog } from '../remote/RemoteConnectionDialog';

export function SSHConnectionList() {
  const [connections, setConnections] = useState<ISSHConnectionConfig[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [showDialog, setShowDialog] = useState(false);
  const [reconnectConfig, setReconnectConfig] = useState<ISSHConnectionConfig | null>(null);
  const [remoteDialog, setRemoteDialog] = useState<{ type: 'vnc' | 'rdp'; host: string } | null>(null);

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

  const handleDialogConnect = (config: ISSHConnectionConfig) => {
    setShowDialog(false);
    setReconnectConfig(null);
    setConnectedIds((prev) => new Set(prev).add(config.id));
    loadConnections();
    openSSHTerminal(config.id, config.label);
  };

  const handleReconnect = (conn: ISSHConnectionConfig) => {
    if (connectedIds.has(conn.id)) {
      openSSHTerminal(conn.id, conn.label);
      return;
    }
    // Open dialog pre-filled with saved config so user can enter password
    setReconnectConfig(conn);
  };

  const openSSHTerminal = (connectionId: string, label: string) => {
    const addTab = (window as any).__addTerminalTab;
    if (addTab) {
      addTab({
        sshConnectionId: connectionId,
        title: `SSH: ${label}`,
      });
    }
  };

  const openSSHInWindow = (conn: ISSHConnectionConfig) => {
    const terminalId = `term-ssh-${Date.now()}`;
    window.electronAPI.openTerminalWindow({
      terminalId,
      title: `SSH: ${conn.label}`,
      sshConnectionId: conn.id,
    });
  };

  const openRemoteDesktop = (conn: ISSHConnectionConfig, type: 'vnc' | 'rdp') => {
    setRemoteDialog({ type, host: conn.host });
  };

  const handleRemoteConnect = (config: { host: string; port: number; username: string; password: string; domain: string }) => {
    if (!remoteDialog) return;
    const sessionId = `${remoteDialog.type}-${Date.now()}`;
    const title = `${remoteDialog.type.toUpperCase()}: ${config.host}`;
    window.electronAPI.openRemoteWindow({
      sessionId,
      type: remoteDialog.type,
      host: config.host,
      port: config.port,
      title,
      username: config.username || undefined,
      password: config.password || undefined,
      domain: config.domain || undefined,
    });
    setRemoteDialog(null);
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
        <div style={styles.headerActions}>
          <button style={styles.addBtn} onClick={() => window.electronAPI.openSSHListWindow()} title="Открыть в отдельном окне">
            <ExternalLink size={12} />
          </button>
          <button style={styles.addBtn} onClick={() => setShowDialog(true)} title="Новое подключение">
            <Plus size={13} />
          </button>
        </div>
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
            const isConnecting = false;
            return (
              <div key={conn.id} style={styles.item}>
                <div
                  style={styles.itemInfo}
                  onClick={() => handleReconnect(conn)}
                  title={isConnected ? 'Открыть терминал' : 'Подключиться'}
                >
                  <span style={{
                    ...styles.dot,
                    background: isConnecting ? 'var(--accent-amber)' : isConnected ? 'var(--accent-green)' : 'var(--text-muted)',
                    boxShadow: isConnected ? 'var(--glow-green)' : 'none',
                  }} />
                  <span style={{
                    ...styles.itemLabel,
                    color: isConnected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}>
                    {isConnecting ? `${conn.label}...` : conn.label}
                  </span>
                </div>
                <div style={styles.itemActions}>
                  {isConnected && (
                    <>
                      <button
                        style={styles.actionBtn}
                        onClick={() => openSSHTerminal(conn.id, conn.label)}
                        title="Открыть терминал"
                      >
                        <Terminal size={12} color="var(--accent-green)" />
                      </button>
                      <button
                        style={styles.actionBtn}
                        onClick={() => openSSHInWindow(conn)}
                        title="Терминал в новом окне"
                      >
                        <ExternalLink size={12} color="var(--accent-amber)" />
                      </button>
                      <button
                        style={styles.actionBtn}
                        onClick={() => handleDisconnect(conn.id)}
                        title="Отключиться"
                      >
                        <WifiOff size={12} color="var(--accent-red)" />
                      </button>
                    </>
                  )}
                  {!isConnected && (
                    <button
                      style={styles.actionBtn}
                      onClick={() => handleReconnect(conn)}
                      title="Подключиться"
                    >
                      <Wifi size={12} color="var(--accent-cyan)" />
                    </button>
                  )}
                  <button
                    style={styles.actionBtn}
                    onClick={() => openRemoteDesktop(conn, 'rdp')}
                    title="RDP подключение"
                  >
                    <Monitor size={12} color="var(--accent-blue)" />
                  </button>
                  <button
                    style={styles.actionBtn}
                    onClick={() => openRemoteDesktop(conn, 'vnc')}
                    title="VNC подключение"
                  >
                    <Monitor size={12} color="var(--accent-purple)" />
                  </button>
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

      {(showDialog || reconnectConfig) && (
        <SSHConnectionDialog
          onClose={() => { setShowDialog(false); setReconnectConfig(null); }}
          onConnect={handleDialogConnect}
          initialConfig={reconnectConfig || undefined}
        />
      )}

      {remoteDialog && (
        <RemoteConnectionDialog
          type={remoteDialog.type}
          host={remoteDialog.host}
          onClose={() => setRemoteDialog(null)}
          onConnect={handleRemoteConnect}
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
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
    cursor: 'pointer',
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
