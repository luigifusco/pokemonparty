// Story Mode — "The Stolen Spark"
// 25 chapters of escalating difficulty across 5 regions

const TRAINERS_PATH = '/pokemonparty/assets/trainers';

export interface StoryChapter {
  id: number;
  region: string;
  trainerName: string;
  trainerTitle: string;
  sprite: string;
  /** Dialogue shown before battle */
  introline: string;
  /** Dialogue shown after winning */
  winLine: string;
  /** Pokemon IDs for the opponent team */
  team: number[];
  fieldSize: 1 | 2 | 3;
  /** Essence reward for first clear */
  essenceReward: number;
  /** If true, player gets a free pack of this tier after winning */
  packReward?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  /** Is this a major boss (shard guardian)? */
  isBoss?: boolean;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  // ════════════════════ KANTO ════════════════════

  { id: 1, region: 'Kanto', trainerName: 'Bug Catcher', trainerTitle: 'Wild Encounter',
    sprite: `${TRAINERS_PATH}/bugcatcher.png`,
    introline: 'A strange energy flickers in the air... A wild Pokémon appears!',
    winLine: 'The wild Pokémon fled. You notice a faint glow in the distance.',
    team: [10], fieldSize: 1, essenceReward: 100 },

  { id: 2, region: 'Kanto', trainerName: 'Youngster Joey', trainerTitle: 'Trainer',
    sprite: `${TRAINERS_PATH}/youngster.png`,
    introline: '"Hey! My Rattata is in the top percentage of all Rattata! Something weird is happening to the Pokémon though..."',
    winLine: '"Wow, you\'re strong! I heard the Spark shattered... Maybe you can fix it?"',
    team: [19, 20], fieldSize: 1, essenceReward: 150 },

  { id: 3, region: 'Kanto', trainerName: 'Rocket Grunt', trainerTitle: 'Team Rocket',
    sprite: `${TRAINERS_PATH}/rocketgrunt.png`,
    introline: '"Hand over your Pokémon! Team Rocket is collecting the Spark shards, and nobody\'s stopping us!"',
    winLine: '"Tch... The boss will hear about this. He\'s got the Kanto shard already!"',
    team: [41, 109, 24], fieldSize: 1, essenceReward: 200 },

  { id: 4, region: 'Kanto', trainerName: 'Brock', trainerTitle: 'Shard Guardian',
    sprite: `${TRAINERS_PATH}/brock.png`,
    introline: '"I\'ve been protecting the Pewter Shard. If you want it, you\'ll have to prove you\'re worthy!"',
    winLine: '"Take the shard. You\'ll need all five to restore the Spark. Head to Johto — I sense another one there."',
    team: [95, 76, 141], fieldSize: 1, essenceReward: 500, packReward: 'common', isBoss: true },

  { id: 5, region: 'Kanto', trainerName: 'Blue', trainerTitle: 'Rival',
    sprite: `${TRAINERS_PATH}/blue.png`,
    introline: '"You\'re collecting shards too? Ha! I\'ll get them all before you. Let\'s see what you\'ve got!"',
    winLine: '"Not bad... but this isn\'t over. I\'ll be watching you."',
    team: [9, 65, 59], fieldSize: 1, essenceReward: 300 },

  { id: 6, region: 'Kanto', trainerName: 'Rocket Grunt', trainerTitle: 'Team Rocket',
    sprite: `${TRAINERS_PATH}/rocketgruntf.png`,
    introline: '"You beat my partner? You won\'t get past me!"',
    winLine: '"The boss... he\'s in the Rocket hideout. But you\'ll never beat him!"',
    team: [24, 110, 89], fieldSize: 1, essenceReward: 200 },

  { id: 7, region: 'Kanto', trainerName: 'Giovanni', trainerTitle: 'Team Rocket Boss',
    sprite: `${TRAINERS_PATH}/giovanni.png`,
    introline: '"The Spark? I don\'t need it. I need its POWER. And you\'re in my way."',
    winLine: '"Impressive... Perhaps the Spark chose correctly after all. Take this — the second shard was hidden here all along."',
    team: [34, 112, 31], fieldSize: 1, essenceReward: 800, packReward: 'uncommon', isBoss: true },

  // ════════════════════ JOHTO ════════════════════

