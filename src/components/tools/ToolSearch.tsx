import React from 'react';
import { Search } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export function ToolSearch() {
  const { state, dispatch } = useAppContext();

  const handleSearch = async (query: string) => {
    dispatch({ type: 'SET_SEARCH', payload: query });

    if (!query.trim()) {
      if (state.selectedCategory) {
        const tools = await window.electronAPI.getToolsByCategory(state.selectedCategory);
        dispatch({ type: 'SET_FILTERED_TOOLS', payload: tools });
      } else {
        dispatch({ type: 'SET_FILTERED_TOOLS', payload: state.tools });
      }
      return;
    }

    const results = await window.electronAPI.searchTools(query);
    dispatch({ type: 'SET_FILTERED_TOOLS', payload: results });
  };

  return (
    <div style={styles.searchContainer}>
      <Search size={14} color="var(--text-muted)" style={styles.icon} />
      <input
        type="text"
        placeholder="Поиск утилит..."
        value={state.searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        style={styles.input}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    margin: '8px 10px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 4,
    transition: 'border-color var(--transition-fast)',
  },
  icon: {
    flexShrink: 0,
    marginRight: 8,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
  },
};
