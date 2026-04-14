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

  useEffect(() => {
    fetch(BASE_PATH + '/api/settings/features')
      .then(r => r.json())
      .then(data => setTmShopEnabled(data.tmShopEnabled ?? false))
      .catch(() => {});
  }, []);

  return (
    <div className="menu-screen">
      <h1>⚡ Pokémon Party</h1>
      <div className="menu-player">Trainer: {playerName}</div>
      <div className="menu-essence">✦ {essence} Essence</div>
      <div className="menu-player">⚡ {elo} Elo</div>
      <div className="menu-player">Collection: {collectionSize} Pokémon</div>
      <div className="menu-buttons">
        <button className="menu-btn menu-btn-notif" onClick={() => navigate('/notifications')}>
          🔔 Notifications{notificationCount > 0 && <span className="notif-badge">{notificationCount}</span>}
        </button>
        <button className="menu-btn" onClick={() => navigate('/collection')}>
          🎒 My Pokémon
        </button>
        <button className="menu-btn" onClick={() => navigate('/store')}>
          🎁 Expansion Shop
        </button>
        {tmShopEnabled && (
          <button className="menu-btn" onClick={() => navigate('/shop')}>
            🛒 TM Shop
          </button>
        )}
        <button className="menu-btn" onClick={() => navigate('/items')}>
          💿 Items ({itemCount})
        </button>
        <button className="menu-btn" onClick={() => navigate('/pokedex')}>
          📖 Pokédex
        </button>
        <button className="menu-btn" onClick={() => navigate('/story')}>
          📜 Story Mode
        </button>
        {collectionSize >= 1 && (
          <button className="menu-btn" onClick={() => navigate('/trade')}>
            🔄 Trade
          </button>
        )}
        {collectionSize >= 2 && (
          <>
            <button className="menu-btn" onClick={() => navigate('/battle')}>
              ⚔️ Battle
            </button>
            <button className="menu-btn" onClick={() => navigate('/battle-demo')}>
              🤖 Battle Demo (vs AI)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
