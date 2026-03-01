import React, { useState } from 'react';
import { X, Wifi, Key, Lock } from 'lucide-react';
import { ISSHConnectionConfig } from '../../types/ssh';

interface SSHConnectionDialogProps {
  onClose: () => void;
  onConnect: (config: ISSHConnectionConfig) => void;
  initialConfig?: ISSHConnectionConfig;
}

export function SSHConnectionDialog({ onClose, onConnect, initialConfig }: SSHConnectionDialogProps) {
  const [label, setLabel] = useState(initialConfig?.label || '');
  const [host, setHost] = useState(initialConfig?.host || '');
  const [port, setPort] = useState(String(initialConfig?.port || 22));
  const [username, setUsername] = useState(initialConfig?.username || 'root');
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>(initialConfig?.authMethod || 'password');
  const [password, setPassword] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState(initialConfig?.privateKeyPath || '');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!host.trim()) {
      setError('Укажите хост');
      return;
    }
    if (!username.trim()) {
      setError('Укажите имя пользователя');
      return;
    }

    setError('');
    setConnecting(true);

    const config: ISSHConnectionConfig = {
      id: initialConfig?.id || `ssh-${Date.now()}`,
      label: label.trim() || `${username}@${host}`,
      host: host.trim(),
      port: parseInt(port) || 22,
      username: username.trim(),
      authMethod,
      password: authMethod === 'password' ? password : undefined,
      privateKeyPath: authMethod === 'key' ? privateKeyPath : undefined,
    };

    try {
      await window.electronAPI.sshConnect(config);
      onConnect(config);
    } catch (err: any) {
      const msg = err.message || '';
      let friendlyError = 'Ошибка подключения';
      if (msg.includes('ECONNREFUSED')) {
        friendlyError = `Соединение отклонено: ${host}:${port} — сервер недоступен или SSH не запущен`;
      } else if (msg.includes('ETIMEDOUT') || msg.includes('Timed out')) {
        friendlyError = `Тайм-аут: ${host}:${port} — сервер не отвечает`;
      } else if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
        friendlyError = `Хост не найден: ${host}`;
      } else if (msg.includes('authentication') || msg.includes('Auth')) {
        friendlyError = 'Ошибка аутентификации — неверный пароль или ключ';
      } else if (msg.includes('Connection lost') || msg.includes('handshake')) {
        friendlyError = `Соединение потеряно: ${host}:${port} — SSH-сервер разорвал подключение (проверьте порт и настройки сервера)`;
      } else if (msg.includes('ENETUNREACH')) {
        friendlyError = `Сеть недоступна: ${host}`;
      } else if (msg) {
        friendlyError = msg;
      }
      setError(friendlyError);
      setConnecting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Wifi size={16} color="var(--accent-cyan)" />
            <span>SSH Подключение</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.field}>
            <label style={styles.label}>Название (необязательно)</label>
            <input
              style={styles.input}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Мой сервер"
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 3 }}>
              <label style={styles.label}>Хост</label>
              <input
                style={styles.input}
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Порт</label>
              <input
                style={styles.input}
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="22"
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Пользователь</label>
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="root"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Метод аутентификации</label>
            <div style={styles.authToggle}>
              <button
                style={{
                  ...styles.authBtn,
                  ...(authMethod === 'password' ? styles.authBtnActive : {}),
                }}
                onClick={() => setAuthMethod('password')}
              >
                <Lock size={12} /> Пароль
              </button>
              <button
                style={{
                  ...styles.authBtn,
                  ...(authMethod === 'key' ? styles.authBtnActive : {}),
                }}
                onClick={() => setAuthMethod('key')}
              >
                <Key size={12} /> SSH-ключ
              </button>
            </div>
          </div>

          {authMethod === 'password' ? (
            <div style={styles.field}>
              <label style={styles.label}>Пароль</label>
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
              />
            </div>
          ) : (
            <div style={styles.field}>
              <label style={styles.label}>Путь к приватному ключу</label>
              <input
                style={styles.input}
                value={privateKeyPath}
                onChange={(e) => setPrivateKeyPath(e.target.value)}
                placeholder="~/.ssh/id_rsa"
              />
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button
            style={styles.connectBtn}
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? 'Подключение...' : 'Подключиться'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    width: 460,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 'var(--font-size-md)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 4,
  },
  body: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  label: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  input: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 4,
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none',
    width: '100%',
  },
  authToggle: {
    display: 'flex',
    gap: 4,
  },
  authBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 4,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
  },
  authBtnActive: {
    borderColor: 'var(--accent-cyan)',
    color: 'var(--accent-cyan)',
    background: 'rgba(10, 189, 198, 0.1)',
  },
  error: {
    padding: '8px 12px',
    background: 'rgba(255, 0, 64, 0.1)',
    border: '1px solid rgba(255, 0, 64, 0.3)',
    borderRadius: 4,
    color: 'var(--accent-red)',
    fontSize: 'var(--font-size-xs)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid var(--border-color)',
  },
  cancelBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: 4,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  connectBtn: {
    padding: '8px 20px',
    background: 'rgba(0, 255, 65, 0.15)',
    border: '1px solid rgba(0, 255, 65, 0.4)',
    borderRadius: 4,
    color: 'var(--accent-green)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
