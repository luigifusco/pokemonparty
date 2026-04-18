// Move scoring (Phase 2-4)
// ====================================================================
// Score each usable move for a given active slot using:
//   - Real damage estimates from @smogon/calc (when possible)
//   - Ability immunity / multiplier matrix
//   - Status / setup / hazard valuations driven by target stats
//   - Character profile weights
// Falls back to a simple heuristic if the calc fails (unknown species etc).

import type { MoveCtx, ScoredMove } from './types.js';
import { applyHardFilters } from './policies.js';
import { estimateDamage } from './damage.js';
import {
  isMoveAbilityImmune,
  abilityResistMult,
  abilityOffenseMult,
  itemDamageMult,
  DAMAGING_RECOIL,
} from './abilityMatrix.js';

// ── Static tables ──────────────────────────────────────────────────

const SETUP_BASE: Record<string, { atk?: number; spa?: number; spe?: number; def?: number; spd?: number }> = {
  swordsdance: { atk: 2 },
  nastyplot: { spa: 2 },
  dragondance: { atk: 1, spe: 1 },
  quiverdance: { spa: 1, spd: 1, spe: 1 },
  calmmind: { spa: 1, spd: 1 },
  bulkup: { atk: 1, def: 1 },
  agility: { spe: 2 },
  rockpolish: { spe: 2 },
  shellsmash: { atk: 2, spa: 2, spe: 2, def: -1, spd: -1 },
  tailglow: { spa: 3 },
  shiftgear: { atk: 1, spe: 2 },
  workup: { atk: 1, spa: 1 },
  growth: { atk: 1, spa: 1 },
  cosmicpower: { def: 1, spd: 1 },
  irondefense: { def: 2 },
  amnesia: { spd: 2 },
  acidarmor: { def: 2 },
  barrier: { def: 2 },
  stockpile: { def: 1, spd: 1 },
  bellydrum: { atk: 6 },
};

const HAZARD_LAYER_DAMAGE: Record<string, (layers: number) => number> = {
  stealthrock: () => 1 / 8,
  spikes: (l) => (l === 1 ? 1 / 8 : l === 2 ? 1 / 6 : 1 / 4),
  toxicspikes: (l) => (l === 1 ? 1 / 16 : 1 / 8),
  stickyweb: () => 0,
};

// ── Helpers ────────────────────────────────────────────────────────

function getTypes(p: any): string[] {
  if (!p) return [];
  if (typeof p.getTypes === 'function') return p.getTypes();
  return p.types || [];
}

function hpPct(p: any): number {
  if (!p || !p.maxhp) return 1;
  return p.hp / p.maxhp;
}

function abilityName(battle: any, p: any): string {
  if (!p?.ability) return '';
  return battle.dex.abilities.get(p.ability)?.name || '';
}

function itemName(battle: any, p: any): string {
  if (!p?.item) return '';
  return battle.dex.items.get(p.item)?.name || '';
}

function typeEffectiveness(dex: any, moveType: string, targetTypes: string[]): number {
  let eff = 1;
  for (const ttype of targetTypes) {
    const dt = dex.types.get(ttype)?.damageTaken?.[moveType];
    if (dt === 1) eff *= 2;
    else if (dt === 2) eff *= 0.5;
    else if (dt === 3) eff *= 0;
  }
  return eff;
}

// ── Damage scoring via calc (with heuristic fallback) ──────────────

