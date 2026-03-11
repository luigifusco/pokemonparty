import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { BattlePokemonState, BattleLogEntry, BattleSnapshot } from '@shared/battle-types';
import { getMoveAnim } from '../data/moveAnimations';
import { runMoveAnimation } from './BattleAnimationEngine';
import { playSfx, getMoveSfxType, playCry, startBattleBgm, stopBattleBgm } from './BattleSounds';
import { BASE_PATH } from '../config';
import './BattleScene.css';

const BATTLE_BGS = [
  'bg-aquacordetown', 'bg-beach', 'bg-city', 'bg-dampcave', 'bg-darkbeach',
  'bg-darkcity', 'bg-darkmeadow', 'bg-deepsea', 'bg-desert', 'bg-earthycave',
  'bg-elite4drake', 'bg-forest', 'bg-icecave', 'bg-leaderwallace', 'bg-library',
  'bg-meadow', 'bg-orasdesert', 'bg-orassea', 'bg-skypillar',
];

interface BattleSceneProps {
  snapshot: BattleSnapshot;
  turnDelayMs?: number;
  essenceGained?: number;
}

interface AnimationState {
  introIndex: number;       // -1 = not started, 0..N = revealing pokemon, N+1 = intro done
  introTotal: number;
  currentLogIndex: number;
  pokemonHp: Record<string, number>;
  pokemonBoosts: Record<string, Record<string, number>>;
  pokemonStatus: Record<string, string>;
  attackingId: string | null;
  actionText: string | null;
  finished: boolean;
}

function getHpClass(current: number, max: number): string {
  const pct = current / max;
  if (pct > 0.5) return 'high';
  if (pct > 0.2) return 'medium';
  return 'low';
}

const STAT_LABELS: Record<string, string> = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

const STATUS_DISPLAY: Record<string, { label: string; cls: string }> = {
  burn: { label: 'BRN', cls: 'status-brn' },
  paralysis: { label: 'PAR', cls: 'status-par' },
  poison: { label: 'PSN', cls: 'status-psn' },
  toxic: { label: 'TOX', cls: 'status-psn' },
  freeze: { label: 'FRZ', cls: 'status-frz' },
  sleep: { label: 'SLP', cls: 'status-slp' },
};

const PokemonCard = ({
  poke,
  currentHp,
  isAttacking,
  visible,
  cardRef,
  boosts,
  statusCondition,
}: {
  poke: BattlePokemonState;
  currentHp: number;
  isAttacking: boolean;
  visible: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  boosts: Record<string, number>;
  statusCondition: string;
}) => {
  const fainted = currentHp <= 0;
  const hpPct = Math.max(0, (currentHp / poke.maxHp) * 100);
  const imgRef = useRef<HTMLImageElement>(null);
  const frozenSrc = useRef<string | null>(null);

  // Freeze the GIF when fainted by capturing current frame to canvas
  useEffect(() => {
    if (fainted && !frozenSrc.current && imgRef.current) {
      const img = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        frozenSrc.current = canvas.toDataURL();
        img.src = frozenSrc.current;
      }
    }
  }, [fainted]);

  const classes = [
    'pokemon-card',
    poke.side,
    fainted ? 'fainted' : '',
    isAttacking ? 'attacking' : '',
    visible ? 'entered' : 'hidden-entry',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} ref={cardRef} data-instance-id={poke.instanceId}
         data-base-transform={poke.side === 'left' ? '' : ''}>
      <div className="pokemon-name">
        {poke.name}
        {statusCondition && STATUS_DISPLAY[statusCondition] && (
          <span className={`status-badge ${STATUS_DISPLAY[statusCondition].cls}`}>
            {STATUS_DISPLAY[statusCondition].label}
          </span>
        )}
      </div>
      <img
        ref={imgRef}
        className={`pokemon-sprite ${poke.side}`}
        src={frozenSrc.current ?? poke.sprite}
        alt={poke.name}
      />
      <div className="pokemon-status-overlay">
        {(() => {
          const active = Object.entries(boosts).filter(([, v]) => v !== 0);
          if (active.length === 0) return null;
          return (
            <div className="pokemon-boosts">
              {active.map(([stat, val]) => (
                <span key={stat} className={`boost-tag ${val > 0 ? 'boost-up' : 'boost-down'}`}>
                  {val > 0 ? '▲' : '▼'}{STAT_LABELS[stat]}{val > 0 ? '+' : ''}{val}
                </span>
              ))}
            </div>
          );
        })()}
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
    </div>
  );
};

