import { useState, useEffect, useCallback } from 'react';
import { BASE_PATH } from '../config';
import './AdminPanel.css';

const API = BASE_PATH;

interface PlayerRow {
  id: string;
  name: string;
  essence: number;
  elo: number;
  pokemon_count: number;
  created_at: string;
}

interface Stats {
  playerCount: number;
  pokemonCount: number;
  battleCount: number;
  itemCount: number;
}

interface RarityWeights {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
}

const RARITY_LABELS: (keyof RarityWeights)[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export default function AdminPanel() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editingEssence, setEditingEssence] = useState<Record<string, string>>({});
  const [editingElo, setEditingElo] = useState<Record<string, string>>({});
  const [rarityWeights, setRarityWeights] = useState<RarityWeights>({
    common: 50, uncommon: 30, rare: 13, epic: 5, legendary: 2,
  });
  const [weightsDirty, setWeightsDirty] = useState(false);
  const [tmShopEnabled, setTmShopEnabled] = useState(false);
  const [aiBattleEnabled, setAiBattleEnabled] = useState(false);

  const refresh = useCallback(async () => {
    const [pRes, sRes, wRes] = await Promise.all([
      fetch(`${API}/api/admin/players`),
      fetch(`${API}/api/admin/stats`),
      fetch(`${API}/api/admin/settings`),
    ]);
    setPlayers((await pRes.json()).players);
    setStats(await sRes.json());
    const settings = await wRes.json();
    if (settings.rarity_weights) {
      setRarityWeights(settings.rarity_weights);
    }
    setTmShopEnabled(settings.tm_shop_enabled ?? false);
    setAiBattleEnabled(settings.ai_battle_enabled ?? false);
    setWeightsDirty(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setEssence = async (id: string) => {
    const val = parseInt(editingEssence[id] ?? '', 10);
    if (isNaN(val)) return;
    await fetch(`${API}/api/admin/player/${id}/set-essence`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essence: val }),
    });
    refresh();
  };

  const setElo = async (id: string) => {
    const val = parseInt(editingElo[id] ?? '', 10);
    if (isNaN(val)) return;
    await fetch(`${API}/api/admin/player/${id}/set-elo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elo: val }),
    });
    refresh();
  };

  const wipePokemon = async (id: string, name: string) => {
    if (!confirm(`Wipe all pokemon for ${name}?`)) return;
    await fetch(`${API}/api/admin/player/${id}/wipe-pokemon`, { method: 'POST' });
    refresh();
  };

  const deletePlayer = async (id: string, name: string) => {
    if (!confirm(`DELETE player ${name}? This cannot be undone.`)) return;
    await fetch(`${API}/api/admin/player/${id}/delete`, { method: 'POST' });
    refresh();
  };

  const resetPlayer = async (id: string, name: string) => {
    if (!confirm(`Reset ${name} to fresh state? This wipes all pokemon, items, story progress, and resets essence/elo.`)) return;
    await fetch(`${API}/api/admin/player/${id}/reset`, { method: 'POST' });
    refresh();
  };

  const wipeAllPokemon = async () => {
    if (!confirm('Wipe ALL pokemon from ALL players?')) return;
    await fetch(`${API}/api/admin/wipe-all-pokemon`, { method: 'POST' });
    refresh();
  };

  const [tournamentName, setTournamentName] = useState('Tournament');
  const [tournamentFieldSize, setTournamentFieldSize] = useState(1);
  const [tournamentPokemon, setTournamentPokemon] = useState(3);
  const [tournamentRegMinutes, setTournamentRegMinutes] = useState(10);
  const [tournamentMatchTime, setTournamentMatchTime] = useState(300);

  const createTournament = async () => {
    await fetch(`${API}/api/admin/tournament/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tournamentName,
        fieldSize: tournamentFieldSize,
        totalPokemon: tournamentPokemon,
        registrationMinutes: tournamentRegMinutes,
        matchTimeLimit: tournamentMatchTime,
      }),
    });
    alert('Tournament created!');
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>🔧 Admin Panel</h2>
        <button className="admin-refresh" onClick={refresh}>↻ Refresh</button>
      </div>

      {stats && (
        <div className="admin-stats">
          <div className="admin-stat"><span>{stats.playerCount}</span>Players</div>
          <div className="admin-stat"><span>{stats.pokemonCount}</span>Pokémon</div>
          <div className="admin-stat"><span>{stats.battleCount}</span>Battles</div>
          <div className="admin-stat"><span>{stats.itemCount}</span>Items</div>
        </div>
      )}

      <div className="admin-actions">
        <button className="admin-danger-btn" onClick={wipeAllPokemon}>🗑️ Wipe All Pokémon</button>
      </div>

      <div className="admin-section">
        <h3>🏆 Create Tournament</h3>
        <div className="admin-weights" style={{ gap: 6 }}>
          <div className="admin-weight-row">
            <label className="admin-weight-label">Name</label>
            <input type="text" value={tournamentName} onChange={e => setTournamentName(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div className="admin-weight-row">
            <label className="admin-weight-label">Field Size</label>
            <select value={tournamentFieldSize} onChange={e => setTournamentFieldSize(Number(e.target.value))}>
              <option value={1}>1v1</option>
              <option value={2}>2v2</option>
              <option value={3}>3v3</option>
            </select>
          </div>
          <div className="admin-weight-row">
            <label className="admin-weight-label">Team Size</label>
            <input type="number" min={1} max={6} value={tournamentPokemon} onChange={e => setTournamentPokemon(Number(e.target.value))} />
          </div>
          <div className="admin-weight-row">
            <label className="admin-weight-label">Reg Time (min)</label>
            <input type="number" min={1} value={tournamentRegMinutes} onChange={e => setTournamentRegMinutes(Number(e.target.value))} />
          </div>
          <div className="admin-weight-row">
            <label className="admin-weight-label">Match Time (sec)</label>
            <input type="number" min={30} value={tournamentMatchTime} onChange={e => setTournamentMatchTime(Number(e.target.value))} />
          </div>
          <button className="admin-save-btn" onClick={createTournament}>🏆 Create Tournament</button>
        </div>
      </div>

      <div className="admin-section">
        <h3>📦 Pack Rarity Weights</h3>
        <p className="admin-hint">Controls the probability of pulling each rarity from packs. Values are relative weights (don't need to sum to 100).</p>
        <div className="admin-weights">
          {RARITY_LABELS.map((rarity) => (
            <div key={rarity} className="admin-weight-row">
              <label className={`admin-weight-label tier-${rarity}`}>{rarity}</label>
              <input
                type="number"
                min={0}
                value={rarityWeights[rarity]}
                onChange={(e) => {
                  setRarityWeights({ ...rarityWeights, [rarity]: Number(e.target.value) });
                  setWeightsDirty(true);
                }}
              />
            </div>
          ))}
          <button
            className="admin-save-btn"
            disabled={!weightsDirty}
            onClick={async () => {
              await fetch(`${API}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'rarity_weights', value: rarityWeights }),
              });
              setWeightsDirty(false);
            }}
          >
            {weightsDirty ? '💾 Save Weights' : '✓ Saved'}
          </button>
        </div>
      </div>

      <div className="admin-section">
        <h3>🔧 Feature Toggles</h3>
        <div className="admin-weight-row">
          <label className="admin-weight-label">TM Shop</label>
          <button
            className={tmShopEnabled ? 'admin-save-btn' : 'admin-danger-btn'}
            onClick={async () => {
              const next = !tmShopEnabled;
              await fetch(`${API}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'tm_shop_enabled', value: next }),
              });
              setTmShopEnabled(next);
            }}
          >
            {tmShopEnabled ? '✅ Enabled' : '❌ Disabled'}
          </button>
        </div>
        <div className="admin-weight-row">
          <label className="admin-weight-label">AI Battle</label>
          <button
            className={aiBattleEnabled ? 'admin-save-btn' : 'admin-danger-btn'}
            onClick={async () => {
              const next = !aiBattleEnabled;
              await fetch(`${API}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'ai_battle_enabled', value: next }),
              });
              setAiBattleEnabled(next);
            }}
          >
            {aiBattleEnabled ? '✅ Enabled' : '❌ Disabled'}
          </button>
        </div>
      </div>

      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Essence</th>
              <th>Elo</th>
              <th>Pokémon</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td className="admin-player-name">{p.name}</td>
                <td>
                  <div className="admin-edit-cell">
                    <span>{p.essence.toLocaleString()}</span>
                    <input
                      type="number"
                      placeholder={String(p.essence)}
                      value={editingEssence[p.id] ?? ''}
                      onChange={(e) => setEditingEssence({ ...editingEssence, [p.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && setEssence(p.id)}
                    />
                    <button onClick={() => setEssence(p.id)}>Set</button>
                  </div>
                </td>
                <td>
                  <div className="admin-edit-cell">
                    <span>{p.elo}</span>
                    <input
                      type="number"
                      placeholder={String(p.elo)}
                      value={editingElo[p.id] ?? ''}
                      onChange={(e) => setEditingElo({ ...editingElo, [p.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && setElo(p.id)}
                    />
                    <button onClick={() => setElo(p.id)}>Set</button>
                  </div>
                </td>
                <td>{p.pokemon_count}</td>
                <td className="admin-actions-cell">
                  <button className="admin-warn-btn" onClick={() => wipePokemon(p.id, p.name)}>Wipe PKM</button>
                  <button className="admin-warn-btn" onClick={() => resetPlayer(p.id, p.name)}>Reset</button>
                  <button className="admin-danger-btn" onClick={() => deletePlayer(p.id, p.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
