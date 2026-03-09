import { useState, useEffect } from 'react';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { BASE_PATH } from '../config';
import './TVView.css';

interface LeaderboardEntry {
  name: string;
  elo: number;
  essence: number;
  topPokemon: number[];
}

const API_BASE = BASE_PATH;

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

  // Split leaderboard into two columns
  const mid = Math.ceil(leaderboard.length / 2);
  const leftCol = leaderboard.slice(0, mid);
  const rightCol = leaderboard.slice(mid);

  const renderRows = (entries: LeaderboardEntry[], startIndex: number) =>
    entries.map((entry, i) => {
      const rank = startIndex + i;
      return (
        <tr key={entry.name}>
          <td className={`tv-rank ${rank < 3 ? `tv-rank-${rank + 1}` : ''}`}>{rank + 1}</td>
          <td className="tv-trainer">{entry.name}</td>
          <td className="center">
            <div className="tv-pokemon-row">
              {entry.topPokemon.map((pid, j) => {
                const pkmn = POKEMON_BY_ID[pid];
                return pkmn ? (
                  <img key={j} src={pkmn.sprite} alt={pkmn.name} title={pkmn.name}
                    className="tv-pokemon-sprite" />
                ) : null;
              })}
              {entry.topPokemon.length === 0 && <span className="tv-no-pokemon">—</span>}
            </div>
          </td>
          <td className="right tv-elo">{entry.elo}</td>
        </tr>
      );
    });

  return (
    <div className="tv-view">
      <h1 className="tv-title">⚡ Pokémon Party — Leaderboard</h1>
      {leaderboard.length === 0 ? (
        <div className="tv-empty">No players yet</div>
      ) : (
        <div className="tv-columns">
          <table className="tv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Trainer</th>
                <th className="center">Top Pokémon</th>
                <th className="right">Elo</th>
              </tr>
            </thead>
            <tbody>{renderRows(leftCol, 0)}</tbody>
          </table>
          {rightCol.length > 0 && (
            <table className="tv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Trainer</th>
                  <th className="center">Top Pokémon</th>
                  <th className="right">Elo</th>
                </tr>
              </thead>
              <tbody>{renderRows(rightCol, mid)}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
