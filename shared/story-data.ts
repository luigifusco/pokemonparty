// Story Mode — Multi-storyline system
// Each storyline is a sequence of battle and dialogue steps

const TRAINERS_PATH = '/pokemonparty/assets/trainers';

export interface StoryStep {
  type: 'battle' | 'dialogue' | 'info';
  speaker?: string;
  sprite?: string;
  lines?: string[];
  trainerName?: string;
  trainerTitle?: string;
  team?: number[];
  fieldSize?: 1 | 2 | 3;
  essenceReward?: number;
  /** For 'info' steps: the title of the info card. */
  infoTitle?: string;
  /** For 'info' steps: the icon shown on the info card. */
  infoIcon?: string;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface TeamChoice {
  label: string;
  pokemonIds: number[];
  /** Region lock activated when this team is chosen. Storylines with a
   *  matching `regionLock` become available; others stay locked forever. */
  region?: string;
}

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
  /** If set, player chooses one team at completion and receives those pokemon */
  teamChoices?: TeamChoice[];
  /** If set, only unlocks for players whose chosen starter region matches. */
  regionLock?: string;
}

/** Special chapter id used to record the irreversible starter-region pick. */
export const STARTER_REGION_PREFIX = 'starter-region:';
export function starterRegionChapter(region: string) { return STARTER_REGION_PREFIX + region; }

// Sentinel chapter ids posted on first-clear of specific storylines.
// Mechanics elsewhere in the code gate on these.
export const BOND_UNLOCK_CHAPTER = 'n-bond-awakening:complete';
export const CHARACTER_UNLOCK_CHAPTER = 'n-styles-revealed:complete';

function sp(name: string) { return TRAINERS_PATH + '/' + name + '.png'; }

