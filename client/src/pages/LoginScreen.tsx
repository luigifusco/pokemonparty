import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_PATH } from '../config';
import './LoginScreen.css';

interface PlayerData {
  id: string;
  name: string;
  essence: number;
  elo: number;
  picture?: string | null;
}

interface LoginScreenProps {
  onLogin: (player: PlayerData, pokemonRows: any[], itemRows: any[], recentPokemonIds?: number[]) => void;
}

const API_BASE = BASE_PATH;

const LAST_PLAYER_KEY = 'lastPlayerName';
const PICTURE_MAX_SIZE = 256;
const PICTURE_QUALITY = 0.82;

const hasGetUserMedia = typeof navigator !== 'undefined'
  && !!navigator.mediaDevices
  && !!navigator.mediaDevices.getUserMedia;

/** Downscale a File to a square JPEG data URL (cover crop). */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = PICTURE_MAX_SIZE;
  canvas.height = PICTURE_MAX_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, PICTURE_MAX_SIZE, PICTURE_MAX_SIZE);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', PICTURE_QUALITY);
}

/** Capture a square center-cropped frame from a <video> element. */
function captureVideoFrame(video: HTMLVideoElement): string {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = PICTURE_MAX_SIZE;
  canvas.height = PICTURE_MAX_SIZE;
  const ctx = canvas.getContext('2d')!;
  // Mirror so the selfie preview matches what the user sees
  ctx.save();
  ctx.translate(PICTURE_MAX_SIZE, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, side, side, 0, 0, PICTURE_MAX_SIZE, PICTURE_MAX_SIZE);
  ctx.restore();
  return canvas.toDataURL('image/jpeg', PICTURE_QUALITY);
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(() => localStorage.getItem(LAST_PLAYER_KEY) ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [step, setStep] = useState<'form' | 'picture'>('form');
  const [picture, setPicture] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch(API_BASE + '/api/settings/features')
      .then(r => r.json())
      .then(data => { setLoginDisabled(data.loginDisabled ?? false); setCheckingStatus(false); })
      .catch(() => setCheckingStatus(false));
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const openCamera = async () => {
    setError('');
    // Desktop browsers ignore <input capture> — use getUserMedia when available.
    // Non-secure contexts (http://) also disable it; fall back to file picker.
    if (!hasGetUserMedia || !window.isSecureContext) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      setCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraReady(true);
      }
    } catch {
      setCameraOpen(false);
      stopCamera();
      // Permission denied or no camera — fall back to file picker
      cameraInputRef.current?.click();
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const snapPhoto = () => {
    if (!videoRef.current || !cameraReady) return;
    const dataUrl = captureVideoFrame(videoRef.current);
    setPicture(dataUrl);
    closeCamera();
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setPicture(dataUrl);
    } catch {
      setError('Could not read that image — try another.');
    } finally {
      e.target.value = '';
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !picture) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), picture }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      localStorage.setItem(LAST_PLAYER_KEY, name.trim());
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
      localStorage.setItem(LAST_PLAYER_KEY, name.trim());
      const pokemonRows = data.pokemon;
      const itemRows = data.items ?? [];
      onLogin(data.player, pokemonRows, itemRows, data.recentPokemonIds);
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

  if (checkingStatus) {
    return <div className="login-screen"><div className="ds-spinner" aria-label="Loading" /></div>;
  }

  if (loginDisabled) {
    return (
      <div className="login-screen splash-screen">
        <div className="splash-glow" />
        <div className="splash-content">
          <div className="splash-icon">⚡</div>
          <h1 className="splash-title">Pokémon Party</h1>
          <div className="splash-subtitle">The party is about to begin</div>
          <div className="splash-dots">
            <span className="splash-dot" />
            <span className="splash-dot" />
            <span className="splash-dot" />
          </div>
          <div className="splash-hint">Get ready, trainers!</div>
        </div>
      </div>
    );
  }

  if (step === 'picture') {
    return (
      <div className="login-screen">
        <h1>⚡ Pokémon Party</h1>
        <div className="register-step">
          <div className="register-step-title">Add your trainer photo</div>
          <div className="register-step-hint">
            Your face shows up on the leaderboard, in battles, and in trades.<br />
            A picture is required to register.
          </div>

          <div className={`register-pic-frame ${picture ? 'has-picture' : ''}`}>
            {picture ? <img src={picture} alt="Your picture" /> : <span className="register-pic-placeholder">📷</span>}
          </div>

          <input
            ref={cameraInputRef}
            className="register-hidden-input"
            type="file"
            accept="image/*"
            capture="user"
            onChange={handlePictureChange}
          />
          <input
            ref={fileInputRef}
            className="register-hidden-input"
            type="file"
            accept="image/*"
            onChange={handlePictureChange}
          />

          <div className="register-pic-buttons">
            <button className="ds-btn ds-btn-primary" onClick={openCamera} disabled={loading}>
              📸 Take photo
            </button>
            <button className="ds-btn" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              🖼️ Choose from library
            </button>
            <button
              className="ds-btn ds-btn-primary ds-btn-block"
              onClick={handleRegister}
              disabled={!picture || loading}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {loading ? 'Registering…' : '✨ Finish registration'}
            </button>
            <button className="ds-btn ds-btn-ghost" onClick={() => { setStep('form'); setPicture(null); setError(''); }} disabled={loading}>
              ← Back
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}
        </div>

        {cameraOpen && (
          <div className="camera-overlay" role="dialog" aria-modal="true">
            <div className="camera-modal">
              <div className="camera-modal-title">Take your photo</div>
              <div className="camera-stage">
                <video ref={videoRef} className="camera-video" playsInline muted />
                <div className="camera-frame-ring" />
                {!cameraReady && <div className="camera-loading">Starting camera…</div>}
              </div>
              <div className="camera-actions">
                <button className="ds-btn ds-btn-ghost" onClick={closeCamera}>Cancel</button>
                <button className="ds-btn ds-btn-primary" onClick={snapPhoto} disabled={!cameraReady}>
                  📸 Snap
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="login-screen">
      <h1>⚡ Pokémon Party</h1>
      <div className="login-form">
        <input
          className="ds-input login-input"
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
            className="ds-btn ds-btn-primary"
            onClick={handleLogin}
            disabled={!name.trim() || loading}
          >
            Login
          </button>
          <button
            className="ds-btn"
            onClick={() => { setError(''); setStep('picture'); }}
            disabled={!name.trim() || loading}
          >
            Register
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-info">No password needed — just pick a name and snap a photo!</div>
      </div>
    </div>
  );
}
