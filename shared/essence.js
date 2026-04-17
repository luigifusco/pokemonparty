// Client-side essence calculations (mirrors server logic)
import { PACKS } from './pack-data';
const TIER_STRENGTH = {
    common: 10,
    uncommon: 25,
    rare: 50,
    epic: 100,
    legendary: 200,
};
const BATTLE_BASE_ESSENCE = 20;
export function calculateBattleEssence(opponentTeam) {
    const teamStrength = opponentTeam.reduce((sum, p) => sum + TIER_STRENGTH[p.tier], 0);
    return BATTLE_BASE_ESSENCE + teamStrength;
}
const RELEASE_BASE = {
    common: 5,
    uncommon: 15,
    rare: 35,
    epic: 75,
    legendary: 150,
};
export function calculateReleaseEssence(tier, evolutionStage) {
    return RELEASE_BASE[tier] * (evolutionStage + 1);
}
// Pack costs are defined per-pack in pack-data.ts
export const PACK_COSTS = Object.fromEntries(PACKS.map((p) => [p.id, p.cost]));
// Legacy BOX_COSTS kept for story mode rewards
export const BOX_COSTS = {
    common: 30,
    uncommon: 75,
    rare: 150,
    epic: 300,
    legendary: 600,
};
export const STARTING_ESSENCE = 100;
