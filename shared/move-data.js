export const MOVE_TYPES = {
    // Normal
    'Body Slam': 'normal',
    'Double-Edge': 'normal',
    'Extreme Speed': 'normal',
    'Facade': 'normal',
    'Head Charge': 'normal',
    'Hidden Power': 'normal',
    'Hyper Fang': 'normal',
    'Slam': 'normal',
    'Strength': 'normal',
    'Struggle': 'normal',
    'Tackle': 'normal',
    'Take Down': 'normal',
    // Fire
    'Fire Blast': 'fire',
    // Water
    'Aqua Tail': 'water',
    'Hydro Pump': 'water',
    'Muddy Water': 'water',
    'Scald': 'water',
    'Surf': 'water',
    // Electric
    'Charge Beam': 'electric',
    'Spark': 'electric',
    'Thunder': 'electric',
    'Thunderbolt': 'electric',
    'Volt Tackle': 'electric',
    'Wild Charge': 'electric',
    'Zap Cannon': 'electric',
    // Grass
    'Energy Ball': 'grass',
    'Petal Dance': 'grass',
    'Power Whip': 'grass',
    'Solar Beam': 'grass',
    'Wood Hammer': 'grass',
    // Ice
    'Blizzard': 'ice',
    'Ice Beam': 'ice',
    // Fighting
    'Brick Break': 'fighting',
    'Close Combat': 'fighting',
    'Cross Chop': 'fighting',
    'Dynamic Punch': 'fighting',
    'Focus Blast': 'fighting',
    // Poison
    'Gunk Shot': 'poison',
    'Poison Sting': 'poison',
    'Sludge Bomb': 'poison',
    // Ground
    'Dig': 'ground',
    'Earth Power': 'ground',
    'Earthquake': 'ground',
    'Mud-Slap': 'ground',
    // Flying
    'Aerial Ace': 'flying',
    'Air Cutter': 'flying',
    'Air Slash': 'flying',
    'Bounce': 'flying',
    'Brave Bird': 'flying',
    'Drill Peck': 'flying',
    'Fly': 'flying',
    'Hurricane': 'flying',
    // Psychic
    'Dream Eater': 'psychic',
    'Future Sight': 'psychic',
    'Psychic': 'psychic',
    'Zen Headbutt': 'psychic',
    // Bug
    'Attack Order': 'bug',
    'Bug Bite': 'bug',
    'Bug Buzz': 'bug',
    'Megahorn': 'bug',
    'Signal Beam': 'bug',
    'Steamroller': 'bug',
    'X-Scissor': 'bug',
    // Rock
    'Rock Slide': 'rock',
    'Rollout': 'rock',
    'Stone Edge': 'rock',
    // Ghost
    'Shadow Ball': 'ghost',
    'Shadow Force': 'ghost',
    // Dragon
    'Outrage': 'dragon',
    // Dark
    'Crunch': 'dark',
    'Dark Pulse': 'dark',
    'Foul Play': 'dark',
    // Steel
    'Flash Cannon': 'steel',
    'Iron Head': 'steel',
    'Iron Tail': 'steel',
    'Meteor Mash': 'steel',
};
export const STAT_MOVES = {
    // Self-boosting moves
    'Swords Dance': { target: 'self', boosts: { atk: 2 } },
    'Dragon Dance': { target: 'self', boosts: { atk: 1, spe: 1 } },
    'Calm Mind': { target: 'self', boosts: { spa: 1, spd: 1 } },
    'Nasty Plot': { target: 'self', boosts: { spa: 2 } },
    'Iron Defense': { target: 'self', boosts: { def: 2 } },
    'Amnesia': { target: 'self', boosts: { spd: 2 } },
    'Agility': { target: 'self', boosts: { spe: 2 } },
    'Bulk Up': { target: 'self', boosts: { atk: 1, def: 1 } },
    'Howl': { target: 'self', boosts: { atk: 1 } },
    'Growth': { target: 'self', boosts: { atk: 1, spa: 1 } },
    'Cosmic Power': { target: 'self', boosts: { def: 1, spd: 1 } },
    'Rock Polish': { target: 'self', boosts: { spe: 2 } },
    'Tail Glow': { target: 'self', boosts: { spa: 3 } },
    'Acid Armor': { target: 'self', boosts: { def: 2 } },
    'Barrier': { target: 'self', boosts: { def: 2 } },
    // Gen 5 self-boosting moves
    'Quiver Dance': { target: 'self', boosts: { spa: 1, spd: 1, spe: 1 } },
    'Shell Smash': { target: 'self', boosts: { atk: 2, spa: 2, spe: 2 } },
    'Coil': { target: 'self', boosts: { atk: 1, def: 1 } },
    'Cotton Guard': { target: 'self', boosts: { def: 3 } },
    'Work Up': { target: 'self', boosts: { atk: 1, spa: 1 } },
    // Opponent-lowering moves
    'Screech': { target: 'opponent', boosts: { def: -2 } },
    'Charm': { target: 'opponent', boosts: { atk: -2 } },
    'Scary Face': { target: 'opponent', boosts: { spe: -2 } },
    'Fake Tears': { target: 'opponent', boosts: { spd: -2 } },
    'Metal Sound': { target: 'opponent', boosts: { spd: -2 } },
    'Feather Dance': { target: 'opponent', boosts: { atk: -2 } },
    'Leer': { target: 'opponent', boosts: { def: -1 } },
    'Growl': { target: 'opponent', boosts: { atk: -1 } },
    'Tail Whip': { target: 'opponent', boosts: { def: -1 } },
    'String Shot': { target: 'opponent', boosts: { spe: -1 } },
};
export const STATUS_MOVES = {
    'Thunder Wave': { status: 'paralysis' },
    'Will-O-Wisp': { status: 'burn' },
    'Toxic': { status: 'toxic' },
    'Hypnosis': { status: 'sleep' },
    'Sleep Powder': { status: 'sleep' },
    'Stun Spore': { status: 'paralysis' },
    'Sing': { status: 'sleep' },
    'Glare': { status: 'paralysis' },
    'Poison Powder': { status: 'poison' },
};
export const MOVE_SECONDARY_EFFECTS = {
    // Paralysis
    'Thunderbolt': { status: 'paralysis', chance: 10 },
    'Thunder': { status: 'paralysis', chance: 30 },
    'Volt Tackle': { status: 'paralysis', chance: 10 },
    'Zap Cannon': { status: 'paralysis', chance: 100 },
    'Body Slam': { status: 'paralysis', chance: 30 },
    'Bounce': { status: 'paralysis', chance: 30 },
    // Burn
    'Fire Blast': { status: 'burn', chance: 10 },
    // Poison
    'Sludge Bomb': { status: 'poison', chance: 30 },
    'Gunk Shot': { status: 'poison', chance: 30 },
    'Poison Sting': { status: 'poison', chance: 30 },
    // Freeze
    'Blizzard': { status: 'freeze', chance: 10 },
    // Gen 5 secondary effects
    'Scald': { status: 'burn', chance: 30 },
    'Blue Flare': { status: 'burn', chance: 20 },
    'Searing Shot': { status: 'burn', chance: 30 },
    'Bolt Strike': { status: 'paralysis', chance: 20 },
    'Wild Charge': { status: 'paralysis', chance: 0 },
};
// Move accuracy (percentage). Moves not listed default to 100.
// Values from Generation IV game data.
export const MOVE_ACCURACY = {
    // 100% (explicitly listed for clarity on commonly-assumed moves)
    'Thunderbolt': 100,
    'Surf': 100,
    'Psychic': 100,
    'Earthquake': 100,
    'Energy Ball': 100,
    'Shadow Ball': 100,
    'Flash Cannon': 100,
    'Dark Pulse': 100,
    'Bug Buzz': 100,
    'Brick Break': 100,
    'X-Scissor': 100,
    'Crunch': 100,
    'Extreme Speed': 100,
    'Sludge Bomb': 100,
    'Earth Power': 100,
    'Signal Beam': 100,
    'Drill Peck': 100,
    'Body Slam': 100,
    'Facade': 100,
    'Brave Bird': 100,
    'Close Combat': 100,
    'Bug Bite': 100,
    'Wood Hammer': 100,
    'Volt Tackle': 100,
    'Double-Edge': 100,
    'Strength': 100,
    'Outrage': 100,
    'Petal Dance': 100,
    'Attack Order': 100,
    'Brine': 100,
    // 95%
    'Air Slash': 95,
    'Iron Head': 95,
    'Air Cutter': 95,
    'Aqua Tail': 95,
    'Dig': 95, // (80 in some gens, 95 in Gen IV)
    'Zen Headbutt': 90,
    'Rock Slide': 90,
    'Poison Sting': 100,
    // 90%
    'Iron Tail': 75,
    'Megahorn': 85,
    'Stone Edge': 80,
    'Power Whip': 85,
    'Mud-Slap': 100,
    'Bounce': 85,
    'Fly': 95, // (90 in some gens, 95 in Gen IV)
    'Dream Eater': 100,
    'Solar Beam': 100,
    'Slam': 75,
    'Tackle': 100, // (95 in older gens, 100 from Gen V)
    'Take Down': 85,
    'Rollout': 90,
    // 85%
    'Muddy Water': 85,
    'Meteor Mash': 90,
    // 80%
    'Hydro Pump': 80,
    'Fire Blast': 85,
    'Blizzard': 70,
    'Thunder': 70,
    'Cross Chop': 80,
    'Gunk Shot': 80,
    'Shadow Force': 100,
    // 70%
    'Focus Blast': 70,
    // 50%
    'Dynamic Punch': 50,
    'Zap Cannon': 50,
    // Special
    'Future Sight': 100,
    'Hidden Power': 100,
    'Struggle': 100,
    'Aerial Ace': Infinity, // Never misses
    // Stat moves — opponent-targeting ones have accuracy
    'Screech': 85,
    'Scary Face': 90, // (was 90 in Gen IV)
    'Metal Sound': 85,
    'String Shot': 95,
    'Growl': 100,
    'Leer': 100,
    'Tail Whip': 100,
    'Charm': 100,
    'Fake Tears': 100,
    'Feather Dance': 100,
    // Status-inflicting moves
    'Thunder Wave': 100,
    'Will-O-Wisp': 75,
    'Toxic': 85,
    'Hypnosis': 60,
    'Sleep Powder': 75,
    'Stun Spore': 75,
    'Sing': 55,
    'Glare': 75,
    'Poison Powder': 75,
    // Gen 5 move accuracy
    'Scald': 100,
    'Razor Shell': 95,
    'Wild Charge': 100,
    'Acrobatics': 100,
    'Hurricane': 70,
    'Blue Flare': 85,
    'Bolt Strike': 85,
    'V-create': 95,
    'Searing Shot': 100,
    'Fiery Dance': 100,
    'Heat Crash': 100,
    'Fusion Flare': 100,
    'Fusion Bolt': 100,
    'Glaciate': 95,
    'Icicle Crash': 90,
    'Frost Breath': 90,
    'Sacred Sword': 100,
    'Secret Sword': 100,
    'Head Charge': 100,
    'Night Daze': 95,
    'Snarl': 95,
    'Psystrike': 100,
    'Heart Stamp': 100,
    'Hex': 100,
    'Dragon Tail': 90,
    'Dual Chop': 90,
    'Leaf Tornado': 90,
    'Horn Leech': 100,
    'Acid Spray': 100,
    'Techno Blast': 100,
    'Relic Song': 100,
    'Gear Grind': 85,
    'Struggle Bug': 100,
    'Steamroller': 100,
    'Smack Down': 100,
};
export const ALL_MOVE_NAMES = Object.keys(MOVE_TYPES);
export function getMoveType(moveName) {
    return MOVE_TYPES[moveName] ?? 'normal';
}
export function getMoveAccuracy(moveName) {
    return MOVE_ACCURACY[moveName] ?? 100;
}
export function getTMSprite(moveName) {
    const type = getMoveType(moveName);
    return `/pokemonparty/assets/tm-${type}.png`;
}
