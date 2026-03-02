import React from 'react';
import { ToolSearch } from '../tools/ToolSearch';
import { CategoryTree } from '../tools/CategoryTree';
import { SSHConnectionList } from '../ssh/SSHConnectionList';
import { Shield } from 'lucide-react';

interface SidebarProps {
  onOpenFileBrowser?: (connectionId: string, label: string) => void;
}

export function Sidebar({ onOpenFileBrowser }: SidebarProps) {
  return (
    <div style={styles.sidebar}>
      <ToolSearch />
      <CategoryTree />
      <SSHConnectionList onOpenFileBrowser={onOpenFileBrowser} />
      <div style={styles.footer}>
        <Shield size={12} color="var(--accent-green)" />
        <span style={styles.footerText}>BlackArch Tools</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 'var(--sidebar-width)',
    minWidth: 240,
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    height: '100%',
    overflow: 'hidden',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderTop: '1px solid var(--border-color)',
    fontSize: 'var(--font-size-xs)',
  },
  footerText: {
    color: 'var(--text-muted)',
  },
};