function formatLogEntry(entry: BattleLogEntry): React.ReactNode {
  // Replacement log entries
  if (entry.replacement) {
    return <span className="stat-change">🔄 {entry.replacement.name} was sent in!</span>;
  }

  // Weather log entries
  if (entry.weather) {
    return <span className={`weather-${entry.weather}`}>{entry.message}</span>;
  }

  // Status damage entries (burn/poison/toxic tick)
  if (entry.statusDamage) {
    return (
      <>
        {entry.message}
        {entry.targetFainted && <span className="fainted" key="faint"> 💀 {entry.targetName} fainted!</span>}
      </>
    );
  }

  // Status condition entries (sleep, freeze, paralysis skip, thaw, wake)
  if (!entry.moveName) {
    return <span>{entry.message}</span>;
  }

  // Stat-change moves
  if (entry.boostChanges) {
    return <span className="stat-change">{entry.message}</span>;
  }

  // Normal attack / status move
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
  const arenaRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const animatingRef = useRef(false);

  const fieldSize = snapshot.fieldSize ?? snapshot.left.length;

  const arenaBg = useMemo(() => {
    const bg = BATTLE_BGS[Math.floor(Math.random() * BATTLE_BGS.length)];
    return `${BASE_PATH}/bgs/${bg}.jpg`;
  }, []);

  // Track which pokemon are currently displayed on the field
  const [displayedLeft, setDisplayedLeft] = useState<BattlePokemonState[]>(() => snapshot.left.slice(0, fieldSize));
  const [displayedRight, setDisplayedRight] = useState<BattlePokemonState[]>(() => snapshot.right.slice(0, fieldSize));

  // Build ordered entry list: alternate left[0], right[0], left[1], right[1], ...
  const entryOrder = useRef<{ instanceId: string; name: string }[]>([]);
  if (entryOrder.current.length === 0) {
    const maxLen = Math.max(displayedLeft.length, displayedRight.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < displayedLeft.length) entryOrder.current.push({ instanceId: displayedLeft[i].instanceId, name: displayedLeft[i].name });
      if (i < displayedRight.length) entryOrder.current.push({ instanceId: displayedRight[i].instanceId, name: displayedRight[i].name });
    }
  }

  // Initialize HP from snapshot starting values
  const initialHp: Record<string, number> = {};
  const initialBoosts: Record<string, Record<string, number>> = {};
  const initialStatus: Record<string, string> = {};
  for (const p of [...snapshot.left, ...snapshot.right]) {
    initialHp[p.instanceId] = p.maxHp;
    initialBoosts[p.instanceId] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    initialStatus[p.instanceId] = '';
  }

  const [anim, setAnim] = useState<AnimationState>({
    introIndex: -1,
    introTotal: entryOrder.current.length,
    currentLogIndex: -1,
    pokemonHp: initialHp,
    pokemonBoosts: initialBoosts,
    pokemonStatus: initialStatus,
    attackingId: null,
    actionText: null,
    finished: false,
  });

  const setCardRef = useCallback((instanceId: string) => (el: HTMLDivElement | null) => {
    cardRefs.current[instanceId] = el;
  }, []);

  // Start BGM on mount, stop on unmount
  useEffect(() => {
    startBattleBgm();
    return () => stopBattleBgm();
  }, []);

  // Stop BGM when battle finishes
  useEffect(() => {
    if (anim.finished) stopBattleBgm();
  }, [anim.finished]);

  // Intro animation: reveal pokemon one by one
  useEffect(() => {
    if (anim.introIndex >= anim.introTotal) return;

    const timer = setTimeout(() => {
      const nextIntro = anim.introIndex + 1;
      if (nextIntro < anim.introTotal) {
        const entry = entryOrder.current[nextIntro];
        playCry(entry.name, 0.3);
      }
      setAnim((prev) => ({ ...prev, introIndex: nextIntro }));
    }, anim.introIndex === -1 ? 400 : 600);

    return () => clearTimeout(timer);
  }, [anim.introIndex, anim.introTotal]);

  // Check which pokemon are visible during intro
  const visibleSet = useRef(new Set<string>());
  if (anim.introIndex >= 0) {
    for (let i = 0; i <= Math.min(anim.introIndex, entryOrder.current.length - 1); i++) {
      visibleSet.current.add(entryOrder.current[i].instanceId);
    }
  }
  const introDone = anim.introIndex >= anim.introTotal;

  useEffect(() => {
    if (!introDone || anim.finished || animatingRef.current) return;

    const nextIdx = anim.currentLogIndex + 1;
    if (nextIdx >= snapshot.log.length) {
      setAnim((prev) => ({ ...prev, finished: true, attackingId: null, actionText: null }));
      return;
    }

    const timer = setTimeout(async () => {
      const entry = snapshot.log[nextIdx];
      animatingRef.current = true;

      // Build action text from the entry message (server provides good messages)
      let actionText = entry.message;

      // For replacement entries, just show text briefly
      if (entry.replacement) {
        setAnim((prev) => ({ ...prev, actionText }));
        // Apply replacement immediately
        setAnim((prev) => {
          const newHp = { ...prev.pokemonHp };
          const newBoosts = { ...prev.pokemonBoosts };
          const newStatus = { ...prev.pokemonStatus };
          const rep = entry.replacement!;
          const fullState = [...snapshot.left, ...snapshot.right].find((p) => p.instanceId === rep.instanceId);
          if (fullState) {
            newHp[rep.instanceId] = fullState.maxHp;
            newBoosts[rep.instanceId] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
            newStatus[rep.instanceId] = '';
            visibleSet.current.add(rep.instanceId);
            const setDisplayed = rep.side === 'left' ? setDisplayedLeft : setDisplayedRight;
            setDisplayed((prev) =>
              prev.map((p) => p.instanceId === entry.targetInstanceId ? fullState : p)
            );
            playCry(rep.name, 0.3);
          }
          return { ...prev, currentLogIndex: nextIdx, pokemonHp: newHp, pokemonBoosts: newBoosts, pokemonStatus: newStatus, attackingId: null };
        });
        animatingRef.current = false;
        return;
      }

      // For status condition entries (no move), just show text
      if (!entry.moveName) {
        setAnim((prev) => ({ ...prev, actionText }));
        // Apply status damage/changes
        setAnim((prev) => {
          const newHp = { ...prev.pokemonHp };
          let newStatus = prev.pokemonStatus;
          if (entry.statusChange) {
            newStatus = { ...prev.pokemonStatus };
            newStatus[entry.statusChange.instanceId] = entry.statusChange.status;
          }
          if (entry.statusDamage) {
            newHp[entry.statusDamage.instanceId] = Math.max(0, (newHp[entry.statusDamage.instanceId] ?? 0) - entry.statusDamage.damage);
          }
          if (entry.targetFainted) {
            playSfx('faint');
            playCry(entry.targetName, 0.2);
          }
          return { ...prev, currentLogIndex: nextIdx, pokemonHp: newHp, pokemonStatus: newStatus, attackingId: null };
        });
        animatingRef.current = false;
        return;
      }

      // --- Normal move entry ---

      // 1. Show "X used Y!" text and highlight attacker
      const moveText = `${entry.attackerName} used ${entry.moveName}!`;
      setAnim((prev) => ({ ...prev, attackingId: entry.attackerInstanceId, actionText: moveText }));

      // Pause so the text is readable
      await new Promise((r) => setTimeout(r, 500));

      // 2. Play move SFX and animation
      if (entry.damage === 0 && entry.effectiveness !== null && !entry.boostChanges && !entry.weather) {
        playSfx('miss');
      } else if (entry.moveName) {
        playSfx(getMoveSfxType(entry.moveName));
      }

      const animConfig = getMoveAnim(entry.moveName);
      const attackerEl = cardRefs.current[entry.attackerInstanceId];
      const defenderEl = cardRefs.current[entry.targetInstanceId];

      if (arenaRef.current && entry.moveName) {
        await runMoveAnimation(animConfig, arenaRef.current, attackerEl, defenderEl);
      }

      // 3. Apply damage, boosts, status AFTER animation and show result
      // Build result text (like mainline games: one summary line after the move)
      let resultText = '';
      if (entry.damage === 0 && entry.effectiveness !== null && !entry.boostChanges && !entry.weather) {
        resultText = `${entry.attackerName}'s attack missed!`;
      } else if (entry.effectiveness === 'super') {
        resultText = "It's super effective!";
      } else if (entry.effectiveness === 'not-very') {
        resultText = "It's not very effective...";
      } else if (entry.effectiveness === 'immune') {
        resultText = "It had no effect...";
      }
      if (entry.targetFainted) {
        resultText = resultText ? `${resultText} ${entry.targetName} fainted!` : `${entry.targetName} fainted!`;
      }

      setAnim((prev) => {
        const newHp = { ...prev.pokemonHp };
        if (entry.damage > 0) {
          newHp[entry.targetInstanceId] = Math.max(
            0,
            (newHp[entry.targetInstanceId] ?? 0) - entry.damage
          );
        }
        let newBoosts = prev.pokemonBoosts;
        if (entry.boostChanges) {
          newBoosts = { ...prev.pokemonBoosts };
          const { instanceId, changes } = entry.boostChanges;
          const current = { ...(newBoosts[instanceId] ?? { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }) };
          for (const [stat, delta] of Object.entries(changes)) {
            current[stat] = (current[stat] ?? 0) + delta;
          }
          newBoosts[instanceId] = current;
        }
        let newStatus = prev.pokemonStatus;
        if (entry.statusChange) {
          newStatus = { ...prev.pokemonStatus };
          newStatus[entry.statusChange.instanceId] = entry.statusChange.status;
        }
        if (entry.statusDamage) {
          newHp[entry.statusDamage.instanceId] = Math.max(
            0,
            (newHp[entry.statusDamage.instanceId] ?? 0) - entry.statusDamage.damage
          );
        }
        if (entry.targetFainted) {
          playSfx('faint');
          playCry(entry.targetName, 0.2);
        }
        return {
          ...prev,
          currentLogIndex: nextIdx,
          pokemonHp: newHp,
          pokemonBoosts: newBoosts,
          pokemonStatus: newStatus,
          attackingId: null,
          actionText: resultText || prev.actionText,
        };
      });

      animatingRef.current = false;
    }, turnDelayMs);

    return () => clearTimeout(timer);
  }, [anim.currentLogIndex, anim.finished, introDone, snapshot.log, turnDelayMs]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [anim.currentLogIndex]);

  const visibleLog = snapshot.log.slice(0, anim.currentLogIndex + 1);

  return (
    <div className="battle-scene">
      <div className="battle-arena" ref={arenaRef} style={{ backgroundImage: `url(${arenaBg})` }}>
        <div className="battle-side left">
          {displayedLeft.map((p) => (
            <PokemonCard
              key={p.instanceId}
              poke={p}
              currentHp={anim.pokemonHp[p.instanceId] ?? p.maxHp}
              isAttacking={anim.attackingId === p.instanceId}
              visible={visibleSet.current.has(p.instanceId)}
              cardRef={setCardRef(p.instanceId)}
              boosts={anim.pokemonBoosts[p.instanceId] ?? {}}
              statusCondition={anim.pokemonStatus[p.instanceId] ?? ''}
            />
          ))}
        </div>
        <div className="battle-divider" />
        <div className="battle-side right">
          {displayedRight.map((p) => (
            <PokemonCard
              key={p.instanceId}
              poke={p}
              currentHp={anim.pokemonHp[p.instanceId] ?? p.maxHp}
              isAttacking={anim.attackingId === p.instanceId}
              visible={visibleSet.current.has(p.instanceId)}
              cardRef={setCardRef(p.instanceId)}
              boosts={anim.pokemonBoosts[p.instanceId] ?? {}}
              statusCondition={anim.pokemonStatus[p.instanceId] ?? ''}
            />
          ))}
        </div>
      </div>

      <div className="battle-action-banner">
        {anim.actionText && <span key={anim.actionText}>{anim.actionText}</span>}
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
