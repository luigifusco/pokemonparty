// Thematic pack definitions
// Each pack contains a curated pool of base-form Pokemon across multiple rarities.

import type { PackDef } from './types';

export const PACKS: PackDef[] = [
  {
    id: 'tidal-wave',
    name: 'Tidal Wave',
    description: 'Water & coastal Pokémon',
    icon: '🌊',
    baseCost: 100,
    pool: [7, 54, 60, 72, 79, 86, 90, 98, 116, 118, 120, 129, 131, 138, 140, 158, 170, 194, 211, 222, 223, 245, 258, 270, 278, 283, 318, 320, 339, 341, 349, 363, 366, 369, 370, 382, 393, 418, 422, 456, 458, 484, 489, 490, 501, 515, 535, 550, 564, 580, 592, 594, 647],
    tmPool: ['Surf', 'Hydro Pump', 'Aqua Tail', 'Scald', 'Muddy Water', 'Brine', 'Blizzard', 'Ice Beam', 'Bounce', 'Rain Dance'],
    itemPool: ['leftovers', 'shell-bell', 'choice-specs', 'wise-glasses'],
  },
  {
    id: 'inferno',
    name: 'Inferno',
    description: 'Fire & heat Pokémon',
    icon: '🔥',
    baseCost: 120,
    pool: [4, 37, 58, 77, 146, 155, 218, 228, 240, 244, 250, 255, 322, 324, 390, 485, 494, 498, 513, 554, 607, 631, 636, 643],
    tmPool: ['Fire Blast', 'Solar Beam', 'Will-O-Wisp', 'Outrage', 'Close Combat', 'Earthquake', 'Sunny Day'],
    itemPool: ['choice-band', 'life-orb', 'flame-orb', 'muscle-band'],
  },
  {
    id: 'overgrowth',
    name: 'Overgrowth',
    description: 'Grass & nature Pokémon',
    icon: '🌿',
    baseCost: 80,
    pool: [1, 43, 46, 69, 102, 114, 152, 187, 191, 251, 252, 270, 273, 285, 331, 345, 357, 387, 406, 420, 455, 459, 492, 495, 511, 540, 546, 548, 556, 585, 590, 597, 640],
    tmPool: ['Solar Beam', 'Energy Ball', 'Power Whip', 'Petal Dance', 'Wood Hammer', 'Sleep Powder', 'Sludge Bomb'],
    itemPool: ['leftovers', 'sitrus-berry', 'black-sludge', 'eviolite'],
  },
  {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    description: 'Electric & weather Pokémon',
    icon: '⚡',
    baseCost: 100,
    pool: [81, 100, 145, 170, 172, 179, 239, 243, 309, 311, 312, 403, 417, 479, 522, 587, 595, 602, 618, 642, 644],
    tmPool: ['Thunder', 'Thunderbolt', 'Wild Charge', 'Volt Tackle', 'Thunder Wave', 'Signal Beam', 'Zap Cannon', 'Charge Beam', 'Spark'],
    itemPool: ['choice-scarf', 'life-orb', 'expert-belt', 'lum-berry'],
  },
  {
    id: 'deep-cavern',
    name: 'Deep Cavern',
    description: 'Rock & ground Pokémon',
    icon: '⛏️',
    baseCost: 90,
    pool: [27, 50, 74, 95, 104, 111, 138, 140, 142, 194, 207, 213, 220, 222, 231, 246, 290, 299, 304, 322, 328, 337, 338, 339, 343, 345, 347, 369, 377, 383, 408, 410, 438, 443, 449, 524, 529, 551, 557, 564, 566, 618, 622, 639, 645],
    tmPool: ['Earthquake', 'Stone Edge', 'Earth Power', 'Rock Slide', 'Dig', 'Iron Head', 'Stealth Rock', 'Sandstorm', 'Spikes'],
    itemPool: ['rocky-helmet', 'choice-band', 'muscle-band', 'eviolite'],
  },
  {
    id: 'twilight',
    name: 'Twilight',
    description: 'Dark, ghost & psychic Pokémon',
    icon: '🌑',
    baseCost: 110,
    pool: [63, 79, 92, 96, 102, 150, 151, 177, 198, 200, 201, 203, 215, 228, 238, 249, 251, 261, 280, 302, 307, 318, 325, 337, 338, 343, 353, 355, 359, 360, 374, 380, 381, 385, 386, 425, 433, 434, 436, 439, 442, 479, 480, 481, 482, 487, 488, 491, 494, 509, 517, 527, 551, 559, 561, 562, 570, 574, 577, 592, 605, 607, 622, 624, 629, 633, 648],
    tmPool: ['Shadow Ball', 'Dark Pulse', 'Psychic', 'Dream Eater', 'Nasty Plot', 'Calm Mind', 'Hypnosis', 'Crunch', 'Foul Play', 'Future Sight', 'Zen Headbutt'],
    itemPool: ['choice-specs', 'wise-glasses', 'life-orb', 'focus-sash'],
  },
  {
    id: 'brawler',
    name: 'Brawler',
    description: 'Fighting & martial Pokémon',
    icon: '🥊',
    baseCost: 100,
    pool: [56, 66, 214, 236, 296, 307, 447, 453, 532, 538, 539, 559, 619, 638, 639, 640, 647],
    tmPool: ['Close Combat', 'Cross Chop', 'Brick Break', 'Focus Blast', 'Dynamic Punch', 'Bulk Up', 'Swords Dance'],
    itemPool: ['choice-band', 'muscle-band', 'focus-sash', 'expert-belt'],
  },
  {
    id: 'sky-legends',
    name: 'Sky Legends',
    description: 'Flying & dragon Pokémon',
    icon: '🐉',
    baseCost: 150,
    pool: [16, 21, 41, 83, 84, 123, 142, 144, 145, 146, 147, 163, 165, 177, 187, 193, 198, 207, 225, 227, 249, 250, 276, 278, 333, 357, 371, 380, 381, 384, 396, 415, 425, 441, 443, 458, 483, 484, 487, 519, 527, 561, 566, 580, 587, 610, 621, 627, 629, 633, 641, 642, 643, 644, 645, 646],
    tmPool: ['Outrage', 'Brave Bird', 'Hurricane', 'Fly', 'Air Slash', 'Dragon Dance', 'Aerial Ace', 'Drill Peck', 'Air Cutter'],
    itemPool: ['choice-scarf', 'life-orb', 'scope-lens', 'lum-berry'],
  },
  {
    id: 'frozen-tundra',
    name: 'Frozen Tundra',
    description: 'Ice & cold Pokémon',
    icon: '❄️',
    baseCost: 120,
    pool: [131, 144, 215, 220, 225, 238, 361, 363, 378, 459, 582, 613, 615, 646],
    tmPool: ['Blizzard', 'Ice Beam', 'Surf', 'Shadow Ball', 'Earthquake', 'Iron Head', 'Hail'],
    itemPool: ['choice-specs', 'focus-sash', 'leftovers', 'expert-belt'],
  },
  {
    id: 'steel-fortress',
    name: 'Steel Fortress',
    description: 'Steel & defensive Pokémon',
    icon: '🛡️',
    baseCost: 130,
    pool: [81, 227, 303, 304, 374, 379, 385, 410, 436, 483, 485, 597, 599, 624, 632, 638, 649],
    tmPool: ['Flash Cannon', 'Iron Head', 'Meteor Mash', 'Iron Defense', 'Earthquake', 'Stone Edge', 'Iron Tail', 'Shadow Force'],
    itemPool: ['rocky-helmet', 'eviolite', 'leftovers', 'lum-berry'],
  },
  {
    id: 'toxic-swamp',
    name: 'Toxic Swamp',
    description: 'Poison & bug Pokémon',
    icon: '☠️',
    baseCost: 70,
    pool: [1, 10, 13, 23, 29, 32, 41, 43, 46, 48, 69, 72, 88, 92, 109, 123, 127, 165, 167, 193, 204, 211, 213, 214, 265, 283, 290, 313, 314, 316, 336, 347, 401, 406, 412, 415, 434, 451, 453, 540, 543, 557, 568, 588, 590, 595, 616, 632, 636, 649],
    tmPool: ['Sludge Bomb', 'Gunk Shot', 'Bug Buzz', 'X-Scissor', 'Megahorn', 'Toxic', 'Poison Sting', 'Bug Bite', 'Attack Order', 'Steamroller', 'Toxic Spikes'],
    itemPool: ['black-sludge', 'toxic-orb', 'scope-lens', 'sitrus-berry'],
  },
  {
    id: 'ancient-relics',
    name: 'Ancient Relics',
    description: 'Fossil & ancient Pokémon',
    icon: '🦴',
    baseCost: 100,
    pool: [74, 95, 111, 138, 140, 142, 213, 222, 246, 299, 304, 337, 338, 345, 347, 369, 377, 408, 410, 438, 524, 557, 564, 566, 639],
    tmPool: ['Stone Edge', 'Earthquake', 'Rock Slide', 'Iron Head', 'Aqua Tail', 'Iron Defense', 'Rollout', 'Stealth Rock'],
    itemPool: ['rocky-helmet', 'eviolite', 'choice-band', 'muscle-band'],
  },
  {
    id: 'wild-card',
    name: 'Wild Card',
    description: 'Normal & oddball Pokémon',
    icon: '🃏',
    baseCost: 90,
    pool: [19, 52, 108, 115, 128, 132, 133, 137, 161, 173, 174, 175, 190, 206, 209, 216, 234, 235, 241, 263, 287, 293, 298, 300, 327, 335, 351, 352, 399, 427, 431, 440, 446, 486, 493, 504, 506, 531, 572, 626],
    tmPool: ['Body Slam', 'Double-Edge', 'Extreme Speed', 'Shadow Ball', 'Thunderbolt', 'Fire Blast', 'Swords Dance', 'Head Charge', 'Facade', 'Rapid Spin', 'Defog'],
    itemPool: ['choice-scarf', 'life-orb', 'leftovers', 'red-card'],
  },
];

