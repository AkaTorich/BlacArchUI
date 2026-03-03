import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  hasSelection: boolean;
}

interface TerminalPanelProps {
  terminalId: string;
  command?: string;
  sshConnectionId?: string;
  isActive: boolean;
  skipKillOnUnmount?: boolean;
}

export function TerminalPanel({ terminalId, command, sshConnectionId, isActive, skipKillOnUnmount }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const skipKillRef = useRef(false);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, hasSelection: false });

  const hideContextMenu = useCallback(() => {
    setCtxMenu((prev) => prev.visible ? { ...prev, visible: false } : prev);
  }, []);

  // Update ref when prop changes
  skipKillRef.current = !!skipKillOnUnmount;

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous terminal if exists (StrictMode remount)
    if (terminalRef.current) {
      terminalRef.current.dispose();
      terminalRef.current = null;
    }

    const terminal = new Terminal({
      theme: {
        background: '#0a0a0f',
        foreground: '#e0e0e8',
        cursor: '#00ff41',
        cursorAccent: '#0a0a0f',
        selectionBackground: 'rgba(0, 255, 65, 0.2)',
        black: '#0a0a0f',
        red: '#ff0040',
        green: '#00ff41',
        yellow: '#ffb700',
        blue: '#2196f3',
        magenta: '#b347d9',
        cyan: '#0abdc6',
        white: '#e0e0e8',
        brightBlack: '#555570',
        brightRed: '#ff4070',
        brightGreen: '#33ff6b',
        brightYellow: '#ffc733',
        brightBlue: '#5bafff',
        brightMagenta: '#cf7eff',
        brightCyan: '#33d6df',
        brightWhite: '#ffffff',
      },
      fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      rightClickSelectsWord: false,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Ctrl+Shift+C = copy selection to clipboard
    terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C' && e.type === 'keydown') {
        const sel = terminal.getSelection();
        if (sel) navigator.clipboard.writeText(sel);
        return false;
      }
      return true;
    });

    // Context menu on right-click — attach directly to xterm's root element
    const xtermEl = terminal.element;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setCtxMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        hasSelection: !!terminal.getSelection(),
      });
      return false;
    };
    if (xtermEl) {
      xtermEl.addEventListener('contextmenu', onContextMenu);
    }
    // Also on the container as fallback
    containerRef.current.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });

    // Listen for data FIRST, before opening any shell
    const cleanupData = window.electronAPI.onPtyData((id, data) => {
      if (id === terminalId) {
        terminal.write(data);
      }
    });

    const cleanupExit = window.electronAPI.onPtyExit((id, exitCode) => {
      if (id === terminalId) {
        terminal.write(`\r\n\x1b[90m[Сессия завершена (код ${exitCode})]\x1b[0m\r\n`);
      }
    });

    const safeFit = () => {
      try { fitAddon.fit(); } catch (_) { /* container not sized yet */ }
    };

    // Fit after a short delay to ensure container is sized
    const initTimer = setTimeout(() => {
      safeFit();

      if (sshConnectionId) {
        // SSH mode
        window.electronAPI.sshOpenShell(sshConnectionId, terminalId)
          .then(async (result: any) => {
            if (result?.reused) {
              // Replay saved output buffer
              const buf = await window.electronAPI.sshGetBuffer(terminalId);
              if (buf) terminal.write(buf);
            } else {
              if (command) {
                setTimeout(() => {
                  window.electronAPI.sshWriteToShell(sshConnectionId, terminalId, command + '\n');
                }, 500);
              }
            }
          })
          .catch((err: any) => {
            terminal.write(`\x1b[31mОшибка: ${err?.message || String(err)}\x1b[0m\r\n`);
          });

        terminal.onData((data) => {
          window.electronAPI.sshWriteToShell(sshConnectionId, terminalId, data);
        });

        terminal.onResize(({ cols, rows }) => {
          window.electronAPI.sshResizeShell(sshConnectionId, terminalId, cols, rows);
        });
      } else {
        // Local mode
        window.electronAPI.ptyCreate(terminalId, command).then(async (result: any) => {
          if (result?.reused) {
            // Replay saved output buffer
            const buf = await window.electronAPI.ptyGetBuffer(terminalId);
            if (buf) terminal.write(buf);
          }
        });

        terminal.onData((data) => {
          window.electronAPI.ptyWrite(terminalId, data);
        });

        terminal.onResize(({ cols, rows }) => {
          window.electronAPI.ptyResize(terminalId, cols, rows);
        });
      }
    }, 150);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      safeFit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(initTimer);
      cleanupData();
      cleanupExit();
      resizeObserver.disconnect();
      xtermEl?.removeEventListener('contextmenu', onContextMenu);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      if (!sshConnectionId && !skipKillRef.current) {
        // Use try-catch: IPC may fail if window is being destroyed
        try {
          window.electronAPI.ptyKill(terminalId).catch(() => {});
        } catch (_) {
          // Window already closing, ignore
        }
      }
    };
  }, [terminalId]);

  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [isActive]);

  const handleCopy = useCallback(() => {
    const sel = terminalRef.current?.getSelection();
    if (sel) navigator.clipboard.writeText(sel);
    hideContextMenu();
  }, [hideContextMenu]);

  const handlePaste = useCallback(() => {
    navigator.clipboard.readText().then((text) => {
      if (text && terminalRef.current) {
        if (sshConnectionId) {
          window.electronAPI.sshWriteToShell(sshConnectionId, terminalId, text);
        } else {
          window.electronAPI.ptyWrite(terminalId, text);
        }
      }
    });
    hideContextMenu();
  }, [hideContextMenu, sshConnectionId, terminalId]);

  const handleSelectAll = useCallback(() => {
    terminalRef.current?.selectAll();
    hideContextMenu();
  }, [hideContextMenu]);

  const handleClear = useCallback(() => {
    terminalRef.current?.clear();
    hideContextMenu();
  }, [hideContextMenu]);

  return (
    <div
      style={{
        ...styles.container,
        visibility: isActive ? 'visible' : 'hidden',
        zIndex: isActive ? 1 : 0,
      }}
      onClick={hideContextMenu}
    >
      <div ref={containerRef} style={styles.terminalArea} />

      {ctxMenu.visible && (
        <div
          style={{
            ...styles.ctxOverlay,
          }}
          onClick={hideContextMenu}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            style={{
              ...styles.ctxMenu,
              left: ctxMenu.x,
              top: ctxMenu.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {ctxMenu.hasSelection && (
              <CtxButton onClick={handleCopy}>Копировать</CtxButton>
            )}
            <CtxButton onClick={handlePaste}>Вставить</CtxButton>
            <div style={styles.ctxSep} />
            <CtxButton onClick={handleSelectAll}>Выделить всё</CtxButton>
            <CtxButton onClick={handleClear}>Очистить</CtxButton>
          </div>
        </div>
      )}
    </div>
  );
}

function CtxButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...ctxItemStyle,
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const ctxItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '6px 14px',
  background: 'transparent',
  border: 'none',
  color: '#e0e0e8',
  fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
  textAlign: 'left',
  cursor: 'pointer',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 4,
    background: '#0a0a0f',
  },
  terminalArea: {
    width: '100%',
    height: '100%',
  },
  ctxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  ctxMenu: {
    position: 'fixed',
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
