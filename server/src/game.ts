// Game logic: essence, evolution, boxes, trading

import type { Pokemon, BoxTier } from '../../shared/types.js';

// Tier-based strength values
const TIER_STRENGTH: Record<BoxTier, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  legendary: 100,
};

// Essence gained per battle = base + sum of opponent team tier values
const BATTLE_BASE_ESSENCE = 20;

export function calculateBattleEssence(opponentTeam: Pokemon[]): number {
  const teamStrength = opponentTeam.reduce(
    (sum, p) => sum + TIER_STRENGTH[p.tier], 0
  );
  return BATTLE_BASE_ESSENCE + teamStrength;
}

// Essence gained from releasing a Pokémon
const RELEASE_BASE: Record<BoxTier, number> = {
  common: 5,
  uncommon: 15,
  rare: 35,
  legendary: 75,
};

// Evolution stage multiplier: base=1x, stage1=2x, stage2=3x
export function calculateReleaseEssence(pokemon: Pokemon): number {
  let stage = 0;
  if (pokemon.evolutionFrom !== undefined) {
    stage = 1;
    // If it evolved from something that also has an evolutionFrom, it's stage 2
    // For simplicity, we check the name pattern or rely on caller
  }
  return RELEASE_BASE[pokemon.tier] * (stage + 1);
}

export function calculateReleaseEssenceWithStage(tier: BoxTier, evolutionStage: number): number {
  return RELEASE_BASE[tier] * (evolutionStage + 1);
}

// Box costs
export const BOX_COSTS: Record<BoxTier, number> = {
  common: 30,
  uncommon: 75,
  rare: 150,
  legendary: 300,
};

// Starting essence (enough for one common box)
export const STARTING_ESSENCE = BOX_COSTS.common;
