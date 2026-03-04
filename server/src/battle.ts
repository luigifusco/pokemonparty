// Battle simulation engine
// Turn-based auto: each round all living Pokémon act once, ordered by speed.
// Each Pokémon picks a random move and random valid target.

import { Pokemon, Move, Stats, PokemonType } from '../../shared/types.js';
import { getEffectiveness } from '../../shared/type-chart.js';

export interface BattlePokemon {
  instanceId: string;
  pokemon: Pokemon;
  currentHp: number;
  maxHp: number;
  statModifiers: Partial<Record<keyof Stats, number>>; // stages -6 to +6
  side: 'left' | 'right';
  moves: Move[];
}

export interface BattleLogEntry {
  round: number;
  attackerInstanceId: string;
  attackerName: string;
  moveName: string;
  targetInstanceId: string;
  targetName: string;
  damage: number;
  effectiveness: 'super' | 'neutral' | 'not-very' | 'immune' | null;
  targetFainted: boolean;
  message: string;
}

export interface BattleState {
  left: BattlePokemon[];
  right: BattlePokemon[];
  log: BattleLogEntry[];
  winner: 'left' | 'right' | null;
  round: number;
}

function getStatMultiplier(stage: number): number {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

function getEffectiveStat(base: number, stage: number): number {
  return Math.floor(base * getStatMultiplier(stage));
}

function randomFactor(): number {
  return (Math.random() * 0.15) + 0.85; // 0.85 - 1.0
}

function calculateDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: Move
): { damage: number; effectiveness: number } {
  if (move.power === null || move.power === 0) {
    return { damage: 0, effectiveness: 1 };
  }

  // Accuracy check
  if (Math.random() * 100 > move.accuracy) {
    return { damage: 0, effectiveness: 1 };
  }

  const isPhysical = move.category === 'physical';
  const atkStat = isPhysical ? 'attack' : 'spAtk';
  const defStat = isPhysical ? 'defense' : 'spDef';

  const atk = getEffectiveStat(
    attacker.pokemon.stats[atkStat],
    attacker.statModifiers[atkStat] ?? 0
  );
  const def = getEffectiveStat(
    defender.pokemon.stats[defStat],
    defender.statModifiers[defStat] ?? 0
  );

  const effectiveness = getEffectiveness(move.type, defender.pokemon.types);

  // Simplified damage formula (based on Gen 3), level fixed at 50
  const level = 50;
  const baseDamage = Math.floor(
    ((2 * level / 5 + 2) * move.power * atk / def) / 50 + 2
  );

  // STAB (Same Type Attack Bonus)
  const stab = attacker.pokemon.types.includes(move.type) ? 1.5 : 1;

  const damage = Math.max(1, Math.floor(baseDamage * stab * effectiveness * randomFactor()));

  return { damage, effectiveness };
}

function effectivenessLabel(e: number): 'super' | 'neutral' | 'not-very' | 'immune' {
  if (e === 0) return 'immune';
  if (e > 1) return 'super';
  if (e < 1) return 'not-very';
  return 'neutral';
}

function applyStatusMove(attacker: BattlePokemon, target: BattlePokemon, move: Move): string {
  if (!move.effect) return `${attacker.pokemon.name} used ${move.name}, but nothing happened!`;

  const effect = move.effect;
  if (effect.type === 'stat_boost' && effect.stat && effect.stages) {
    const current = target.statModifiers[effect.stat] ?? 0;
    const newStage = Math.max(-6, Math.min(6, current + effect.stages));
    target.statModifiers[effect.stat] = newStage;
    const direction = effect.stages > 0 ? 'rose' : 'fell';
    return `${target.pokemon.name}'s ${effect.stat} ${direction}!`;
  }

  if (effect.type === 'heal' && effect.healPercent) {
    const healAmount = Math.floor(target.maxHp * effect.healPercent / 100);
    target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
    return `${target.pokemon.name} restored HP!`;
  }

  return `${attacker.pokemon.name} used ${move.name}!`;
}

