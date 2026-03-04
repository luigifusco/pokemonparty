// Maps numeric move IDs (from pokemon-data.ts) to real move names
// used by the @smogon/calc damage calculator (Gen 4 move database).

export const MOVE_NAMES: Record<number, string> = {
  // Bug-line basic moves
  1: 'Tackle',            // Caterpie, Weedle
  2: 'Bug Bite',          // Caterpie
  3: 'Tackle',            // Metapod, Kakuna (cocoons are weak)
  4: 'Struggle',          // Metapod, Kakuna (filler weak move)
  5: 'Silver Wind',       // Butterfree
  6: 'Psybeam',           // Butterfree
  7: 'Poison Sting',      // Weedle, Beedrill, Bulbasaur, Ivysaur, Zubat
  8: 'Pin Missile',       // Beedrill

  // Normal/Flying-line moves
  9: 'Tackle',            // Pidgey, Pidgeotto, Rattata, Spearow, Squirtle
  10: 'Gust',             // Pidgey
  11: 'Wing Attack',      // Pidgeotto, Pidgeot
  12: 'Aerial Ace',       // Pidgeot
  13: 'Quick Attack',     // Rattata, Raticate
  14: 'Hyper Fang',       // Raticate
  15: 'Peck',             // Spearow, Fearow
  16: 'Drill Peck',       // Fearow

  // Poison/Flying (Zubat line)
  17: 'Bite',             // Zubat, Golbat
  18: 'Air Cutter',       // Golbat

  // Grass/Poison (Bulbasaur line)
  19: 'Vine Whip',        // Bulbasaur
  20: 'Razor Leaf',       // Ivysaur
  21: 'Giga Drain',       // Venusaur
  22: 'Sludge Bomb',      // Venusaur

  // Fire (Charmander line)
  23: 'Ember',            // Charmander, Charmeleon
  24: 'Scratch',          // Charmander
  25: 'Flamethrower',     // Charmeleon, Charizard
  26: 'Air Slash',        // Charizard, Salamence

  // Water (Squirtle line)
  27: 'Water Gun',        // Squirtle, Wartortle
  28: 'Bite',             // Wartortle, Blastoise, Lapras
  29: 'Hydro Pump',       // Blastoise, Gyarados

  // Electric (Pikachu line)
  30: 'Thunderbolt',      // Pikachu, Raichu
  31: 'Quick Attack',     // Pikachu
  32: 'Thunder',          // Raichu

  // Psychic (Abra line)
  33: 'Confusion',        // Abra, Kadabra
  34: 'Hidden Power',     // Abra
  35: 'Psybeam',          // Kadabra, Alakazam
  36: 'Psychic',          // Alakazam

  // Fighting (Machop line)
  37: 'Karate Chop',      // Machop, Machoke
  38: 'Low Kick',         // Machop
  39: 'Cross Chop',       // Machoke, Machamp
  40: 'Dynamic Punch',    // Machamp

  // Ghost/Poison (Gastly line)
  41: 'Lick',             // Gastly, Haunter
  42: 'Night Shade',      // Gastly
  43: 'Shadow Ball',      // Haunter, Gengar
  44: 'Sludge Bomb',      // Gengar

  // Dragon (Dratini line, Bagon line)
  45: 'Twister',          // Dratini, Dragonair, Bagon, Shelgon
  46: 'Slam',             // Dratini
  47: 'Dragon Claw',      // Dragonair, Dragonite, Salamence
  48: 'Aerial Ace',       // Dragonite

  // Rock/Ground/Dark (Larvitar line)
  49: 'Rock Throw',       // Larvitar, Pupitar
  50: 'Dig',              // Larvitar
  51: 'Rock Slide',       // Pupitar, Tyranitar
  52: 'Crunch',           // Tyranitar

  // Dragon (Bagon line extras)
  53: 'Headbutt',         // Bagon
  54: 'Zen Headbutt',     // Shelgon

  // Steel/Psychic (Beldum line)
  55: 'Take Down',        // Beldum, Metang
  56: 'Zen Headbutt',     // Beldum
  57: 'Meteor Mash',      // Metang, Metagross
  58: 'Psychic',          // Metagross

  // Legendary singles
  59: 'Body Slam',        // Snorlax
  60: 'Earthquake',       // Snorlax
  61: 'Ice Beam',         // Lapras
  62: 'Earthquake',       // Gyarados
};
