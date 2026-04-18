// Box opening logic — picks random base-form Pokémon from a themed pack pool
// with tier-weighted selection

import type { Pokemon, BoxTier, PackId } from './types';
import { POKEMON } from './pokemon-data';
import { PACKS_BY_ID, PACK_TIERS_BY_ID } from './pack-data';
import type { PackTierId } from './types';
import { ALL_MOVE_NAMES } from './move-data';

const POKEMON_BY_ID_MAP = new Map(POKEMON.map((p) => [p.id, p]));

function weightedPickFromPool(
  pool: Pokemon[],
  weights: Record<BoxTier, number>,
  excludeIds?: Set<number>,
): Pokemon | null {
  let totalWeight = 0;
  const weighted: { pokemon: Pokemon; weight: number }[] = [];
  for (const p of pool) {
    if (excludeIds && excludeIds.has(p.id)) continue;
    const w = weights[p.tier] ?? 0;
    if (w > 0) {
      weighted.push({ pokemon: p, weight: w });
      totalWeight += w;
    }
  }
  if (totalWeight === 0) {
    // Fall back to any non-excluded pokemon regardless of weight so we never
    // return null when the pool still has something to give.
    const fallback = pool.filter((p) => !excludeIds?.has(p.id));
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  let roll = Math.random() * totalWeight;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.pokemon;
  }
  return weighted[weighted.length - 1].pokemon;
}

export interface PackResult {
  pokemon: Pokemon[];
  bonusTMs: string[];
  bonusItems: string[];
}

export function openPack(packId: PackId, tierId: PackTierId): PackResult {
  const pack = PACKS_BY_ID[packId];
  const tier = PACK_TIERS_BY_ID[tierId];
  if (!pack || !tier) return { pokemon: [], bonusTMs: [], bonusItems: [] };

  // Build pool of base-form Pokemon in this pack
  const pool = pack.pool
    .map((id) => POKEMON_BY_ID_MAP.get(id))
    .filter((p): p is Pokemon => p !== undefined && p.evolutionFrom === undefined);

  if (pool.length === 0) return { pokemon: [], bonusTMs: [], bonusItems: [] };

  // Intersect tier weights with what's actually in the pool, so e.g. a
  // Master pack on a pool with no legendaries doesn't waste weight budget.
  const poolTiers = new Set(pool.map((p) => p.tier));
  const weights: Record<BoxTier, number> = { ...tier.weights };
  for (const t of Object.keys(weights) as BoxTier[]) {
    if (!poolTiers.has(t)) weights[t] = 0;
  }

  // Dedupe where we can: reroll a duplicate up to a few times; if the pool is
  // smaller than the card count we accept the dupes (small pools like Frozen
  // Tundra have ~6 base forms).
  const picked: Pokemon[] = [];
  const seen = new Set<number>();
  const allowDupes = pool.length < tier.cards;

  for (let i = 0; i < tier.cards; i++) {
    let pick: Pokemon | null = null;
    const tries = allowDupes ? 1 : 6;
    for (let r = 0; r < tries; r++) {
      pick = weightedPickFromPool(pool, weights, allowDupes ? undefined : seen);
      if (pick && (allowDupes || !seen.has(pick.id))) break;
    }
    if (!pick) pick = weightedPickFromPool(pool, weights);
    if (!pick) break;
    picked.push(pick);
    seen.add(pick.id);
  }

  // Pity: Ultra/Master guarantee at least one epic+ card when the pool can
  // supply one.
  if (tier.guaranteedHighTier && picked.length > 0) {
    const hasHigh = picked.some((p) => p.tier === 'epic' || p.tier === 'legendary');
    if (!hasHigh) {
      const upgradePool = pool.filter((p) => p.tier === 'epic' || p.tier === 'legendary');
      if (upgradePool.length > 0) {
        const upgrade = upgradePool[Math.floor(Math.random() * upgradePool.length)];
        picked[picked.length - 1] = upgrade;
      }
    }
  }

  // Sort from least to most rare for the reveal animation
  const RARITY_ORDER: Record<BoxTier, number> = {
    common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
  };
  picked.sort((a, b) => RARITY_ORDER[a.tier] - RARITY_ORDER[b.tier]);

  // Bonus TMs
  const bonusTMs: string[] = [];
  if (pack.tmPool.length > 0) {
    for (let i = 0; i < tier.bonusTmCount; i++) {
      bonusTMs.push(pack.tmPool[Math.floor(Math.random() * pack.tmPool.length)]);
    }
  }

  // Bonus held items
  const bonusItems: string[] = [];
  if (pack.itemPool.length > 0) {
    for (let i = 0; i < tier.bonusItemCount; i++) {
      bonusItems.push(pack.itemPool[Math.floor(Math.random() * pack.itemPool.length)]);
    }
  }

  return { pokemon: picked, bonusTMs, bonusItems };
}

export function getPackPoolSize(packId: PackId): number {
  const pack = PACKS_BY_ID[packId];
  if (!pack) return 0;
  return pack.pool.filter((id) => {
    const p = POKEMON_BY_ID_MAP.get(id);
    return p && p.evolutionFrom === undefined;
  }).length;
}

// --- Legacy API for story mode rewards (kept for backward compat) ---

function getBaseFormsForTier(tier: BoxTier): Pokemon[] {
  return POKEMON.filter((p) => p.tier === tier && p.evolutionFrom === undefined);
}

export function openBox(tier: BoxTier): Pokemon[] {
  const pool = getBaseFormsForTier(tier);
  if (pool.length === 0) return [];

  const result: Pokemon[] = [];
  for (let i = 0; i < 3; i++) {
    result.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return result;
}

export function getPoolSize(tier: BoxTier): number {
  return getBaseFormsForTier(tier).length;
}

// TM rolling (used by story mode rewards)

export function rollTM(): string {
  return ALL_MOVE_NAMES[Math.floor(Math.random() * ALL_MOVE_NAMES.length)];
}
