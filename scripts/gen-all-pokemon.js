#!/usr/bin/env node
// Generates shared/species-data.ts, shared/pokemon-data.ts, and shared/move-data.ts
// for ALL Gen 1-5 Pokemon (#1-649) using data from:
//   - pokemon-showdown/data/pokedex.ts (names, evolutions, types)
//   - pokemon-showdown/data/learnsets.ts (move learnsets)
//   - pokemon-showdown/data/moves.ts (move types/categories)
//   - damage-calc (base stats)
//
// Usage: node scripts/gen-all-pokemon.js

const fs = require('fs');
const path = require('path');

// ─── Parse Showdown data ────────────────────────────────────────────────

function parseShowdownTS(filePath, varName) {
  const src = fs.readFileSync(filePath, 'utf8');
  const cleaned = src.replace(new RegExp(`^export const ${varName}:.*?= \\{`), 'module.exports = {');
  const tmpFile = `/tmp/_showdown_${varName.toLowerCase()}.js`;
  fs.writeFileSync(tmpFile, cleaned);
  return require(tmpFile);
}

function parseMovesTS(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const moves = {};
  let currentId = null;
  for (const line of src.split('\n')) {
    const idMatch = line.match(/^\t([a-z0-9]+): \{/);
    if (idMatch) currentId = idMatch[1];
    if (!currentId) continue;
    if (!moves[currentId]) moves[currentId] = {};
    const nameMatch = line.match(/^\t\tname: "(.+?)"/);
    if (nameMatch) moves[currentId].name = nameMatch[1];
    const typeMatch = line.match(/^\t\ttype: "(.+?)"/);
    if (typeMatch) moves[currentId].type = typeMatch[1];
    const catMatch = line.match(/^\t\tcategory: "(.+?)"/);
    if (catMatch) moves[currentId].category = catMatch[1];
    const bpMatch = line.match(/^\t\tbasePower: (\d+)/);
    if (bpMatch) moves[currentId].basePower = parseInt(bpMatch[1]);
  }
  return moves;
}

const dex = parseShowdownTS(path.join(__dirname, '../pokemon-showdown/data/pokedex.ts'), 'Pokedex');
const learnsets = parseShowdownTS(path.join(__dirname, '../pokemon-showdown/data/learnsets.ts'), 'Learnsets');
const showdownMoves = parseMovesTS(path.join(__dirname, '../pokemon-showdown/data/moves.ts'));
const { SPECIES } = require(path.join(__dirname, '../damage-calc/calc/dist/data/species.js'));
const gen5Stats = SPECIES[5]; // Gen 5 data includes all Gen 1-5 Pokemon

// ─── Collect Gen 1-5 base species ───────────────────────────────────────

const MAX_DEX = 649; // Gen 5 ends at Genesect #649

const seen = new Set();
const allPokemon = [];
const numToName = {};
const nameToNum = {};
const nameToKey = {};

for (const [key, entry] of Object.entries(dex)) {
  if (entry.num >= 1 && entry.num <= MAX_DEX && !entry.forme && !seen.has(entry.num)) {
    seen.add(entry.num);
    allPokemon.push({ key, ...entry });
    numToName[entry.num] = entry.name;
    nameToNum[entry.name] = entry.num;
    nameToKey[entry.name] = key;
  }
}
allPokemon.sort((a, b) => a.num - b.num);

console.log(`Found ${allPokemon.length} Gen 1-5 Pokemon`);

// ─── Build evolution chains (filtered to Gen 1-5 only) ──────────────────

function getGen5Evos(pokemon) {
  if (!pokemon.evos) return [];
  return pokemon.evos
    .filter(evoName => {
      const key = evoName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const evo = dex[key];
      return evo && evo.num >= 1 && evo.num <= MAX_DEX && !evo.forme;
    })
    .map(evoName => {
      const key = evoName.toLowerCase().replace(/[^a-z0-9]/g, '');
      return dex[key].num;
    });
}

function getGen5Prevo(pokemon) {
  if (!pokemon.prevo) return undefined;
  const key = pokemon.prevo.toLowerCase().replace(/[^a-z0-9]/g, '');
  const prevo = dex[key];
  if (prevo && prevo.num >= 1 && prevo.num <= MAX_DEX && !prevo.forme) {
    return prevo.num;
  }
  return undefined;
}

// ─── Define the game's move pool ────────────────────────────────────────
// Curated list of moves that exist in Gen 4 and are interesting for the game

const GAME_MOVES = {
  // Normal
  'Tackle': 'normal', 'Scratch': 'normal', 'Pound': 'normal', 'Quick Attack': 'normal',
  'Headbutt': 'normal', 'Body Slam': 'normal', 'Slam': 'normal', 'Take Down': 'normal',
  'Hyper Fang': 'normal', 'Strength': 'normal', 'Return': 'normal',
  'Fury Swipes': 'normal', 'Slash': 'normal', 'Facade': 'normal',
  'Double-Edge': 'normal', 'Hyper Beam': 'normal', 'Giga Impact': 'normal',
  'Extreme Speed': 'normal', 'Crush Claw': 'normal',
  // Fire
  'Ember': 'fire', 'Flame Wheel': 'fire', 'Flamethrower': 'fire',
  'Fire Blast': 'fire', 'Fire Punch': 'fire', 'Fire Fang': 'fire',
  'Heat Wave': 'fire', 'Lava Plume': 'fire', 'Blaze Kick': 'fire',
  'Eruption': 'fire', 'Overheat': 'fire', 'Magma Storm': 'fire',
  'Sunny Day': 'fire', 'Fire Spin': 'fire', 'Flame Charge': 'fire',
  // Water
  'Water Gun': 'water', 'Bubble': 'water', 'Water Pulse': 'water',
  'Surf': 'water', 'Hydro Pump': 'water', 'Aqua Tail': 'water',
  'Waterfall': 'water', 'Brine': 'water', 'Aqua Jet': 'water',
  'Rain Dance': 'water', 'Muddy Water': 'water', 'Dive': 'water',
  'Octazooka': 'water', 'Hydro Cannon': 'water',
  // Electric
  'Thunder Shock': 'electric', 'Spark': 'electric', 'Thunderbolt': 'electric',
  'Thunder': 'electric', 'Thunder Punch': 'electric', 'Thunder Fang': 'electric',
  'Discharge': 'electric', 'Charge Beam': 'electric', 'Volt Tackle': 'electric',
  'Shock Wave': 'electric', 'Zap Cannon': 'electric',
  // Grass
  'Absorb': 'grass', 'Vine Whip': 'grass', 'Razor Leaf': 'grass',
  'Giga Drain': 'grass', 'Solar Beam': 'grass', 'Leaf Blade': 'grass',
  'Energy Ball': 'grass', 'Seed Bomb': 'grass', 'Magical Leaf': 'grass',
  'Petal Dance': 'grass', 'Mega Drain': 'grass', 'Wood Hammer': 'grass',
  'Leaf Storm': 'grass', 'Power Whip': 'grass', 'Bullet Seed': 'grass',
  'Frenzy Plant': 'grass',
  // Ice
  'Ice Beam': 'ice', 'Blizzard': 'ice', 'Ice Punch': 'ice',
  'Ice Fang': 'ice', 'Powder Snow': 'ice', 'Icy Wind': 'ice',
  'Avalanche': 'ice', 'Ice Shard': 'ice', 'Aurora Beam': 'ice',
  // Fighting
  'Karate Chop': 'fighting', 'Low Kick': 'fighting', 'Cross Chop': 'fighting',
  'Dynamic Punch': 'fighting', 'Mach Punch': 'fighting', 'Sky Uppercut': 'fighting',
  'Brick Break': 'fighting', 'Close Combat': 'fighting', 'Force Palm': 'fighting',
  'Drain Punch': 'fighting', 'Aura Sphere': 'fighting', 'Focus Blast': 'fighting',
  'Hammer Arm': 'fighting', 'Rock Smash': 'fighting',
  'Hi Jump Kick': 'fighting', 'Revenge': 'fighting',
  // Poison
  'Poison Sting': 'poison', 'Sludge Bomb': 'poison', 'Sludge': 'poison',
  'Poison Jab': 'poison', 'Cross Poison': 'poison', 'Poison Fang': 'poison',
  'Acid': 'poison', 'Gunk Shot': 'poison', 'Poison Tail': 'poison',
  // Ground
  'Earthquake': 'ground', 'Dig': 'ground', 'Mud Shot': 'ground',
  'Earth Power': 'ground', 'Mud Bomb': 'ground', 'Bone Club': 'ground',
  'Bonemerang': 'ground', 'Bulldoze': 'ground', 'Sand Tomb': 'ground',
  'Mud-Slap': 'ground',
  // Flying
  'Gust': 'flying', 'Wing Attack': 'flying', 'Aerial Ace': 'flying',
  'Air Slash': 'flying', 'Air Cutter': 'flying', 'Peck': 'flying',
  'Drill Peck': 'flying', 'Fly': 'flying', 'Brave Bird': 'flying',
  'Sky Attack': 'flying', 'Pluck': 'flying', 'Bounce': 'flying',
  // Psychic
  'Confusion': 'psychic', 'Psybeam': 'psychic', 'Psychic': 'psychic',
  'Zen Headbutt': 'psychic', 'Psyshock': 'psychic', 'Extrasensory': 'psychic',
  'Future Sight': 'psychic', 'Psycho Cut': 'psychic', 'Luster Purge': 'psychic',
  'Mist Ball': 'psychic', 'Dream Eater': 'psychic',
  // Bug
  'Bug Bite': 'bug', 'Silver Wind': 'bug', 'Pin Missile': 'bug',
  'X-Scissor': 'bug', 'Signal Beam': 'bug', 'Bug Buzz': 'bug',
  'Megahorn': 'bug', 'U-turn': 'bug', 'Fury Cutter': 'bug',
  'Attack Order': 'bug',
  // Rock
  'Rock Throw': 'rock', 'Rock Slide': 'rock', 'Stone Edge': 'rock',
  'Ancient Power': 'rock', 'Rock Tomb': 'rock', 'Power Gem': 'rock',
  'Rock Blast': 'rock', 'Head Smash': 'rock', 'Rollout': 'rock',
  // Ghost
  'Lick': 'ghost', 'Shadow Ball': 'ghost', 'Night Shade': 'ghost',
  'Shadow Claw': 'ghost', 'Shadow Punch': 'ghost', 'Shadow Sneak': 'ghost',
  'Ominous Wind': 'ghost', 'Shadow Force': 'ghost', 'Astonish': 'ghost',
  // Dragon
  'Twister': 'dragon', 'Dragon Claw': 'dragon', 'Dragon Breath': 'dragon',
  'Dragon Pulse': 'dragon', 'Outrage': 'dragon', 'Draco Meteor': 'dragon',
  'Dragon Rush': 'dragon', 'Dragon Rage': 'dragon',
  // Dark
  'Bite': 'dark', 'Crunch': 'dark', 'Dark Pulse': 'dark',
  'Sucker Punch': 'dark', 'Night Slash': 'dark', 'Faint Attack': 'dark',
  'Pursuit': 'dark', 'Assurance': 'dark', 'Payback': 'dark',
  'Foul Play': 'dark',
  // Steel
  'Meteor Mash': 'steel', 'Iron Tail': 'steel', 'Steel Wing': 'steel',
  'Metal Claw': 'steel', 'Flash Cannon': 'steel', 'Iron Head': 'steel',
  'Bullet Punch': 'steel', 'Mirror Shot': 'steel', 'Magnet Bomb': 'steel',
  'Gyro Ball': 'steel', 'Doom Desire': 'steel',
  // Fairy (not in Gen 4 but some pokemon have it retroactively)
  'Moonblast': 'fairy', 'Dazzling Gleam': 'fairy', 'Play Rough': 'fairy',
  'Draining Kiss': 'fairy',
  // Gen 5 signature/notable moves
  'Scald': 'water', 'Razor Shell': 'water',
  'Wild Charge': 'electric',
  'Acrobatics': 'flying', 'Hurricane': 'flying',
  'Blue Flare': 'fire', 'Searing Shot': 'fire', 'V-create': 'fire',
  'Fiery Dance': 'fire', 'Heat Crash': 'fire',
  'Bolt Strike': 'electric', 'Fusion Bolt': 'electric',
  'Fusion Flare': 'fire',
  'Glaciate': 'ice', 'Icicle Crash': 'ice', 'Frost Breath': 'ice',
  'Sacred Sword': 'fighting',
  'Secret Sword': 'fighting',
  'Head Charge': 'normal',
  'Night Daze': 'dark', 'Snarl': 'dark',
  'Psystrike': 'psychic', 'Heart Stamp': 'psychic',
  'Hex': 'ghost',
  'Dragon Tail': 'dragon', 'Dual Chop': 'dragon',
  'Leaf Tornado': 'grass', 'Horn Leech': 'grass',
  'Acid Spray': 'poison',
  'Techno Blast': 'normal', 'Relic Song': 'normal',
  'Gear Grind': 'steel',
  'Struggle Bug': 'bug',
  'Steamroller': 'bug',
  'Smack Down': 'rock',
  // Gen 5 status moves
  'Quiver Dance': 'bug', 'Shell Smash': 'normal', 'Coil': 'poison',
  'Cotton Guard': 'grass', 'Work Up': 'normal',
  // Hidden Power placeholder
  'Hidden Power': 'normal',
  'Struggle': 'normal',
};

// Convert move name to Showdown learnset ID
function moveToId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── Assign moves to each Pokemon ───────────────────────────────────────

function getLearnableMoves(pokemonKey) {
  const ls = learnsets[pokemonKey];
  if (!ls || !ls.learnset) return [];
  // Get moves learnable in Gen 1-5 (source codes starting with 1-5)
  const genMoves = [];
  for (const [moveId, sources] of Object.entries(ls.learnset)) {
    if (sources.some(s => s.startsWith('5') || s.startsWith('4') || s.startsWith('3') || s.startsWith('2') || s.startsWith('1'))) {
      genMoves.push(moveId);
    }
  }
  return genMoves;
}

function pickMoves(pokemon, pokemonKey) {
  const learnable = getLearnableMoves(pokemonKey);
  const pokemonTypes = (pokemon.types || []).map(t => t.toLowerCase());

  // Map learnable move IDs to our game moves
  const available = [];
  for (const moveId of learnable) {
    for (const [moveName, moveType] of Object.entries(GAME_MOVES)) {
      if (moveToId(moveName) === moveId) {
        available.push({ name: moveName, type: moveType });
      }
    }
  }

  if (available.length === 0) {
    return ['Tackle', 'Struggle'];
  }

  const moveRank = (moveName) => {
    const sm = showdownMoves[moveToId(moveName)];
    return sm ? sm.basePower || 0 : 0;
  };

  // Split by type relationship
  const stab1 = available.filter(m => m.type === pokemonTypes[0]);
  const stab2 = pokemonTypes[1] ? available.filter(m => m.type === pokemonTypes[1]) : [];
  const coverage = available.filter(m => !pokemonTypes.includes(m.type) && m.type !== 'normal');
  const normalMoves = available.filter(m => m.type === 'normal' && !pokemonTypes.includes('normal'));

  // Sort each group by power (prefer mid-high range: 60-120 BP sweet spot)
  const sortByPower = (arr) => arr.sort((a, b) => {
    const bpA = moveRank(a.name), bpB = moveRank(b.name);
    // Prefer moves in 60-120 range, then higher, then lower
    const scoreA = (bpA >= 60 && bpA <= 120) ? bpA + 100 : bpA;
    const scoreB = (bpB >= 60 && bpB <= 120) ? bpB + 100 : bpB;
    return scoreB - scoreA;
  });

  sortByPower(stab1);
  sortByPower(stab2);
  sortByPower(coverage);
  sortByPower(normalMoves);

  let move1, move2;

  // First move: best STAB from primary type
  if (stab1.length > 0) {
    move1 = stab1[0].name;
  } else if (stab2.length > 0) {
    move1 = stab2[0].name;
  } else if (coverage.length > 0) {
    move1 = coverage[0].name;
  } else if (normalMoves.length > 0) {
    move1 = normalMoves[0].name;
  } else {
    move1 = available[0].name;
  }

  // Second move: prefer secondary STAB, then coverage, then more STAB, then normal
  const candidates = [
    ...(stab2.length > 0 ? [stab2[0]] : []),
    ...coverage,
    ...stab1.filter(m => m.name !== move1),
    ...(stab2.length > 1 ? stab2.slice(1) : []),
    ...normalMoves,
  ].filter(m => m.name !== move1);

  move2 = candidates.length > 0 ? candidates[0].name : (available.find(m => m.name !== move1)?.name || 'Struggle');

  return [move1, move2];
}

// ─── Assign tiers ───────────────────────────────────────────────────────
// Tier assignment based on evolution line strength:
// - All members of an evolution line share the same tier
// - Tier is determined by the final form's BST
// - Legendaries/mythicals are always epic

const LEGENDARIES = new Set([
  144, 145, 146, // Articuno, Zapdos, Moltres
  150, 151,       // Mewtwo, Mew
  243, 244, 245, // Raikou, Entei, Suicune
  249, 250,       // Lugia, Ho-Oh
  251,            // Celebi
  377, 378, 379, // Regis
  380, 381,       // Lati@s
  382, 383, 384, // Weather trio
  385, 386,       // Jirachi, Deoxys
  480, 481, 482, // Lake trio
  483, 484,       // Dialga, Palkia
  485,            // Heatran
  486,            // Regigigas
  487,            // Giratina
  488,            // Cresselia
  489, 490,       // Phione, Manaphy
  491,            // Darkrai
  492,            // Shaymin
  493,            // Arceus
  // Gen 5 legendaries & mythicals
  494,            // Victini
  638, 639, 640, // Cobalion, Terrakion, Virizion
  641, 642, 645, // Tornadus, Thundurus, Landorus
  643, 644,       // Reshiram, Zekrom
  646,            // Kyurem
  647,            // Keldeo
  648,            // Meloetta
  649,            // Genesect
]);

function getBST(name) {
  const s = gen5Stats[name];
  if (!s) return 0;
  return s.bs.hp + s.bs.at + s.bs.df + (s.bs.sa || 0) + (s.bs.sd || 0) + s.bs.sp;
}

// Find the highest-BST final form in an evolution line
function getFinalFormBST(pokemon) {
  const evos = getGen5Evos(pokemon);
  if (evos.length === 0) return getBST(pokemon.name);
  let maxBST = 0;
  for (const evoNum of evos) {
    const evoName = numToName[evoNum];
    if (!evoName) continue;
    const evoKey = nameToKey[evoName];
    const evoEntry = dex[evoKey];
    if (!evoEntry) continue;
    const evoBST = getFinalFormBST(evoEntry);
    if (evoBST > maxBST) maxBST = evoBST;
  }
  return maxBST;
}

// Get the root ancestor of an evolution line
function getLineRoot(pokemon) {
  const prevo = getGen5Prevo(pokemon);
  if (prevo === undefined) return pokemon;
  const prevoName = numToName[prevo];
  if (!prevoName) return pokemon;
  const prevoKey = nameToKey[prevoName];
  const prevoEntry = dex[prevoKey];
  if (!prevoEntry) return pokemon;
  return getLineRoot(prevoEntry);
}

// Compute tier for each pokemon: all members of a line share the same tier
const tierCache = {};

function assignTier(pokemon) {
  const num = pokemon.num;

  // Legendaries/mythicals get 'legendary' tier
  if (LEGENDARIES.has(num)) return 'legendary';

  // Find the root of the evolution line
  const root = getLineRoot(pokemon);
  if (tierCache[root.num] !== undefined) return tierCache[root.num];

  // Get the best final form BST
  const finalBST = getFinalFormBST(root);
  const hasEvos = getGen5Evos(root).length > 0;

  let tier;
  if (finalBST >= 600) {
    tier = 'epic'; // Pseudo-legendaries (Dragonite, Tyranitar, Salamence, Metagross, Garchomp)
  } else if (finalBST >= 530) {
    tier = 'rare'; // Strong pokemon (starters' final forms, Gyarados, Lapras, etc.)
  } else if (finalBST >= 455) {
    tier = 'uncommon'; // Mid-tier pokemon
  } else {
    tier = 'common'; // Weak pokemon (early bugs, birds, etc.)
  }

  // Cache for all members of the line
  tierCache[root.num] = tier;
  return tier;
}

// ─── Sprite name helper ─────────────────────────────────────────────────

function spriteId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── Generate all data ──────────────────────────────────────────────────

const entries = [];
const usedMoves = new Set();

for (const pokemon of allPokemon) {
  const prevo = getGen5Prevo(pokemon);
  const evos = getGen5Evos(pokemon);
  const tier = assignTier(pokemon);
  const [move1, move2] = pickMoves(pokemon, pokemon.key);

  usedMoves.add(move1);
  usedMoves.add(move2);

  entries.push({
    id: pokemon.num,
    name: pokemon.name,
    moves: [move1, move2],
    tier,
    evolutionFrom: prevo,
    evolutionTo: evos.length > 0 ? evos : undefined,
  });
}

// ─── Stats ──────────────────────────────────────────────────────────────

const tierCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
const baseForms = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
for (const e of entries) {
  tierCounts[e.tier]++;
  if (!e.evolutionFrom) baseForms[e.tier]++;
}
console.log('Tier distribution:', tierCounts);
console.log('Base forms per tier (for box opening):', baseForms);
console.log('Total moves used:', usedMoves.size);

// ─── Write shared/species-data.ts ───────────────────────────────────────

let speciesOut = '// Auto-generated from damage-calc Gen 5 species data\n';
speciesOut += '// Regenerate with: node scripts/gen-all-pokemon.js\n\n';
speciesOut += 'export const SPECIES_DATA: Record<string, {\n';
speciesOut += '  types: string[];\n';
speciesOut += '  bs: { hp: number; at: number; df: number; sa: number; sd: number; sp: number };\n';
speciesOut += '}> = {\n';

for (const pokemon of allPokemon) {
  const s = gen5Stats[pokemon.name];
  if (!s) {
    console.error('Missing from damage-calc:', pokemon.name);
    continue;
  }
  const types = JSON.stringify(s.types);
  speciesOut += `  '${pokemon.name}': { types: ${types}, bs: { hp: ${s.bs.hp}, at: ${s.bs.at}, df: ${s.bs.df}, sa: ${s.bs.sa || 0}, sd: ${s.bs.sd || 0}, sp: ${s.bs.sp} } },\n`;
}

speciesOut += '};\n';
fs.writeFileSync(path.join(__dirname, '../shared/species-data.ts'), speciesOut);
console.log('Generated shared/species-data.ts');

// ─── Update MOVE_TYPES section in shared/move-data.ts ───────────────────

// Group used moves by type
const movesByType = {};
for (const moveName of [...usedMoves].sort()) {
  const type = GAME_MOVES[moveName];
  if (!type) continue;
  if (!movesByType[type]) movesByType[type] = [];
  movesByType[type].push(moveName);
}

const typeOrder = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

let moveTypesBlock = "export const MOVE_TYPES: Record<string, PokemonType> = {\n";

for (const type of typeOrder) {
  const moves = movesByType[type];
  if (!moves || moves.length === 0) continue;
  moveTypesBlock += `  // ${type.charAt(0).toUpperCase() + type.slice(1)}\n`;
  for (const move of moves.sort()) {
    moveTypesBlock += `  '${move}': '${type}',\n`;
  }
}

moveTypesBlock += "};";

// Read existing move-data.ts and replace only the MOVE_TYPES block
const moveDataPath = path.join(__dirname, '../shared/move-data.ts');
let moveDataSrc = fs.readFileSync(moveDataPath, 'utf8');
const moveTypesRe = /export const MOVE_TYPES: Record<string, PokemonType> = \{[\s\S]*?\n\};/;
if (moveTypesRe.test(moveDataSrc)) {
  moveDataSrc = moveDataSrc.replace(moveTypesRe, moveTypesBlock);
  fs.writeFileSync(moveDataPath, moveDataSrc);
  console.log('Updated MOVE_TYPES in shared/move-data.ts');
} else {
  console.error('Could not find MOVE_TYPES block in move-data.ts — skipping update');
}

// ─── Write shared/pokemon-data.ts ───────────────────────────────────────

let dataOut = "// Pokémon data — game-specific fields only; stats & types sourced from species-data.ts\n";
dataOut += "// Auto-generated by scripts/gen-all-pokemon.js\n";
dataOut += "import type { Pokemon, PokemonType, BoxTier } from './types';\n";
dataOut += "import { SPECIES_DATA } from './species-data';\n\n";

dataOut += "interface PokemonEntry {\n";
dataOut += "  id: number;\n";
dataOut += "  name: string;\n";
dataOut += "  moves: [string, string];\n";
dataOut += "  tier: BoxTier;\n";
dataOut += "  evolutionFrom?: number;\n";
dataOut += "  evolutionTo?: number[];\n";
dataOut += "}\n\n";

dataOut += "function buildPokemon(entry: PokemonEntry): Pokemon {\n";
dataOut += "  const species = SPECIES_DATA[entry.name];\n";
dataOut += '  if (!species) throw new Error(`Unknown species: ${entry.name}`);\n';
dataOut += "  return {\n";
dataOut += "    id: entry.id,\n";
dataOut += "    name: entry.name,\n";
dataOut += "    types: species.types.map((t) => t.toLowerCase()) as PokemonType[],\n";
dataOut += "    stats: {\n";
dataOut += "      hp: species.bs.hp,\n";
dataOut += "      attack: species.bs.at,\n";
dataOut += "      defense: species.bs.df,\n";
dataOut += "      spAtk: species.bs.sa,\n";
dataOut += "      spDef: species.bs.sd,\n";
dataOut += "      speed: species.bs.sp,\n";
dataOut += "    },\n";
dataOut += "    moves: entry.moves,\n";
dataOut += "    tier: entry.tier,\n";
dataOut += `    sprite: \`/assets/\${entry.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif\`,\n`;
dataOut += "    evolutionFrom: entry.evolutionFrom,\n";
dataOut += "    evolutionTo: entry.evolutionTo,\n";
dataOut += "  };\n";
dataOut += "}\n\n";

dataOut += "const ENTRIES: PokemonEntry[] = [\n";

// Group by tier for readability
for (const tier of ['common', 'uncommon', 'rare', 'epic', 'legendary']) {
  const tierEntries = entries.filter(e => e.tier === tier);
  dataOut += `  // ${tier.charAt(0).toUpperCase() + tier.slice(1)} tier\n`;
  for (const e of tierEntries) {
    const evoFrom = e.evolutionFrom !== undefined ? `, evolutionFrom: ${e.evolutionFrom}` : '';
    const evoTo = e.evolutionTo ? `, evolutionTo: [${e.evolutionTo.join(', ')}]` : '';
    dataOut += `  { id: ${e.id}, name: '${e.name}', moves: ['${e.moves[0]}', '${e.moves[1]}'], tier: '${e.tier}'${evoFrom}${evoTo} },\n`;
  }
}

dataOut += "];\n\n";
dataOut += "export const POKEMON: Pokemon[] = ENTRIES.map(buildPokemon);\n\n";
dataOut += "export const POKEMON_BY_ID: Record<number, Pokemon> = Object.fromEntries(\n";
dataOut += "  POKEMON.map((p) => [p.id, p])\n";
dataOut += ");\n";

fs.writeFileSync(path.join(__dirname, '../shared/pokemon-data.ts'), dataOut);
console.log('Generated shared/pokemon-data.ts');

console.log('\nDone! Don\'t forget to update shared/types.ts: evolutionTo should be number[]');
