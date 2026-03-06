// Demo Pokémon data — a subset of Gen 1-3 for development
import type { Pokemon, PokemonType } from './types';

function pokemon(
  id: number, name: string, types: PokemonType[], 
  hp: number, attack: number, defense: number, spAtk: number, spDef: number, speed: number,
  moves: [string, string], tier: 'common' | 'uncommon' | 'rare' | 'legendary',
  evolutionFrom?: number, evolutionTo?: number
): Pokemon {
  return {
    id, name, types,
    stats: { hp, attack, defense, spAtk, spDef, speed },
    moves, tier,
    sprite: `/assets/${name.toLowerCase().replace(/[^a-z0-9-]/g, '')}.gif`,
    evolutionFrom, evolutionTo,
  };
}

export const POKEMON: Pokemon[] = [
  // Common tier — weak evolution lines
  pokemon(10, 'Caterpie', ['bug'], 45, 30, 35, 20, 20, 45, ['Tackle', 'Bug Bite'], 'common', undefined, 11),
  pokemon(11, 'Metapod', ['bug'], 50, 20, 55, 25, 25, 30, ['Tackle', 'Struggle'], 'common', 10, 12),
  pokemon(12, 'Butterfree', ['bug', 'flying'], 60, 45, 50, 90, 80, 70, ['Silver Wind', 'Psybeam'], 'common', 11),
  pokemon(13, 'Weedle', ['bug', 'poison'], 40, 35, 30, 20, 20, 50, ['Tackle', 'Poison Sting'], 'common', undefined, 14),
  pokemon(14, 'Kakuna', ['bug', 'poison'], 45, 25, 50, 25, 25, 35, ['Tackle', 'Struggle'], 'common', 13, 15),
  pokemon(15, 'Beedrill', ['bug', 'poison'], 65, 90, 40, 45, 80, 75, ['Poison Sting', 'Pin Missile'], 'common', 14),
  pokemon(16, 'Pidgey', ['normal', 'flying'], 40, 45, 40, 35, 35, 56, ['Tackle', 'Gust'], 'common', undefined, 17),
  pokemon(17, 'Pidgeotto', ['normal', 'flying'], 63, 60, 55, 50, 50, 71, ['Tackle', 'Wing Attack'], 'common', 16, 18),
  pokemon(18, 'Pidgeot', ['normal', 'flying'], 83, 80, 75, 70, 70, 101, ['Wing Attack', 'Aerial Ace'], 'common', 17),
  pokemon(19, 'Rattata', ['normal'], 30, 56, 35, 25, 35, 72, ['Tackle', 'Quick Attack'], 'common', undefined, 20),
  pokemon(20, 'Raticate', ['normal'], 55, 81, 60, 50, 70, 97, ['Quick Attack', 'Hyper Fang'], 'common', 19),
  pokemon(21, 'Spearow', ['normal', 'flying'], 40, 60, 30, 31, 31, 70, ['Tackle', 'Peck'], 'common', undefined, 22),
  pokemon(22, 'Fearow', ['normal', 'flying'], 65, 90, 65, 61, 61, 100, ['Peck', 'Drill Peck'], 'common', 21),
  pokemon(41, 'Zubat', ['poison', 'flying'], 40, 45, 35, 30, 40, 55, ['Bite', 'Poison Sting'], 'common', undefined, 42),
  pokemon(42, 'Golbat', ['poison', 'flying'], 75, 80, 70, 65, 75, 90, ['Bite', 'Air Cutter'], 'common', 41),

  // Uncommon tier — moderate evolution lines
  pokemon(1, 'Bulbasaur', ['grass', 'poison'], 45, 49, 49, 65, 65, 45, ['Vine Whip', 'Poison Sting'], 'uncommon', undefined, 2),
  pokemon(2, 'Ivysaur', ['grass', 'poison'], 60, 62, 63, 80, 80, 60, ['Razor Leaf', 'Poison Sting'], 'uncommon', 1, 3),
  pokemon(3, 'Venusaur', ['grass', 'poison'], 80, 82, 83, 100, 100, 80, ['Giga Drain', 'Sludge Bomb'], 'uncommon', 2),
  pokemon(4, 'Charmander', ['fire'], 39, 52, 43, 60, 50, 65, ['Ember', 'Scratch'], 'uncommon', undefined, 5),
  pokemon(5, 'Charmeleon', ['fire'], 58, 64, 58, 80, 65, 80, ['Ember', 'Flamethrower'], 'uncommon', 4, 6),
  pokemon(6, 'Charizard', ['fire', 'flying'], 78, 84, 78, 109, 85, 100, ['Flamethrower', 'Air Slash'], 'uncommon', 5),
  pokemon(7, 'Squirtle', ['water'], 44, 48, 65, 50, 64, 43, ['Water Gun', 'Tackle'], 'uncommon', undefined, 8),
  pokemon(8, 'Wartortle', ['water'], 59, 63, 80, 65, 80, 58, ['Water Gun', 'Bite'], 'uncommon', 7, 9),
  pokemon(9, 'Blastoise', ['water'], 79, 83, 100, 85, 105, 78, ['Hydro Pump', 'Bite'], 'uncommon', 8),
  pokemon(25, 'Pikachu', ['electric'], 35, 55, 40, 50, 50, 90, ['Thunderbolt', 'Quick Attack'], 'uncommon', 172, 26),
  pokemon(26, 'Raichu', ['electric'], 60, 90, 55, 90, 80, 110, ['Thunderbolt', 'Thunder'], 'uncommon', 25),
  pokemon(63, 'Abra', ['psychic'], 25, 20, 15, 105, 55, 90, ['Confusion', 'Hidden Power'], 'uncommon', undefined, 64),
  pokemon(64, 'Kadabra', ['psychic'], 40, 35, 30, 120, 70, 105, ['Confusion', 'Psybeam'], 'uncommon', 63, 65),
  pokemon(65, 'Alakazam', ['psychic'], 55, 50, 45, 135, 95, 120, ['Psybeam', 'Psychic'], 'uncommon', 64),
  pokemon(66, 'Machop', ['fighting'], 70, 80, 50, 35, 35, 35, ['Karate Chop', 'Low Kick'], 'uncommon', undefined, 67),
  pokemon(67, 'Machoke', ['fighting'], 80, 100, 70, 50, 60, 45, ['Karate Chop', 'Cross Chop'], 'uncommon', 66, 68),
  pokemon(68, 'Machamp', ['fighting'], 90, 130, 80, 65, 85, 55, ['Cross Chop', 'Dynamic Punch'], 'uncommon', 67),

  // Rare tier — strong evolution lines
  pokemon(92, 'Gastly', ['ghost', 'poison'], 30, 35, 30, 100, 35, 80, ['Lick', 'Night Shade'], 'rare', undefined, 93),
  pokemon(93, 'Haunter', ['ghost', 'poison'], 45, 50, 45, 115, 55, 95, ['Lick', 'Shadow Ball'], 'rare', 92, 94),
  pokemon(94, 'Gengar', ['ghost', 'poison'], 60, 65, 60, 130, 75, 110, ['Shadow Ball', 'Sludge Bomb'], 'rare', 93),
  pokemon(147, 'Dratini', ['dragon'], 41, 64, 45, 50, 50, 50, ['Twister', 'Slam'], 'rare', undefined, 148),
  pokemon(148, 'Dragonair', ['dragon'], 61, 84, 65, 70, 70, 70, ['Twister', 'Dragon Claw'], 'rare', 147, 149),
  pokemon(149, 'Dragonite', ['dragon', 'flying'], 91, 134, 95, 100, 100, 80, ['Dragon Claw', 'Aerial Ace'], 'rare', 148),
  pokemon(246, 'Larvitar', ['rock', 'ground'], 50, 64, 50, 45, 50, 41, ['Rock Throw', 'Dig'], 'rare', undefined, 247),
  pokemon(247, 'Pupitar', ['rock', 'ground'], 70, 84, 70, 65, 70, 51, ['Rock Throw', 'Rock Slide'], 'rare', 246, 248),
  pokemon(248, 'Tyranitar', ['rock', 'dark'], 100, 134, 110, 95, 100, 61, ['Rock Slide', 'Crunch'], 'rare', 247),
  pokemon(371, 'Bagon', ['dragon'], 45, 75, 60, 40, 30, 50, ['Twister', 'Headbutt'], 'rare', undefined, 372),
  pokemon(372, 'Shelgon', ['dragon'], 65, 95, 100, 60, 50, 50, ['Twister', 'Zen Headbutt'], 'rare', 371, 373),
  pokemon(373, 'Salamence', ['dragon', 'flying'], 95, 135, 80, 110, 80, 100, ['Dragon Claw', 'Air Slash'], 'rare', 372),

  // Legendary tier
  pokemon(374, 'Beldum', ['steel', 'psychic'], 40, 55, 80, 35, 60, 30, ['Take Down', 'Zen Headbutt'], 'legendary', undefined, 375),
  pokemon(375, 'Metang', ['steel', 'psychic'], 60, 75, 100, 55, 80, 50, ['Take Down', 'Meteor Mash'], 'legendary', 374, 376),
  pokemon(376, 'Metagross', ['steel', 'psychic'], 80, 135, 130, 95, 90, 70, ['Meteor Mash', 'Psychic'], 'legendary', 375),
  pokemon(143, 'Snorlax', ['normal'], 160, 110, 65, 65, 110, 30, ['Body Slam', 'Earthquake'], 'legendary'),
  pokemon(131, 'Lapras', ['water', 'ice'], 130, 85, 80, 85, 95, 60, ['Bite', 'Ice Beam'], 'legendary'),
  pokemon(130, 'Gyarados', ['water', 'flying'], 95, 125, 79, 60, 100, 81, ['Hydro Pump', 'Earthquake'], 'legendary'),

  // Weather Pokémon
  pokemon(270, 'Lotad', ['water', 'grass'], 40, 30, 30, 40, 50, 30, ['Rain Dance', 'Absorb'], 'uncommon', undefined, 271),
  pokemon(271, 'Lombre', ['water', 'grass'], 60, 50, 50, 60, 70, 50, ['Rain Dance', 'Surf'], 'uncommon', 270, 272),
  pokemon(272, 'Ludicolo', ['water', 'grass'], 80, 70, 70, 90, 100, 70, ['Rain Dance', 'Surf'], 'uncommon', 271),
  pokemon(102, 'Exeggcute', ['grass', 'psychic'], 60, 40, 80, 60, 45, 40, ['Sunny Day', 'Confusion'], 'uncommon', undefined, 103),
  pokemon(103, 'Exeggutor', ['grass', 'psychic'], 95, 95, 85, 125, 65, 55, ['Solar Beam', 'Psychic'], 'uncommon', 102),
];

export const POKEMON_BY_ID: Record<number, Pokemon> = Object.fromEntries(
  POKEMON.map((p) => [p.id, p])
);
