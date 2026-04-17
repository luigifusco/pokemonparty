import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_PATH } from '../config';
import './LoginScreen.css';
const API_BASE = BASE_PATH;
const LAST_PLAYER_KEY = 'lastPlayerName';
export default function LoginScreen({ onLogin }) {
    const navigate = useNavigate();
    const [name, setName] = useState(() => localStorage.getItem(LAST_PLAYER_KEY) ?? '');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const handleRegister = async () => {
        if (!name.trim())
            return;
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
            localStorage.setItem(LAST_PLAYER_KEY, name.trim());
            onLogin(data.player, [], []);
            navigate('/play');
        }
        catch {
            setError('Cannot connect to server');
        }
        finally {
            setLoading(false);
        }
    };
    const handleLogin = async () => {
        if (!name.trim())
            return;
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
            localStorage.setItem(LAST_PLAYER_KEY, name.trim());
            const pokemonRows = data.pokemon;
            const itemRows = data.items ?? [];
            onLogin(data.player, pokemonRows, itemRows);
            navigate('/play');
        }
        catch {
            setError('Cannot connect to server');
        }
        finally {
            setLoading(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter')
            handleLogin();
    };
    return (_jsxs("div", { className: "login-screen", children: [_jsx("h1", { children: "\u26A1 Pok\u00E9mon Party" }), _jsxs("div", { className: "login-form", children: [_jsx("input", { className: "login-input", type: "text", placeholder: "Your name", value: name, onChange: (e) => setName(e.target.value), onKeyDown: handleKeyDown, autoFocus: true, maxLength: 20, disabled: loading }), _jsxs("div", { className: "login-buttons", children: [_jsx("button", { className: "login-btn primary", onClick: handleLogin, disabled: !name.trim() || loading, children: "Login" }), _jsx("button", { className: "login-btn", onClick: handleRegister, disabled: !name.trim() || loading, children: "Register" })] }), error && _jsx("div", { className: "login-error", children: error }), _jsx("div", { className: "login-info", children: "No password needed \u2014 just pick a name!" })] })] }));
}
