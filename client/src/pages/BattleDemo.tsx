import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BattleScene from '../components/BattleScene';
import type { BattleSnapshot } from '@shared/battle-types';
import { POKEMON } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import type { Pokemon } from '@shared/types';
import './BattleDemo.css';
import './BattleMultiplayer.css';

const API_BASE = '';

function pickRandomTeam(exclude: number[]): Pokemon[] {
  const available = POKEMON.filter((p) => !exclude.includes(p.id));
  const team: Pokemon[] = [];
  while (team.length < 3 && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    team.push(available.splice(idx, 1)[0]);
  }
  return team;
}

interface BattleDemoProps {
  essence: number;
  onGainEssence: (amount: number) => void;
}

export default function BattleDemo({ essence, onGainEssence }: BattleDemoProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Pokemon[]>([]);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [opponentTeam, setOpponentTeam] = useState<Pokemon[]>([]);
  const [rewarded, setRewarded] = useState(false);
  const [loading, setLoading] = useState(false);

  if (snapshot) {
    const essenceGained = calculateBattleEssence(opponentTeam);
    // Award essence once when battle finishes with a win
    if (snapshot.winner === 'left' && !rewarded) {
      onGainEssence(essenceGained);
      setRewarded(true);
    }
    return (
      <div className="battle-demo-wrapper">
        <BattleScene snapshot={snapshot} turnDelayMs={2000} essenceGained={essenceGained} />
        <button className="battle-demo-back" onClick={() => { setSnapshot(null); setSelected([]); setOpponentTeam([]); setRewarded(false); }}>
          ← New Battle
        </button>
      </div>
    );
  }

  const toggle = (p: Pokemon) => {
    if (selected.find((s) => s.id === p.id)) {
      setSelected(selected.filter((s) => s.id !== p.id));
    } else if (selected.length < 3) {
      setSelected([...selected, p]);
    }
  };

  const startBattle = async () => {
    const opponent = pickRandomTeam(selected.map((p) => p.id));
    setOpponentTeam(opponent);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/battle/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftTeam: selected.map((p) => p.id),
          rightTeam: opponent.map((p) => p.id),
        }),
      });
      const data = await res.json();
      setSnapshot(data.snapshot);
    } catch (err) {
      console.error('Battle simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...POKEMON].sort((a, b) => a.id - b.id);

  return (
    <div className="battle-mp-screen">
      <div className="battle-mp-team-header">
        <button className="battle-mp-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>Pick Your Team ({selected.length}/3)</h2>
        {selected.length === 3 && (
          <button className="team-select-go" onClick={startBattle} disabled={loading}>
            {loading ? '⏳ Simulating...' : '⚔️ Battle!'}
          </button>
        )}
      </div>
      <div className="team-select-chosen">
        {selected.map((p) => (
          <div key={p.id} className="team-select-chosen-card" onClick={() => toggle(p)}>
            <img src={p.sprite} alt={p.name} />
            <span>{p.name}</span>
          </div>
        ))}
        {Array.from({ length: 3 - selected.length }).map((_, i) => (
          <div key={`empty-${i}`} className="team-select-chosen-card empty">?</div>
        ))}
      </div>
      <div className="team-select-scroll">
        <div className="team-select-grid">
          {sorted.map((p) => {
            const isSelected = !!selected.find((s) => s.id === p.id);
            return (
              <div
                key={p.id}
                className={`team-select-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggle(p)}
              >
                <img src={p.sprite} alt={p.name} />
                <div className="team-select-card-name">{p.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
