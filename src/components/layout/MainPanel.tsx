import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { ToolList } from '../tools/ToolList';
import { ToolDetail } from '../tools/ToolDetail';

export function MainPanel() {
  const { state } = useAppContext();

  return (
    <div style={styles.main}>
      {state.selectedTool ? (
        <ToolDetail />
      ) : (
        <ToolList />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    height: '100%',
    overflow: 'hidden',
  },
};
