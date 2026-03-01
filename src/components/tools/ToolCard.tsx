import React from 'react';
import { Terminal, ExternalLink } from 'lucide-react';
import { ITool } from '../../types/tool';
import { useAppContext } from '../../context/AppContext';

interface ToolCardProps {
  tool: ITool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const { state, dispatch } = useAppContext();
  const isSelected = state.selectedTool?.id === tool.id;

  return (
    <div
      style={{
        ...styles.card,
        ...(isSelected ? styles.cardSelected : {}),
      }}
      onClick={() => dispatch({ type: 'SELECT_TOOL', payload: tool })}
    >
      <div style={styles.header}>
        <div style={styles.nameRow}>
          <Terminal size={14} color="var(--accent-green)" />
          <span style={styles.name}>{tool.name}</span>
          {tool.version && (
            <span style={styles.version}>v{tool.version}</span>
          )}
        </div>
      </div>
      <div style={styles.description}>{tool.descriptionRu}</div>
      <div style={styles.tags}>
        {tool.categories.slice(0, 3).map((cat) => (
          <span key={cat} style={styles.tag}>
            {cat.replace('blackarch-', '')}
          </span>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  },
  cardSelected: {
    background: 'var(--bg-hover)',
    borderLeft: '2px solid var(--accent-green)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontWeight: 600,
    fontSize: 'var(--font-size-md)',
    color: 'var(--text-primary)',
  },
  version: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    padding: '1px 6px',
    borderRadius: 4,
  },
  description: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: 6,
    lineHeight: 1.4,
  },
  tags: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--accent-cyan)',
    background: 'rgba(10, 189, 198, 0.1)',
    padding: '1px 8px',
    borderRadius: 4,
    border: '1px solid rgba(10, 189, 198, 0.2)',
  },
};
