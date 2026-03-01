import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { ToolCard } from './ToolCard';
import { Package } from 'lucide-react';

export function ToolList() {
  const { state } = useAppContext();

  if (state.isLoading) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyText}>Загрузка утилит...</span>
      </div>
    );
  }

  if (state.filteredTools.length === 0) {
    return (
      <div style={styles.empty}>
        <Package size={32} color="var(--text-muted)" />
        <span style={styles.emptyText}>Утилиты не найдены</span>
        <span style={styles.emptyHint}>Попробуйте другой запрос или категорию</span>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      <div style={styles.header}>
        <span style={styles.count}>
          {state.filteredTools.length} {getToolsWord(state.filteredTools.length)}
          {state.selectedCategory && ` в категории`}
        </span>
      </div>
      <div style={styles.scrollArea}>
        {state.filteredTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function getToolsWord(count: number): string {
  const n = count % 100;
  if (n >= 11 && n <= 14) return 'утилит';
  const last = n % 10;
  if (last === 1) return 'утилита';
  if (last >= 2 && last <= 4) return 'утилиты';
  return 'утилит';
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-color)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
  },
  count: {
    textTransform: 'uppercase',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 8,
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-md)',
  },
  emptyHint: {
    color: 'var(--text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
};
