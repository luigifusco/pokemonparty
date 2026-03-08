// TM Shop pricing — cost in essence to purchase a TM
// Prices based on move power, accuracy, and competitive utility

export const TM_PRICES: Record<string, number> = {
  // === Premium moves (high power / top competitive) ===
  'Earthquake': 200,
  'Close Combat': 200,
  'Outrage': 200,
  'Brave Bird': 180,
  'Hydro Pump': 180,
  'Fire Blast': 180,
  'Thunder': 150,
  'Blizzard': 150,
  'Focus Blast': 150,
  'Volt Tackle': 180,
  'Wood Hammer': 180,
  'Double-Edge': 150,
  'Shadow Force': 200,
  'Extreme Speed': 180,
  'Gunk Shot': 150,
  'Meteor Mash': 180,
  'Zap Cannon': 120,
  'Dynamic Punch': 120,
  'Petal Dance': 150,
  'Solar Beam': 150,
  'Power Whip': 150,

  // === Strong moves (reliable, good power) ===
  'Thunderbolt': 150,
  'Surf': 150,
  'Psychic': 150,
  'Energy Ball': 120,
  'Shadow Ball': 150,
  'Dark Pulse': 120,
  'Flash Cannon': 120,
  'Sludge Bomb': 120,
  'Earth Power': 150,
  'Bug Buzz': 120,
  'Crunch': 120,
  'Stone Edge': 150,
  'Iron Head': 120,
  'X-Scissor': 100,
  'Megahorn': 150,
  'Cross Chop': 120,
  'Drill Peck': 100,
  'Body Slam': 100,
  'Attack Order': 120,
  'Aqua Tail': 100,
  'Air Slash': 100,
  'Zen Headbutt': 100,

  // === Mid-tier moves ===
  'Rock Slide': 100,
  'Signal Beam': 80,
  'Iron Tail': 80,
  'Bounce': 80,
  'Fly': 80,
  'Dig': 80,
  'Muddy Water': 100,
  'Brine': 80,
  'Dream Eater': 80,
  'Future Sight': 100,
  'Bug Bite': 60,
  'Facade': 80,
  'Rollout': 50,
  'Take Down': 60,
  'Slam': 50,
  'Strength': 60,
  'Hidden Power': 60,

  // === Weak moves ===
  'Aerial Ace': 60,
  'Mud-Slap': 30,
  'Poison Sting': 20,
  'Tackle': 20,
  'Struggle': 10,

  // === Stat-boosting moves (very valuable competitively) ===
  'Swords Dance': 200,
  'Dragon Dance': 250,
  'Calm Mind': 200,
  'Nasty Plot': 200,
  'Agility': 150,
  'Iron Defense': 120,
  'Amnesia': 120,
  'Bulk Up': 150,
  'Rock Polish': 120,
  'Tail Glow': 250,
  'Acid Armor': 100,
  'Barrier': 100,
  'Cosmic Power': 120,
  'Growth': 80,
  'Howl': 60,

  // === Stat-lowering moves ===
  'Screech': 80,
  'Charm': 80,
  'Scary Face': 60,
  'Fake Tears': 80,
  'Metal Sound': 80,
  'Feather Dance': 80,
  'Leer': 30,
  'Growl': 30,
  'Tail Whip': 30,
  'String Shot': 30,
};

export function getTMPrice(moveName: string): number {
  return TM_PRICES[moveName] ?? 100;
}

export const ALL_SHOP_TMS = Object.keys(TM_PRICES).sort();
