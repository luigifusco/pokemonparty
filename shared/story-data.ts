// Story Mode — Multi-storyline system
// Each storyline is a sequence of battle and dialogue steps

const TRAINERS_PATH = '/pokemonparty/assets/trainers';

export interface StoryStep {
  type: 'battle' | 'dialogue';
  speaker?: string;
  sprite?: string;
  lines?: string[];
  trainerName?: string;
  trainerTitle?: string;
  team?: number[];
  fieldSize?: 1 | 2 | 3;
  essenceReward?: number;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Storyline {
  id: string;
  title: string;
  description: string;
  region: string;
  difficulty: Difficulty;
  icon: string;
  requires: string[];
  requiresCount?: number;
  steps: StoryStep[];
  completionReward: {
    essence: number;
    pack?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  };
}

function sp(name: string) { return TRAINERS_PATH + '/' + name + '.png'; }

export const STORYLINES: Storyline[] = [
  // ───────────── BEGINNER ─────────────
  {
    id: 'brock-challenge', title: "Brock's Challenge", description: 'Prove yourself to the rock-solid gym leader.',
    region: 'Kanto', difficulty: 'beginner', icon: '🪨', requires: [],
    steps: [
      { type: 'dialogue', speaker: 'Brock', sprite: sp('brock'), lines: ["So you want to become a trainer?", "Show me you can handle rock-solid defense!"] },
      { type: 'battle', trainerName: 'Brock', trainerTitle: 'Gym Leader', team: [74, 95], fieldSize: 1, essenceReward: 100 },
      { type: 'dialogue', speaker: 'Brock', sprite: sp('brock'), lines: ["Not bad! You've got potential.", "Keep training and you'll go far."] },
    ],
    completionReward: { essence: 200 },
  },
  {
    id: 'misty-trial', title: "Misty's Trial", description: 'Face the power of water at Cerulean Gym.',
    region: 'Kanto', difficulty: 'beginner', icon: '🌊', requires: [],
    steps: [
      { type: 'dialogue', speaker: 'Misty', sprite: sp('misty'), lines: ["Think you can handle the power of water?", "Let's find out!"] },
      { type: 'battle', trainerName: 'Misty', trainerTitle: 'Gym Leader', team: [120, 121], fieldSize: 1, essenceReward: 100 },
      { type: 'dialogue', speaker: 'Misty', sprite: sp('misty'), lines: ["Hmph... you got lucky.", "But I respect your skill."] },
    ],
    completionReward: { essence: 200 },
  },
  {
    id: 'whitney-fury', title: "Whitney's Fury", description: "Whitney won't let anyone call her weak!",
    region: 'Johto', difficulty: 'beginner', icon: '🐄', requires: [],
    steps: [
      { type: 'dialogue', speaker: 'Whitney', sprite: sp('whitney'), lines: ["Everyone thinks I'm just a crybaby!", "I'll show you how strong I really am!"] },
      { type: 'battle', trainerName: 'Whitney', trainerTitle: 'Gym Leader', team: [35, 241], fieldSize: 1, essenceReward: 100 },
      { type: 'dialogue', speaker: 'Whitney', sprite: sp('whitney'), lines: ["*sniff*... Okay, you win.", "But next time I won't go easy!"] },
    ],
    completionReward: { essence: 200 },
  },
  {
    id: 'roxanne-lesson', title: "Roxanne's Lesson", description: 'A studious battle with the Hoenn professor.',
    region: 'Hoenn', difficulty: 'beginner', icon: '📖', requires: [],
    steps: [
      { type: 'dialogue', speaker: 'Roxanne', sprite: sp('roxanne'), lines: ["Type matchups are the foundation of strategy.", "Allow me to demonstrate!"] },
      { type: 'battle', trainerName: 'Roxanne', trainerTitle: 'Gym Leader', team: [74, 299], fieldSize: 1, essenceReward: 100 },
      { type: 'dialogue', speaker: 'Roxanne', sprite: sp('roxanne'), lines: ["Excellent application of type advantages!", "You learn fast."] },
    ],
    completionReward: { essence: 200 },
  },

  // ───────────── INTERMEDIATE ─────────────
  {
    id: 'kanto-gyms', title: 'Kanto Gym Circuit', description: 'Challenge the Kanto gym leaders in sequence.',
    region: 'Kanto', difficulty: 'intermediate', icon: '🏛️',
    requires: ['brock-challenge', 'misty-trial', 'whitney-fury', 'roxanne-lesson'], requiresCount: 2,
    steps: [
      { type: 'dialogue', speaker: 'Brock', sprite: sp('brock'), lines: ["Ready for the real challenge?", "The Kanto gyms await."] },
      { type: 'battle', trainerName: 'Brock', trainerTitle: 'Gym Leader', team: [95, 76, 141], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Misty', trainerTitle: 'Gym Leader', team: [121, 131, 130], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Lt. Surge', trainerTitle: 'Gym Leader', team: [26, 101, 135], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Erika', trainerTitle: 'Gym Leader', team: [45, 114, 3], fieldSize: 2, essenceReward: 200 },
      { type: 'battle', trainerName: 'Sabrina', trainerTitle: 'Gym Leader', team: [65, 196, 122], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Sabrina', sprite: sp('sabrina'), lines: ["I foresee great things in your future...", "The Elite Four awaits."] },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },
  {
    id: 'johto-gyms', title: 'Johto Gym Circuit', description: 'Challenge the Johto gym leaders.',
    region: 'Johto', difficulty: 'intermediate', icon: '🏛️',
    requires: ['brock-challenge', 'misty-trial', 'whitney-fury', 'roxanne-lesson'], requiresCount: 2,
    steps: [
      { type: 'dialogue', speaker: 'Falkner', sprite: sp('falkner'), lines: ["Johto's gym leaders are no pushovers.", "Are you ready?"] },
      { type: 'battle', trainerName: 'Falkner', trainerTitle: 'Gym Leader', team: [22, 164], fieldSize: 1, essenceReward: 100 },
      { type: 'battle', trainerName: 'Bugsy', trainerTitle: 'Gym Leader', team: [123, 214], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Whitney', trainerTitle: 'Gym Leader', team: [241, 36, 210], fieldSize: 1, essenceReward: 200 },
      { type: 'battle', trainerName: 'Morty', trainerTitle: 'Gym Leader', team: [94, 200, 429], fieldSize: 2, essenceReward: 200 },
      { type: 'battle', trainerName: 'Chuck', trainerTitle: 'Gym Leader', team: [62, 107], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Jasmine', trainerTitle: 'Gym Leader', team: [208, 82, 227], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Jasmine', sprite: sp('jasmine'), lines: ["Your bond with your Pokémon is beautiful.", "Keep going!"] },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },
  {
    id: 'hoenn-gyms', title: 'Hoenn Gym Circuit', description: 'Challenge the Hoenn gym leaders.',
    region: 'Hoenn', difficulty: 'intermediate', icon: '🏛️',
    requires: ['brock-challenge', 'misty-trial', 'whitney-fury', 'roxanne-lesson'], requiresCount: 2,
    steps: [
      { type: 'battle', trainerName: 'Roxanne', trainerTitle: 'Gym Leader', team: [76, 299, 306], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Brawly', trainerTitle: 'Gym Leader', team: [296, 297], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Wattson', trainerTitle: 'Gym Leader', team: [82, 310, 181], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Flannery', trainerTitle: 'Gym Leader', team: [323, 219, 324], fieldSize: 2, essenceReward: 200 },
      { type: 'battle', trainerName: 'Norman', trainerTitle: 'Gym Leader', team: [289, 335, 128], fieldSize: 2, essenceReward: 200 },
      { type: 'battle', trainerName: 'Winona', trainerTitle: 'Gym Leader', team: [334, 277, 227], fieldSize: 2, essenceReward: 200 },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },
  {
    id: 'sinnoh-gyms', title: 'Sinnoh Gym Circuit', description: 'Challenge the Sinnoh gym leaders.',
    region: 'Sinnoh', difficulty: 'intermediate', icon: '🏛️',
    requires: ['brock-challenge', 'misty-trial', 'whitney-fury', 'roxanne-lesson'], requiresCount: 2,
    steps: [
      { type: 'battle', trainerName: 'Maylene', trainerTitle: 'Gym Leader', team: [308, 448, 214], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Crasher Wake', trainerTitle: 'Gym Leader', team: [130, 195, 419], fieldSize: 1, essenceReward: 150 },
      { type: 'battle', trainerName: 'Fantina', trainerTitle: 'Gym Leader', team: [429, 426, 94], fieldSize: 2, essenceReward: 200 },
      { type: 'battle', trainerName: 'Byron', trainerTitle: 'Gym Leader', team: [411, 208, 306], fieldSize: 2, essenceReward: 200 },
      { type: 'battle', trainerName: 'Candice', trainerTitle: 'Gym Leader', team: [473, 461, 460], fieldSize: 2, essenceReward: 200 },
      { type: 'battle', trainerName: 'Volkner', trainerTitle: 'Gym Leader', team: [466, 405, 135, 26], fieldSize: 2, essenceReward: 250 },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },

  // ───────────── ADVANCED ─────────────
  {
    id: 'kanto-e4', title: 'Kanto Elite Four', description: 'Face the strongest trainers in Kanto.',
    region: 'Kanto', difficulty: 'advanced', icon: '⭐',
    requires: ['kanto-gyms'],
    steps: [
      { type: 'dialogue', speaker: 'Lance', sprite: sp('lance'), lines: ["The Elite Four awaits.", "Only the strongest may pass."] },
      { type: 'battle', trainerName: 'Bruno', trainerTitle: 'Elite Four', team: [68, 107, 106, 95], fieldSize: 2, essenceReward: 300 },
      { type: 'battle', trainerName: 'Agatha', trainerTitle: 'Elite Four', team: [94, 169, 110, 429], fieldSize: 2, essenceReward: 300 },
      { type: 'battle', trainerName: 'Lance', trainerTitle: 'Champion', team: [149, 130, 142, 6], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Lance', sprite: sp('lance'), lines: ["You are truly worthy.", "But there is one more challenger..."] },
      { type: 'battle', trainerName: 'Blue', trainerTitle: 'Champion', team: [9, 65, 59, 103, 112, 130], fieldSize: 3, essenceReward: 500 },
    ],
    completionReward: { essence: 2000, pack: 'rare' },
  },
  {
    id: 'johto-e4', title: 'Johto Elite Four', description: 'Face the strongest trainers in Johto.',
    region: 'Johto', difficulty: 'advanced', icon: '⭐',
    requires: ['johto-gyms'],
    steps: [
      { type: 'battle', trainerName: 'Will', trainerTitle: 'Elite Four', team: [178, 80, 103, 196], fieldSize: 2, essenceReward: 300 },
      { type: 'battle', trainerName: 'Koga', trainerTitle: 'Elite Four', team: [169, 110, 89, 49], fieldSize: 2, essenceReward: 300 },
      { type: 'battle', trainerName: 'Karen', trainerTitle: 'Elite Four', team: [197, 229, 215, 359], fieldSize: 2, essenceReward: 400 },
      { type: 'battle', trainerName: 'Lance', trainerTitle: 'Champion', team: [149, 130, 142, 6, 148, 230], fieldSize: 3, essenceReward: 500 },
    ],
    completionReward: { essence: 2000, pack: 'rare' },
  },
  {
    id: 'hoenn-e4', title: 'Hoenn Elite Four', description: 'Face the strongest trainers in Hoenn.',
    region: 'Hoenn', difficulty: 'advanced', icon: '⭐',
    requires: ['hoenn-gyms'],
    steps: [
      { type: 'battle', trainerName: 'Sidney', trainerTitle: 'Elite Four', team: [275, 319, 332, 359], fieldSize: 2, essenceReward: 300 },
      { type: 'battle', trainerName: 'Phoebe', trainerTitle: 'Elite Four', team: [356, 354, 429, 477], fieldSize: 2, essenceReward: 300 },
      { type: 'battle', trainerName: 'Glacia', trainerTitle: 'Elite Four', team: [362, 365, 461, 473], fieldSize: 2, essenceReward: 400 },
      { type: 'battle', trainerName: 'Steven', trainerTitle: 'Champion', team: [376, 306, 348, 346, 227, 344], fieldSize: 3, essenceReward: 500 },
    ],
    completionReward: { essence: 2500, pack: 'rare' },
  },
  {
    id: 'sinnoh-e4', title: 'Sinnoh Elite Four', description: 'Face the strongest trainers in Sinnoh.',
    region: 'Sinnoh', difficulty: 'advanced', icon: '⭐',
    requires: ['sinnoh-gyms'],
    steps: [
      { type: 'battle', trainerName: 'Aaron', trainerTitle: 'Elite Four', team: [416, 214, 469, 402], fieldSize: 2, essenceReward: 300 },
      { type: 'battle', trainerName: 'Bertha', trainerTitle: 'Elite Four', team: [450, 76, 340, 464], fieldSize: 2, essenceReward: 300 },
      { type: 'battle', trainerName: 'Flint', trainerTitle: 'Elite Four', team: [392, 467, 136, 59], fieldSize: 2, essenceReward: 400 },
      { type: 'battle', trainerName: 'Cynthia', trainerTitle: 'Champion', team: [445, 448, 442, 350, 407, 468], fieldSize: 3, essenceReward: 600 },
    ],
    completionReward: { essence: 3000, pack: 'epic' },
  },

  // ───────────── EXPERT ─────────────
  {
    id: 'red-challenge', title: 'The Red Challenge', description: 'Face the legendary trainer atop Mt. Silver.',
    region: 'Kanto', difficulty: 'expert', icon: '🏔️',
    requires: ['kanto-e4', 'johto-e4'],
    steps: [
      { type: 'dialogue', speaker: 'Blue', sprite: sp('blue'), lines: ["You've beaten the Elite Four in two regions...", "But Red is on another level.", "He doesn't speak. He just battles."] },
      { type: 'battle', trainerName: 'Red', trainerTitle: 'Pokémon Master', team: [25, 143, 131, 3, 6, 9], fieldSize: 3, essenceReward: 1000 },
      { type: 'dialogue', speaker: 'Red', sprite: sp('red'), lines: ["..."] },
    ],
    completionReward: { essence: 5000, pack: 'legendary' },
  },
  {
    id: 'cynthia-rematch', title: "Cynthia's Rematch", description: 'The Sinnoh Champion seeks a worthy challenger.',
    region: 'Sinnoh', difficulty: 'expert', icon: '🌟',
    requires: ['sinnoh-e4'],
    steps: [
      { type: 'dialogue', speaker: 'Cynthia', sprite: sp('cynthia'), lines: ["I've been training since our last battle.", "No holding back this time."] },
      { type: 'battle', trainerName: 'Cynthia', trainerTitle: 'Champion', team: [445, 448, 442, 350, 407, 468], fieldSize: 3, essenceReward: 1000 },
      { type: 'dialogue', speaker: 'Cynthia', sprite: sp('cynthia'), lines: ["Magnificent... You truly are the strongest trainer I've ever faced."] },
    ],
    completionReward: { essence: 5000, pack: 'epic' },
  },
];

export const STORYLINES_BY_ID: Record<string, Storyline> = Object.fromEntries(
  STORYLINES.map((s) => [s.id, s])
);

export const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  beginner: 0, intermediate: 1, advanced: 2, expert: 3,
};
