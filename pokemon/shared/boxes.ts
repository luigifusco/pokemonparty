// Box opening logic — picks 3 random base-form Pokémon from the tier pool

import type { Pokemon, BoxTier } from './types';
import { POKEMON } from './pokemon-data';

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
