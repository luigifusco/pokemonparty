import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as promClient from 'prom-client';
import { initDb } from './db.js';
import { STARTING_ESSENCE, BOX_COSTS } from '../../shared/essence.js';
import { STARTING_ELO, calculateEloChanges } from '../../shared/elo.js';
import { POKEMON_BY_ID } from '../../shared/pokemon-data.js';
import { randomNature, randomIVs } from '../../shared/natures.js';
import { STAT_MOVES, STATUS_MOVES, MOVE_SECONDARY_EFFECTS, getMoveAccuracy } from '../../shared/move-data.js';
import type { StatusCondition } from '../../shared/move-data.js';
import type { BattleSnapshot, BattlePokemonState, BattleLogEntry } from '../../shared/battle-types.js';
import type { Pokemon as AppPokemon } from '../../shared/types.js';
import {
  calculate as calcDamage,
  Pokemon as CalcPokemon,
  Move as CalcMove,
  Field as CalcField,
  Generations,
  toID,
} from '../../damage-calc/calc/dist/index.js';

const GEN = 4;
const BATTLE_LEVEL = 50;
const calcGen = Generations.get(GEN);
const ZERO_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

// BASE_PATH env var controls the URL prefix (e.g. 'pokemonparty' → '/pokemonparty').
// Empty or unset means the app is served at root.
const rawBasePath = (process.env.BASE_PATH ?? 'pokemonparty').replace(/^\/|\/$/g, '');
const BASE_PATH = rawBasePath ? `/${rawBasePath}` : '';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  path: `${BASE_PATH}/socket.io`,
});

app.use(express.json());

const db = initDb();

// --- Prometheus metrics ---
const metricsRegistry = new promClient.Registry();
promClient.collectDefaultMetrics({ register: metricsRegistry });

const playersOnline = new promClient.Gauge({ name: 'pokemonparty_players_online', help: 'Currently connected players', registers: [metricsRegistry] });
const battlesTotal = new promClient.Counter({ name: 'pokemonparty_battles_total', help: 'Total battles completed', labelNames: ['field_size', 'total_pokemon', 'selection_mode', 'opponent_type'], registers: [metricsRegistry] });
const tradesTotal = new promClient.Counter({ name: 'pokemonparty_trades_total', help: 'Total trades completed', registers: [metricsRegistry] });
const battleRounds = new promClient.Histogram({ name: 'pokemonparty_battle_rounds', help: 'Rounds per battle', labelNames: ['field_size', 'total_pokemon'], buckets: [5, 10, 15, 20, 30, 40, 50], registers: [metricsRegistry] });
const playersRegistered = new promClient.Gauge({ name: 'pokemonparty_players_registered', help: 'Total registered players', registers: [metricsRegistry] });

// Seed registered count from DB
const playerCount = (db.prepare('SELECT COUNT(*) as c FROM players').get() as any).c;
playersRegistered.set(playerCount);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  const typeData = calcGen.types.get(toID(moveType));
  if (!typeData) return 1;
  let mult = 1;
  for (const t of defenderTypes) {
    mult *= (typeData.effectiveness as Record<string, number>)[capitalize(t)] ?? 1;
  }
  return mult;
}

function effectivenessLabel(e: number): 'super' | 'neutral' | 'not-very' | 'immune' {
  if (e === 0) return 'immune';
  if (e > 1) return 'super';
  if (e < 1) return 'not-very';
  return 'neutral';
}

function makeCalcPokemon(p: AppPokemon, curHP?: number, boosts?: Record<string, number>): CalcPokemon {
  return new CalcPokemon(GEN, p.name, {
    level: BATTLE_LEVEL,
    evs: ZERO_EVS,
    nature: 'Serious',
    curHP,
    boosts,
  });
}

