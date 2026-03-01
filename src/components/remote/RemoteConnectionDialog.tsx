import React, { useState } from 'react';
import { X, Monitor } from 'lucide-react';

interface RemoteConnectionDialogProps {
  type: 'vnc' | 'rdp';
  host: string;
  onClose: () => void;
  onConnect: (config: {
    host: string;
    port: number;
    username: string;
    password: string;
    domain: string;
    encryption: 'auto' | 'none' | 'encrypted';
  }) => void;
}

export function RemoteConnectionDialog({ type, host, onClose, onConnect }: RemoteConnectionDialogProps) {
  const [hostValue, setHostValue] = useState(host);
  const [port, setPort] = useState(type === 'rdp' ? 3389 : 5900);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [encryption, setEncryption] = useState<'auto' | 'none' | 'encrypted'>('auto');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({ host: hostValue, port, username, password, domain, encryption });
  };

  const accentColor = type === 'rdp' ? 'var(--accent-blue)' : 'var(--accent-purple)';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Monitor size={14} color={accentColor} />
            <span style={{ ...styles.headerText, color: accentColor }}>
              {type.toUpperCase()} подключение
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Хост
            <input
              style={styles.input}
              value={hostValue}
              onChange={(e) => setHostValue(e.target.value)}
              placeholder="192.168.1.100"
              required
              autoFocus
            />
          </label>

          <label style={styles.label}>
            Порт
            <input
              style={styles.input}
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              required
            />
          </label>

          {type === 'rdp' && (
            <label style={styles.label}>
              Домен
              <input
                style={styles.input}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Необязательно"
              />
            </label>
          )}

          <label style={styles.label}>
            Имя пользователя
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={type === 'rdp' ? 'Administrator' : 'Необязательно'}
              required={type === 'rdp'}
            />
          </label>

          <label style={styles.label}>
            Пароль
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={type === 'vnc' ? 'VNC пароль (если есть)' : 'Пароль'}
              required={type === 'rdp'}
            />
          </label>

          {type === 'vnc' && (
            <label style={styles.label}>
              Шифрование
              <select
                style={styles.input}
                value={encryption}
                onChange={(e) => setEncryption(e.target.value as 'auto' | 'none' | 'encrypted')}
              >
                <option value="auto">Авто (любой)</option>
                <option value="none">Без шифрования</option>
                <option value="encrypted">Только шифрование</option>
              </select>
            </label>
          )}

          <button
            type="submit"
            style={{ ...styles.submitBtn, background: accentColor }}
          >
            Подключиться
          </button>
        </form>
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
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    borderRadius: 8,
    width: 340,
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
  },
  headerText: {
    fontSize: 13,
    fontWeight: 600,
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
    borderRadius: 4,
  },
  form: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 11,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  input: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 4,
    padding: '6px 10px',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
  },
  submitBtn: {
    marginTop: 4,
    padding: '8px 16px',
    border: 'none',
    borderRadius: 4,
    color: '#000',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
};
