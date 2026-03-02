import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  File,
  FileText,
  ArrowUp,
  RefreshCw,
  Upload,
  X,
  FolderPlus,
} from 'lucide-react';
import type { SftpFileEntry } from '../../types/electron';

interface FileBrowserProps {
  connectionId: string;
  connectionLabel: string;
  onClose: () => void;
}

interface CtxMenuState {
  visible: boolean;
  x: number;
  y: number;
  entry: SftpFileEntry | null;
}

export function FileBrowser({ connectionId, connectionLabel, onClose }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('/');
  const [entries, setEntries] = useState<SftpFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>({ visible: false, x: 0, y: 0, entry: null });
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const loadDir = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError('');
    try {
      const list = await window.electronAPI.sftpList(connectionId, dirPath);
      setEntries(list);
      setCurrentPath(dirPath);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    loadDir('/');
  }, [loadDir]);

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  useEffect(() => {
    if (creatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [creatingFolder]);

  const navigate = useCallback((name: string) => {
    const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    loadDir(newPath);
  }, [currentPath, loadDir]);

  const goUp = useCallback(() => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    loadDir('/' + parts.join('/'));
  }, [currentPath, loadDir]);

  const hideCtx = useCallback(() => {
    setCtxMenu({ visible: false, x: 0, y: 0, entry: null });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: SftpFileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, entry });
  }, []);

  const handleBgContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, entry: null });
  }, []);

  const fullPath = (name: string) =>
    currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;

  const handleCopyPath = useCallback(() => {
    if (ctxMenu.entry) {
      navigator.clipboard.writeText(fullPath(ctxMenu.entry.name));
    }
    hideCtx();
  }, [ctxMenu.entry, currentPath, hideCtx]);

  const handleRenameStart = useCallback(() => {
    if (ctxMenu.entry) {
      setRenaming(ctxMenu.entry.name);
      setRenameValue(ctxMenu.entry.name);
    }
    hideCtx();
  }, [ctxMenu.entry, hideCtx]);

  const handleRenameConfirm = useCallback(async () => {
    if (!renaming || !renameValue || renaming === renameValue) {
      setRenaming(null);
      return;
    }
    try {
      await window.electronAPI.sftpRename(connectionId, fullPath(renaming), fullPath(renameValue));
      await loadDir(currentPath);
    } catch (err: any) {
      setError(err.message);
    }
    setRenaming(null);
  }, [renaming, renameValue, connectionId, currentPath, loadDir]);

  const handleDelete = useCallback(async () => {
    if (!ctxMenu.entry) return;
    const entry = ctxMenu.entry;
    hideCtx();
    const confirmed = confirm(`Удалить "${entry.name}"?`);
    if (!confirmed) return;
    try {
      await window.electronAPI.sftpDelete(connectionId, fullPath(entry.name), entry.type === 'directory');
      await loadDir(currentPath);
    } catch (err: any) {
      setError(err.message);
    }
  }, [ctxMenu.entry, connectionId, currentPath, loadDir, hideCtx]);

  const handleDownload = useCallback(async () => {
    if (!ctxMenu.entry || ctxMenu.entry.type === 'directory') return;
    hideCtx();
    try {
      await window.electronAPI.sftpDownload(connectionId, fullPath(ctxMenu.entry.name));
    } catch (err: any) {
      setError(err.message);
    }
  }, [ctxMenu.entry, connectionId, currentPath, hideCtx]);

  const handleUpload = useCallback(async () => {
    hideCtx();
    try {
      const uploaded = await window.electronAPI.sftpUpload(connectionId, currentPath);
      if (uploaded) await loadDir(currentPath);
    } catch (err: any) {
      setError(err.message);
    }
  }, [connectionId, currentPath, loadDir, hideCtx]);

  const handleNewFolder = useCallback(() => {
    hideCtx();
    setCreatingFolder(true);
    setNewFolderName('');
  }, [hideCtx]);

  const handleNewFolderConfirm = useCallback(async () => {
    if (!newFolderName) {
      setCreatingFolder(false);
      return;
    }
    try {
      await window.electronAPI.sftpMkdir(connectionId, fullPath(newFolderName));
      await loadDir(currentPath);
    } catch (err: any) {
      setError(err.message);
    }
    setCreatingFolder(false);
  }, [newFolderName, connectionId, currentPath, loadDir]);

  const handleDoubleClick = useCallback((entry: SftpFileEntry) => {
    if (entry.type === 'directory') {
      navigate(entry.name);
    } else {
      window.electronAPI.sftpDownload(connectionId, fullPath(entry.name));
    }
  }, [navigate, connectionId, currentPath]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} K`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} M`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} G`;
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>{connectionLabel}</span>
        <div style={styles.headerActions}>
          <IconBtn title="Загрузить файл" onClick={handleUpload}><Upload size={13} /></IconBtn>
          <IconBtn title="Новая папка" onClick={handleNewFolder}><FolderPlus size={13} /></IconBtn>
          <IconBtn title="Обновить" onClick={() => loadDir(currentPath)}><RefreshCw size={13} /></IconBtn>
          <IconBtn title="Закрыть" onClick={onClose}><X size={13} /></IconBtn>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div style={styles.breadcrumbs}>
        <IconBtn title="Вверх" onClick={goUp}><ArrowUp size={12} /></IconBtn>
        <span style={styles.crumb} onClick={() => loadDir('/')}>/</span>
        {breadcrumbs.map((part, i) => (
          <React.Fragment key={i}>
            <span style={styles.crumb} onClick={() => loadDir('/' + breadcrumbs.slice(0, i + 1).join('/'))}>
              {part}
            </span>
            {i < breadcrumbs.length - 1 && <span style={styles.crumbSep}>/</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}

      {/* File list */}
      <div style={styles.fileList} onContextMenu={handleBgContextMenu}>
        {loading ? (
          <div style={styles.empty}>Загрузка...</div>
        ) : entries.length === 0 ? (
          <div style={styles.empty}>Пусто</div>
        ) : (
          <>
            {creatingFolder && (
              <div style={styles.fileRow}>
                <Folder size={14} color="var(--accent-amber)" />
                <input
                  ref={newFolderInputRef}
                  style={styles.renameInput}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={handleNewFolderConfirm}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNewFolderConfirm();
                    if (e.key === 'Escape') setCreatingFolder(false);
                  }}
                  placeholder="Имя папки"
                />
              </div>
            )}
            {entries.map((entry) => (
              <div
                key={entry.name}
                style={styles.fileRow}
                onDoubleClick={() => handleDoubleClick(entry)}
                onContextMenu={(e) => handleContextMenu(e, entry)}
              >
                {entry.type === 'directory' ? (
                  <Folder size={14} color="var(--accent-amber)" />
                ) : entry.name.match(/\.(txt|md|log|conf|cfg|ini|json|xml|yml|yaml|sh|py|js|ts|c|h|cpp|rs|go|java)$/i) ? (
                  <FileText size={14} color="var(--accent-cyan)" />
                ) : (
                  <File size={14} color="var(--text-muted)" />
                )}
                {renaming === entry.name ? (
                  <input
                    ref={renameInputRef}
                    style={styles.renameInput}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameConfirm}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameConfirm();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                  />
                ) : (
                  <>
                    <span style={styles.fileName}>{entry.name}</span>
                    {entry.type === 'file' && (
                      <span style={styles.fileSize}>{formatSize(entry.size)}</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu.visible && (
        <div style={styles.ctxOverlay} onClick={hideCtx} onContextMenu={(e) => e.preventDefault()}>
          <div style={{ ...styles.ctxMenu, left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
            {ctxMenu.entry ? (
              <>
                <CtxButton onClick={handleCopyPath}>Копировать путь</CtxButton>
                <CtxButton onClick={handleRenameStart}>Переименовать</CtxButton>
                {ctxMenu.entry.type !== 'directory' && (
                  <CtxButton onClick={handleDownload}>Скачать</CtxButton>
                )}
                <CtxButton onClick={handleUpload}>Загрузить сюда</CtxButton>
                <CtxButton onClick={handleNewFolder}>Новая папка</CtxButton>
                <div style={styles.ctxSep} />
                <CtxButton onClick={handleDelete} danger>Удалить</CtxButton>
              </>
            ) : (
              <>
                <CtxButton onClick={handleUpload}>Загрузить файл</CtxButton>
                <CtxButton onClick={handleNewFolder}>Новая папка</CtxButton>
                <div style={styles.ctxSep} />
                <CtxButton onClick={() => { hideCtx(); loadDir(currentPath); }}>Обновить</CtxButton>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      style={{
        ...styles.iconBtn,
        background: hovered ? 'rgba(255,255,255,0.08)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function CtxButton({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        display: 'block',
        width: '100%',
        padding: '6px 14px',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: 'none',
        color: danger ? '#ff4444' : '#e0e0e8',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        textAlign: 'left' as const,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 300,
    minWidth: 240,
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-cyan)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: 140,
  },
  headerActions: {
    display: 'flex',
    gap: 2,
  },
  iconBtn: {
    border: 'none',
    borderRadius: 4,
    padding: 4,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '4px 10px',
    borderBottom: '1px solid var(--border-subtle)',
    fontSize: 11,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    flexWrap: 'nowrap' as const,
  },
  crumb: {
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '1px 2px',
    borderRadius: 2,
    whiteSpace: 'nowrap' as const,
  },
  crumbSep: {
    color: 'var(--text-muted)',
    opacity: 0.5,
  },
  error: {
    padding: '4px 10px',
    fontSize: 11,
    color: '#ff4444',
    background: 'rgba(255,0,0,0.05)',
  },
  fileList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '2px 0',
  },
  empty: {
    padding: 20,
    textAlign: 'center' as const,
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--text-primary)',
    transition: 'background 0.1s',
  },
  fileName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  fileSize: {
    fontSize: 10,
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  renameInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--accent-cyan)',
    borderRadius: 3,
    padding: '2px 4px',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
  },
  ctxOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  ctxMenu: {
    position: 'fixed' as const,
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '4px 0',
    minWidth: 160,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    zIndex: 101,
  },
  ctxSep: {
    height: 1,
    margin: '4px 8px',
    background: 'rgba(255,255,255,0.08)',
  },
};
