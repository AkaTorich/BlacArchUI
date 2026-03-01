import React, { useState, useCallback } from 'react';
import { Plus, X, ExternalLink, Terminal as TerminalIcon } from 'lucide-react';
import { TerminalPanel } from './TerminalPanel';

interface TabInfo {
  id: string;
  title: string;
  command?: string;
  sshConnectionId?: string;
  skipKill?: boolean;
}

let tabCounter = 0;

function createTab(opts?: { command?: string; sshConnectionId?: string; title?: string }): TabInfo {
  tabCounter++;
  return {
    id: `term-${tabCounter}-${Date.now()}`,
    title: opts?.title || (opts?.command ? opts.command.split(' ')[0] : `Terminal ${tabCounter}`),
    command: opts?.command,
    sshConnectionId: opts?.sshConnectionId,
  };
}

export function TerminalTabs() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const addTab = useCallback((commandOrOpts?: string | { command?: string; sshConnectionId?: string; title?: string }) => {
    let tab: TabInfo;
    if (typeof commandOrOpts === 'string') {
      tab = createTab({ command: commandOrOpts });
    } else {
      tab = createTab(commandOrOpts);
    }
    setTabs((prev) => [...prev, tab]);
    setActiveTab(tab.id);
    setIsExpanded(true);
  }, []);

  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      if (activeTab === tabId) {
        setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      if (newTabs.length === 0) {
        setIsExpanded(false);
      }
      return newTabs;
    });
  }, [activeTab]);

  const popoutTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Mark tab to skip kill on unmount, then remove it
    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, skipKill: true } : t));

    // Open in new window — pass existing terminal info
    window.electronAPI.openTerminalWindow({
      terminalId: tab.id,
      title: tab.title,
      command: tab.command,
      sshConnectionId: tab.sshConnectionId,
    });

    // Remove tab from this panel after a tick (so skipKill prop propagates)
    setTimeout(() => {
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        if (activeTab === tabId) {
          setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        }
        if (newTabs.length === 0) {
          setIsExpanded(false);
        }
        return newTabs;
      });
    }, 100);
  }, [tabs, activeTab]);

  // Expose addTab globally
  React.useEffect(() => {
    (window as any).__addTerminalTab = addTab;
    return () => {
      delete (window as any).__addTerminalTab;
    };
  }, [addTab]);

  return (
    <div style={{
      ...styles.container,
      height: isExpanded ? 300 : 36,
    }}>
      <div style={styles.tabBar}>
        <div style={styles.tabBarLeft}>
          <TerminalIcon size={13} color="var(--accent-green)" />
          <span style={styles.tabBarTitle} onClick={() => {
            if (tabs.length > 0) setIsExpanded(!isExpanded);
          }}>
            ТЕРМИНАЛ
          </span>
        </div>
        <div style={styles.tabList}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => {
                setActiveTab(tab.id);
                setIsExpanded(true);
              }}
            >
              <span style={styles.tabTitle}>{tab.title}</span>
              <button
                style={styles.popoutBtn}
                onClick={(e) => popoutTab(tab.id, e)}
                title="Открыть в отдельном окне"
              >
                <ExternalLink size={10} />
              </button>
              <button
                style={styles.tabClose}
                onClick={(e) => closeTab(tab.id, e)}
                title="Закрыть"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <button
          style={styles.addBtn}
          onClick={() => addTab()}
          title="Новый терминал"
        >
          <Plus size={14} />
        </button>
      </div>

      {isExpanded && (
        <div style={styles.terminalArea}>
          {tabs.map((tab) => (
            <TerminalPanel
              key={tab.id}
              terminalId={tab.id}
              command={tab.command}
              sshConnectionId={tab.sshConnectionId}
              isActive={activeTab === tab.id}
              skipKillOnUnmount={tab.skipKill}
            />
          ))}
          {tabs.length === 0 && (
            <div style={styles.empty}>
              <span style={styles.emptyText}>
                Нажмите + для создания нового терминала
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    transition: 'height 0.2s ease',
    overflow: 'hidden',
    flexShrink: 0,
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    height: 36,
    minHeight: 36,
    padding: '0 12px',
    gap: 8,
    borderBottom: '1px solid var(--border-color)',
    background: '#08080d',
  },
  tabBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  tabBarTitle: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '1px',
    cursor: 'pointer',
  },
  tabList: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    overflow: 'hidden',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    transition: 'background var(--transition-fast)',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    background: 'var(--bg-hover)',
    color: 'var(--accent-green)',
  },
  tabTitle: {
    maxWidth: 100,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  popoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-amber)',
    cursor: 'pointer',
    padding: 2,
    borderRadius: 2,
  },
  tabClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 2,
    borderRadius: 2,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    flexShrink: 0,
  },
  terminalArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
};
