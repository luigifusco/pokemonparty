import { useState, useEffect, useCallback } from 'react';
import { BASE_PATH } from '../config';
import { POKEMON } from '@shared/pokemon-data';
import PokemonIcon from '../components/PokemonIcon';
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
  const [loginDisabled, setLoginDisabled] = useState(false);

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
    setLoginDisabled(settings.login_disabled ?? false);
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
  const [tournamentFixedTeam, setTournamentFixedTeam] = useState(false);
  const [tournamentPublicTeams, setTournamentPublicTeams] = useState(false);
  const [tournamentPrizes, setTournamentPrizes] = useState<{ essence: number; pack: string; pokemonIds: number[] }[]>([]);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [pokemonPickerFor, setPokemonPickerFor] = useState<number | null>(null);
  const [pokemonSearch, setPokemonSearch] = useState('');

  const addPrizeTier = () => {
    setTournamentPrizes(prev => [...prev, { essence: 500, pack: '', pokemonIds: [] }]);
  };

  const removePrizeTier = (i: number) => {
    setTournamentPrizes(prev => prev.filter((_, idx) => idx !== i));
  };

  const updatePrize = (i: number, field: string, value: any) => {
    setTournamentPrizes(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addPokemonToPrize = (tierIdx: number, pokemonId: number) => {
    setTournamentPrizes(prev => {
      const next = [...prev];
      if (!next[tierIdx].pokemonIds.includes(pokemonId)) {
        next[tierIdx] = { ...next[tierIdx], pokemonIds: [...next[tierIdx].pokemonIds, pokemonId] };
      }
      return next;
    });
    setPokemonPickerFor(null);
    setPokemonSearch('');
  };

  const removePokemonFromPrize = (tierIdx: number, pokemonId: number) => {
    setTournamentPrizes(prev => {
      const next = [...prev];
      next[tierIdx] = { ...next[tierIdx], pokemonIds: next[tierIdx].pokemonIds.filter(id => id !== pokemonId) };
      return next;
    });
  };

  const createTournament = async () => {
    const prizes = tournamentPrizes.map(p => ({
      essence: p.essence,
      pack: p.pack || undefined,
      pokemonIds: p.pokemonIds.length > 0 ? p.pokemonIds : undefined,
    }));
    await fetch(`${API}/api/admin/tournament/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tournamentName,
        fieldSize: tournamentFieldSize,
        totalPokemon: tournamentPokemon,
        registrationMinutes: tournamentRegMinutes,
        matchTimeLimit: tournamentMatchTime,
        fixedTeam: tournamentFixedTeam,
        publicTeams: tournamentPublicTeams,
        prizes,
      }),
    });
    setShowCreateTournament(false);
    setTournamentPrizes([]);
  };

  const filteredPokemon = POKEMON.filter(p =>
    pokemonSearch ? p.name.toLowerCase().includes(pokemonSearch.toLowerCase()) : true
  ).slice(0, 40);

  if (showCreateTournament) {
    return (
      <div className="admin-panel">
        <div className="admin-header">
          <button className="admin-refresh" onClick={() => setShowCreateTournament(false)}>← Back</button>
          <h2>🏆 Create Tournament</h2>
        </div>
        <div className="admin-create-scroll">
          <div className="admin-create-section">
            <h4>Settings</h4>
            <div className="admin-weight-row">
              <label className="admin-weight-label">Name</label>
              <input type="text" value={tournamentName} onChange={e => setTournamentName(e.target.value)} style={{ flex: 1 }} />
            </div>
            <div className="admin-weight-row">
              <label className="admin-weight-label">Format</label>
              <select value={tournamentFieldSize} onChange={e => setTournamentFieldSize(Number(e.target.value))}>
                <option value={1}>1v1</option><option value={2}>2v2</option><option value={3}>3v3</option>
              </select>
            </div>
            <div className="admin-weight-row">
              <label className="admin-weight-label">Team Size</label>
              <input type="number" min={1} max={6} value={tournamentPokemon} onChange={e => setTournamentPokemon(Number(e.target.value))} />
            </div>
            <div className="admin-weight-row">
              <label className="admin-weight-label">Registration (min)</label>
              <input type="number" min={1} value={tournamentRegMinutes} onChange={e => setTournamentRegMinutes(Number(e.target.value))} />
            </div>
            <div className="admin-weight-row">
              <label className="admin-weight-label">Match time (sec)</label>
              <input type="number" min={30} value={tournamentMatchTime} onChange={e => setTournamentMatchTime(Number(e.target.value))} />
            </div>
            <div className="admin-weight-row">
              <label className="admin-weight-label">Fixed Team</label>
              <label className="admin-toggle"><input type="checkbox" checked={tournamentFixedTeam} onChange={e => setTournamentFixedTeam(e.target.checked)} /><span className="admin-toggle-slider" /></label>
            </div>
            <div className="admin-weight-row">
              <label className="admin-weight-label">Public Teams</label>
              <label className="admin-toggle"><input type="checkbox" checked={tournamentPublicTeams} onChange={e => setTournamentPublicTeams(e.target.checked)} /><span className="admin-toggle-slider" /></label>
            </div>
          </div>

          <div className="admin-create-section">
            <h4>Prizes ({tournamentPrizes.length} tiers)</h4>
            <p className="admin-hint">Add prize tiers from top rank down. Last tier is treated as participation prize.</p>
            {tournamentPrizes.map((p, i) => (
              <div key={i} className="admin-prize-card">
                <div className="admin-prize-card-header">
                  <span className="admin-prize-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'} Rank {i + 1}{i === tournamentPrizes.length - 1 && tournamentPrizes.length > 1 ? ' (participation)' : ''}</span>
                  <button className="admin-prize-remove" onClick={() => removePrizeTier(i)}>✕</button>
                </div>
                <div className="admin-weight-row">
                  <label className="admin-weight-label">Essence</label>
                  <input type="number" min={0} value={p.essence} onChange={e => updatePrize(i, 'essence', Number(e.target.value))} />
                </div>
                <div className="admin-weight-row">
                  <label className="admin-weight-label">Pack</label>
                  <select value={p.pack} onChange={e => updatePrize(i, 'pack', e.target.value)}>
                    <option value="">None</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                <div className="admin-weight-row">
                  <label className="admin-weight-label">Pokémon</label>
                  <button className="admin-prize-add-pkm" onClick={() => { setPokemonPickerFor(i); setPokemonSearch(''); }}>+ Add</button>
                </div>
                {p.pokemonIds.length > 0 && (
                  <div className="admin-prize-pokemon-list">
                    {p.pokemonIds.map(pid => {
                      const poke = POKEMON.find(pk => pk.id === pid);
                      return poke ? (
                        <div key={pid} className="admin-prize-pokemon-chip" onClick={() => removePokemonFromPrize(i, pid)}>
                          <PokemonIcon pokemonId={pid} size={20} />
                          <span>{poke.name}</span>
                          <span className="admin-prize-pokemon-x">✕</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            ))}
            <button className="admin-prize-add" onClick={addPrizeTier}>+ Add Prize Tier</button>
          </div>

          <button className="admin-save-btn" style={{ margin: '16px', width: 'calc(100% - 32px)' }} onClick={createTournament}>🏆 Create Tournament</button>
        </div>

        {pokemonPickerFor !== null && (
          <div className="admin-overlay" onClick={e => e.target === e.currentTarget && setPokemonPickerFor(null)}>
            <div className="admin-modal">
              <div className="admin-modal-header">
                <span>Select Pokémon</span>
                <button onClick={() => setPokemonPickerFor(null)}>✕</button>
              </div>
              <div className="admin-modal-body">
                <input type="text" placeholder="Search..." value={pokemonSearch} onChange={e => setPokemonSearch(e.target.value)} autoFocus style={{ width: '100%', marginBottom: 8 }} />
                <div className="admin-pokemon-grid">
                  {filteredPokemon.map(p => (
                    <div key={p.id} className="admin-pokemon-pick" onClick={() => addPokemonToPrize(pokemonPickerFor, p.id)}>
                      <PokemonIcon pokemonId={p.id} size={28} />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
        <button className="admin-save-btn" onClick={() => setShowCreateTournament(true)}>🏆 Create Tournament</button>
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
          <label className="admin-toggle">
            <input type="checkbox" checked={tmShopEnabled} onChange={async (e) => {
              const next = e.target.checked;
              await fetch(`${API}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'tm_shop_enabled', value: next }),
              });
              setTmShopEnabled(next);
            }} />
            <span className="admin-toggle-slider" />
          </label>
        </div>
        <div className="admin-weight-row">
          <label className="admin-weight-label">AI Battle</label>
          <label className="admin-toggle">
            <input type="checkbox" checked={aiBattleEnabled} onChange={async (e) => {
              const next = e.target.checked;
              await fetch(`${API}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'ai_battle_enabled', value: next }),
              });
              setAiBattleEnabled(next);
            }} />
            <span className="admin-toggle-slider" />
          </label>
        </div>
        <div className="admin-weight-row">
          <label className="admin-weight-label">Disable Login</label>
          <label className="admin-toggle">
            <input type="checkbox" checked={loginDisabled} onChange={async (e) => {
              const next = e.target.checked;
              await fetch(`${API}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'login_disabled', value: next }),
              });
              setLoginDisabled(next);
            }} />
            <span className="admin-toggle-slider" />
          </label>
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
