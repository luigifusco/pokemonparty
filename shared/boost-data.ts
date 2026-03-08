// Boost items — one per stat, maxes out the IV when used on a Pokémon
// Sprites from Pokémon Showdown CDN (vitamin item icons)

import type { Stats } from './types';

export type StatKey = keyof Stats;

export interface BoostItem {
  stat: StatKey;
  name: string;        // display name (e.g. "Protein")
  spriteSlug: string;  // Showdown CDN slug (e.g. "protein")
}

export const MAX_IV = 31;

export const BOOST_ITEMS: BoostItem[] = [
  { stat: 'hp',      name: 'HP Up',    spriteSlug: 'hp-up' },
  { stat: 'attack',  name: 'Protein',  spriteSlug: 'protein' },
  { stat: 'defense', name: 'Iron',     spriteSlug: 'iron' },
  { stat: 'spAtk',   name: 'Calcium',  spriteSlug: 'calcium' },
  { stat: 'spDef',   name: 'Zinc',     spriteSlug: 'zinc' },
  { stat: 'speed',   name: 'Carbos',   spriteSlug: 'carbos' },
];

export const BOOST_BY_STAT: Record<StatKey, BoostItem> = Object.fromEntries(
  BOOST_ITEMS.map((b) => [b.stat, b])
) as Record<StatKey, BoostItem>;

export function getBoostSprite(stat: StatKey): string {
  return `/pokemonparty/assets/${BOOST_BY_STAT[stat].spriteSlug}.png`;
}

export function getBoostName(stat: StatKey): string {
  return BOOST_BY_STAT[stat].name;
}

export function rollBoost(): StatKey {
  const stats: StatKey[] = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
  return stats[Math.floor(Math.random() * stats.length)];
}