  { id: 8, region: 'Johto', trainerName: 'Lass', trainerTitle: 'Trainer',
    sprite: `${TRAINERS_PATH}/lass.png`,
    introline: '"The Pokémon in Johto are acting strange... Please, can you help?"',
    winLine: '"Thank you for the battle! Whitney at the Goldenrod Gym might know about the shard."',
    team: [35, 36, 176], fieldSize: 1, essenceReward: 200 },

  { id: 9, region: 'Johto', trainerName: 'Silver', trainerTitle: 'Rival',
    sprite: `${TRAINERS_PATH}/silver.png`,
    introline: '"Out of my way. The shards are MINE. I don\'t need anyone\'s help!"',
    winLine: '"...Fine. Maybe there\'s more to strength than just power."',
    team: [157, 215, 169], fieldSize: 1, essenceReward: 400 },

  { id: 10, region: 'Johto', trainerName: 'Whitney', trainerTitle: 'Shard Guardian',
    sprite: `${TRAINERS_PATH}/whitney.png`,
    introline: '"The Johto Shard? Waaah, you can\'t just TAKE it! You have to beat me first!"',
    winLine: '"*sniff* Fine, take it... But promise you\'ll save the Pokémon!"',
    team: [241, 242, 36, 210], fieldSize: 1, essenceReward: 600, packReward: 'uncommon', isBoss: true },

  // ════════════════════ HOENN ════════════════════

  { id: 11, region: 'Hoenn', trainerName: 'Aqua Grunt', trainerTitle: 'Team Aqua',
    sprite: `${TRAINERS_PATH}/aquagrunt.png`,
    introline: '"Team Aqua will expand the seas! The Hoenn shard will fuel our plans!"',
    winLine: '"Boss Archie has the shard... You\'ll never take it from him!"',
    team: [318, 320, 72], fieldSize: 1, essenceReward: 250 },

  { id: 12, region: 'Hoenn', trainerName: 'Magma Grunt', trainerTitle: 'Team Magma',
    sprite: `${TRAINERS_PATH}/magmagrunt.png`,
    introline: '"Team Magma will expand the land! We need that shard more than Aqua does!"',
    winLine: '"Maxie will be furious... but maybe the shard shouldn\'t belong to either of us."',
    team: [322, 218, 88], fieldSize: 1, essenceReward: 250 },

  { id: 13, region: 'Hoenn', trainerName: 'Archie', trainerTitle: 'Team Aqua Boss',
    sprite: `${TRAINERS_PATH}/archie.png`,
    introline: '"The ocean\'s fury needs the Spark! Hand over the shards you\'ve collected, or face the tide!"',
    winLine: '"The sea... it calms. Maybe the Spark isn\'t meant to be controlled."',
    team: [319, 130, 342, 73], fieldSize: 2, essenceReward: 500 },

  { id: 14, region: 'Hoenn', trainerName: 'Maxie', trainerTitle: 'Team Magma Boss',
    sprite: `${TRAINERS_PATH}/maxie.png`,
    introline: '"If Archie couldn\'t stop you, perhaps I should try a different approach. The shard — NOW!"',
    winLine: '"The earth stills... You\'ve earned the right to carry the shards."',
    team: [323, 229, 330, 324], fieldSize: 2, essenceReward: 500 },

  { id: 15, region: 'Hoenn', trainerName: 'Steven', trainerTitle: 'Shard Guardian',
    sprite: `${TRAINERS_PATH}/steven.png`,
    introline: '"I\'ve safeguarded the Hoenn Shard within the ancient stones. Show me you can handle its weight."',
    winLine: '"Magnificent. Three shards gathered. The Spark stirs — continue to Sinnoh."',
    team: [376, 306, 348, 346], fieldSize: 2, essenceReward: 1000, packReward: 'rare', isBoss: true },

  // ════════════════════ SINNOH ════════════════════

  { id: 16, region: 'Sinnoh', trainerName: 'Blue', trainerTitle: 'Rival (Rematch)',
    sprite: `${TRAINERS_PATH}/blue.png`,
    introline: '"Three shards already? I\'ve been training too. Don\'t think you\'re ahead!"',
    winLine: '"Alright, I admit it. You might actually be the one to restore the Spark."',
    team: [9, 65, 59, 103], fieldSize: 2, essenceReward: 600 },