function simulateBattleFromIds(leftIds: number[], rightIds: number[], fieldSize?: number): BattleSnapshot {
  const activeFieldSize = fieldSize ?? leftIds.length;
  const leftPokemon = leftIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean);
  const rightPokemon = rightIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean);

  // Compute real stats via damage-calc for HP and speed
  const calcInstances: Record<string, CalcPokemon> = {};
  const buildEntry = (p: AppPokemon, instanceId: string) => {
    const cp = makeCalcPokemon(p);
    calcInstances[instanceId] = cp;
    return cp;
  };

  const left: BattlePokemonState[] = leftPokemon.map((p, i) => {
    const cp = buildEntry(p, `l${i}`);
    return {
      instanceId: `l${i}`, name: p.name, sprite: p.sprite, types: p.types,
      currentHp: cp.maxHP(), maxHp: cp.maxHP(), side: 'left' as const,
    };
  });
  const right: BattlePokemonState[] = rightPokemon.map((p, i) => {
    const cp = buildEntry(p, `r${i}`);
    return {
      instanceId: `r${i}`, name: p.name, sprite: p.sprite, types: p.types,
      currentHp: cp.maxHP(), maxHp: cp.maxHP(), side: 'right' as const,
    };
  });

  const hp: Record<string, number> = {};
  for (const p of [...left, ...right]) hp[p.instanceId] = p.maxHp;

  const allPokemon = [
    ...leftPokemon.map((p, i) => ({ ...p, instanceId: `l${i}`, side: 'left' as const })),
    ...rightPokemon.map((p, i) => ({ ...p, instanceId: `r${i}`, side: 'right' as const })),
  ];

  // Track which pokemon are currently on field vs reserve
  const activeIds = new Set<string>();
  for (let i = 0; i < Math.min(activeFieldSize, leftPokemon.length); i++) activeIds.add(`l${i}`);
  for (let i = 0; i < Math.min(activeFieldSize, rightPokemon.length); i++) activeIds.add(`r${i}`);

  // Ordered reserve queues (by pick order, after the initial active ones)
  const leftReserve: string[] = [];
  for (let i = activeFieldSize; i < leftPokemon.length; i++) leftReserve.push(`l${i}`);
  const rightReserve: string[] = [];
  for (let i = activeFieldSize; i < rightPokemon.length; i++) rightReserve.push(`r${i}`);

  // Bring in a reserve to replace a fainted pokemon; returns log entry or null
  function tryReplace(faintedId: string, side: 'left' | 'right', roundNum: number): BattleLogEntry | null {
    const reserve = side === 'left' ? leftReserve : rightReserve;
    if (reserve.length === 0) return null;
    const replacementId = reserve.shift()!;
    activeIds.delete(faintedId);
    activeIds.add(replacementId);
    const rp = allPokemon.find((p) => p.instanceId === replacementId)!;
    const rpState = [...left, ...right].find((p) => p.instanceId === replacementId)!;
    return {
      round: roundNum,
      attackerInstanceId: '', attackerName: '',
      moveName: '', targetInstanceId: faintedId, targetName: '',
      damage: 0, effectiveness: null, targetFainted: false,
      message: `${rp.name} was sent in!`,
      replacement: { instanceId: replacementId, name: rp.name, sprite: rpState.sprite, side },
    };
  }

  // Track stat boosts per pokemon (clamped to [-6, +6])
  const boosts: Record<string, Record<string, number>> = {};
  for (const p of allPokemon) {
    boosts[p.instanceId] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  }

  function clampBoost(val: number): number {
    return Math.max(-6, Math.min(6, val));
  }

  function boostStatName(key: string): string {
    const names: Record<string, string> = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
    return names[key] ?? key;
  }

  const log: BattleLogEntry[] = [];
  let round = 0;

  // Status condition tracking
  const status: Record<string, StatusCondition | null> = {};
  const sleepTurns: Record<string, number> = {};
  const toxicCounter: Record<string, number> = {};
  for (const p of allPokemon) {
    status[p.instanceId] = null;
    sleepTurns[p.instanceId] = 0;
    toxicCounter[p.instanceId] = 0;
  }

  const STATUS_NAMES: Record<string, string> = {
    burn: 'burned', paralysis: 'paralyzed', poison: 'poisoned',
    toxic: 'badly poisoned', freeze: 'frozen', sleep: 'fell asleep',
  };

  // Weather state
  const WEATHER_MOVES: Record<string, 'Rain' | 'Sun'> = {
    'Rain Dance': 'Rain',
    'Sunny Day': 'Sun',
  };
  let weather: 'Rain' | 'Sun' | null = null;
  let weatherTurnsLeft = 0;

  while (round < 50) {
    // Active pokemon on the field that are still alive
    const onField = allPokemon.filter((p) => hp[p.instanceId] > 0 && activeIds.has(p.instanceId));
    // Total alive (including reserves) to check game-over
    const leftTotalAlive = allPokemon.filter((p) => p.side === 'left' && hp[p.instanceId] > 0).length;
    const rightTotalAlive = allPokemon.filter((p) => p.side === 'right' && hp[p.instanceId] > 0).length;
    if (leftTotalAlive === 0 || rightTotalAlive === 0) break;
    // Also break if no one is on field (shouldn't happen if reserves exist)
    const leftOnField = onField.filter((p) => p.side === 'left');
    const rightOnField = onField.filter((p) => p.side === 'right');
    if (leftOnField.length === 0 || rightOnField.length === 0) break;

    round++;

    // Decrement weather at start of round
    if (weather && weatherTurnsLeft > 0) {
      weatherTurnsLeft--;
      if (weatherTurnsLeft <= 0) {
        log.push({
          round,
          attackerInstanceId: '', attackerName: '',
          moveName: '', targetInstanceId: '', targetName: '',
          damage: 0, effectiveness: null, targetFainted: false,
          message: weather === 'Rain' ? 'The rain stopped.' : 'The sunlight faded.',
          weather: 'clear',
        });
        weather = null;
      } else {
        const weatherTag = weather === 'Rain' ? 'rain' as const : 'sun' as const;
        const weatherDesc = weather === 'Rain' ? '🌧️ Rain' : '☀️ Sun';
        log.push({
          round,
          attackerInstanceId: '', attackerName: '',
          moveName: '', targetInstanceId: '', targetName: '',
          damage: 0, effectiveness: null, targetFainted: false,
          message: `${weatherDesc} (${weatherTurnsLeft}/5 turns remaining)`,
          weather: weatherTag,
        });
      }
    }
    // Sort by speed stat, accounting for boosts and paralysis
    const sorted = [...onField].sort((a, b) => {
      const baseSpeA = calcInstances[a.instanceId].rawStats.spe;
      const baseSpeB = calcInstances[b.instanceId].rawStats.spe;
      const boostA = boosts[a.instanceId].spe;
      const boostB = boosts[b.instanceId].spe;
      const multA = boostA >= 0 ? (2 + boostA) / 2 : 2 / (2 - boostA);
      const multB = boostB >= 0 ? (2 + boostB) / 2 : 2 / (2 - boostB);
      let spdA = Math.floor(baseSpeA * multA);
      let spdB = Math.floor(baseSpeB * multB);
      if (status[a.instanceId] === 'paralysis') spdA = Math.floor(spdA * 0.25);
      if (status[b.instanceId] === 'paralysis') spdB = Math.floor(spdB * 0.25);
      if (spdB !== spdA) return spdB - spdA;
      return Math.random() - 0.5;
    });

    for (const attacker of sorted) {
      if (hp[attacker.instanceId] <= 0) continue;
      if (!activeIds.has(attacker.instanceId)) continue;
      const opponents = allPokemon.filter((p) => p.side !== attacker.side && hp[p.instanceId] > 0 && activeIds.has(p.instanceId));
      if (opponents.length === 0) continue;

      const target = opponents[Math.floor(Math.random() * opponents.length)];

      // --- Status condition checks before acting ---
      const curStatus = status[attacker.instanceId];

      // Frozen: 20% chance to thaw each turn
      if (curStatus === 'freeze') {
        if (Math.random() < 0.2) {
          status[attacker.instanceId] = null;
          log.push({
            round, attackerInstanceId: attacker.instanceId, attackerName: attacker.name,
            moveName: '', targetInstanceId: attacker.instanceId, targetName: attacker.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${attacker.name} thawed out!`,
            statusChange: { instanceId: attacker.instanceId, status: '' },
          });
        } else {
          log.push({
            round, attackerInstanceId: attacker.instanceId, attackerName: attacker.name,
            moveName: '', targetInstanceId: attacker.instanceId, targetName: attacker.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${attacker.name} is frozen solid and can't move!`,
          });
          continue;
        }
      }

      // Sleep: decrement counter, wake up at 0
      if (curStatus === 'sleep') {
        sleepTurns[attacker.instanceId]--;
        if (sleepTurns[attacker.instanceId] <= 0) {
          status[attacker.instanceId] = null;
          log.push({
            round, attackerInstanceId: attacker.instanceId, attackerName: attacker.name,
            moveName: '', targetInstanceId: attacker.instanceId, targetName: attacker.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${attacker.name} woke up!`,
            statusChange: { instanceId: attacker.instanceId, status: '' },
          });
        } else {
          log.push({
            round, attackerInstanceId: attacker.instanceId, attackerName: attacker.name,
            moveName: '', targetInstanceId: attacker.instanceId, targetName: attacker.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${attacker.name} is fast asleep!`,
          });
          continue;
        }
      }

      // Paralysis: 25% chance of full paralysis
      if (curStatus === 'paralysis' && Math.random() < 0.25) {
        log.push({
          round, attackerInstanceId: attacker.instanceId, attackerName: attacker.name,
          moveName: '', targetInstanceId: attacker.instanceId, targetName: attacker.name,
          damage: 0, effectiveness: null, targetFainted: false,
          message: `${attacker.name} is paralyzed! It can't move!`,
        });
        continue;
      }

      // Pick a random move from the Pokémon's two moves
      const moveName = attacker.moves[Math.floor(Math.random() * attacker.moves.length)];

      // Handle weather-setting moves
      const weatherEffect = WEATHER_MOVES[moveName];
      if (weatherEffect) {
        weather = weatherEffect;
        weatherTurnsLeft = 5;
        const weatherMsg = weatherEffect === 'Rain'
          ? 'It started to rain!'
          : 'The sunlight turned harsh!';
        log.push({
          round,
          attackerInstanceId: attacker.instanceId,
          attackerName: attacker.name,
          moveName,
          targetInstanceId: attacker.instanceId,
          targetName: attacker.name,
          damage: 0,
          effectiveness: null,
          targetFainted: false,
          message: `${attacker.name} used ${moveName}! ${weatherMsg}`,
          weather: weatherEffect === 'Rain' ? 'rain' : 'sun',
        });
        continue;
      }

      // Handle stat-change moves
      const statEffect = STAT_MOVES[moveName];
      if (statEffect) {
        // Opponent-targeting stat moves can miss based on accuracy
        if (statEffect.target === 'opponent') {
          const acc = getMoveAccuracy(moveName);
          if (acc < Infinity && Math.random() * 100 >= acc) {
            log.push({
              round,
              attackerInstanceId: attacker.instanceId,
              attackerName: attacker.name,
              moveName,
              targetInstanceId: target.instanceId,
              targetName: target.name,
              damage: 0,
              effectiveness: 'neutral' as const,
              targetFainted: false,
              message: `${attacker.name} used ${moveName} on ${target.name}! It missed!`,
            });
            continue;
          }
        }

        const affectedId = statEffect.target === 'self' ? attacker.instanceId : target.instanceId;
        const affectedName = statEffect.target === 'self' ? attacker.name : target.name;
        const pokemonBoosts = boosts[affectedId];

        // Compute actual changes applied (accounting for clamping)
        const actualChanges: Record<string, number> = {};
        const changes: string[] = [];
        for (const [stat, delta] of Object.entries(statEffect.boosts)) {
          const oldVal = pokemonBoosts[stat];
          pokemonBoosts[stat] = clampBoost(oldVal + delta);
          const actual = pokemonBoosts[stat] - oldVal;
          actualChanges[stat] = actual;
          if (actual !== 0) {
            const direction = actual > 0 ? 'rose' : 'fell';
            const intensity = Math.abs(actual) >= 2 ? ' sharply' : '';
            changes.push(`${boostStatName(stat)}${intensity} ${direction}!`);
          } else {
            changes.push(`${boostStatName(stat)} can't go any ${delta > 0 ? 'higher' : 'lower'}!`);
          }
        }

        const targetLabel = statEffect.target === 'self' ? '' : ` on ${target.name}`;
        const msg = `${attacker.name} used ${moveName}${targetLabel}! ${affectedName}'s ${changes.join(' ')}`;

        log.push({
          round,
          attackerInstanceId: attacker.instanceId,
          attackerName: attacker.name,
          moveName,
          targetInstanceId: affectedId,
          targetName: affectedName,
          damage: 0,
          effectiveness: null,
          targetFainted: false,
          message: msg,
          boostChanges: { instanceId: affectedId, changes: actualChanges },
        });
        continue;
      }

      // Handle pure status-inflicting moves
      const statusEffect = STATUS_MOVES[moveName];
      if (statusEffect) {
        // Accuracy check
        const sAcc = getMoveAccuracy(moveName);
        if (sAcc < Infinity && Math.random() * 100 >= sAcc) {
          log.push({
            round, attackerInstanceId: attacker.instanceId, attackerName: attacker.name,
            moveName, targetInstanceId: target.instanceId, targetName: target.name,
            damage: 0, effectiveness: 'neutral' as const, targetFainted: false,
            message: `${attacker.name} used ${moveName} on ${target.name}! It missed!`,
          });
          continue;
        }
        // Can't apply status if target already has one
        if (status[target.instanceId]) {
          log.push({
            round, attackerInstanceId: attacker.instanceId, attackerName: attacker.name,
            moveName, targetInstanceId: target.instanceId, targetName: target.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${attacker.name} used ${moveName} on ${target.name}! But it failed!`,
          });
          continue;
        }
        status[target.instanceId] = statusEffect.status;
        if (statusEffect.status === 'sleep') {
          sleepTurns[target.instanceId] = 1 + Math.floor(Math.random() * 3); // 1-3 turns
        }
        if (statusEffect.status === 'toxic') {
          toxicCounter[target.instanceId] = 1;
        }
        log.push({
          round, attackerInstanceId: attacker.instanceId, attackerName: attacker.name,
          moveName, targetInstanceId: target.instanceId, targetName: target.name,
          damage: 0, effectiveness: null, targetFainted: false,
          message: `${attacker.name} used ${moveName}! ${target.name} ${STATUS_NAMES[statusEffect.status]}!`,
          statusChange: { instanceId: target.instanceId, status: statusEffect.status },
        });
        continue;
      }

      // Accuracy check for damage moves
      const acc = getMoveAccuracy(moveName);
      if (acc < Infinity && Math.random() * 100 >= acc) {
        log.push({
          round,
          attackerInstanceId: attacker.instanceId,
          attackerName: attacker.name,
          moveName,
          targetInstanceId: target.instanceId,
          targetName: target.name,
          damage: 0,
          effectiveness: 'neutral',
          targetFainted: false,
          message: `${attacker.name} used ${moveName} on ${target.name}! It missed!`,
        });
        continue;
      }

      // Create fresh calc objects with current HP and boosts
      const atkCalc = makeCalcPokemon(attacker, hp[attacker.instanceId], boosts[attacker.instanceId]);
      const defCalc = makeCalcPokemon(target, hp[target.instanceId], boosts[target.instanceId]);
      const moveCalc = new CalcMove(GEN, moveName);

      // Build field with current weather
      const field = weather ? new CalcField({ weather }) : undefined;

      const result = calcDamage(GEN, atkCalc, defCalc, moveCalc, field);
      const [minDmg, maxDmg] = result.range();

      // Pick a random roll between min and max
      let damage: number;
      if (Array.isArray(result.damage) && (result.damage as number[]).length === 16) {
        const rolls = result.damage as number[];
        damage = rolls[Math.floor(Math.random() * rolls.length)];
      } else {
        damage = minDmg + Math.floor(Math.random() * (maxDmg - minDmg + 1));
      }

      // Burn halves physical move damage
      if (status[attacker.instanceId] === 'burn' && moveCalc.category === 'Physical') {
        damage = Math.floor(damage / 2);
      }

      const moveType = moveCalc.type;
      const effectiveness = getTypeEffectiveness(
        moveType, target.types
      );

      hp[target.instanceId] = Math.max(0, hp[target.instanceId] - damage);
      const fainted = hp[target.instanceId] <= 0;

      let message = `${attacker.name} used ${moveName} on ${target.name}!`;
      if (damage === 0 && effectiveness === 0) {
        message += ` It had no effect...`;
      } else if (damage === 0) {
        message += ` It missed!`;
      } else {
        if (effectiveness > 1) message += ` It's super effective!`;
        else if (effectiveness < 1 && effectiveness > 0) message += ` It's not very effective...`;
        message += ` (${damage} dmg)`;
      }
      if (fainted) message += ` ${target.name} fainted!`;

      // Check for secondary status effect
      let statusApplied: StatusCondition | null = null;
      const secondary = MOVE_SECONDARY_EFFECTS[moveName];
      if (secondary && !fainted && !status[target.instanceId] && damage > 0) {
        if (Math.random() * 100 < secondary.chance) {
          status[target.instanceId] = secondary.status;
          statusApplied = secondary.status;
          if (secondary.status === 'sleep') {
            sleepTurns[target.instanceId] = 1 + Math.floor(Math.random() * 3);
          }
          message += ` ${target.name} ${STATUS_NAMES[secondary.status]}!`;
        }
      }

      log.push({
        round,
        attackerInstanceId: attacker.instanceId,
        attackerName: attacker.name,
        moveName,
        targetInstanceId: target.instanceId,
        targetName: target.name,
        damage,
        effectiveness: effectivenessLabel(effectiveness),
        targetFainted: fainted,
        message,
        ...(statusApplied ? { statusChange: { instanceId: target.instanceId, status: statusApplied } } : {}),
      });

      // Replace fainted pokemon with next reserve
      if (fainted) {
        const rep = tryReplace(target.instanceId, target.side, round);
        if (rep) log.push(rep);
      }
    }

    // End-of-turn status damage (burn, poison, toxic)
    for (const p of onField) {
      if (hp[p.instanceId] <= 0) continue;
      const s = status[p.instanceId];
      if (!s) continue;

      let statusDmg = 0;
      let statusMsg = '';
      const maxHpVal = [...left, ...right].find((x) => x.instanceId === p.instanceId)?.maxHp ?? 1;

      if (s === 'burn') {
        statusDmg = Math.max(1, Math.floor(maxHpVal / 8));
        statusMsg = `${p.name} is hurt by its burn!`;
      } else if (s === 'poison') {
        statusDmg = Math.max(1, Math.floor(maxHpVal / 8));
        statusMsg = `${p.name} is hurt by poison!`;
      } else if (s === 'toxic') {
        statusDmg = Math.max(1, Math.floor(maxHpVal * toxicCounter[p.instanceId] / 16));
        toxicCounter[p.instanceId]++;
        statusMsg = `${p.name} is hurt by toxic poison!`;
      }

      if (statusDmg > 0) {
        hp[p.instanceId] = Math.max(0, hp[p.instanceId] - statusDmg);
        const fainted = hp[p.instanceId] <= 0;
        if (fainted) statusMsg += ` ${p.name} fainted!`;
        log.push({
          round, attackerInstanceId: p.instanceId, attackerName: p.name,
          moveName: '', targetInstanceId: p.instanceId, targetName: p.name,
          damage: 0, effectiveness: null, targetFainted: fainted,
          message: statusMsg,
          statusDamage: { instanceId: p.instanceId, damage: statusDmg },
        });

        if (fainted) {
          const rep = tryReplace(p.instanceId, p.side, round);
          if (rep) log.push(rep);
        }
      }
    }
  }

  // Update snapshot HP from simulation state
  for (const p of left) p.currentHp = hp[p.instanceId];
  for (const p of right) p.currentHp = hp[p.instanceId];

  const leftHp = left.reduce((s, p) => s + p.currentHp, 0);
  const rightHp = right.reduce((s, p) => s + p.currentHp, 0);
  let winner: 'left' | 'right' | null = null;
  if (leftHp > 0 && rightHp <= 0) winner = 'left';
  else if (rightHp > 0 && leftHp <= 0) winner = 'right';
  else winner = leftHp >= rightHp ? 'left' : 'right';

  return { left, right, log, winner, round, fieldSize: activeFieldSize };
}

function flipSnapshot(snapshot: BattleSnapshot): BattleSnapshot {
  const flipSide = (s: 'left' | 'right') => s === 'left' ? 'right' : 'left';
  return {
    left: snapshot.right.map((p) => ({ ...p, side: 'left' as const })),
    right: snapshot.left.map((p) => ({ ...p, side: 'right' as const })),
    log: snapshot.log.map((e) => ({
      ...e,
      replacement: e.replacement ? { ...e.replacement, side: flipSide(e.replacement.side) } : undefined,
    })),
    winner: snapshot.winner ? flipSide(snapshot.winner) : null,
    round: snapshot.round,
    fieldSize: snapshot.fieldSize,
  };
}

// --- REST API ---

// Register a new player
app.post(`${BASE_PATH}/api/register`, (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const trimmed = name.trim();
  const existing = db.prepare('SELECT id FROM players WHERE name = ?').get(trimmed);
  if (existing) {
    return res.status(409).json({ error: 'Name already taken' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO players (id, name, essence, elo) VALUES (?, ?, ?, ?)').run(id, trimmed, STARTING_ESSENCE, STARTING_ELO);
  playersRegistered.inc();

  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE id = ?').get(id);
  return res.json({ player });
});

// Login (just look up by name)
app.post(`${BASE_PATH}/api/login`, (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE name = ?').get(name.trim()) as any;
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // Also fetch their pokemon collection
  const pokemon = db.prepare('SELECT id, pokemon_id, nature, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, move_1, move_2 FROM owned_pokemon WHERE player_id = ?').all(player.id);
  const items = db.prepare('SELECT id, item_type, item_data FROM owned_items WHERE player_id = ?').all(player.id);
  return res.json({ player, pokemon, items });
});

// Get player data
app.get(`${BASE_PATH}/api/player/:id`, (req, res) => {
  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE id = ?').get(req.params.id) as any;
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const pokemon = db.prepare('SELECT id, pokemon_id, nature, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, move_1, move_2 FROM owned_pokemon WHERE player_id = ?').all(player.id);
  const items = db.prepare('SELECT id, item_type, item_data FROM owned_items WHERE player_id = ?').all(player.id);
  return res.json({ player, pokemon, items });
});

// Update player essence
app.post(`${BASE_PATH}/api/player/:id/essence`, (req, res) => {
  const { essence } = req.body;
  if (typeof essence !== 'number') return res.status(400).json({ error: 'Invalid essence' });
  db.prepare('UPDATE players SET essence = ? WHERE id = ?').run(essence, req.params.id);
  return res.json({ ok: true });
});

// Add pokemon to player collection
app.post(`${BASE_PATH}/api/player/:id/pokemon`, (req, res) => {
  const { pokemonIds } = req.body;
  if (!Array.isArray(pokemonIds)) return res.status(400).json({ error: 'Invalid pokemonIds' });

  const insert = db.prepare(
    'INSERT INTO owned_pokemon (id, player_id, pokemon_id, nature, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const created: any[] = [];
  for (const pid of pokemonIds) {
    const id = uuidv4();
    const nature = randomNature();
    const ivs = randomIVs();
    insert.run(id, req.params.id, pid, nature, ivs.hp, ivs.attack, ivs.defense, ivs.spAtk, ivs.spDef, ivs.speed);
    created.push({ id, pokemon_id: pid, nature, iv_hp: ivs.hp, iv_atk: ivs.attack, iv_def: ivs.defense, iv_spa: ivs.spAtk, iv_spd: ivs.spDef, iv_spe: ivs.speed });
  }
  return res.json({ ok: true, pokemon: created });
});

// Remove pokemon from player collection (by pokemon_id, removes N copies)
app.post(`${BASE_PATH}/api/player/:id/pokemon/remove`, (req, res) => {
  const { pokemonId, count } = req.body;
  if (typeof pokemonId !== 'number' || typeof count !== 'number') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const rows = db.prepare(
    'SELECT id FROM owned_pokemon WHERE player_id = ? AND pokemon_id = ? LIMIT ?'
  ).all(req.params.id, pokemonId, count) as any[];

  const del = db.prepare('DELETE FROM owned_pokemon WHERE id = ?');
  for (const row of rows) {
    del.run(row.id);
  }
  return res.json({ ok: true, removed: rows.length });
});

// Add items to player inventory
app.post(`${BASE_PATH}/api/player/:id/items`, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid items' });

  const insert = db.prepare(
    'INSERT INTO owned_items (id, player_id, item_type, item_data) VALUES (?, ?, ?, ?)'
  );
  const created: any[] = [];
  for (const item of items) {
    const id = uuidv4();
    insert.run(id, req.params.id, item.itemType, item.itemData);
    created.push({ id, item_type: item.itemType, item_data: item.itemData });
  }
  return res.json({ ok: true, items: created });
});

// Remove items from player inventory
app.post(`${BASE_PATH}/api/player/:id/items/remove`, (req, res) => {
  const { itemType, itemData, count } = req.body;
  if (typeof itemType !== 'string' || typeof itemData !== 'string' || typeof count !== 'number') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const rows = db.prepare(
    'SELECT id FROM owned_items WHERE player_id = ? AND item_type = ? AND item_data = ? LIMIT ?'
  ).all(req.params.id, itemType, itemData, count) as any[];

  const del = db.prepare('DELETE FROM owned_items WHERE id = ?');
  for (const row of rows) {
    del.run(row.id);
  }
  return res.json({ ok: true, removed: rows.length });
});

// Evolve a pokemon instance in-place (keeps IVs/nature, changes pokemon_id)
app.post(`${BASE_PATH}/api/player/:id/pokemon/evolve`, (req, res) => {
  const { instanceId, newPokemonId } = req.body;
  if (typeof instanceId !== 'string' || typeof newPokemonId !== 'number') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const row = db.prepare(
    'SELECT id FROM owned_pokemon WHERE id = ? AND player_id = ?'
  ).get(instanceId, req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }

  db.prepare('UPDATE owned_pokemon SET pokemon_id = ? WHERE id = ?').run(newPokemonId, instanceId);
  return res.json({ ok: true });
});

// Teach a TM to a pokemon (replace one of its moves, consume the TM)
app.post(`${BASE_PATH}/api/player/:id/pokemon/teach-tm`, (req, res) => {
  const { instanceId, moveName, moveSlot } = req.body;
  if (typeof instanceId !== 'string' || typeof moveName !== 'string' || (moveSlot !== 0 && moveSlot !== 1)) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const pokemon = db.prepare(
    'SELECT id, pokemon_id, move_1, move_2 FROM owned_pokemon WHERE id = ? AND player_id = ?'
  ).get(instanceId, req.params.id) as any;
  if (!pokemon) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }

  // Get current effective moves (learned or species defaults)
  const species = POKEMON_BY_ID[pokemon.pokemon_id];
  if (!species) return res.status(404).json({ error: 'Unknown pokemon species' });
  const currentMove1 = pokemon.move_1 ?? species.moves[0];
  const currentMove2 = pokemon.move_2 ?? species.moves[1];

  const newMove1 = moveSlot === 0 ? moveName : currentMove1;
  const newMove2 = moveSlot === 1 ? moveName : currentMove2;

  db.prepare('UPDATE owned_pokemon SET move_1 = ?, move_2 = ? WHERE id = ?').run(newMove1, newMove2, instanceId);

  // Remove one TM from inventory
  const tmRow = db.prepare(
    'SELECT id FROM owned_items WHERE player_id = ? AND item_type = ? AND item_data = ? LIMIT 1'
  ).get(req.params.id, 'tm', moveName) as any;
  if (tmRow) {
    db.prepare('DELETE FROM owned_items WHERE id = ?').run(tmRow.id);
  }

  return res.json({ ok: true });
});

// Use a boost item on a pokemon (max out one IV, consume the item)
app.post(`${BASE_PATH}/api/player/:id/pokemon/use-boost`, (req, res) => {
  const { instanceId, stat } = req.body;
  const validStats = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
  if (typeof instanceId !== 'string' || typeof stat !== 'string' || !validStats.includes(stat)) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const pokemon = db.prepare(
    'SELECT id FROM owned_pokemon WHERE id = ? AND player_id = ?'
  ).get(instanceId, req.params.id) as any;
  if (!pokemon) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }

  const colMap: Record<string, string> = {
    hp: 'iv_hp', attack: 'iv_atk', defense: 'iv_def',
    spAtk: 'iv_spa', spDef: 'iv_spd', speed: 'iv_spe',
  };
  const col = colMap[stat];
  db.prepare(`UPDATE owned_pokemon SET ${col} = 31 WHERE id = ?`).run(instanceId);

  // Remove one boost item from inventory
  const boostRow = db.prepare(
    'SELECT id FROM owned_items WHERE player_id = ? AND item_type = ? AND item_data = ? LIMIT 1'
  ).get(req.params.id, 'boost', stat) as any;
  if (boostRow) {
    db.prepare('DELETE FROM owned_items WHERE id = ?').run(boostRow.id);
  }

  return res.json({ ok: true });
});

// Get leaderboard (ranked by Elo)
app.get(`${BASE_PATH}/api/leaderboard`, (_req, res) => {
  const players = db.prepare('SELECT id, name, elo, essence FROM players ORDER BY elo DESC').all() as any[];
  const topPokemonStmt = db.prepare(
    'SELECT pokemon_id FROM battle_pokemon_usage WHERE player_id = ? ORDER BY times_used DESC LIMIT 3'
  );
  const result = players.map((p: any) => ({
    name: p.name,
    elo: p.elo,
    essence: p.essence,
    topPokemon: (topPokemonStmt.all(p.id) as any[]).map((r: any) => r.pokemon_id),
  }));
  return res.json({ players: result });
});

// Online players endpoint
app.get(`${BASE_PATH}/api/players/online`, (_req, res) => {
  const names = Array.from(connectedPlayers.keys());
  return res.json({ players: names });
});

// Prometheus metrics endpoint
app.get(`${BASE_PATH}/metrics`, async (_req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

// Analytics endpoint — battle stats breakdown
app.get(`${BASE_PATH}/api/analytics/battles`, (_req, res) => {
  const byMode = db.prepare(`
    SELECT field_size, total_pokemon, selection_mode, opponent_type,
           COUNT(*) as count, AVG(rounds) as avg_rounds
    FROM battles
    GROUP BY field_size, total_pokemon, selection_mode, opponent_type
    ORDER BY count DESC
  `).all();

  const byDay = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM battles
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 30
  `).all();

  const topPlayers = db.prepare(`
    SELECT p.name,
           COUNT(*) as battles,
           SUM(CASE WHEN b.winner_id = p.id THEN 1 ELSE 0 END) as wins
    FROM players p
    JOIN battles b ON b.winner_id = p.id OR b.loser_id = p.id
    WHERE b.opponent_type = 'pvp'
    GROUP BY p.id
    ORDER BY battles DESC
    LIMIT 20
  `).all();

  return res.json({ byMode, byDay, topPlayers });
});

// AI / demo battle endpoint
app.post(`${BASE_PATH}/api/battle/simulate`, (req, res) => {
  const { leftTeam, rightTeam, fieldSize, selectionMode } = req.body;
  if (!Array.isArray(leftTeam) || !Array.isArray(rightTeam)) {
    return res.status(400).json({ error: 'leftTeam and rightTeam must be arrays of pokemon IDs' });
  }
  const fs = fieldSize ?? leftTeam.length;
  const mode = selectionMode ?? 'blind';
  const snapshot = simulateBattleFromIds(leftTeam, rightTeam, fieldSize);

  const labels = { field_size: String(fs), total_pokemon: String(leftTeam.length), selection_mode: mode, opponent_type: 'ai' };
  battlesTotal.inc(labels);
  battleRounds.observe({ field_size: String(fs), total_pokemon: String(leftTeam.length) }, snapshot.round);

  // Record in DB (no player IDs for AI battles)
  db.prepare(
    'INSERT INTO battles (id, winner_id, loser_id, essence_gained, field_size, total_pokemon, selection_mode, opponent_type, rounds) VALUES (?, NULL, NULL, 0, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), fs, leftTeam.length, mode, 'ai', snapshot.round);

  return res.json({ snapshot });
});

// --- Socket.IO: Battle matching ---

// Track challenges: Map<challengerName, targetName>
const pendingChallenges = new Map<string, string>();
const pendingChallengeConfigs = new Map<string, { fieldSize: number; totalPokemon: number }>();
// Track connected players: Map<playerName, socketId>
const connectedPlayers = new Map<string, string>();
// Track active battles: Map<battleId, battle state>
interface ActiveBattle {
  id: string;
  player1: string;
  player2: string;
  player1Team: number[] | null;
  player2Team: number[] | null;
  fieldSize: number;
  totalPokemon: number;
}
const activeBattles = new Map<string, ActiveBattle>();

// Trade state
const pendingTrades = new Map<string, string>(); // initiator -> target
interface ActiveTrade {
  id: string;
  player1: string;
  player2: string;
  player1Pokemon: number | null;
  player2Pokemon: number | null;
  player1Confirmed: boolean;
  player2Confirmed: boolean;
}
const activeTrades = new Map<string, ActiveTrade>();


io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let playerName: string | null = null;

  socket.on('player:identify', (name: string) => {
    playerName = name;
    connectedPlayers.set(name, socket.id);
    playersOnline.set(connectedPlayers.size);
    console.log(`Player identified: ${name}`);
  });

  socket.on('battle:challenge', (data: string | { target: string; fieldSize?: number; totalPokemon?: number }) => {
    if (!playerName) return;
    const targetName = typeof data === 'string' ? data : data.target;
    const fieldSize = (typeof data === 'object' ? data.fieldSize : undefined) ?? 3;
    const totalPokemon = (typeof data === 'object' ? data.totalPokemon : undefined) ?? 3;
    pendingChallenges.set(playerName, targetName);
    pendingChallengeConfigs.set(playerName, { fieldSize, totalPokemon });
    console.log(`${playerName} challenges ${targetName}`);

    // Check if there's a mutual challenge
    const otherChallenge = pendingChallenges.get(targetName);
    if (otherChallenge === playerName) {
      // Match found!
      pendingChallenges.delete(playerName);
      pendingChallenges.delete(targetName);

      const config = pendingChallengeConfigs.get(targetName) ?? { fieldSize: 3, totalPokemon: 3 };
      pendingChallengeConfigs.delete(playerName);
      pendingChallengeConfigs.delete(targetName);
      const battleId = uuidv4();
      const battle: ActiveBattle = {
        id: battleId,
        player1: playerName,
        player2: targetName,
        player1Team: null,
        player2Team: null,
        fieldSize: config.fieldSize,
        totalPokemon: config.totalPokemon,
      };
      activeBattles.set(battleId, battle);

      // Notify both players
      const socket1 = connectedPlayers.get(playerName);
      const socket2 = connectedPlayers.get(targetName);
      if (socket1) io.to(socket1).emit('battle:matched', { battleId, opponent: targetName, fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
      if (socket2) io.to(socket2).emit('battle:matched', { battleId, opponent: playerName, fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
      console.log(`Battle matched: ${playerName} vs ${targetName} (${battleId})`);
    } else {
      // Notify challenger they're waiting
      socket.emit('battle:waiting', { target: targetName });
      // Notify target they've been challenged
      const targetSocket = connectedPlayers.get(targetName);
      if (targetSocket) io.to(targetSocket).emit('battle:challenged', { challenger: playerName });
    }
  });

  socket.on('battle:cancel', () => {
    if (!playerName) return;
    pendingChallenges.delete(playerName);
    pendingChallengeConfigs.delete(playerName);
    socket.emit('battle:cancelled');
  });

  socket.on('battle:selectTeam', ({ battleId, team }: { battleId: string; team: number[] }) => {
    if (!playerName) return;
    const battle = activeBattles.get(battleId);
    if (!battle) return;

    if (battle.player1 === playerName) battle.player1Team = team;
    else if (battle.player2 === playerName) battle.player2Team = team;

    // Check if both teams are selected
    if (battle.player1Team && battle.player2Team) {
      const socket1 = connectedPlayers.get(battle.player1);
      const socket2 = connectedPlayers.get(battle.player2);

      // Simulate battle on server so both players see the same result
      const snapshot = simulateBattleFromIds(battle.player1Team, battle.player2Team, battle.fieldSize);

      const battleDataP1 = {
        battleId,
        player1: battle.player1,
        player2: battle.player2,
        player1Team: battle.player1Team,
        player2Team: battle.player2Team,
        snapshot,
      };
      const battleDataP2 = {
        battleId,
        player1: battle.player1,
        player2: battle.player2,
        player1Team: battle.player1Team,
        player2Team: battle.player2Team,
        snapshot: flipSnapshot(snapshot),
      };

      if (socket1) io.to(socket1).emit('battle:start', battleDataP1);
      if (socket2) io.to(socket2).emit('battle:start', battleDataP2);
      console.log(`Battle starting: ${battle.player1} vs ${battle.player2}`);

      // Report result immediately from server simulation
      const winnerName = snapshot.winner === 'left' ? battle.player1 : battle.player2;
      const loserName = snapshot.winner === 'left' ? battle.player2 : battle.player1;

      const winnerRow = db.prepare('SELECT id, elo FROM players WHERE name = ?').get(winnerName) as any;
      const loserRow = db.prepare('SELECT id, elo FROM players WHERE name = ?').get(loserName) as any;
      if (winnerRow && loserRow) {
        const { winnerNewElo, loserNewElo, winnerDelta, loserDelta } = calculateEloChanges(winnerRow.elo, loserRow.elo);
        db.prepare('UPDATE players SET elo = ? WHERE id = ?').run(winnerNewElo, winnerRow.id);
        db.prepare('UPDATE players SET elo = ? WHERE id = ?').run(loserNewElo, loserRow.id);

        const eloUpdate = { winnerName, loserName, winnerNewElo, loserNewElo, winnerDelta, loserDelta };
        if (socket1) io.to(socket1).emit('battle:eloUpdate', eloUpdate);
        if (socket2) io.to(socket2).emit('battle:eloUpdate', eloUpdate);

        const p1Row = snapshot.winner === 'left' ? winnerRow : loserRow;
        const p2Row = snapshot.winner === 'left' ? loserRow : winnerRow;
        const recordUsage = db.prepare(
          'INSERT INTO battle_pokemon_usage (player_id, pokemon_id, times_used) VALUES (?, ?, 1) ON CONFLICT(player_id, pokemon_id) DO UPDATE SET times_used = times_used + 1'
        );
        for (const pid of battle.player1Team) recordUsage.run(p1Row.id, pid);
        for (const pid of battle.player2Team) recordUsage.run(p2Row.id, pid);

        console.log(`Elo update: ${winnerName} ${winnerRow.elo}→${winnerNewElo} (+${winnerDelta}), ${loserName} ${loserRow.elo}→${loserNewElo} (${loserDelta})`);
      }

      activeBattles.delete(battleId);
      const labels = { field_size: String(battle.fieldSize), total_pokemon: String(battle.totalPokemon), selection_mode: 'blind', opponent_type: 'pvp' };
      battlesTotal.inc(labels);
      battleRounds.observe({ field_size: String(battle.fieldSize), total_pokemon: String(battle.totalPokemon) }, snapshot.round);

      // Record battle in DB with config
      const recordBattle = db.prepare(
        'INSERT INTO battles (id, winner_id, loser_id, essence_gained, winner_elo_delta, loser_elo_delta, field_size, total_pokemon, selection_mode, opponent_type, rounds) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)'
      );
      if (winnerRow && loserRow) {
        recordBattle.run(battleId, winnerRow.id, loserRow.id, winnerDelta, loserDelta, battle.fieldSize, battle.totalPokemon, 'blind', 'pvp', snapshot.round);
      }
    } else {
      socket.emit('battle:waitingForOpponent');
    }
  });

  // --- Trade events ---

  socket.on('trade:request', (targetName: string) => {
    if (!playerName) return;
    pendingTrades.set(playerName, targetName);
    console.log(`${playerName} wants to trade with ${targetName}`);

    const otherRequest = pendingTrades.get(targetName);
    if (otherRequest === playerName) {
      pendingTrades.delete(playerName);
      pendingTrades.delete(targetName);

      const tradeId = uuidv4();
      const trade: ActiveTrade = {
        id: tradeId,
        player1: playerName,
        player2: targetName,
        player1Pokemon: null,
        player2Pokemon: null,
        player1Confirmed: false,
        player2Confirmed: false,
      };
      activeTrades.set(tradeId, trade);

      const socket1 = connectedPlayers.get(playerName);
      const socket2 = connectedPlayers.get(targetName);
      if (socket1) io.to(socket1).emit('trade:matched', { tradeId, partner: targetName });
      if (socket2) io.to(socket2).emit('trade:matched', { tradeId, partner: playerName });
      console.log(`Trade matched: ${playerName} <-> ${targetName} (${tradeId})`);
    } else {
      socket.emit('trade:waiting', { target: targetName });
      const targetSocket = connectedPlayers.get(targetName);
      if (targetSocket) io.to(targetSocket).emit('trade:incoming', { from: playerName });
    }
  });

  socket.on('trade:cancel', () => {
    if (!playerName) return;
    pendingTrades.delete(playerName);
    socket.emit('trade:cancelled');
  });

  socket.on('trade:selectPokemon', ({ tradeId, pokemonId }: { tradeId: string; pokemonId: number }) => {
    if (!playerName) return;
    const trade = activeTrades.get(tradeId);
    if (!trade) return;

    if (trade.player1 === playerName) {
      trade.player1Pokemon = pokemonId;
      trade.player1Confirmed = false;
    } else if (trade.player2 === playerName) {
      trade.player2Pokemon = pokemonId;
      trade.player2Confirmed = false;
    }

    // Notify both when both have selected
    if (trade.player1Pokemon !== null && trade.player2Pokemon !== null) {
      const socket1 = connectedPlayers.get(trade.player1);
      const socket2 = connectedPlayers.get(trade.player2);
      const data = {
        tradeId,
        player1Pokemon: trade.player1Pokemon,
        player2Pokemon: trade.player2Pokemon,
      };
      if (socket1) io.to(socket1).emit('trade:bothSelected', data);
      if (socket2) io.to(socket2).emit('trade:bothSelected', data);
    } else {
      socket.emit('trade:waitingForPartner');
    }
  });

  socket.on('trade:confirm', ({ tradeId }: { tradeId: string }) => {
    if (!playerName) return;
    const trade = activeTrades.get(tradeId);
    if (!trade) return;

    if (trade.player1 === playerName) trade.player1Confirmed = true;
    else if (trade.player2 === playerName) trade.player2Confirmed = true;

    if (trade.player1Confirmed && trade.player2Confirmed) {
      const socket1 = connectedPlayers.get(trade.player1);
      const socket2 = connectedPlayers.get(trade.player2);
      const data = {
        tradeId,
        player1: trade.player1,
        player2: trade.player2,
        player1Pokemon: trade.player1Pokemon,
        player2Pokemon: trade.player2Pokemon,
      };
      if (socket1) io.to(socket1).emit('trade:execute', data);
      if (socket2) io.to(socket2).emit('trade:execute', data);
      activeTrades.delete(tradeId);
      tradesTotal.inc();
      console.log(`Trade executed: ${trade.player1} <-> ${trade.player2}`);
    } else {
      socket.emit('trade:waitingConfirm');
    }
  });

  socket.on('disconnect', () => {
    if (playerName) {
      connectedPlayers.delete(playerName);
      playersOnline.set(connectedPlayers.size);
      pendingChallenges.delete(playerName);
      pendingChallengeConfigs.delete(playerName);
      pendingTrades.delete(playerName);
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

// Serve built client files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(BASE_PATH || '/', express.static(clientDistPath));
  app.get(`${BASE_PATH}/*`, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