export function simulateBattle(
  leftTeam: { instanceId: string; pokemon: Pokemon; moves: Move[] }[],
  rightTeam: { instanceId: string; pokemon: Pokemon; moves: Move[] }[]
): BattleState {
  const left: BattlePokemon[] = leftTeam.map((p) => ({
    instanceId: p.instanceId,
    pokemon: p.pokemon,
    currentHp: p.pokemon.stats.hp,
    maxHp: p.pokemon.stats.hp,
    statModifiers: {},
    side: 'left' as const,
    moves: p.moves,
  }));

  const right: BattlePokemon[] = rightTeam.map((p) => ({
    instanceId: p.instanceId,
    pokemon: p.pokemon,
    currentHp: p.pokemon.stats.hp,
    maxHp: p.pokemon.stats.hp,
    statModifiers: {},
    side: 'right' as const,
    moves: p.moves,
  }));

  const log: BattleLogEntry[] = [];
  let round = 0;
  const MAX_ROUNDS = 50;

  while (round < MAX_ROUNDS) {
    const leftAlive = left.filter((p) => p.currentHp > 0);
    const rightAlive = right.filter((p) => p.currentHp > 0);

    if (leftAlive.length === 0 || rightAlive.length === 0) break;

    round++;
    const allAlive = [...leftAlive, ...rightAlive];

    // Sort by speed (descending), random tiebreak
    allAlive.sort((a, b) => {
      const speedA = getEffectiveStat(a.pokemon.stats.speed, a.statModifiers.speed ?? 0);
      const speedB = getEffectiveStat(b.pokemon.stats.speed, b.statModifiers.speed ?? 0);
      if (speedB !== speedA) return speedB - speedA;
      return Math.random() - 0.5;
    });

    for (const attacker of allAlive) {
      if (attacker.currentHp <= 0) continue;

      const move = attacker.moves[Math.floor(Math.random() * attacker.moves.length)];
      const opponents = (attacker.side === 'left' ? right : left).filter((p) => p.currentHp > 0);
      const allies = (attacker.side === 'left' ? left : right).filter((p) => p.currentHp > 0);

      if (move.category === 'status') {
        const validTargets = allies.length > 0 ? allies : [attacker];
        const target = validTargets[Math.floor(Math.random() * validTargets.length)];
        const message = applyStatusMove(attacker, target, move);

        log.push({
          round,
          attackerInstanceId: attacker.instanceId,
          attackerName: attacker.pokemon.name,
          moveName: move.name,
          targetInstanceId: target.instanceId,
          targetName: target.pokemon.name,
          damage: 0,
          effectiveness: null,
          targetFainted: false,
          message,
        });
      } else {
        if (opponents.length === 0) continue;
        const target = opponents[Math.floor(Math.random() * opponents.length)];
        const { damage, effectiveness } = calculateDamage(attacker, target, move);

        target.currentHp = Math.max(0, target.currentHp - damage);
        const fainted = target.currentHp <= 0;

        let message = `${attacker.pokemon.name} used ${move.name} on ${target.pokemon.name}!`;
        if (damage === 0 && effectiveness === 0) {
          message += ` It had no effect...`;
        } else if (damage === 0) {
          message += ` It missed!`;
        } else {
          if (effectiveness > 1) message += ` It's super effective!`;
          else if (effectiveness < 1 && effectiveness > 0) message += ` It's not very effective...`;
          message += ` (${damage} dmg)`;
        }
        if (fainted) message += ` ${target.pokemon.name} fainted!`;

        log.push({
          round,
          attackerInstanceId: attacker.instanceId,
          attackerName: attacker.pokemon.name,
          moveName: move.name,
          targetInstanceId: target.instanceId,
          targetName: target.pokemon.name,
          damage,
          effectiveness: effectivenessLabel(effectiveness),
          targetFainted: fainted,
          message,
        });
      }
    }
  }

  const leftAlive = left.filter((p) => p.currentHp > 0).length;
  const rightAlive = right.filter((p) => p.currentHp > 0).length;
  let winner: 'left' | 'right' | null = null;
  if (leftAlive > 0 && rightAlive === 0) winner = 'left';
  else if (rightAlive > 0 && leftAlive === 0) winner = 'right';
  else if (round >= MAX_ROUNDS) {
    const leftHp = left.reduce((s, p) => s + p.currentHp, 0);
    const rightHp = right.reduce((s, p) => s + p.currentHp, 0);
    winner = leftHp >= rightHp ? 'left' : 'right';
  }

  return { left, right, log, winner, round };
}
