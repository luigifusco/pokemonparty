// Ability / item effect matrix
// ====================================================================
// Data-driven tables for ability-based immunities, damage multipliers,
// and item modifiers. Consumed by scoring.ts as hard filters or score
// multipliers.

/** Defensive abilities that make specific move types deal zero damage. */
export const ABILITY_IMMUNE_BY_TYPE: Record<string, string[]> = {
  Fire: ['Flash Fire'],
  Water: ['Water Absorb', 'Dry Skin', 'Storm Drain'],
  Electric: ['Volt Absorb', 'Lightning Rod', 'Motor Drive'],
  Grass: ['Sap Sipper'],
  Ground: ['Levitate'],
};

/** Abilities that grant full immunity to categories of moves. */
export function isMoveAbilityImmune(moveType: string, moveFlags: any, moveCategory: string, ability: string): boolean {
  if (!ability) return false;
  const list = ABILITY_IMMUNE_BY_TYPE[moveType];
  if (list && list.includes(ability)) return true;
  if (ability === 'Bulletproof' && (moveFlags?.bullet || moveFlags?.bomb)) return true;
  if (ability === 'Soundproof' && moveFlags?.sound) return true;
  if (ability === 'Good as Gold' && moveCategory === 'Status') return true;
  return false;
}

/** Defensive abilities that resist (but don't immune) a move type. */
export function abilityResistMult(moveType: string, ability: string): number {
  if (!ability) return 1;
  if (ability === 'Thick Fat' && (moveType === 'Fire' || moveType === 'Ice')) return 0.5;
  if (ability === 'Heatproof' && moveType === 'Fire') return 0.5;
  if (ability === 'Dry Skin' && moveType === 'Fire') return 1.25;
  if (ability === 'Fluffy' && moveType === 'Fire') return 2.0; // takes extra damage — skip for now; leave as 1
  return 1;
}

/** Offensive abilities that boost the user's move damage. */
export function abilityOffenseMult(params: {
  ability: string;
  moveType: string;
  moveBP: number;
  moveFlags: any;
  moveCategory: string;
  hasSecondary: boolean;
  selfTypes: string[];
  selfHpPct: number;
  selfHasStatus: boolean;
}): number {
  const { ability, moveType, moveBP, moveFlags, hasSecondary, selfTypes, selfHpPct, selfHasStatus } = params;
  if (!ability) return 1;
  let m = 1;

  if (ability === 'Adaptability' && selfTypes.includes(moveType)) m *= 4 / 3; // STAB becomes 2x instead of 1.5x; net ×4/3
  if (ability === 'Technician' && moveBP > 0 && moveBP <= 60) m *= 1.5;
  if (ability === 'Sheer Force' && hasSecondary) m *= 1.3;
  if (ability === 'Tough Claws' && moveFlags?.contact) m *= 1.3;
  if (ability === 'Iron Fist' && moveFlags?.punch) m *= 1.2;
  if (ability === 'Strong Jaw' && moveFlags?.bite) m *= 1.5;
  if (ability === 'Mega Launcher' && moveFlags?.pulse) m *= 1.5;
  if (ability === 'Reckless' && (moveFlags?.recoil || moveFlags?.crash)) m *= 1.2;
  if (ability === 'Sand Force' && (moveType === 'Rock' || moveType === 'Ground' || moveType === 'Steel')) m *= 1.3;
  if (ability === 'Solar Power' && moveType !== 'Status') m *= 1.5; // only in sun — caller decides
  if (ability === 'Analytic') m *= 1.3; // assume slow — caller decides
  if (ability === 'Guts' && selfHasStatus) m *= 1.5;
  if (ability === 'Huge Power' || ability === 'Pure Power') m *= 2;

  // Low-HP boosters
  if (selfHpPct < 1 / 3) {
    if (ability === 'Blaze' && moveType === 'Fire') m *= 1.5;
    if (ability === 'Torrent' && moveType === 'Water') m *= 1.5;
    if (ability === 'Overgrow' && moveType === 'Grass') m *= 1.5;
    if (ability === 'Swarm' && moveType === 'Bug') m *= 1.5;
  }
  return m;
}

/** Item damage/risk modifiers. */
export function itemDamageMult(item: string, moveCategory: string, moveType: string, selfTypes: string[], isSE: boolean): number {
  if (!item) return 1;
  if (item === 'Life Orb') return 1.3;
  if (item === 'Choice Band' && moveCategory === 'Physical') return 1.5;
  if (item === 'Choice Specs' && moveCategory === 'Special') return 1.5;
  if (item === 'Expert Belt' && isSE) return 1.2;
  if (item === 'Muscle Band' && moveCategory === 'Physical') return 1.1;
  if (item === 'Wise Glasses' && moveCategory === 'Special') return 1.1;
  // Type-boost plates/incenses (generic ×1.2)
  const TYPE_PLATES: Record<string, string> = {
    'Flame Plate': 'Fire', 'Splash Plate': 'Water', 'Zap Plate': 'Electric',
    'Meadow Plate': 'Grass', 'Icicle Plate': 'Ice', 'Fist Plate': 'Fighting',
    'Toxic Plate': 'Poison', 'Earth Plate': 'Ground', 'Sky Plate': 'Flying',
    'Mind Plate': 'Psychic', 'Insect Plate': 'Bug', 'Stone Plate': 'Rock',
    'Spooky Plate': 'Ghost', 'Draco Plate': 'Dragon', 'Dread Plate': 'Dark',
    'Iron Plate': 'Steel', 'Pixie Plate': 'Fairy',
  };
  if (TYPE_PLATES[item] === moveType) return 1.2;
  return 1;
}

/** Recoil fraction for recoil-tagged moves (used for recoil penalty). */
export const DAMAGING_RECOIL: Record<string, number> = {
  doubleedge: 0.33,
  takedown: 0.25,
  bravebird: 0.33,
  flareblitz: 0.33,
  volttackle: 0.33,
  woodhammer: 0.33,
  headsmash: 0.5,
  submission: 0.25,
  headcharge: 0.25,
  struggle: 0.25,
};
