import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

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
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

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
        terminal.write('\x1b[36mОткрытие SSH shell...\x1b[0m\r\n');

        window.electronAPI.sshOpenShell(sshConnectionId, terminalId)
          .then(() => {
            if (command) {
              setTimeout(() => {
                window.electronAPI.sshWriteToShell(sshConnectionId, terminalId, command + '\n');
              }, 500);
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
        window.electronAPI.ptyCreate(terminalId, command);

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
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      if (!sshConnectionId && !skipKillRef.current) {
        window.electronAPI.ptyKill(terminalId);
      }
    };
  }, [terminalId]);

  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.container,
        display: isActive ? 'block' : 'none',
      }}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    padding: 4,
    background: '#0a0a0f',
  },
};
