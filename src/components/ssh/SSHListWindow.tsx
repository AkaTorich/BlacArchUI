import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Wifi, WifiOff, Plus, Trash2, Server, Terminal, ExternalLink } from 'lucide-react';
import { ISSHConnectionConfig } from '../../types/ssh';
import { SSHConnectionDialog } from './SSHConnectionDialog';

export function SSHListWindow() {
  const [connections, setConnections] = useState<ISSHConnectionConfig[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [showDialog, setShowDialog] = useState(false);
  const [reconnectConfig, setReconnectConfig] = useState<ISSHConnectionConfig | null>(null);

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
    openSSHInWindow(config);
  };

  const handleReconnect = (conn: ISSHConnectionConfig) => {
    if (connectedIds.has(conn.id)) {
      openSSHInWindow(conn);
      return;
    }
    setReconnectConfig(conn);
  };

  const openSSHInWindow = (conn: ISSHConnectionConfig) => {
    const terminalId = `term-ssh-${Date.now()}`;
    window.electronAPI.openTerminalWindow({
      terminalId,
      title: `SSH: ${conn.label}`,
      sshConnectionId: conn.id,
    });
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
      <div style={styles.titleBar}>
        <div style={styles.dragRegion}>
          <Server size={14} color="var(--accent-cyan)" />
          <span style={styles.titleText}>SSH Подключения</span>
        </div>
        <div style={styles.controls}>
          <button style={styles.controlBtn} onClick={() => window.electronAPI.windowMinimize()}>
            <Minus size={14} />
          </button>
          <button style={styles.controlBtn} onClick={() => window.electronAPI.windowMaximize()}>
            <Square size={12} />
          </button>
          <button style={{ ...styles.controlBtn, ...styles.closeBtnStyle }} onClick={() => window.electronAPI.closeChildWindow()}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.toolbar}>
          <span style={styles.toolbarText}>{connections.length} серверов</span>
          <button style={styles.addBtn} onClick={() => setShowDialog(true)} title="Новое подключение">
            <Plus size={14} />
            <span>Добавить</span>
          </button>
        </div>

        <div style={styles.list}>
          {connections.length === 0 ? (
            <div style={styles.empty}>
              <Server size={24} color="var(--text-muted)" />
              <span style={styles.emptyText}>Нет сохранённых подключений</span>
              <button style={styles.emptyAddBtn} onClick={() => setShowDialog(true)}>
                <Plus size={14} /> Добавить сервер
              </button>
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
                    <div style={styles.itemTextBlock}>
                      <span style={{
                        ...styles.itemLabel,
                        color: isConnected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}>
                        {isConnecting ? `${conn.label}...` : conn.label}
                      </span>
                      <span style={styles.itemHost}>
                        {conn.username}@{conn.host}:{conn.port}
                      </span>
                    </div>
                  </div>
                  <div style={styles.itemActions}>
                    {isConnected && (
                      <>
                        <button
                          style={styles.actionBtn}
                          onClick={() => openSSHInWindow(conn)}
                          title="Открыть терминал"
                        >
                          <Terminal size={14} color="var(--accent-green)" />
                        </button>
                        <button
                          style={styles.actionBtn}
                          onClick={() => handleDisconnect(conn.id)}
                          title="Отключиться"
                        >
                          <WifiOff size={14} color="var(--accent-red)" />
                        </button>
                      </>
                    )}
                    {!isConnected && (
                      <button
                        style={styles.actionBtn}
                        onClick={() => handleReconnect(conn)}
                        title="Подключиться"
                      >
                        <Wifi size={14} color="var(--accent-cyan)" />
                      </button>
                    )}
                    <button
                      style={styles.actionBtn}
                      onClick={() => handleDelete(conn.id)}
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {(showDialog || reconnectConfig) && (
        <SSHConnectionDialog
          onClose={() => { setShowDialog(false); setReconnectConfig(null); }}
          onConnect={handleDialogConnect}
          initialConfig={reconnectConfig || undefined}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    background: 'var(--bg-primary)',
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
  titleText: {
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
  closeBtnStyle: {
    color: '#8888a0',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border-color)',
  },
  toolbarText: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    background: 'rgba(10, 189, 198, 0.1)',
    border: '1px solid rgba(10, 189, 198, 0.3)',
    borderRadius: 4,
    color: 'var(--accent-cyan)',
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
    fontSize: 11,
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 8px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '40px 20px',
  },
  emptyText: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  emptyAddBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    background: 'rgba(10, 189, 198, 0.1)',
    border: '1px solid rgba(10, 189, 198, 0.3)',
    borderRadius: 4,
    color: 'var(--accent-cyan)',
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
    fontSize: 12,
    cursor: 'pointer',
    marginTop: 4,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 6,
    marginBottom: 2,
    transition: 'background 0.15s ease',
  },
  itemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  itemTextBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflow: 'hidden',
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemHost: {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemActions: {
    display: 'flex',
    gap: 4,
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
    padding: 4,
    borderRadius: 4,
  },
};
