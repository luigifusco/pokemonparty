import { useState, useEffect, useRef } from 'react';
import type { BattlePokemonState, BattleLogEntry, BattleSnapshot } from '@shared/battle-types';
import './BattleScene.css';

interface BattleSceneProps {
  snapshot: BattleSnapshot;
  turnDelayMs?: number;
  essenceGained?: number;
}

interface AnimationState {
  currentLogIndex: number;
  pokemonHp: Record<string, number>;
  attackingId: string | null;
  hitId: string | null;
  finished: boolean;
}

function getHpClass(current: number, max: number): string {
  const pct = current / max;
  if (pct > 0.5) return 'high';
  if (pct > 0.2) return 'medium';
  return 'low';
}

function PokemonCard({
  poke,
  currentHp,
  isAttacking,
  isHit,
}: {
  poke: BattlePokemonState;
  currentHp: number;
  isAttacking: boolean;
  isHit: boolean;
}) {
  const fainted = currentHp <= 0;
  const hpPct = Math.max(0, (currentHp / poke.maxHp) * 100);
  const classes = [
    'pokemon-card',
    poke.side,
    fainted ? 'fainted' : '',
    isAttacking ? 'attacking' : '',
    isHit ? 'hit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="pokemon-name">{poke.name}</div>
      <img
        className={`pokemon-sprite ${poke.side}`}
        src={poke.sprite}
        alt={poke.name}
      />
      <div className="pokemon-hp">
        <div className="hp-bar-container">
          <div
            className={`hp-bar ${getHpClass(currentHp, poke.maxHp)}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <div className="hp-text">
          {fainted ? 'Fainted' : `${currentHp} / ${poke.maxHp}`}
        </div>
      </div>
    </div>
  );
}

function formatLogEntry(entry: BattleLogEntry): React.ReactNode {
  const parts: React.ReactNode[] = [];

  parts.push(`${entry.attackerName} used ${entry.moveName}`);

  if (entry.damage > 0) {
    parts.push(' on ');
    parts.push(entry.targetName);

    if (entry.effectiveness === 'super') {
      parts.push(<span className="super" key="eff"> — Super effective!</span>);
    } else if (entry.effectiveness === 'not-very') {
      parts.push(<span className="not-very" key="eff"> — Not very effective...</span>);
    } else if (entry.effectiveness === 'immune') {
      parts.push(<span className="immune" key="eff"> — No effect!</span>);
    }

    parts.push(<span className="damage" key="dmg"> ({entry.damage} dmg)</span>);
  } else if (entry.effectiveness === null) {
    // Status move
    parts.push(` → ${entry.targetName}`);
  } else if (entry.damage === 0) {
    parts.push(` on ${entry.targetName} — Missed!`);
  }

  if (entry.targetFainted) {
    parts.push(<span className="fainted" key="faint"> 💀 {entry.targetName} fainted!</span>);
  }

  return <>{parts}</>;
}

export default function BattleScene({ snapshot, turnDelayMs = 1200, essenceGained }: BattleSceneProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Initialize HP from snapshot starting values
  const initialHp: Record<string, number> = {};
  for (const p of [...snapshot.left, ...snapshot.right]) {
    initialHp[p.instanceId] = p.maxHp;
  }

  const [anim, setAnim] = useState<AnimationState>({
    currentLogIndex: -1,
    pokemonHp: initialHp,
    attackingId: null,
    hitId: null,
    finished: false,
  });

  useEffect(() => {
    if (anim.finished) return;

    const nextIdx = anim.currentLogIndex + 1;
    if (nextIdx >= snapshot.log.length) {
      setAnim((prev) => ({ ...prev, finished: true, attackingId: null, hitId: null }));
      return;
    }

    const timer = setTimeout(() => {
      const entry = snapshot.log[nextIdx];
      setAnim((prev) => {
        const newHp = { ...prev.pokemonHp };
        if (entry.damage > 0) {
          newHp[entry.targetInstanceId] = Math.max(
            0,
            (newHp[entry.targetInstanceId] ?? 0) - entry.damage
          );
        }
        return {
          currentLogIndex: nextIdx,
          pokemonHp: newHp,
          attackingId: entry.attackerInstanceId,
          hitId: entry.damage > 0 ? entry.targetInstanceId : null,
          finished: false,
        };
      });
    }, turnDelayMs);

    return () => clearTimeout(timer);
  }, [anim.currentLogIndex, anim.finished, snapshot.log, turnDelayMs]);

  // Clear attacking/hit highlight after a short delay
  useEffect(() => {
    if (!anim.attackingId && !anim.hitId) return;
    const timer = setTimeout(() => {
      setAnim((prev) => ({ ...prev, attackingId: null, hitId: null }));
    }, 400);
    return () => clearTimeout(timer);
  }, [anim.attackingId, anim.hitId]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [anim.currentLogIndex]);

  const visibleLog = snapshot.log.slice(0, anim.currentLogIndex + 1);

  return (
    <div className="battle-scene">
      <div className="battle-arena">
        <div className="battle-side left">
          {snapshot.left.map((p) => (
            <PokemonCard
              key={p.instanceId}
              poke={p}
              currentHp={anim.pokemonHp[p.instanceId] ?? p.maxHp}
              isAttacking={anim.attackingId === p.instanceId}
              isHit={anim.hitId === p.instanceId}
            />
          ))}
        </div>
        <div className="battle-divider" />
        <div className="battle-side right">
          {snapshot.right.map((p) => (
            <PokemonCard
              key={p.instanceId}
              poke={p}
              currentHp={anim.pokemonHp[p.instanceId] ?? p.maxHp}
              isAttacking={anim.attackingId === p.instanceId}
              isHit={anim.hitId === p.instanceId}
            />
          ))}
        </div>
      </div>

      {anim.finished && snapshot.winner && (
        <div className="battle-winner">
          🏆 {snapshot.winner === 'left' ? 'You' : 'Opponent'} won the battle!
          {essenceGained !== undefined && snapshot.winner === 'left' && (
            <div className="battle-essence-reward">✦ +{essenceGained} Essence</div>
          )}
        </div>
      )}

      <div className="battle-log">
        {visibleLog.map((entry, i) => {
          const prevRound = i > 0 ? visibleLog[i - 1].round : 0;
          const showRoundMarker = entry.round !== prevRound;
          return (
            <div className="battle-log-entry" key={i}>
              {showRoundMarker && (
                <span className="round-marker">— Round {entry.round} —</span>
              )}
              <div>{formatLogEntry(entry)}</div>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
