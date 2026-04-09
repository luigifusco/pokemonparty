import type { NatureName, IVs, Stats } from './types';

export interface NatureData {
  name: NatureName;
  plus: keyof Stats | null;  // boosted stat (+10%)
  minus: keyof Stats | null; // reduced stat (-10%)
}

export const NATURES: NatureData[] = [
  // Neutral natures (no effect)
  { name: 'Hardy',   plus: null,      minus: null },
  { name: 'Docile',  plus: null,      minus: null },
  { name: 'Serious', plus: null,      minus: null },
  { name: 'Bashful', plus: null,      minus: null },
  { name: 'Quirky',  plus: null,      minus: null },
  // +Attack
  { name: 'Lonely',  plus: 'attack',  minus: 'defense' },
  { name: 'Brave',   plus: 'attack',  minus: 'speed' },
  { name: 'Adamant', plus: 'attack',  minus: 'spAtk' },
  { name: 'Naughty', plus: 'attack',  minus: 'spDef' },
  // +Defense
  { name: 'Bold',    plus: 'defense', minus: 'attack' },
  { name: 'Relaxed', plus: 'defense', minus: 'speed' },
  { name: 'Impish',  plus: 'defense', minus: 'spAtk' },
  { name: 'Lax',     plus: 'defense', minus: 'spDef' },
  // +Speed
  { name: 'Timid',   plus: 'speed',   minus: 'attack' },
  { name: 'Hasty',   plus: 'speed',   minus: 'defense' },
  { name: 'Jolly',   plus: 'speed',   minus: 'spAtk' },
  { name: 'Naive',   plus: 'speed',   minus: 'spDef' },
  // +SpAtk
  { name: 'Modest',  plus: 'spAtk',   minus: 'attack' },
  { name: 'Mild',    plus: 'spAtk',   minus: 'defense' },
  { name: 'Quiet',   plus: 'spAtk',   minus: 'speed' },
  { name: 'Rash',    plus: 'spAtk',   minus: 'spDef' },
  // +SpDef
  { name: 'Calm',    plus: 'spDef',   minus: 'attack' },
  { name: 'Gentle',  plus: 'spDef',   minus: 'defense' },
  { name: 'Sassy',   plus: 'spDef',   minus: 'speed' },
  { name: 'Careful', plus: 'spDef',   minus: 'spAtk' },
];

export const NATURE_BY_NAME: Record<NatureName, NatureData> = Object.fromEntries(
  NATURES.map((n) => [n.name, n])
) as Record<NatureName, NatureData>;

export function randomNature(): NatureName {
  return NATURES[Math.floor(Math.random() * NATURES.length)].name;
}

export function randomIVs(): IVs {
  const rand = () => Math.floor(Math.random() * 32);
  return { hp: rand(), attack: rand(), defense: rand(), spAtk: rand(), spDef: rand(), speed: rand() };
}

// Stat label for display
export const STAT_LABELS: Record<keyof Stats, string> = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  spAtk: 'SpA',
  spDef: 'SpD',
  speed: 'Spe',
};

// Compute the effective stat at level 100, applying base stat + IV + nature
export function calcStat(
  stat: keyof Stats, base: number, iv: number, nature: NatureData
): number {
  const level = 100;
  if (stat === 'hp') {
    // HP = ((2*Base + IV) * Level / 100) + Level + 10
    return Math.floor(((2 * base + iv) * level) / 100) + level + 10;
  }
  // Other = (((2*Base + IV) * Level / 100) + 5) * nature
  let value = Math.floor(((2 * base + iv) * level) / 100) + 5;
  if (nature.plus === stat) value = Math.floor(value * 1.1);
  if (nature.minus === stat) value = Math.floor(value * 0.9);
  return value;
}
