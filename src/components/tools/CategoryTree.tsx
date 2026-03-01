import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Scan, Target, Wifi, Eye, Search, KeyRound, Lock, Zap, Globe, Network, Radio, ArrowLeftRight, ShieldAlert, Users, Undo2, Binary, Route, Bug, Bot, Flame, Smartphone, Database, Fingerprint, Terminal, FileCode, Cpu, FileSearch, Shield, Siren, Inbox, HardDrive, Bluetooth, Phone, Monitor, Keyboard, Package, PackageOpen, Eraser, LayoutList, Plane, Layers } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { ICategory } from '../../types/tool';

const iconMap: Record<string, React.ReactNode> = {
  'scan': <Scan size={14} />,
  'target': <Target size={14} />,
  'wifi': <Wifi size={14} />,
  'eye': <Eye size={14} />,
  'search': <Search size={14} />,
  'key-round': <KeyRound size={14} />,
  'lock': <Lock size={14} />,
  'zap': <Zap size={14} />,
  'globe': <Globe size={14} />,
  'network': <Network size={14} />,
  'radio': <Radio size={14} />,
  'arrow-left-right': <ArrowLeftRight size={14} />,
  'shield-alert': <ShieldAlert size={14} />,
  'users': <Users size={14} />,
  'mask': <ShieldAlert size={14} />,
  'undo-2': <Undo2 size={14} />,
  'binary': <Binary size={14} />,
  'door-open': <Route size={14} />,
  'route': <Route size={14} />,
  'bug': <Bug size={14} />,
  'bot': <Bot size={14} />,
  'flame': <Flame size={14} />,
  'smartphone': <Smartphone size={14} />,
  'database': <Database size={14} />,
  'fingerprint': <Fingerprint size={14} />,
  'terminal': <Terminal size={14} />,
  'file-code': <FileCode size={14} />,
  'cpu': <Cpu size={14} />,
  'file-search': <FileSearch size={14} />,
  'shield': <Shield size={14} />,
  'siren': <Siren size={14} />,
  'inbox': <Inbox size={14} />,
  'hard-drive': <HardDrive size={14} />,
  'chip': <Cpu size={14} />,
  'bluetooth': <Bluetooth size={14} />,
  'nfc': <Radio size={14} />,
  'phone': <Phone size={14} />,
  'monitor': <Monitor size={14} />,
  'keyboard': <Keyboard size={14} />,
  'package': <Package size={14} />,
  'package-open': <PackageOpen size={14} />,
  'eraser': <Eraser size={14} />,
  'layout-list': <LayoutList size={14} />,
  'plane': <Plane size={14} />,
  'layers': <Layers size={14} />,
};

function CategoryItem({ category }: { category: ICategory }) {
  const { state, dispatch } = useAppContext();
  const isSelected = state.selectedCategory === category.id;

  const handleClick = async () => {
    if (isSelected) {
      dispatch({ type: 'SELECT_CATEGORY', payload: null });
      dispatch({ type: 'SET_FILTERED_TOOLS', payload: state.tools });
    } else {
      dispatch({ type: 'SELECT_CATEGORY', payload: category.id });
      const tools = await window.electronAPI.getToolsByCategory(category.id);
      dispatch({ type: 'SET_FILTERED_TOOLS', payload: tools });
    }
    dispatch({ type: 'SET_SEARCH', payload: '' });
  };

  return (
    <div
      style={{
        ...styles.categoryItem,
        ...(isSelected ? styles.categoryActive : {}),
      }}
      onClick={handleClick}
      title={category.description}
    >
      <span style={styles.categoryIcon}>
        {isSelected ? <ChevronDown size={12} color="var(--accent-green)" /> : <ChevronRight size={12} color="var(--text-muted)" />}
      </span>
      <span style={{ ...styles.catIcon, color: isSelected ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>
        {iconMap[category.icon] || <Layers size={14} />}
      </span>
      <span style={{
        ...styles.categoryName,
        color: isSelected ? 'var(--accent-green)' : 'var(--text-primary)',
      }}>
        {category.nameRu}
      </span>
      {(category.toolCount ?? 0) > 0 && (
        <span style={styles.badge}>{category.toolCount}</span>
      )}
    </div>
  );
}

export function CategoryTree() {
  const { state } = useAppContext();

  return (
    <div style={styles.tree}>
      <div style={styles.header}>
        <span style={styles.headerText}>КАТЕГОРИИ</span>
      </div>
      <div style={styles.list}>
        {state.categories.map((cat) => (
          <CategoryItem key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tree: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '10px 14px 6px',
  },
  headerText: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '1.5px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 4px 8px',
  },
  categoryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
    fontSize: 'var(--font-size-sm)',
  },
  categoryActive: {
    background: 'var(--bg-hover)',
  },
  categoryIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  catIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  categoryName: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    padding: '1px 6px',
    borderRadius: 8,
    fontSize: 'var(--font-size-xs)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
};
