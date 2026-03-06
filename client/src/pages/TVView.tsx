import { useState, useEffect } from 'react';
import { POKEMON_BY_ID } from '@shared/pokemon-data';

interface LeaderboardEntry {
  name: string;
  elo: number;
  essence: number;
  topPokemon: number[];
}

const API_BASE = '';

export default function TVView() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`);
        const data = await res.json();
        setLeaderboard(data.players);
      } catch {
        // ignore
      }
    };
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#1a1a2e', color: '#eee', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center' }}>⚡ Pokémon Party — Leaderboard</h1>
      <table style={{ width: '100%', maxWidth: 600, margin: '2rem auto', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #444' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
            <th style={{ padding: '8px', textAlign: 'left' }}>Trainer</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Top Pokémon</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Elo</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Essence</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, i) => (
            <tr key={entry.name} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '8px' }}>{i + 1}</td>
              <td style={{ padding: '8px' }}>{entry.name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  {entry.topPokemon.map((pid, j) => {
                    const pkmn = POKEMON_BY_ID[pid];
                    return pkmn ? (
                      <img key={j} src={pkmn.sprite} alt={pkmn.name} title={pkmn.name}
                        style={{ width: 32, height: 32, imageRendering: 'pixelated', objectFit: 'scale-down' }} />
                    ) : null;
                  })}
                  {entry.topPokemon.length === 0 && <span style={{ color: '#555' }}>—</span>}
                </div>
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{entry.elo}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>✦ {entry.essence}</td>
            </tr>
          ))}
          {leaderboard.length === 0 && (
            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No players yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
