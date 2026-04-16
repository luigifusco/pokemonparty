import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_PATH } from '../config';
import './MenuScreen.css';

interface MenuScreenProps {
  playerName: string;
  essence: number;
  elo: number;
  collectionSize: number;
  itemCount: number;
  notificationCount: number;
}

export default function MenuScreen({ playerName, essence, elo, collectionSize, itemCount, notificationCount }: MenuScreenProps) {
  const navigate = useNavigate();
  const [tmShopEnabled, setTmShopEnabled] = useState(false);
  const [aiBattleEnabled, setAiBattleEnabled] = useState(false);

  useEffect(() => {
    fetch(BASE_PATH + '/api/settings/features')
      .then(r => r.json())
      .then(data => {
        setTmShopEnabled(data.tmShopEnabled ?? false);
        setAiBattleEnabled(data.aiBattleEnabled ?? false);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="menu-screen">
      <div className="menu-header">
        <div className="menu-header-info">
          <div className="menu-player-name">{playerName}</div>
          <div className="menu-player-stats">
            <span className="menu-essence">✦ {essence} <span className="menu-stat-label">Essence</span></span>
            <span className="menu-elo">⚡ {elo} <span className="menu-stat-label">Elo</span></span>
          </div>
        </div>
        {notificationCount > 0 && (
          <button className="menu-notif-btn" onClick={() => navigate('/notifications')}>
            🔔<span className="notif-badge">{notificationCount}</span>
          </button>
        )}
        {notificationCount === 0 && (
          <button className="menu-notif-btn menu-notif-empty" onClick={() => navigate('/notifications')}>🔔</button>
        )}
      </div>

      <div className="menu-scroll">
        <div className="menu-section">
          <div className="menu-section-title">Battle</div>
          <div className="menu-grid">
            {collectionSize >= 2 && (
              <button className="menu-tile menu-tile-accent" onClick={() => navigate('/battle')}>
                <span className="menu-tile-icon">⚔️</span>
                <span className="menu-tile-label">PvP Battle</span>
              </button>
            )}
            <button className="menu-tile menu-tile-accent" onClick={() => navigate('/story')}>
              <span className="menu-tile-icon">📜</span>
              <span className="menu-tile-label">Story Mode</span>
            </button>
            <button className="menu-tile menu-tile-accent" onClick={() => navigate('/tournaments')}>
              <span className="menu-tile-icon">🏆</span>
              <span className="menu-tile-label">Tournaments</span>
            </button>
            {aiBattleEnabled && collectionSize >= 2 && (
              <button className="menu-tile" onClick={() => navigate('/battle-demo')}>
                <span className="menu-tile-icon">🤖</span>
                <span className="menu-tile-label">vs AI</span>
              </button>
            )}
          </div>
        </div>

        <div className="menu-section">
          <div className="menu-section-title">Collection</div>
          <div className="menu-grid">
            <button className="menu-tile" onClick={() => navigate('/collection')}>
              <span className="menu-tile-icon">🎒</span>
              <span className="menu-tile-label">Pokémon</span>
              <span className="menu-tile-count">{collectionSize}</span>
            </button>
            <button className="menu-tile" onClick={() => navigate('/items')}>
              <span className="menu-tile-icon">💿</span>
              <span className="menu-tile-label">Items</span>
              <span className="menu-tile-count">{itemCount}</span>
            </button>
            <button className="menu-tile" onClick={() => navigate('/pokedex')}>
              <span className="menu-tile-icon">📖</span>
              <span className="menu-tile-label">Pokédex</span>
            </button>
            {collectionSize >= 1 && (
              <button className="menu-tile" onClick={() => navigate('/trade')}>
                <span className="menu-tile-icon">🔄</span>
                <span className="menu-tile-label">Trade</span>
              </button>
            )}
          </div>
        </div>

        <div className="menu-section">
          <div className="menu-section-title">Shop</div>
          <div className="menu-grid">
            <button className="menu-tile" onClick={() => navigate('/store')}>
              <span className="menu-tile-icon">🎁</span>
              <span className="menu-tile-label">Packs</span>
            </button>
            {tmShopEnabled && (
              <button className="menu-tile" onClick={() => navigate('/shop')}>
                <span className="menu-tile-icon">🛒</span>
                <span className="menu-tile-label">TM Shop</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
