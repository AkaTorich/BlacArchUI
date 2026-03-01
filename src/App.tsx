import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { MainPanel } from './components/layout/MainPanel';
import { StatusBar } from './components/layout/StatusBar';
import { TerminalTabs } from './components/terminal/TerminalTabs';
import { TerminalWindow } from './components/terminal/TerminalWindow';
import { SSHListWindow } from './components/ssh/SSHListWindow';
import { RemoteDesktopWindow } from './components/remote/RemoteDesktopWindow';

function AppContent() {
  const { dispatch } = useAppContext();

  useEffect(() => {
    async function loadData() {
      try {
        const [categories, tools] = await Promise.all([
          window.electronAPI.getCategories(),
          window.electronAPI.getTools(),
        ]);
        dispatch({ type: 'SET_CATEGORIES', payload: categories });
        dispatch({ type: 'SET_TOOLS', payload: tools });
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    loadData();
  }, [dispatch]);

  return (
    <div style={styles.app}>
      <TitleBar />
      <div style={styles.body}>
        <Sidebar />
        <div style={styles.mainArea}>
          <MainPanel />
          <TerminalTabs />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}

export function App() {
  // Check if this is a special window
  const params = new URLSearchParams(window.location.search);
  if (params.get('terminalWindow')) {
    const terminalId = params.get('terminalId') || `term-win-${Date.now()}`;
    const title = params.get('title') || 'Terminal';
    const command = params.get('command') || undefined;
    const sshConnectionId = params.get('sshConnectionId') || undefined;

    return (
      <TerminalWindow
        terminalId={terminalId}
        title={title}
        command={command}
        sshConnectionId={sshConnectionId}
      />
    );
  }

  if (params.get('sshListWindow')) {
    return <SSHListWindow />;
  }

  if (params.get('remoteDesktop')) {
    return (
      <RemoteDesktopWindow
        sessionId={params.get('sessionId') || `remote-${Date.now()}`}
        type={(params.get('type') as 'vnc' | 'rdp') || 'vnc'}
        host={params.get('host') || ''}
        port={Number(params.get('port')) || 5900}
        title={params.get('title') || 'Remote Desktop'}
        username={params.get('username') || undefined}
        password={params.get('password') || undefined}
        domain={params.get('domain') || undefined}
        encryption={(params.get('encryption') as 'auto' | 'none' | 'encrypted') || 'auto'}
      />
    );
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: 'var(--bg-primary)',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
};
