import { useNavigate } from 'react-router-dom';
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
        <button className="menu-btn" onClick={() => navigate('/shop')}>
          🛒 TM Shop
        </button>
        <button className="menu-btn" onClick={() => navigate('/items')}>
          💿 Items ({itemCount})
        </button>
        <button className="menu-btn" onClick={() => navigate('/pokedex')}>
          📖 All Pokémon
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