function damageScore(move: any, md: any, ctx: MoveCtx): { score: number; koChance: number; recoilFrac: number; isSE: boolean } {
  const target = ctx.target;
  if (!target) return { score: 0.1, koChance: 0, recoilFrac: 0, isSE: false };

  const moveType = md.type;
  const targetTypes = getTypes(target);
  const selfTypes = getTypes(ctx.selfPkmn);
  const selfAbility = abilityName(ctx.battle, ctx.selfPkmn);
  const targetAbility = abilityName(ctx.battle, target);
  const selfItem = itemName(ctx.battle, ctx.selfPkmn);

  // Ability full immunity
  if (isMoveAbilityImmune(moveType, md.flags, md.category, targetAbility)) {
    return { score: 0, koChance: 0, recoilFrac: 0, isSE: false };
  }

  const est = estimateDamage(ctx.battle, ctx.selfPkmn, target, move.id);
  const eff = typeEffectiveness(ctx.dex, moveType, targetTypes);
  const isSE = eff >= 2;

  let score: number;
  let koChance: 0 | 0.5 | 1 = 0;

  if (est) {
    const offMul = abilityOffenseMult({
      ability: selfAbility,
      moveType,
      moveBP: md.basePower || 0,
      moveFlags: md.flags,
      moveCategory: md.category,
      hasSecondary: !!(md.secondary || md.secondaries?.length),
      selfTypes,
      selfHpPct: hpPct(ctx.selfPkmn),
      selfHasStatus: !!ctx.selfPkmn?.status,
    });
    const itemMul = itemDamageMult(selfItem, md.category, moveType, selfTypes, isSE);
    const defResist = abilityResistMult(moveType, targetAbility);
    const adjAvgFrac = Math.min(2, est.avgFrac * offMul * itemMul * defResist);

    score = adjAvgFrac * est.accFactor;
    koChance = est.koChance;

    if (!koChance && target.hp) {
      const effectiveMin = est.min * offMul * itemMul * defResist;
      const effectiveAvg = est.avg * offMul * itemMul * defResist;
      if (effectiveMin >= target.hp) koChance = 1;
      else if (effectiveAvg >= target.hp) koChance = 0.5;
    }
  } else {
    const bp = md.basePower || 0;
    const bpScore = bp > 0 ? Math.min(1.5, bp / 100) : 0.3;
    const stab = selfTypes.includes(moveType) ? 1.5 : 1.0;
    const rawAcc = md.accuracy === true || md.accuracy === undefined ? 1 : Math.max(0.3, (md.accuracy as number) / 100);
    score = bpScore * stab * eff * rawAcc;
    if (hpPct(target) < 0.3) koChance = 0.5;
  }

  const recoilFrac = DAMAGING_RECOIL[(md.id || '').toLowerCase()] || 0;
  return { score, koChance, recoilFrac, isSE };
}

// ── Status-move valuation ──────────────────────────────────────────

function statusValue(move: any, md: any, ctx: MoveCtx): number {
  if (md.category !== 'Status') return 0;
  const id = (md.id || '').toLowerCase();
  const t = ctx.target;
  if (!t) return 0;

  if (md.status) {
    switch (md.status) {
      case 'tox': return 1.0;
      case 'psn': return 0.6;
      case 'brn': {
        const atkStat = t.storedStats?.atk ?? t.baseStoredStats?.atk ?? 100;
        const spaStat = t.storedStats?.spa ?? t.baseStoredStats?.spa ?? 100;
        return atkStat > spaStat ? 1.2 : 0.8;
      }
      case 'par': {
        const tSpe = t.storedStats?.spe ?? 100;
        const sSpe = ctx.selfPkmn?.storedStats?.spe ?? 100;
        return tSpe > sSpe ? 1.1 : 0.7;
      }
      case 'slp': return 1.4;
      case 'frz': return 1.2;
    }
  }

  if (md.volatileStatus) {
    switch (md.volatileStatus) {
      case 'confusion': return 0.5;
      case 'taunt': return 0.7;
      case 'encore': return 0.7;
      case 'disable': return 0.5;
      case 'leechseed': return 0.8;
      case 'yawn': return 0.9;
    }
  }

  if (id === 'leechseed' && !getTypes(t).includes('Grass')) return 0.8;

  if (md.boosts && md.target !== 'self' && md.target !== 'adjacentAllyOrSelf') {
    const entries = Object.entries(md.boosts) as [string, number][];
    const total = entries.reduce((s, [, v]) => s + Math.max(0, -v), 0);
    return total * 0.25;
  }

  return 0;
}

// ── Setup-move valuation ───────────────────────────────────────────

function setupValue(move: any, md: any, ctx: MoveCtx): number {
  const id = (md.id || '').toLowerCase();
  const boosts = SETUP_BASE[id];
  if (!boosts) return 0;

  const atkBoost = (boosts.atk || 0) + (boosts.spa || 0);
  const spdBoost = boosts.spe || 0;
  const defBoost = (boosts.def || 0) + (boosts.spd || 0);
  const negBoost = Object.values(boosts).reduce<number>((s, v) => s + (v! < 0 ? v! : 0), 0);

  let base = atkBoost * 0.35 + spdBoost * 0.2 + defBoost * 0.15 + negBoost * 0.2;

  const shp = hpPct(ctx.selfPkmn);
  if (shp < 0.35) base *= 0.2;

  const thp = hpPct(ctx.target);
  if (thp < 0.25) base *= 0.3;

  if (ctx.oppAlive === 1 && thp < 0.3) base *= 0.3;

  if (id === 'bellydrum') base = shp > 0.6 ? 2.0 : 0.3;

  return Math.max(0, base);
}

