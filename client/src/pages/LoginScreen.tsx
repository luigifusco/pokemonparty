import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginScreen.css';

interface PlayerData {
  id: string;
  name: string;
  essence: number;
  elo: number;
}

interface LoginScreenProps {
  onLogin: (player: PlayerData, pokemonRows: any[], itemRows: any[]) => void;
}

const API_BASE = '/pokemonparty';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      onLogin(data.player, [], []);
      navigate('/play');
    } catch {
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      const pokemonRows = data.pokemon;
      const itemRows = data.items ?? [];
      onLogin(data.player, pokemonRows, itemRows);
      navigate('/play');
    } catch {
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="login-screen">
      <h1>⚡ Pokémon Party</h1>
      <div className="login-form">
        <input
          className="login-input"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          maxLength={20}
          disabled={loading}
        />
        <div className="login-buttons">
          <button
            className="login-btn primary"
            onClick={handleLogin}
            disabled={!name.trim() || loading}
          >
            Login
          </button>
          <button
            className="login-btn"
            onClick={handleRegister}
            disabled={!name.trim() || loading}
          >
            Register
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-info">No password needed — just pick a name!</div>
      </div>
    </div>
  );
}
