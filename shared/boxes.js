// Box opening logic — picks 5 random base-form Pokémon from a themed pack pool
// with rarity-weighted selection
import { POKEMON } from './pokemon-data';
import { PACKS_BY_ID } from './pack-data';
import { ALL_MOVE_NAMES } from './move-data';
const POKEMON_BY_ID_MAP = new Map(POKEMON.map((p) => [p.id, p]));
export const DEFAULT_RARITY_WEIGHTS = {
    common: 50,
    uncommon: 30,
    rare: 13,
    epic: 5,
    legendary: 2,
};
export const CARDS_PER_PACK = 5;
function weightedPickFromPool(pool, weights) {
    // Build weighted pool: each pokemon's weight is determined by its tier
    const weighted = [];
    let totalWeight = 0;
    for (const p of pool) {
        const w = weights[p.tier] ?? 0;
        if (w > 0) {
            weighted.push({ pokemon: p, weight: w });
            totalWeight += w;
        }
    }
    if (totalWeight === 0) {
        // Fallback: equal weight
        return pool[Math.floor(Math.random() * pool.length)];
    }
    let roll = Math.random() * totalWeight;
    for (const entry of weighted) {
        roll -= entry.weight;
        if (roll <= 0)
            return entry.pokemon;
    }
    return weighted[weighted.length - 1].pokemon;
}
export function openPack(packId, rarityWeights) {
    const pack = PACKS_BY_ID[packId];
    if (!pack)
        return [];
    const weights = rarityWeights ?? DEFAULT_RARITY_WEIGHTS;
    // Build pool of base-form Pokemon in this pack
    const pool = pack.pool
        .map((id) => POKEMON_BY_ID_MAP.get(id))
        .filter((p) => p !== undefined && p.evolutionFrom === undefined);
    if (pool.length === 0)
        return [];
    const result = [];
    for (let i = 0; i < CARDS_PER_PACK; i++) {
        result.push(weightedPickFromPool(pool, weights));
    }
    // Sort from least to most rare
    const RARITY_ORDER = {
        common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
    };
    result.sort((a, b) => RARITY_ORDER[a.tier] - RARITY_ORDER[b.tier]);
    return result;
}
export function getPackPoolSize(packId) {
    const pack = PACKS_BY_ID[packId];
    if (!pack)
        return 0;
    return pack.pool.filter((id) => {
        const p = POKEMON_BY_ID_MAP.get(id);
        return p && p.evolutionFrom === undefined;
    }).length;
}
// --- Legacy API for story mode rewards (kept for backward compat) ---
function getBaseFormsForTier(tier) {
    return POKEMON.filter((p) => p.tier === tier && p.evolutionFrom === undefined);
}
export function openBox(tier) {
    const pool = getBaseFormsForTier(tier);
    if (pool.length === 0)
        return [];
    const result = [];
    for (let i = 0; i < 3; i++) {
        result.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return result;
}
export function getPoolSize(tier) {
    return getBaseFormsForTier(tier).length;
}
// TM rolling (used by story mode rewards)
export function rollTM() {
    return ALL_MOVE_NAMES[Math.floor(Math.random() * ALL_MOVE_NAMES.length)];
}