export const STORYLINES: Storyline[] = [
  // ───────────── STARTER ─────────────
  {
    id: 'oak-starters', title: "Oak's Gift", description: 'Professor Oak has a gift for new trainers!',
    region: 'Kanto', difficulty: 'beginner', icon: '🧪', requires: [],
    steps: [
      { type: 'dialogue', speaker: 'Prof. Oak', sprite: sp('oak'), lines: [
        "Hello there! Welcome to the world of Pokémon!",
        "My name is Oak. People call me the Pokémon Professor.",
        "You must be a new trainer. I have something special for you.",
      ]},
      { type: 'dialogue', speaker: 'Prof. Oak', sprite: sp('oak'), lines: [
        "I've prepared five teams of starter Pokémon.",
        "Each team comes from a different region.",
        "Choose wisely — these will be your first partners!",
      ]},
    ],
    completionReward: { essence: 0 },
    teamChoices: [
      { label: 'Kanto Starters', pokemonIds: [1, 4, 7], region: 'Kanto' },
      { label: 'Johto Starters', pokemonIds: [152, 155, 158], region: 'Johto' },
      { label: 'Hoenn Starters', pokemonIds: [252, 255, 258], region: 'Hoenn' },
      { label: 'Sinnoh Starters', pokemonIds: [387, 390, 393], region: 'Sinnoh' },
      { label: 'Unova Starters', pokemonIds: [495, 498, 501], region: 'Unova' },
    ],
  },

  // ───────────── BEGINNER ─────────────
  {
    id: 'bug-catcher', title: 'Bug Catcher Frenzy', description: 'A bug enthusiast blocks the path!',
    region: 'Kanto', difficulty: 'beginner', icon: '🐛', requires: ['oak-starters'],
    steps: [
      { type: 'dialogue', speaker: 'Bug Catcher', sprite: sp('bugcatcher'), lines: ["Hey! You stepped into my web of bugs!", "Nobody passes without a battle!"] },
      { type: 'battle', trainerName: 'Bug Catcher', trainerTitle: 'Trainer', team: [10, 13], fieldSize: 1, essenceReward: 80 },
      { type: 'dialogue', speaker: 'Bug Catcher', sprite: sp('bugcatcher'), lines: ["Wow, your Pokémon are way stronger than my bugs...", "Good luck out there!"] },
    ],
    completionReward: { essence: 150 },
  },
  {
    id: 'youngster-joey', title: "Youngster Joey's Dare", description: 'His Rattata is in the top percentage!',
    region: 'Kanto', difficulty: 'beginner', icon: '👦', requires: ['oak-starters'],
    steps: [
      { type: 'dialogue', speaker: 'Youngster Joey', sprite: sp('youngster'), lines: ["Hey! My Rattata is in the top percentage of all Rattata!", "I challenge you to prove it!"] },
      { type: 'battle', trainerName: 'Youngster Joey', trainerTitle: 'Trainer', team: [19, 20], fieldSize: 1, essenceReward: 80 },
      { type: 'dialogue', speaker: 'Youngster Joey', sprite: sp('youngster'), lines: ["Okay maybe he's not THE top percentage...", "But he's still pretty good, right?"] },
    ],
    completionReward: { essence: 150 },
  },
  {
    id: 'n-bond-awakening', title: 'A Stranger Named N',
    description: 'A mysterious young man wants to talk about your Pokémon.',
    region: 'Unova', difficulty: 'beginner', icon: '👁️',
    requires: ['bug-catcher', 'youngster-joey'],
    steps: [
      { type: 'dialogue', speaker: 'N', sprite: sp('n'), lines: [
        "...Your Pokémon. They're saying something.",
        "Yes — I can hear them. Most people can't, but I always have.",
        "Tell me, trainer: do you think your Pokémon are happy by your side?",
      ]},
      { type: 'dialogue', speaker: 'N', sprite: sp('n'), lines: [
        "I'm called N. I travel the world looking for the truth about Pokémon and people.",
        "I've seen trainers who treat their Pokémon as tools. Weapons.",
        "But I've also seen ones — like you — who might just be friends with them.",
        "I want to feel for myself. Battle me, and let me hear your Pokémon's voices.",
      ]},
      { type: 'battle', trainerName: 'N', trainerTitle: 'Mysterious Trainer', team: [509, 519, 531], fieldSize: 1, essenceReward: 120 },
      { type: 'dialogue', speaker: 'N', sprite: sp('n'), lines: [
        "...I felt it. Your Pokémon trust you.",
        "That bond is not something you train into them. It's something you earn — together, over time.",
        "Every battle you fight beside them, every moment you share — they grow closer to you.",
        "And as that bond deepens, your Pokémon themselves change. They grow. They become more.",
      ]},
      { type: 'info', infoTitle: 'Bond XP — Unlocked!', infoIcon: '💞', lines: [
        "Your Pokémon now earn Bond XP from every battle.",
        "Higher bond + thematic tokens → evolution.",
      ]},
      { type: 'dialogue', speaker: 'N', sprite: sp('n'), lines: [
        "We will meet again, trainer. The world is larger than you realize.",
        "Until then... listen to your Pokémon. They have so much to say."
      ]},
    ],
    completionReward: { essence: 300 },
  },
  {
    id: 'may-rival', title: "May's Challenge", description: 'A Hoenn rival blocks the path with her starter!',
    region: 'Hoenn', difficulty: 'beginner', icon: '🌿', requires: ['n-bond-awakening'],
    steps: [
      { type: 'dialogue', speaker: 'May', sprite: sp('may'), lines: ["Hey, you're that new trainer Dad mentioned!", "I'm May — let's see what you've got!"] },
      { type: 'battle', trainerName: 'May', trainerTitle: 'Hoenn Rival', team: [255, 261, 273], fieldSize: 1, essenceReward: 100 },
      { type: 'dialogue', speaker: 'May', sprite: sp('may'), lines: ["Whoa, you're really good!", "Next time I'll bring a stronger team — promise!"] },
    ],
    completionReward: { essence: 200 },
  },
  {
    id: 'barry-rival', title: "Barry's Rush", description: "Sinnoh's hyper rival has no time to lose!",
    region: 'Sinnoh', difficulty: 'beginner', icon: '⚡', requires: ['n-bond-awakening'],
    steps: [
      { type: 'dialogue', speaker: 'Barry', sprite: sp('barry'), lines: ["Hey hey hey! Took you long enough!", "I'm gonna fine you a million if you don't battle me right now!"] },
      { type: 'battle', trainerName: 'Barry', trainerTitle: 'Sinnoh Rival', team: [390, 396, 399], fieldSize: 1, essenceReward: 100 },
      { type: 'dialogue', speaker: 'Barry', sprite: sp('barry'), lines: ["Aw man! How'd you get so strong already?!", "Fine, fine — I'll train harder. See ya later!"] },
    ],
    completionReward: { essence: 200 },
  },
  {
    id: 'n-styles-revealed', title: 'A Familiar Stranger',
    description: 'N returns — and brings a question about how you fight.',
    region: 'Unova', difficulty: 'beginner', icon: '🎭',
    requires: ['may-rival', 'barry-rival'],
    steps: [
      { type: 'dialogue', speaker: 'N', sprite: sp('n'), lines: [
        "We meet again, trainer. I told you we would.",
        "I've been watching. Your bond with your Pokémon — it's grown.",
        "But I've also noticed something curious.",
      ]},
      { type: 'dialogue', speaker: 'N', sprite: sp('n'), lines: [
        "Every trainer I've met fights differently. Some plan, some attack, some protect.",
        "Your Pokémon don't just listen to your moves — they listen to *who you are* in battle.",
        "Tell me... do you even know what kind of trainer you've become?",
        "Show me. Battle me again, and let your style speak.",
      ]},
      { type: 'battle', trainerName: 'N', trainerTitle: 'Mysterious Trainer', team: [624, 532, 543], fieldSize: 1, essenceReward: 180 },
      { type: 'dialogue', speaker: 'N', sprite: sp('n'), lines: [
        "Yes... I see it now. You have a voice in battle, even if you've never heard it.",
        "From now on, when you send out a Pokémon, choose how *you* show up too.",
        "Your style shapes their resolve. Their resolve shapes the fight.",
      ]},
      { type: 'info', infoTitle: 'Battle Styles — Unlocked!', infoIcon: '🎭', lines: [
        "Pick a battle style for each Pokémon when you send it out.",
        "Different styles, different vibes. Find what fits you.",
      ]},
      { type: 'dialogue', speaker: 'N', sprite: sp('n'), lines: [
        "Until next time, trainer.",
        "I'm curious to see who you become.",
      ]},
    ],
    completionReward: { essence: 400 },
  },

  // ───────────── INTERMEDIATE ─────────────
  {
    id: 'kanto-gyms', title: 'Kanto Gym Circuit', description: 'Challenge the Kanto gym leaders in sequence.',
    region: 'Kanto', difficulty: 'intermediate', icon: '🏛️', regionLock: 'Kanto',
    requires: ['n-styles-revealed'],
    steps: [
      { type: 'dialogue', speaker: 'Brock', sprite: sp('brock'), lines: ["Ready for the real challenge?", "The Kanto gyms await — and I'm your first opponent again!"] },
      { type: 'battle', trainerName: 'Brock', trainerTitle: 'Pewter Gym Leader', team: [95, 76, 141], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Brock', sprite: sp('brock'), lines: ["You really have grown stronger.", "Cerulean City is next — Misty won't go easy on you."] },
      { type: 'dialogue', speaker: 'Misty', sprite: sp('misty'), lines: ["So you beat Brock, huh?", "My water Pokémon will wash you right back to Pallet!"] },
      { type: 'battle', trainerName: 'Misty', trainerTitle: 'Cerulean Gym Leader', team: [121, 131, 130], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Misty', sprite: sp('misty'), lines: ["You're better than I thought.", "Head to Vermilion — Lt. Surge is waiting."] },
      { type: 'dialogue', speaker: 'Lt. Surge', sprite: sp('ltsurge'), lines: ["Hey, kid! You think you've got what it takes?", "I'll show you the shocking power of electricity!"] },
      { type: 'battle', trainerName: 'Lt. Surge', trainerTitle: 'Vermilion Gym Leader', team: [26, 101, 135], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Lt. Surge', sprite: sp('ltsurge'), lines: ["Hah! You really are something.", "Celadon's gym is next — try not to get charmed."] },
      { type: 'dialogue', speaker: 'Erika', sprite: sp('erika'), lines: ["Welcome to Celadon Gym.", "I shall not lose this match."] },
      { type: 'battle', trainerName: 'Erika', trainerTitle: 'Celadon Gym Leader', team: [45, 114, 3], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Erika', sprite: sp('erika'), lines: ["Oh! I concede the match.", "You're elegant in battle. Sabrina awaits in Saffron."] },
      { type: 'dialogue', speaker: 'Sabrina', sprite: sp('sabrina'), lines: ["I have foreseen your arrival.", "And I have foreseen your defeat."] },
      { type: 'battle', trainerName: 'Sabrina', trainerTitle: 'Saffron Gym Leader', team: [65, 196, 122], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Sabrina', sprite: sp('sabrina'), lines: ["I foresee great things in your future...", "The Elite Four awaits."] },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },
  {
    id: 'johto-gyms', title: 'Johto Gym Circuit', description: 'Challenge the Johto gym leaders.',
    region: 'Johto', difficulty: 'intermediate', icon: '🏛️', regionLock: 'Johto',
    requires: ['n-styles-revealed'],
    steps: [
      { type: 'dialogue', speaker: 'Falkner', sprite: sp('falkner'), lines: ["Johto's gym leaders are no pushovers.", "I, Falkner, am the first wall you must break."] },
      { type: 'battle', trainerName: 'Falkner', trainerTitle: 'Violet Gym Leader', team: [22, 164], fieldSize: 1, essenceReward: 100 },
      { type: 'dialogue', speaker: 'Falkner', sprite: sp('falkner'), lines: ["Father's birds were no match for you.", "Try Azalea Town next — Bugsy is sharp."] },
      { type: 'dialogue', speaker: 'Bugsy', sprite: sp('bugsy'), lines: ["Bug-type Pokémon are misunderstood.", "Allow me to demonstrate their true power!"] },
      { type: 'battle', trainerName: 'Bugsy', trainerTitle: 'Azalea Gym Leader', team: [123, 214], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Bugsy', sprite: sp('bugsy'), lines: ["Hmm! That's data I can use.", "Whitney is up next — and she's tougher than she looks."] },
      { type: 'dialogue', speaker: 'Whitney', sprite: sp('whitney'), lines: ["I won't cry this time!", "Miltank, let's roll!"] },
      { type: 'battle', trainerName: 'Whitney', trainerTitle: 'Goldenrod Gym Leader', team: [241, 36, 210], fieldSize: 1, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Whitney', sprite: sp('whitney'), lines: ["W-waaah! Fine, take the badge!", "Morty in Ecruteak will spook you good."] },
      { type: 'dialogue', speaker: 'Morty', sprite: sp('morty'), lines: ["Welcome to the Ecruteak Gym.", "I see your aura clearly... but can you see mine?"] },
      { type: 'battle', trainerName: 'Morty', trainerTitle: 'Ecruteak Gym Leader', team: [94, 200, 429], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Morty', sprite: sp('morty'), lines: ["Your light shines brighter than I imagined.", "Cianwood and Chuck are next."] },
      { type: 'dialogue', speaker: 'Chuck', sprite: sp('chuck'), lines: ["WAHAHAHA! A challenger!", "Train your body and your Pokémon will follow!"] },
      { type: 'battle', trainerName: 'Chuck', trainerTitle: 'Cianwood Gym Leader', team: [62, 107], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Chuck', sprite: sp('chuck'), lines: ["A worthy fight!", "Olivine's lighthouse keeper is your last test."] },
      { type: 'dialogue', speaker: 'Jasmine', sprite: sp('jasmine'), lines: ["I... I'll try my best.", "Please, take this seriously."] },
      { type: 'battle', trainerName: 'Jasmine', trainerTitle: 'Olivine Gym Leader', team: [208, 82, 227], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Jasmine', sprite: sp('jasmine'), lines: ["Your bond with your Pokémon is beautiful.", "Keep going!"] },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },
  {
    id: 'hoenn-gyms', title: 'Hoenn Gym Circuit', description: 'Challenge the Hoenn gym leaders.',
    region: 'Hoenn', difficulty: 'intermediate', icon: '🏛️', regionLock: 'Hoenn',
    requires: ['n-styles-revealed'],
    steps: [
      { type: 'dialogue', speaker: 'Roxanne', sprite: sp('roxanne'), lines: ["Welcome to Rustboro Gym.", "I'll teach you that rock-types aren't to be underestimated."] },
      { type: 'battle', trainerName: 'Roxanne', trainerTitle: 'Rustboro Gym Leader', team: [76, 299, 306], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Roxanne', sprite: sp('roxanne'), lines: ["Excellent... noted.", "Brawly trains in Dewford. He hits hard."] },
      { type: 'dialogue', speaker: 'Brawly', sprite: sp('brawly'), lines: ["The big wave's coming, kid!", "Show me your fighting spirit!"] },
      { type: 'battle', trainerName: 'Brawly', trainerTitle: 'Dewford Gym Leader', team: [296, 297], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Brawly', sprite: sp('brawly'), lines: ["Whoa! You ride that wave well.", "Mauville's Wattson will have a real charge for you."] },
      { type: 'dialogue', speaker: 'Wattson', sprite: sp('wattson'), lines: ["Wahaha! Welcome, welcome!", "Mauville Gym's traps will give you a jolt!"] },
      { type: 'battle', trainerName: 'Wattson', trainerTitle: 'Mauville Gym Leader', team: [82, 310, 181], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Wattson', sprite: sp('wattson'), lines: ["Wahaha! Sparks will fly elsewhere now.", "Lavaridge — and Flannery — burn next!"] },
      { type: 'dialogue', speaker: 'Flannery', sprite: sp('flannery'), lines: ["My grandfather built this gym!", "I won't let his legacy down — burn!"] },
      { type: 'battle', trainerName: 'Flannery', trainerTitle: 'Lavaridge Gym Leader', team: [323, 219, 324], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Flannery', sprite: sp('flannery'), lines: ["I... I learned a lot from you.", "Petalburg's leader is... well, you'll see."] },
      { type: 'dialogue', speaker: 'Norman', sprite: sp('norman'), lines: ["So you've made it this far.", "I won't go easy just because we may know each other."] },
      { type: 'battle', trainerName: 'Norman', trainerTitle: 'Petalburg Gym Leader', team: [289, 335, 128], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Norman', sprite: sp('norman'), lines: ["I'm proud of you.", "Fortree's Winona soars high — be ready."] },
      { type: 'dialogue', speaker: 'Winona', sprite: sp('winona'), lines: ["I am the Flying-type user, Winona.", "Soar with me — if you can keep up!"] },
      { type: 'battle', trainerName: 'Winona', trainerTitle: 'Fortree Gym Leader', team: [334, 277, 227], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Winona', sprite: sp('winona'), lines: ["You fly higher than I imagined.", "The skies of Hoenn welcome you, Champion-to-be."] },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },
  {
    id: 'sinnoh-gyms', title: 'Sinnoh Gym Circuit', description: 'Challenge the Sinnoh gym leaders.',
    region: 'Sinnoh', difficulty: 'intermediate', icon: '🏛️', regionLock: 'Sinnoh',
    requires: ['n-styles-revealed'],
    steps: [
      { type: 'dialogue', speaker: 'Maylene', sprite: sp('maylene'), lines: ["I'm the Veilstone Gym Leader, Maylene.", "Don't hold back — I won't!"] },
      { type: 'battle', trainerName: 'Maylene', trainerTitle: 'Veilstone Gym Leader', team: [308, 448, 214], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Maylene', sprite: sp('maylene'), lines: ["You hit hard. Respect.", "Crasher Wake makes a big splash next — literally."] },
      { type: 'dialogue', speaker: 'Crasher Wake', sprite: sp('crasherwake'), lines: ["I am Crasher Waaaaake!", "Time to crash and splash, friend!"] },
      { type: 'battle', trainerName: 'Crasher Wake', trainerTitle: 'Pastoria Gym Leader', team: [130, 195, 419], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Crasher Wake', sprite: sp('crasherwake'), lines: ["Whoo-aah! That was a soaking!", "Hearthome's Fantina will charm you right out of the gym."] },
      { type: 'dialogue', speaker: 'Fantina', sprite: sp('fantina'), lines: ["Bonjour, mon challenger!", "My ghosts shall dance you into defeat!"] },
      { type: 'battle', trainerName: 'Fantina', trainerTitle: 'Hearthome Gym Leader', team: [429, 426, 94], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Fantina', sprite: sp('fantina'), lines: ["Magnifique! You danced through my ghosts.", "Canalave's Byron — strong as steel — is next."] },
      { type: 'dialogue', speaker: 'Byron', sprite: sp('byron'), lines: ["Wha-ha-ha! A sturdy challenger!", "Steel will not yield easily!"] },
      { type: 'battle', trainerName: 'Byron', trainerTitle: 'Canalave Gym Leader', team: [411, 208, 306], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Byron', sprite: sp('byron'), lines: ["Hrm! You bent the iron.", "Snowpoint freezes the toughest hearts — Candice awaits."] },
      { type: 'dialogue', speaker: 'Candice', sprite: sp('candice'), lines: ["Hi-hi! I'm Candice!", "Focus, friend — my ice will test your spirit!"] },
      { type: 'battle', trainerName: 'Candice', trainerTitle: 'Snowpoint Gym Leader', team: [473, 461, 460], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Candice', sprite: sp('candice'), lines: ["Wow, you're really focused!", "Sunyshore's Volkner is the last gym — and the brightest."] },
      { type: 'dialogue', speaker: 'Volkner', sprite: sp('volkner'), lines: ["...Finally, a challenger worth my time.", "Light up the gym!"] },
      { type: 'battle', trainerName: 'Volkner', trainerTitle: 'Sunyshore Gym Leader', team: [466, 405, 135, 26], fieldSize: 2, essenceReward: 250 },
      { type: 'dialogue', speaker: 'Volkner', sprite: sp('volkner'), lines: ["That sparked something in me.", "Go — the Pokémon League is calling you."] },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },
  {
    id: 'unova-gyms', title: 'Unova Gym Circuit', description: 'Challenge the Unova gym leaders.',
    region: 'Unova', difficulty: 'intermediate', icon: '🏛️', regionLock: 'Unova',
    requires: ['n-styles-revealed'],
    steps: [
      { type: 'dialogue', speaker: 'Cilan', sprite: sp('cilan'), lines: ["Welcome to the Striaton Gym restaurant.", "Today's special: a battle with the Triple Gym Leaders!"] },
      { type: 'battle', trainerName: 'Cilan', trainerTitle: 'Striaton Gym Leader', team: [511, 506, 270], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Chili', sprite: sp('chili'), lines: ["My turn! Time to fire things up!", "Get ready to feel the heat!"] },
      { type: 'battle', trainerName: 'Chili', trainerTitle: 'Striaton Gym Leader', team: [513, 58, 322], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Cress', sprite: sp('cress'), lines: ["My elegant water Pokémon will rinse you out.", "Shall we begin?"] },
      { type: 'battle', trainerName: 'Cress', trainerTitle: 'Striaton Gym Leader', team: [515, 60, 318], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Lenora', sprite: sp('lenora'), lines: ["Welcome, dear, to the Nacrene Museum.", "Time for a research project — on you!"] },
      { type: 'battle', trainerName: 'Lenora', trainerTitle: 'Nacrene Gym Leader', team: [505, 507, 508], fieldSize: 1, essenceReward: 150 },
      { type: 'dialogue', speaker: 'Burgh', sprite: sp('burgh'), lines: ["Inspiration strikes when I battle.", "Let's create a masterpiece together!"] },
      { type: 'battle', trainerName: 'Burgh', trainerTitle: 'Castelia Gym Leader', team: [542, 545, 589], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Elesa', sprite: sp('elesa'), lines: ["Welcome to my electrifying gym, model challenger.", "Let's give the audience a show!"] },
      { type: 'battle', trainerName: 'Elesa', trainerTitle: 'Nimbasa Gym Leader', team: [587, 523, 595], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Clay', sprite: sp('clay'), lines: ["Now, that's a sturdy challenger!", "Let me show you what real ground-shakin' looks like!"] },
      { type: 'battle', trainerName: 'Clay', trainerTitle: 'Driftveil Gym Leader', team: [536, 552, 530], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Skyla', sprite: sp('skyla'), lines: ["Welcome to Mistralton Gym, the runway!", "Ready to soar? My birds will take you on a flight!"] },
      { type: 'battle', trainerName: 'Skyla', trainerTitle: 'Mistralton Gym Leader', team: [581, 561, 277], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Brycen', sprite: sp('brycen'), lines: ["Hmph. The cold reveals all weakness.", "Let me chill your spirit."] },
      { type: 'battle', trainerName: 'Brycen', trainerTitle: 'Icirrus Gym Leader', team: [524, 615, 583], fieldSize: 2, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Drayden', sprite: sp('drayden'), lines: ["Long has Opelucid waited for a worthy challenger.", "Show me the fire of a true dragon trainer!"] },
      { type: 'battle', trainerName: 'Drayden', trainerTitle: 'Opelucid Gym Leader', team: [621, 612, 635], fieldSize: 2, essenceReward: 250 },
      { type: 'dialogue', speaker: 'Drayden', sprite: sp('drayden'), lines: ["Marvelous!", "Unova's Pokémon League awaits you, Champion-to-be."] },
    ],
    completionReward: { essence: 1000, pack: 'uncommon' },
  },
  {
    id: 'team-rocket', title: 'Team Rocket Hideout', description: 'Infiltrate Team Rocket and face Giovanni.',
    region: 'Kanto', difficulty: 'advanced', icon: '🚀', regionLock: 'Kanto',
    requires: ['kanto-gyms'],
    steps: [
      { type: 'dialogue', speaker: 'Rocket Grunt', sprite: sp('rocketgrunt'), lines: ["Hand over your Pokémon!", "Team Rocket doesn't take no for an answer!"] },
      { type: 'battle', trainerName: 'Rocket Grunt', trainerTitle: 'Team Rocket', team: [41, 109, 24], fieldSize: 1, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Rocket Grunt', sprite: sp('rocketgruntf'), lines: ["You beat my partner? You won't get past me!"] },
      { type: 'battle', trainerName: 'Rocket Grunt', trainerTitle: 'Team Rocket', team: [110, 89, 42], fieldSize: 1, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Giovanni', sprite: sp('giovanni'), lines: ["So you've made it to the boss.", "I don't need heroes. I need power.", "And you're in my way."] },
      { type: 'battle', trainerName: 'Giovanni', trainerTitle: 'Team Rocket Boss', team: [34, 112, 31, 89], fieldSize: 2, essenceReward: 500 },
      { type: 'dialogue', speaker: 'Giovanni', sprite: sp('giovanni'), lines: ["Impressive... Team Rocket will remember this.", "But we'll be back."] },
    ],
    completionReward: { essence: 1500, pack: 'uncommon' },
  },
  {
    id: 'aqua-magma', title: 'Aqua vs Magma', description: 'Stop both teams from tearing Hoenn apart.',
    region: 'Hoenn', difficulty: 'advanced', icon: '🌋', regionLock: 'Hoenn',
    requires: ['hoenn-gyms'],
    steps: [
      { type: 'dialogue', speaker: 'Aqua Grunt', sprite: sp('aquagrunt'), lines: ["Team Aqua will expand the seas!", "Stand aside or face the tide!"] },
      { type: 'battle', trainerName: 'Aqua Grunt', trainerTitle: 'Team Aqua', team: [318, 320, 72], fieldSize: 1, essenceReward: 200 },
      { type: 'dialogue', speaker: 'Magma Grunt', sprite: sp('magmagrunt'), lines: ["Team Magma will expand the land!", "We need that power more than Aqua does!"] },
      { type: 'battle', trainerName: 'Magma Grunt', trainerTitle: 'Team Magma', team: [322, 218, 88], fieldSize: 1, essenceReward: 200 },
      { type: 'battle', trainerName: 'Archie', trainerTitle: 'Team Aqua Boss', team: [319, 130, 342, 73], fieldSize: 2, essenceReward: 400 },
      { type: 'battle', trainerName: 'Maxie', trainerTitle: 'Team Magma Boss', team: [323, 229, 330, 324], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Steven', sprite: sp('steven'), lines: ["You've saved Hoenn from both teams.", "The balance of land and sea is restored."] },
    ],
    completionReward: { essence: 2000, pack: 'rare' },
  },
  {
    id: 'kanto-e4', title: 'Kanto Elite Four', description: 'Face the strongest trainers in Kanto.',
    region: 'Kanto', difficulty: 'advanced', icon: '⭐', regionLock: 'Kanto',
    requires: ['kanto-gyms'],
    steps: [
      { type: 'dialogue', speaker: 'Lance', sprite: sp('lance'), lines: ["The Elite Four awaits.", "Only the strongest may pass."] },
      { type: 'dialogue', speaker: 'Lorelei', sprite: sp('lorelei'), lines: ["Welcome, challenger.", "I, Lorelei of the Elite Four, will freeze you in your tracks."] },
      { type: 'battle', trainerName: 'Lorelei', trainerTitle: 'Elite Four', team: [87, 91, 124, 131], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Bruno', sprite: sp('bruno'), lines: ["Hwa-haa!", "I am Bruno. My fighting Pokémon will crush you!"] },
      { type: 'battle', trainerName: 'Bruno', trainerTitle: 'Elite Four', team: [68, 107, 106, 95], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Agatha', sprite: sp('agatha'), lines: ["Oak's been talking about you, child.", "Let's see if you can survive my ghosts!"] },
      { type: 'battle', trainerName: 'Agatha', trainerTitle: 'Elite Four', team: [94, 169, 110, 429], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Lance', sprite: sp('lance'), lines: ["I am Lance, the Dragon Master.", "Show me what you're made of!"] },
      { type: 'battle', trainerName: 'Lance', trainerTitle: 'Champion', team: [149, 130, 142, 6], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Lance', sprite: sp('lance'), lines: ["You are truly worthy.", "But there is one more challenger..."] },
      { type: 'dialogue', speaker: 'Blue', sprite: sp('blue'), lines: ["Yo! Long time no see!", "I'm the strongest trainer in Kanto. Don't you forget it!"] },
      { type: 'battle', trainerName: 'Blue', trainerTitle: 'Champion', team: [9, 65, 59, 103, 112, 130], fieldSize: 3, essenceReward: 500 },
      { type: 'dialogue', speaker: 'Blue', sprite: sp('blue'), lines: ["Tch... well, you're not bad.", "I'll be back stronger. Count on it."] },
    ],
    completionReward: { essence: 2000, pack: 'rare' },
  },
  {
    id: 'johto-e4', title: 'Johto Elite Four', description: 'Face the strongest trainers in Johto.',
    region: 'Johto', difficulty: 'advanced', icon: '⭐', regionLock: 'Johto',
    requires: ['johto-gyms'],
    steps: [
      { type: 'dialogue', speaker: 'Will', sprite: sp('will'), lines: ["Welcome, I am Will.", "I have trained all around the world. My psychic Pokémon are unbeatable!"] },
      { type: 'battle', trainerName: 'Will', trainerTitle: 'Elite Four', team: [178, 80, 103, 196], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Koga', sprite: sp('koga'), lines: ["Fwahahaha!", "A ninja's poisons will be your demise!"] },
      { type: 'battle', trainerName: 'Koga', trainerTitle: 'Elite Four', team: [169, 110, 89, 49], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Bruno', sprite: sp('bruno'), lines: ["We meet again.", "My fists are sharper than ever!"] },
      { type: 'battle', trainerName: 'Bruno', trainerTitle: 'Elite Four', team: [68, 106, 107, 95, 62], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Karen', sprite: sp('karen'), lines: ["I am Karen of the Elite Four.", "I prefer Pokémon I personally like — strong feelings make strong Pokémon."] },
      { type: 'battle', trainerName: 'Karen', trainerTitle: 'Elite Four', team: [197, 229, 215, 359], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Lance', sprite: sp('lance'), lines: ["Welcome to the Champion's room.", "I am Lance, the dragon trainer. There's no losing this time!"] },
      { type: 'battle', trainerName: 'Lance', trainerTitle: 'Champion', team: [149, 130, 142, 6, 148, 230], fieldSize: 3, essenceReward: 500 },
      { type: 'dialogue', speaker: 'Lance', sprite: sp('lance'), lines: ["You... you defeated even me.", "You are the new Champion of Johto."] },
    ],
    completionReward: { essence: 2000, pack: 'rare' },
  },
  {
    id: 'hoenn-e4', title: 'Hoenn Elite Four', description: 'Face the strongest trainers in Hoenn.',
    region: 'Hoenn', difficulty: 'advanced', icon: '⭐', regionLock: 'Hoenn',
    requires: ['hoenn-gyms'],
    steps: [
      { type: 'dialogue', speaker: 'Sidney', sprite: sp('sidney'), lines: ["Heh, you got grit.", "I'm Sidney — Dark-type's the name, and I don't play nice."] },
      { type: 'battle', trainerName: 'Sidney', trainerTitle: 'Elite Four', team: [275, 319, 332, 359], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Phoebe', sprite: sp('phoebe'), lines: ["Hi! I'm Phoebe.", "I trained with the spirits on Mt. Pyre. They never quite let me go..."] },
      { type: 'battle', trainerName: 'Phoebe', trainerTitle: 'Elite Four', team: [356, 354, 429, 477], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Glacia', sprite: sp('glacia'), lines: ["Welcome.", "My Ice Pokémon froze in passion the day they met you."] },
      { type: 'battle', trainerName: 'Glacia', trainerTitle: 'Elite Four', team: [362, 365, 461, 473], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Drake', sprite: sp('drake'), lines: ["I am Drake, of the Elite Four.", "Riding dragons takes courage. Show me yours!"] },
      { type: 'battle', trainerName: 'Drake', trainerTitle: 'Elite Four', team: [373, 330, 334, 350], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Steven', sprite: sp('steven'), lines: ["Welcome, challenger.", "I am Steven, the Hoenn Champion. Let our stones clash!"] },
      { type: 'battle', trainerName: 'Steven', trainerTitle: 'Champion', team: [376, 306, 348, 346, 227, 344], fieldSize: 3, essenceReward: 500 },
      { type: 'dialogue', speaker: 'Steven', sprite: sp('steven'), lines: ["A truly dazzling battle.", "Hoenn has a new Champion."] },
    ],
    completionReward: { essence: 2500, pack: 'rare' },
  },
  {
    id: 'sinnoh-e4', title: 'Sinnoh Elite Four', description: 'Face the strongest trainers in Sinnoh.',
    region: 'Sinnoh', difficulty: 'advanced', icon: '⭐', regionLock: 'Sinnoh',
    requires: ['sinnoh-gyms'],
    steps: [
      { type: 'dialogue', speaker: 'Aaron', sprite: sp('aaron'), lines: ["Welcome to the Pokémon League.", "I'm Aaron — Bug-types are way stronger than people think!"] },
      { type: 'battle', trainerName: 'Aaron', trainerTitle: 'Elite Four', team: [416, 214, 469, 402], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Bertha', sprite: sp('bertha'), lines: ["Well, hello, sonny!", "Granny Bertha will teach you how strong the earth can be."] },
      { type: 'battle', trainerName: 'Bertha', trainerTitle: 'Elite Four', team: [450, 76, 340, 464], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Flint', sprite: sp('flint'), lines: ["You ready to get fired up?", "My Fire-types will burn you to a crisp!"] },
      { type: 'battle', trainerName: 'Flint', trainerTitle: 'Elite Four', team: [392, 467, 136, 59], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Lucian', sprite: sp('lucian'), lines: ["A moment, please — let me finish this paragraph.", "Now... shall we begin?"] },
      { type: 'battle', trainerName: 'Lucian', trainerTitle: 'Elite Four', team: [475, 122, 437, 376], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Cynthia', sprite: sp('cynthia'), lines: ["I'm Cynthia, the Sinnoh Champion.", "I never lose lightly. Bring everything you've got!"] },
      { type: 'battle', trainerName: 'Cynthia', trainerTitle: 'Champion', team: [445, 448, 442, 350, 407, 468], fieldSize: 3, essenceReward: 600 },
      { type: 'dialogue', speaker: 'Cynthia', sprite: sp('cynthia'), lines: ["What a thrilling battle...", "You truly are a Champion. Sinnoh is yours."] },
    ],
    completionReward: { essence: 3000, pack: 'epic' },
  },
  {
    id: 'unova-e4', title: 'Unova Elite Four', description: 'Face the strongest trainers in Unova.',
    region: 'Unova', difficulty: 'advanced', icon: '⭐', regionLock: 'Unova',
    requires: ['unova-gyms'],
    steps: [
      { type: 'dialogue', speaker: 'Shauntal', sprite: sp('shauntal'), lines: ["You... are an inspiration for my next novel.", "Let my Ghost-types haunt the page!"] },
      { type: 'battle', trainerName: 'Shauntal', trainerTitle: 'Elite Four', team: [563, 571, 622, 593], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Marshal', sprite: sp('marshal'), lines: ["Hyaaaah!", "I'll show you the strength of a true martial artist!"] },
      { type: 'battle', trainerName: 'Marshal', trainerTitle: 'Elite Four', team: [538, 539, 619, 534], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Grimsley', sprite: sp('grimsley'), lines: ["Life is a serious game of chance.", "Care to wager on this match?"] },
      { type: 'battle', trainerName: 'Grimsley', trainerTitle: 'Elite Four', team: [510, 552, 625, 461], fieldSize: 2, essenceReward: 300 },
      { type: 'dialogue', speaker: 'Caitlin', sprite: sp('caitlin'), lines: ["I have awakened from my slumber for you.", "Show me a battle worth the dream."] },
      { type: 'battle', trainerName: 'Caitlin', trainerTitle: 'Elite Four', team: [579, 518, 561, 576], fieldSize: 2, essenceReward: 400 },
      { type: 'dialogue', speaker: 'Alder', sprite: sp('alder'), lines: ["Hahaha! What an incredible run!", "I am Alder, the Champion of Unova. Let's enjoy this!"] },
      { type: 'battle', trainerName: 'Alder', trainerTitle: 'Champion', team: [637, 631, 615, 553, 612, 596], fieldSize: 3, essenceReward: 500 },
      { type: 'dialogue', speaker: 'Alder', sprite: sp('alder'), lines: ["A truly fiery battle!", "You are now the Champion of Unova. Wear the title with pride."] },
    ],
    completionReward: { essence: 3000, pack: 'epic' },
  },
  {
    id: 'red-challenge', title: 'The Red Challenge', description: 'Face the legendary trainer atop Mt. Silver.',
    region: 'Kanto', difficulty: 'expert', icon: '🏔️', regionLock: 'Kanto',
    requires: ['kanto-e4'],
    steps: [
      { type: 'dialogue', speaker: 'Blue', sprite: sp('blue'), lines: ["You've beaten the Elite Four in two regions...", "But Red is on another level.", "He doesn't speak. He just battles."] },
      { type: 'battle', trainerName: 'Red', trainerTitle: 'Pokémon Master', team: [25, 143, 131, 3, 6, 9], fieldSize: 3, essenceReward: 1000 },
      { type: 'dialogue', speaker: 'Red', sprite: sp('red'), lines: ["..."] },
    ],
    completionReward: { essence: 5000, pack: 'legendary' },
  },
  {
    id: 'cynthia-rematch', title: "Cynthia's Rematch", description: 'The Sinnoh Champion seeks a worthy challenger.',
    region: 'Sinnoh', difficulty: 'expert', icon: '🌟', regionLock: 'Sinnoh',
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