// ── Hazard-move valuation ──────────────────────────────────────────

function hazardValue(move: any, md: any, ctx: MoveCtx): number {
  if (!md.sideCondition) return 0;
  const id = (md.sideCondition || '').toLowerCase();
  const oppCond = ctx.oppSide.sideConditions || {};

  const benchAlive = ctx.oppSide.pokemon.filter((p: any) => !p.fainted && !p.isActive).length;
  if (benchAlive === 0) return 0.1;

  const dmgFn = HAZARD_LAYER_DAMAGE[id];
  if (!dmgFn) return 0;

  const curLayers = oppCond[id]?.layers || (oppCond[id] ? 1 : 0);
  const perEntry = dmgFn(curLayers + 1);
  return perEntry * benchAlive * 2;
}

// ── Full move score ────────────────────────────────────────────────

export function scoreMove(move: any, ctx: MoveCtx): ScoredMove {
  const md = ctx.dex.moves.get(move.id);
  if (!md) return { move, score: 1 };

  const filtered = applyHardFilters(move, md, ctx);
  if (filtered) return { move, score: 0, filteredBy: filtered };

  const profile = ctx.profile;
  let total = 0;

  if (md.category !== 'Status') {
    const { score: dmg, koChance, recoilFrac } = damageScore(move, md, ctx);
    let dmgComp = dmg * profile.damageWeight;

    if (koChance >= 1) dmgComp += profile.koBonus;
    else if (koChance >= 0.5) dmgComp += profile.koBonus * 0.5;

    if (recoilFrac > 0) {
      dmgComp *= 1 - recoilFrac * (1 - profile.recoilTolerance);
    }

    const rawAcc = md.accuracy === true || md.accuracy === undefined ? 100 : (md.accuracy as number);
    if (rawAcc < 100) {
      const extraPenalty = (1 - profile.riskTolerance) * (1 - rawAcc / 100);
      dmgComp *= 1 - extraPenalty;
    }

    if ((md.priority || 0) > 0) {
      dmgComp *= 1 + profile.priorityBias;
      if (koChance >= 0.5) dmgComp *= 1.3;
    }

    total += dmgComp;
  }

  total += statusValue(move, md, ctx) * profile.statusWeight;
  total += setupValue(move, md, ctx) * profile.setupWeight;
  total += hazardValue(move, md, ctx) * profile.hazardWeight;

  if (total <= 0) total = 0.01;

  return { move, score: total };
}

// ── Priority-KO bypass ─────────────────────────────────────────────
// If any priority move guarantees a KO, pick it immediately (argmax)
// regardless of profile temperature. Returns null if no such move.
export function priorityKOBypass(scored: ScoredMove[], ctx: MoveCtx): ScoredMove | null {
  let best: ScoredMove | null = null;
  let bestScore = -1;
  for (const s of scored) {
    const md = ctx.dex.moves.get(s.move.id);
    if (!md) continue;
    if ((md.priority || 0) <= 0) continue;
    if (s.score <= 0) continue;
    // Re-check KO against current target
    if (!ctx.target) continue;
    const est = estimateDamage(ctx.battle, ctx.selfPkmn, ctx.target, s.move.id);
    if (!est) continue;
    if (est.min < ctx.target.hp) continue; // not a guaranteed KO
    if (s.score > bestScore) { best = s; bestScore = s.score; }
  }
  return best;
}

// ── Softmax pick ───────────────────────────────────────────────────

export function pickMove(scored: ScoredMove[], temperature: number): ScoredMove {
  const viable = scored.filter(s => s.score > 0);
  const pool = viable.length > 0 ? viable : scored.map(s => ({ ...s, score: 1 }));
  if (pool.length === 1) return pool[0];

  if (temperature <= 0.001) {
    let best = pool[0];
    for (const s of pool) if (s.score > best.score) best = s;
    return best;
  }

  const logScores = pool.map(s => Math.log(s.score + 1e-9) / temperature);
  const maxLog = Math.max(...logScores);
  const exps = logScores.map(l => Math.exp(l - maxLog));
  const total = exps.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= exps[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
