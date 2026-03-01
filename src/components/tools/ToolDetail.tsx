import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Terminal, ExternalLink, Copy, Check, ChevronLeft, Play, BookOpen, Settings2, Code, Wifi } from 'lucide-react';

export function ToolDetail() {
  const { state, dispatch } = useAppContext();
  const tool = state.selectedTool;

  if (!tool) {
    return (
      <div style={styles.placeholder}>
        <Terminal size={48} color="var(--text-muted)" />
        <div style={styles.placeholderTitle}>Выберите утилиту</div>
        <div style={styles.placeholderHint}>
          Выберите категорию слева и нажмите на утилиту для просмотра справки
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backBtn}
          onClick={() => dispatch({ type: 'SELECT_TOOL', payload: null })}
        >
          <ChevronLeft size={16} />
          Назад
        </button>
      </div>

      {/* Tool Info */}
      <div style={styles.scrollArea}>
        <div style={styles.titleSection}>
          <div style={styles.titleRow}>
            <Terminal size={20} color="var(--accent-green)" />
            <h1 style={styles.toolName}>{tool.name}</h1>
            {tool.version && <span style={styles.version}>v{tool.version}</span>}
          </div>
          <div style={styles.tags}>
            {tool.categories.map((cat) => (
              <span key={cat} style={styles.tag}>{cat.replace('blackarch-', '')}</span>
            ))}
          </div>
          {tool.url && (
            <a href={tool.url} style={styles.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={12} /> {tool.url}
            </a>
          )}
        </div>

        {/* Description */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <BookOpen size={14} /> Описание
          </h2>
          <div style={styles.description}>
            {tool.helpRu || tool.descriptionRu}
          </div>
        </div>

        {/* Command */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <Terminal size={14} /> Команда
          </h2>
          <div style={styles.commandBlock}>
            <code style={styles.command}>$ {tool.command}</code>
            <CopyButton text={tool.command} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              style={styles.runBtn}
              onClick={() => {
                const addTab = (window as any).__addTerminalTab;
                if (addTab) addTab(tool.command);
              }}
            >
              <Play size={14} />
              Локально
            </button>
            <RunViaSSHButton command={tool.command} />
          </div>
        </div>

        {/* Usage Examples */}
        {tool.usageExamples.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <Code size={14} /> Примеры использования
            </h2>
            {tool.usageExamples.map((example, i) => (
              <div key={i} style={styles.example}>
                <div style={styles.exampleTitle}>{example.title}</div>
                <div style={styles.commandBlock}>
                  <code style={styles.command}>$ {example.command}</code>
                  <CopyButton text={example.command} />
                </div>
                <div style={styles.exampleDesc}>{example.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Parameters */}
        {tool.parameters.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <Settings2 size={14} /> Параметры
            </h2>
            <div style={styles.paramsTable}>
              {tool.parameters.map((param, i) => (
                <div key={i} style={styles.paramRow}>
                  <code style={styles.paramFlag}>{param.flag}</code>
                  <span style={styles.paramDesc}>{param.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RunViaSSHButton({ command }: { command: string }) {
  const [sshConnections, setSshConnections] = useState<Array<{ id: string; label: string }>>([]);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    window.electronAPI.sshGetSaved().then(async (conns: any[]) => {
      const active: Array<{ id: string; label: string }> = [];
      for (const c of conns) {
        const connected = await window.electronAPI.sshIsConnected(c.id);
        if (connected) active.push({ id: c.id, label: c.label });
      }
      setSshConnections(active);
    });
  }, []);

  if (sshConnections.length === 0) return null;

  const runOnSSH = (connectionId: string, label: string) => {
    setShowMenu(false);
    const addTab = (window as any).__addTerminalTab;
    if (addTab) {
      addTab({
        sshConnectionId: connectionId,
        title: `SSH: ${command.split(' ')[0]}`,
        command,
      });
    }
  };

  if (sshConnections.length === 1) {
    return (
      <button
        style={styles.runSSHBtn}
        onClick={() => runOnSSH(sshConnections[0].id, sshConnections[0].label)}
      >
        <Wifi size={14} />
        SSH: {sshConnections[0].label}
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button style={styles.runSSHBtn} onClick={() => setShowMenu(!showMenu)}>
        <Wifi size={14} />
        Через SSH
      </button>
      {showMenu && (
        <div style={styles.sshMenu}>
          {sshConnections.map((conn) => (
            <button
              key={conn.id}
              style={styles.sshMenuItem}
              onClick={() => runOnSSH(conn.id, conn.label)}
            >
              {conn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button style={styles.copyBtn} onClick={handleCopy} title="Копировать">
      {copied ? <Check size={12} color="var(--accent-green)" /> : <Copy size={12} />}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 'var(--font-size-lg)',
    color: 'var(--text-secondary)',
  },
  placeholderHint: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
    textAlign: 'center',
    maxWidth: 300,
  },
  header: {
    padding: '8px 16px',
    borderBottom: '1px solid var(--border-color)',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  },
  titleSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid var(--border-color)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  toolName: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  version: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  tags: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--accent-cyan)',
    background: 'rgba(10, 189, 198, 0.1)',
    padding: '2px 10px',
    borderRadius: 4,
    border: '1px solid rgba(10, 189, 198, 0.2)',
  },
  url: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: 'var(--accent-cyan)',
    fontSize: 'var(--font-size-xs)',
    textDecoration: 'none',
    opacity: 0.7,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 'var(--font-size-md)',
    fontWeight: 600,
    color: 'var(--accent-green)',
    marginBottom: 10,
    margin: 0,
    paddingBottom: 6,
    borderBottom: '1px solid var(--border-color)',
  },
  description: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  commandBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 4,
    padding: '8px 12px',
    marginBottom: 4,
  },
  command: {
    color: 'var(--accent-green)',
    fontSize: 'var(--font-size-sm)',
    fontFamily: 'var(--font-mono)',
    wordBreak: 'break-all',
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    flexShrink: 0,
  },
  example: {
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    color: 'var(--accent-amber)',
    marginBottom: 4,
  },
  exampleDesc: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    marginTop: 4,
    paddingLeft: 12,
    borderLeft: '2px solid var(--border-color)',
  },
  paramsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  paramRow: {
    display: 'flex',
    gap: 12,
    padding: '6px 0',
    borderBottom: '1px solid rgba(30, 30, 56, 0.5)',
    alignItems: 'flex-start',
  },
  paramFlag: {
    color: 'var(--accent-purple)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    minWidth: 120,
    flexShrink: 0,
  },
  paramDesc: {
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    lineHeight: 1.4,
  },
  runBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'rgba(0, 255, 65, 0.1)',
    border: '1px solid rgba(0, 255, 65, 0.3)',
    borderRadius: 4,
    color: 'var(--accent-green)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  runSSHBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'rgba(10, 189, 198, 0.1)',
    border: '1px solid rgba(10, 189, 198, 0.3)',
    borderRadius: 4,
    color: 'var(--accent-cyan)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  sshMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: 4,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 100,
    minWidth: 160,
  },
  sshMenuItem: {
    display: 'block',
    width: '100%',
    padding: '8px 14px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
};
