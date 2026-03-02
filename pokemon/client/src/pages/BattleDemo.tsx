import { useState } from 'react';
import BattleScene from '../components/BattleScene';
import type { BattleSnapshot, BattlePokemonState, BattleLogEntry } from '@shared/battle-types';
import { POKEMON } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import type { Pokemon } from '@shared/types';
import './BattleDemo.css';

// Simple client-side battle simulation for the demo
function randomFactor(): number {
  return Math.random() * 0.15 + 0.85;
}

function simulateDemoBattle(leftPicks: Pokemon[], rightPicks: Pokemon[]): BattleSnapshot {
  const left: BattlePokemonState[] = leftPicks.map((p, i) => ({
    instanceId: `l${i}`, name: p.name, sprite: p.sprite, types: p.types,
    currentHp: p.stats.hp, maxHp: p.stats.hp, side: 'left',
  }));
  const right: BattlePokemonState[] = rightPicks.map((p, i) => ({
    instanceId: `r${i}`, name: p.name, sprite: p.sprite, types: p.types,
    currentHp: p.stats.hp, maxHp: p.stats.hp, side: 'right',
  }));

  const hp: Record<string, number> = {};
  for (const p of [...left, ...right]) hp[p.instanceId] = p.maxHp;

  const allPokemon = [
    ...leftPicks.map((p, i) => ({ ...p, instanceId: `l${i}`, side: 'left' as const })),
    ...rightPicks.map((p, i) => ({ ...p, instanceId: `r${i}`, side: 'right' as const })),
  ];

  const log: BattleLogEntry[] = [];
  let round = 0;

  while (round < 50) {
    const alive = allPokemon.filter((p) => hp[p.instanceId] > 0);
    const leftAlive = alive.filter((p) => p.side === 'left');
    const rightAlive = alive.filter((p) => p.side === 'right');
    if (leftAlive.length === 0 || rightAlive.length === 0) break;

    round++;
    const sorted = [...alive].sort((a, b) => b.stats.speed - a.stats.speed || Math.random() - 0.5);

    for (const attacker of sorted) {
      if (hp[attacker.instanceId] <= 0) continue;
      const opponents = allPokemon.filter((p) => p.side !== attacker.side && hp[p.instanceId] > 0);
      if (opponents.length === 0) continue;

      const target = opponents[Math.floor(Math.random() * opponents.length)];
      const isPhysical = attacker.stats.attack > attacker.stats.spAtk;
      const atk = isPhysical ? attacker.stats.attack : attacker.stats.spAtk;
      const def = isPhysical ? target.stats.defense : target.stats.spDef;
      const power = 60 + Math.floor(Math.random() * 40);
      const damage = Math.max(1, Math.floor(((22 * power * atk / def) / 50 + 2) * randomFactor()));

      hp[target.instanceId] = Math.max(0, hp[target.instanceId] - damage);
      const fainted = hp[target.instanceId] <= 0;

      log.push({
        round,
        attackerInstanceId: attacker.instanceId,
        attackerName: attacker.name,
        moveName: isPhysical ? 'Attack' : 'Sp. Attack',
        targetInstanceId: target.instanceId,
        targetName: target.name,
        damage,
        effectiveness: 'neutral',
        targetFainted: fainted,
        message: '',
      });
    }
  }

  const leftHp = left.reduce((s, p) => s + hp[p.instanceId], 0);
  const rightHp = right.reduce((s, p) => s + hp[p.instanceId], 0);
  let winner: 'left' | 'right' | null = null;
  if (leftHp > 0 && rightHp <= 0) winner = 'left';
  else if (rightHp > 0 && leftHp <= 0) winner = 'right';
  else winner = leftHp >= rightHp ? 'left' : 'right';

  return { left, right, log, winner, round };
}

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
  const [selected, setSelected] = useState<Pokemon[]>([]);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [opponentTeam, setOpponentTeam] = useState<Pokemon[]>([]);
  const [rewarded, setRewarded] = useState(false);

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

  const startBattle = () => {
    const opponent = pickRandomTeam(selected.map((p) => p.id));
    setOpponentTeam(opponent);
    const result = simulateDemoBattle(selected, opponent);
    setSnapshot(result);
  };

  const sorted = [...POKEMON].sort((a, b) => a.id - b.id);

  return (
    <div className="team-select-screen">
      <div className="team-select-header">
        <h2>Pick Your Team ({selected.length}/3)</h2>
        {selected.length === 3 && (
          <button className="team-select-go" onClick={startBattle}>⚔️ Battle!</button>
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
  );
}