  { id: 17, region: 'Sinnoh', trainerName: 'Galactic Grunt', trainerTitle: 'Team Galactic',
    sprite: `${TRAINERS_PATH}/galacticgrunt.png`,
    introline: '"Team Galactic will create a new universe! The shards are the key to our master plan!"',
    winLine: '"Commander... we\'ve failed. The intruder is heading for the summit."',
    team: [42, 436, 453], fieldSize: 1, essenceReward: 300 },

  { id: 18, region: 'Sinnoh', trainerName: 'Galactic Grunt', trainerTitle: 'Team Galactic',
    sprite: `${TRAINERS_PATH}/galacticgrunt.png`,
    introline: '"You won\'t reach the Spear Pillar! Team Galactic stands firm!"',
    winLine: '"Fall back! Let the Champion handle this one..."',
    team: [435, 169, 82], fieldSize: 1, essenceReward: 300 },

  { id: 19, region: 'Sinnoh', trainerName: 'Cynthia', trainerTitle: 'Shard Guardian',
    sprite: `${TRAINERS_PATH}/cynthia.png`,
    introline: '"The Sinnoh Shard resonates with the ancient myths. Prove to me that you understand the bond between people and Pokémon."',
    winLine: '"Four shards... The Spark is nearly whole. But beware — darkness gathers in Unova."',
    team: [445, 448, 442, 350, 468, 407], fieldSize: 2, essenceReward: 1500, packReward: 'epic', isBoss: true },

  // ════════════════════ UNOVA ════════════════════

  { id: 20, region: 'Unova', trainerName: 'Plasma Grunt', trainerTitle: 'Team Plasma',
    sprite: `${TRAINERS_PATH}/plasmagrunt.png`,
    introline: '"Lord Ghetsis says the Spark must be destroyed! Pokémon liberation demands it!"',
    winLine: '"How... Lord N said trainers are cruel, but you... you care about your Pokémon."',
    team: [510, 569, 521, 523], fieldSize: 2, essenceReward: 400 },

  { id: 21, region: 'Unova', trainerName: 'Plasma Grunt', trainerTitle: 'Team Plasma',
    sprite: `${TRAINERS_PATH}/plasmagrunt.png`,
    introline: '"The last shard is with Lord Ghetsis. You\'ll never take it from him!"',
    winLine: '"Maybe... maybe Ghetsis was wrong about trainers after all."',
    team: [545, 560, 537, 591], fieldSize: 2, essenceReward: 400 },

  { id: 22, region: 'Unova', trainerName: 'N', trainerTitle: 'King of Team Plasma',
    sprite: `${TRAINERS_PATH}/n.png`,
    introline: '"The Spark connects Pokémon and people... but is that bond real, or just chains? Show me your truth!"',
    winLine: '"I see... Your Pokémon fight alongside you freely. Perhaps the Spark IS the bond itself."',
    team: [571, 601, 567, 565, 584, 612], fieldSize: 2, essenceReward: 1000 },

  { id: 23, region: 'Unova', trainerName: 'Ghetsis', trainerTitle: 'The Usurper',
    sprite: `${TRAINERS_PATH}/ghetsis.png`,
    introline: '"Foolish child! The Spark\'s power is MINE. I will reshape the world — without Pokémon, without bonds, without YOU!"',
    winLine: '"No... NO! The Spark... it rejects me?! This cannot be!"',
    team: [635, 563, 537, 625, 604, 452], fieldSize: 2, essenceReward: 2000, packReward: 'rare', isBoss: true },

  // ════════════════════ FINALE ════════════════════

  { id: 24, region: 'Finale', trainerName: 'Blue', trainerTitle: 'Rival (Final)',
    sprite: `${TRAINERS_PATH}/blue.png`,
    introline: '"All five shards... Before you restore the Spark, let\'s have one final battle. No holding back!"',
    winLine: '"That was the best battle I\'ve ever had. Go — restore the Spark. The world is counting on you."',
    team: [9, 65, 59, 103, 112, 130], fieldSize: 3, essenceReward: 1500 },

  { id: 25, region: 'Finale', trainerName: 'Red', trainerTitle: 'The Legend',
    sprite: `${TRAINERS_PATH}/red.png`,
    introline: '"..."',
    winLine: 'The Spark blazes brilliantly. All five shards unite. Across every region, Pokémon roar with renewed energy. The world is saved.',
    team: [25, 143, 131, 3, 6, 9], fieldSize: 3, essenceReward: 5000, packReward: 'legendary', isBoss: true },
];

export const STORY_REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Finale'];