export const PACKS_BY_ID: Record<string, PackDef> = Object.fromEntries(
  PACKS.map((p) => [p.id, p])
);

// ─── Pack tiers ────────────────────────────────────────────────
// Orthogonal quality axis. Each theme above has the same pool/TMs/items;
// the tier shifts rarity distribution, card count, and cost.

import type { PackTierDef, PackTierId, PackId } from './types';

export const PACK_TIERS: PackTierDef[] = [
  {
    id: 'basic',
    name: 'Basic',
    costMultiplier: 1,
    cards: 5,
    weights: { common: 60, uncommon: 30, rare: 8, epic: 2, legendary: 0 },
    guaranteedHighTier: false,
    bonusTmCount: 1,
    bonusItemCount: 1,
  },
  {
    id: 'great',
    name: 'Great',
    costMultiplier: 2.5,
    cards: 5,
    weights: { common: 30, uncommon: 45, rare: 18, epic: 6, legendary: 1 },
    guaranteedHighTier: false,
    bonusTmCount: 1,
    bonusItemCount: 1,
  },
  {
    id: 'ultra',
    name: 'Ultra',
    costMultiplier: 6,
    cards: 7,
    weights: { common: 8, uncommon: 30, rare: 40, epic: 18, legendary: 4 },
    guaranteedHighTier: true,
    bonusTmCount: 2,
    bonusItemCount: 1,
  },
  {
    id: 'master',
    name: 'Master',
    costMultiplier: 15,
    cards: 7,
    weights: { common: 0, uncommon: 8, rare: 30, epic: 45, legendary: 17 },
    guaranteedHighTier: true,
    bonusTmCount: 2,
    bonusItemCount: 2,
  },
];

export const PACK_TIERS_BY_ID: Record<PackTierId, PackTierDef> = Object.fromEntries(
  PACK_TIERS.map((t) => [t.id, t])
) as Record<PackTierId, PackTierDef>;

export function packTierCost(packId: PackId, tierId: PackTierId): number {
  const pack = PACKS_BY_ID[packId];
  const tier = PACK_TIERS_BY_ID[tierId];
  if (!pack || !tier) return 0;
  return Math.ceil(pack.baseCost * tier.costMultiplier);
}
