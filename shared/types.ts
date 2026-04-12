// Shared types for the Pokémon party game

export interface Pokemon {
  id: number;
  name: string;
  types: PokemonType[];
  stats: Stats;
  moves: [MoveId, MoveId];
  evolutionFrom?: number;
  evolutionTo?: number[];
  tier: BoxTier;
  sprite: string;
}

export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface IVs {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export type NatureName =
  | 'Hardy' | 'Lonely' | 'Brave' | 'Adamant' | 'Naughty'
  | 'Bold' | 'Docile' | 'Relaxed' | 'Impish' | 'Lax'
  | 'Timid' | 'Hasty' | 'Serious' | 'Jolly' | 'Naive'
  | 'Modest' | 'Mild' | 'Quiet' | 'Bashful' | 'Rash'
  | 'Calm' | 'Gentle' | 'Sassy' | 'Careful' | 'Quirky';

export interface PokemonInstance {
  instanceId: string;
  pokemon: Pokemon;
  ivs: IVs;
  nature: NatureName;
  ability: string;
  learnedMoves?: [MoveId, MoveId];
  heldItem?: string;
}

// Returns the effective moves for a pokemon instance (learned overrides species defaults)
export function getEffectiveMoves(inst: PokemonInstance): [MoveId, MoveId] {
  return inst.learnedMoves ?? inst.pokemon.moves;
}

export type MoveId = string;

export type BoxTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
// Rarity is the same set of values, used for pull-rate weighting in packs
export type Rarity = BoxTier;

export type PackId = string;

export interface PackDef {
  id: PackId;
  name: string;
  description: string;
  icon: string;
  pool: number[];   // base-form Pokemon IDs in this pack
  cost: number;      // essence cost
}

export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

// Items

export type ItemType = 'tm' | 'token' | 'boost' | 'held_item';

export interface OwnedItem {
  id: string;
  itemType: ItemType;
  itemData: string; // move name for TMs, pokemon ID (as string) for tokens, stat key for boosts
}
