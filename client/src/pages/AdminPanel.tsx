import { useState, useEffect, useCallback } from 'react';
import { BASE_PATH } from '../config';
import { POKEMON } from '@shared/pokemon-data';
import PokemonIcon from '../components/PokemonIcon';
import Avatar from '../components/Avatar';
import './AdminPanel.css';

const API = BASE_PATH;

interface PlayerRow {
  id: string;
  name: string;
  essence: number;
  elo: number;
  pokemon_count: number;
  created_at: string;
  picture?: string | null;
}

interface Stats {
  playerCount: number;
  pokemonCount: number;
  battleCount: number;
  itemCount: number;
}

export default function AdminPanel() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editingEssence, setEditingEssence] = useState<Record<string, string>>({});
  const [editingElo, setEditingElo] = useState<Record<string, string>>({});
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
    setTmShopEnabled(settings.tm_shop_enabled ?? false);
    setAiBattleEnabled(settings.ai_battle_enabled ?? false);
    setLoginDisabled(settings.login_disabled ?? false);
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

  const saveSetting = async (key: string, value: unknown) => {
    await fetch(`${API}/api/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  };

  // ===================== Create Tournament view =====================
  if (showCreateTournament) {
    return (
      <div className="admin-panel">
        <div className="ds-topbar">
          <button
            className="ds-btn ds-btn-ghost ds-btn-sm ds-btn-icon"
            onClick={() => setShowCreateTournament(false)}
            aria-label="Back"
          >
            ←
          </button>
          <div className="admin-topbar-titles">
            <div className="ds-topbar-subtitle">Tournament</div>
            <div className="ds-topbar-title">🏆 Create Tournament</div>
          </div>
        </div>

        <div className="admin-create-scroll">
          {/* Basics */}
          <div className="ds-card">
            <h3 className="admin-card-title">📝 Basics</h3>
            <div className="admin-field-row">
              <label className="admin-field-label" htmlFor="t-name">Name</label>
              <input
                id="t-name"
                className="ds-input admin-field-control"
                style={{ width: 200 }}
                type="text"
                value={tournamentName}
                onChange={e => setTournamentName(e.target.value)}
              />
            </div>
            <div className="admin-field-row">
              <label className="admin-field-label" htmlFor="t-format">Format</label>
              <select
                id="t-format"
                className="ds-select admin-field-control"
                style={{ width: 120 }}
                value={tournamentFieldSize}
                onChange={e => setTournamentFieldSize(Number(e.target.value))}
              >
                <option value={1}>1v1</option>
                <option value={2}>2v2</option>
                <option value={3}>3v3</option>
              </select>
            </div>
            <div className="admin-field-row">
              <label className="admin-field-label" htmlFor="t-team">Team size</label>
              <input
                id="t-team"
                className="ds-input admin-input-num admin-field-control"
                type="number"
                min={1}
                max={6}
                value={tournamentPokemon}
                onChange={e => setTournamentPokemon(Number(e.target.value))}
              />
            </div>
            <div className="admin-field-row">
              <label className="admin-field-label" htmlFor="t-reg">
                Registration
                <span className="admin-field-desc">Minutes before it starts</span>
              </label>
              <input
                id="t-reg"
                className="ds-input admin-input-num admin-field-control"
                type="number"
                min={1}
                value={tournamentRegMinutes}
                onChange={e => setTournamentRegMinutes(Number(e.target.value))}
              />
            </div>
            <div className="admin-field-row">
              <label className="admin-field-label" htmlFor="t-match">
                Match time
                <span className="admin-field-desc">Seconds per match</span>
              </label>
              <input
                id="t-match"
                className="ds-input admin-input-num admin-field-control"
                type="number"
                min={30}
                value={tournamentMatchTime}
                onChange={e => setTournamentMatchTime(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Flags */}
          <div className="ds-card">
            <h3 className="admin-card-title">⚙️ Flags</h3>
            <div className="admin-field-row">
              <div className="admin-field-label">
                Fixed team
                <span className="admin-field-desc">Players lock their team before bracket</span>
              </div>
              <label className="ds-toggle admin-field-control">
                <input
                  type="checkbox"
                  checked={tournamentFixedTeam}
                  onChange={e => setTournamentFixedTeam(e.target.checked)}
                />
                <span className="ds-toggle-slider" />
              </label>
            </div>
            <div className="admin-field-row">
              <div className="admin-field-label">
                Public teams
                <span className="admin-field-desc">Teams visible to all participants</span>
              </div>
              <label className="ds-toggle admin-field-control">
                <input
                  type="checkbox"
                  checked={tournamentPublicTeams}
                  onChange={e => setTournamentPublicTeams(e.target.checked)}
                />
                <span className="ds-toggle-slider" />
              </label>
            </div>
          </div>

          {/* Prizes */}
          <div className="ds-card">
            <h3 className="admin-card-title">
              🎁 Prizes
              <span className="ds-badge ds-badge-accent">{tournamentPrizes.length} tiers</span>
            </h3>
            <p className="admin-card-hint">
              Add prize tiers from top rank down. The last tier is treated as the participation prize.
            </p>

            {tournamentPrizes.map((p, i) => {
              const isLast = i === tournamentPrizes.length - 1 && tournamentPrizes.length > 1;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅';
              return (
                <div key={i} className="admin-prize-card">
                  <div className="admin-prize-head">
                    <span className="admin-prize-rank">
                      {medal} Rank {i + 1}
                      {isLast && <span className="admin-prize-rank-tag">Participation</span>}
                    </span>
                    <button
                      className="ds-btn ds-btn-ghost ds-btn-sm"
                      onClick={() => removePrizeTier(i)}
                      aria-label="Remove tier"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <div className="admin-field-row">
                    <label className="admin-field-label">Essence</label>
                    <input
                      className="ds-input admin-input-num admin-field-control"
                      type="number"
                      min={0}
                      value={p.essence}
                      onChange={e => updatePrize(i, 'essence', Number(e.target.value))}
                    />
                  </div>
                  <div className="admin-field-row">
                    <label className="admin-field-label">Pack</label>
                    <select
                      className="ds-select admin-field-control"
                      style={{ width: 140 }}
                      value={p.pack}
                      onChange={e => updatePrize(i, 'pack', e.target.value)}
                    >
                      <option value="">None</option>
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>
                  <div className="admin-field-row">
                    <label className="admin-field-label">Pokémon</label>
                    <button
                      className="ds-btn ds-btn-ghost ds-btn-sm admin-field-control"
                      onClick={() => { setPokemonPickerFor(i); setPokemonSearch(''); }}
                    >
                      + Add
                    </button>
                  </div>
                  {p.pokemonIds.length > 0 && (
                    <div className="admin-prize-pokemon-list">
                      {p.pokemonIds.map(pid => {
                        const poke = POKEMON.find(pk => pk.id === pid);
                        return poke ? (
                          <div
                            key={pid}
                            className="admin-prize-pokemon-chip"
                            onClick={() => removePokemonFromPrize(i, pid)}
                            title="Remove"
                          >
                            <PokemonIcon pokemonId={pid} size={20} />
                            <span>{poke.name}</span>
                            <span className="admin-chip-x">✕</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <button className="admin-btn-dashed" onClick={addPrizeTier} style={{ marginTop: tournamentPrizes.length ? 'var(--space-2)' : 0 }}>
              + Add prize tier
            </button>
          </div>

          <button className="ds-btn ds-btn-primary ds-btn-lg ds-btn-block" onClick={createTournament}>
            🏆 Create Tournament
          </button>
        </div>

        {pokemonPickerFor !== null && (
          <div
            className="ds-overlay"
            onClick={e => e.target === e.currentTarget && setPokemonPickerFor(null)}
          >
            <div className="ds-modal admin-pokemon-modal">
              <div className="admin-pokemon-modal-head">
                <span className="admin-pokemon-modal-title">Select Pokémon</span>
                <button
                  className="ds-btn ds-btn-ghost ds-btn-sm ds-btn-icon"
                  onClick={() => setPokemonPickerFor(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <input
                className="ds-input"
                type="text"
                placeholder="Search..."
                value={pokemonSearch}
                onChange={e => setPokemonSearch(e.target.value)}
                autoFocus
              />
              <div className="admin-pokemon-grid">
                {filteredPokemon.map(p => (
                  <div
                    key={p.id}
                    className="admin-pokemon-pick"
                    onClick={() => addPokemonToPrize(pokemonPickerFor, p.id)}
                  >
                    <PokemonIcon pokemonId={p.id} size={28} />
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== Main Admin view =====================
  return (
    <div className="admin-panel">
      <div className="ds-topbar">
        <div className="admin-topbar-titles">
          <div className="ds-topbar-subtitle">Administrator</div>
          <div className="ds-topbar-title">🔧 Admin Panel</div>
        </div>
        <button
          className="ds-btn ds-btn-ghost ds-btn-sm"
          onClick={refresh}
          aria-label="Refresh"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="admin-scroll">
        {/* Stats */}
        {stats && (
          <div className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat-value">{stats.playerCount}</span>
              <span className="admin-stat-label">Players</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{stats.pokemonCount}</span>
              <span className="admin-stat-label">Pokémon</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{stats.battleCount}</span>
              <span className="admin-stat-label">Battles</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{stats.itemCount}</span>
              <span className="admin-stat-label">Items</span>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="admin-actions-row">
          <button className="ds-btn ds-btn-primary" onClick={() => setShowCreateTournament(true)}>
            🏆 Tournament
          </button>
          <button className="ds-btn ds-btn-danger" onClick={wipeAllPokemon}>
            🗑️ Wipe All PKM
          </button>
        </div>

        {/* Feature toggles */}
        <div className="ds-section-title">Features</div>
        <div className="ds-card">
          <div className="admin-field-row">
            <div className="admin-field-label">
              TM Shop
              <span className="admin-field-desc">Allow players to buy TMs</span>
            </div>
            <label className="ds-toggle admin-field-control">
              <input
                type="checkbox"
                checked={tmShopEnabled}
                onChange={async (e) => {
                  const next = e.target.checked;
                  await saveSetting('tm_shop_enabled', next);
                  setTmShopEnabled(next);
                }}
              />
              <span className="ds-toggle-slider" />
            </label>
          </div>
          <div className="admin-field-row">
            <div className="admin-field-label">
              AI Battle
              <span className="admin-field-desc">Enable solo battles vs AI</span>
            </div>
            <label className="ds-toggle admin-field-control">
              <input
                type="checkbox"
                checked={aiBattleEnabled}
                onChange={async (e) => {
                  const next = e.target.checked;
                  await saveSetting('ai_battle_enabled', next);
                  setAiBattleEnabled(next);
                }}
              />
              <span className="ds-toggle-slider" />
            </label>
          </div>
          <div className="admin-field-row">
            <div className="admin-field-label">
              Disable login
              <span className="admin-field-desc">Block new sign-ins site-wide</span>
            </div>
            <label className="ds-toggle admin-field-control">
              <input
                type="checkbox"
                checked={loginDisabled}
                onChange={async (e) => {
                  const next = e.target.checked;
                  await saveSetting('login_disabled', next);
                  setLoginDisabled(next);
                }}
              />
              <span className="ds-toggle-slider" />
            </label>
          </div>
        </div>

        {/* Users */}
        <div className="ds-section-title">Users ({players.length})</div>
        {players.length === 0 ? (
          <div className="ds-card ds-empty">
            <div className="ds-empty-icon">👥</div>
            <div className="ds-empty-text">No players yet</div>
          </div>
        ) : (
          players.map((p) => (
            <div key={p.id} className="ds-card admin-user-card">
              <div className="admin-user-head">
                <Avatar name={p.name} picture={p.picture ?? null} size="md" />
                <div className="admin-user-name">{p.name}</div>
              </div>

              <div className="admin-user-stats">
                <span className="ds-stat">
                  <span className="ds-stat-icon">✨</span>
                  <span className="ds-stat-essence">{p.essence.toLocaleString()}</span>
                </span>
                <span className="ds-stat">
                  <span className="ds-stat-icon">🏆</span>
                  <span className="ds-stat-elo">{p.elo}</span>
                </span>
                <span className="ds-stat">
                  <span className="ds-stat-icon">📕</span>
                  <span>{p.pokemon_count}</span>
                </span>
              </div>

              <div className="admin-edit-group">
                <div className="admin-edit-row">
                  <span className="admin-edit-row-label">Essence</span>
                  <input
                    className="ds-input"
                    type="number"
                    placeholder={String(p.essence)}
                    value={editingEssence[p.id] ?? ''}
                    onChange={(e) => setEditingEssence({ ...editingEssence, [p.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && setEssence(p.id)}
                  />
                  <button className="ds-btn ds-btn-sm" onClick={() => setEssence(p.id)}>Set</button>
                </div>
                <div className="admin-edit-row">
                  <span className="admin-edit-row-label">ELO</span>
                  <input
                    className="ds-input"
                    type="number"
                    placeholder={String(p.elo)}
                    value={editingElo[p.id] ?? ''}
                    onChange={(e) => setEditingElo({ ...editingElo, [p.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && setElo(p.id)}
                  />
                  <button className="ds-btn ds-btn-sm" onClick={() => setElo(p.id)}>Set</button>
                </div>
              </div>

              <div className="admin-user-actions">
                <button
                  className="ds-btn ds-btn-ghost ds-btn-sm admin-btn-warn"
                  onClick={() => wipePokemon(p.id, p.name)}
                >
                  Wipe PKM
                </button>
                <button
                  className="ds-btn ds-btn-ghost ds-btn-sm admin-btn-warn"
                  onClick={() => resetPlayer(p.id, p.name)}
                >
                  Reset
                </button>
                <button
                  className="ds-btn ds-btn-danger ds-btn-sm"
                  onClick={() => deletePlayer(p.id, p.name)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
