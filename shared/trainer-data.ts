// AI Trainer definitions for single-player battles
// Pokemon IDs reference shared/pokemon-data.ts entries (gen 1-5)

export interface AITrainer {
  id: string;
  name: string;
  title: string;
  region: string;
  sprite: string;
  /** Core 3 pokemon (always used) */
  coreTeam: number[];
  /** Extra 3 pokemon (used for 4-6 pokemon battles) */
  extraTeam: number[];
}

const TRAINERS_PATH = '/pokemonparty/assets/trainers';

export const AI_TRAINERS: AITrainer[] = [
  // ==================== KANTO ====================

  // Gym Leaders
  { id: 'brock', name: 'Brock', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/brock.png`,
    coreTeam: [95, 76, 141], extraTeam: [142, 208, 346] },
  { id: 'misty', name: 'Misty', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/misty.png`,
    coreTeam: [121, 131, 130], extraTeam: [91, 350, 73] },
  { id: 'ltsurge', name: 'Lt. Surge', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/ltsurge.png`,
    coreTeam: [26, 101, 135], extraTeam: [82, 181, 466] },
  { id: 'erika', name: 'Erika', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/erika.png`,
    coreTeam: [45, 114, 3], extraTeam: [182, 407, 465] },
  { id: 'koga', name: 'Koga', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/koga.png`,
    coreTeam: [169, 110, 89], extraTeam: [49, 73, 454] },
  { id: 'janine', name: 'Janine', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/janine.png`,
    coreTeam: [169, 110, 168], extraTeam: [49, 73, 454] },
  { id: 'sabrina', name: 'Sabrina', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/sabrina.png`,
    coreTeam: [65, 196, 122], extraTeam: [103, 80, 475] },
  { id: 'blaine', name: 'Blaine', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/blaine.png`,
    coreTeam: [59, 126, 6], extraTeam: [78, 136, 467] },
  { id: 'giovanni', name: 'Giovanni', title: 'Gym Leader', region: 'Kanto', sprite: `${TRAINERS_PATH}/giovanni.png`,
    coreTeam: [34, 112, 31], extraTeam: [105, 473, 472] },

  // Elite Four
  { id: 'bruno', name: 'Bruno', title: 'Elite Four', region: 'Kanto', sprite: `${TRAINERS_PATH}/bruno.png`,
    coreTeam: [68, 107, 106], extraTeam: [95, 208, 448] },

  // Champions & Rivals
  { id: 'lance', name: 'Lance', title: 'Champion', region: 'Kanto', sprite: `${TRAINERS_PATH}/lance.png`,
    coreTeam: [149, 130, 142], extraTeam: [6, 148, 230] },
  { id: 'blue', name: 'Blue', title: 'Champion', region: 'Kanto', sprite: `${TRAINERS_PATH}/blue.png`,
    coreTeam: [9, 65, 59], extraTeam: [103, 112, 130] },
  { id: 'red', name: 'Red', title: 'Pokémon Master', region: 'Kanto', sprite: `${TRAINERS_PATH}/red.png`,
    coreTeam: [25, 143, 131], extraTeam: [3, 6, 9] },

  // ==================== JOHTO ====================

  // Gym Leaders
  { id: 'falkner', name: 'Falkner', title: 'Gym Leader', region: 'Johto', sprite: `${TRAINERS_PATH}/falkner.png`,
    coreTeam: [18, 164, 85], extraTeam: [22, 398, 430] },
  { id: 'bugsy', name: 'Bugsy', title: 'Gym Leader', region: 'Johto', sprite: `${TRAINERS_PATH}/bugsy.png`,
    coreTeam: [212, 214, 127], extraTeam: [469, 12, 15] },
  { id: 'whitney', name: 'Whitney', title: 'Gym Leader', region: 'Johto', sprite: `${TRAINERS_PATH}/whitney.png`,
    coreTeam: [241, 242, 36], extraTeam: [40, 113, 210] },
  { id: 'morty', name: 'Morty', title: 'Gym Leader', region: 'Johto', sprite: `${TRAINERS_PATH}/morty.png`,
    coreTeam: [94, 200, 429], extraTeam: [93, 477, 292] },
  { id: 'chuck', name: 'Chuck', title: 'Gym Leader', region: 'Johto', sprite: `${TRAINERS_PATH}/chuck.png`,
    coreTeam: [62, 68, 57], extraTeam: [237, 106, 448] },
  { id: 'jasmine', name: 'Jasmine', title: 'Gym Leader', region: 'Johto', sprite: `${TRAINERS_PATH}/jasmine.png`,
    coreTeam: [208, 82, 227], extraTeam: [437, 212, 395] },
  { id: 'pryce', name: 'Pryce', title: 'Gym Leader', region: 'Johto', sprite: `${TRAINERS_PATH}/pryce.png`,
    coreTeam: [473, 87, 221], extraTeam: [91, 131, 365] },
  { id: 'clair', name: 'Clair', title: 'Gym Leader', region: 'Johto', sprite: `${TRAINERS_PATH}/clair.png`,
    coreTeam: [230, 149, 130], extraTeam: [148, 334, 445] },

  // Elite Four
  { id: 'will', name: 'Will', title: 'Elite Four', region: 'Johto', sprite: `${TRAINERS_PATH}/will.png`,
    coreTeam: [178, 124, 103], extraTeam: [80, 196, 65] },
  { id: 'karen', name: 'Karen', title: 'Elite Four', region: 'Johto', sprite: `${TRAINERS_PATH}/karen.png`,
    coreTeam: [197, 229, 461], extraTeam: [248, 94, 430] },

  // Rivals
  { id: 'silver', name: 'Silver', title: 'Rival', region: 'Johto', sprite: `${TRAINERS_PATH}/silver.png`,
    coreTeam: [157, 160, 215], extraTeam: [82, 94, 169] },

  // ==================== HOENN ====================

  // Gym Leaders
  { id: 'roxanne', name: 'Roxanne', title: 'Gym Leader', region: 'Hoenn', sprite: `${TRAINERS_PATH}/roxanne.png`,
    coreTeam: [299, 76, 141], extraTeam: [142, 476, 348] },
  { id: 'brawly', name: 'Brawly', title: 'Gym Leader', region: 'Hoenn', sprite: `${TRAINERS_PATH}/brawly.png`,
    coreTeam: [297, 68, 237], extraTeam: [214, 308, 448] },
  { id: 'wattson', name: 'Wattson', title: 'Gym Leader', region: 'Hoenn', sprite: `${TRAINERS_PATH}/wattson.png`,
    coreTeam: [310, 82, 101], extraTeam: [181, 466, 171] },
  { id: 'flannery', name: 'Flannery', title: 'Gym Leader', region: 'Hoenn', sprite: `${TRAINERS_PATH}/flannery.png`,
    coreTeam: [324, 323, 229], extraTeam: [219, 59, 467] },
  { id: 'norman', name: 'Norman', title: 'Gym Leader', region: 'Hoenn', sprite: `${TRAINERS_PATH}/norman.png`,
    coreTeam: [289, 115, 128], extraTeam: [143, 242, 217] },
  { id: 'winona', name: 'Winona', title: 'Gym Leader', region: 'Hoenn', sprite: `${TRAINERS_PATH}/winona.png`,
    coreTeam: [334, 227, 277], extraTeam: [357, 430, 468] },

  // Elite Four
  { id: 'sidney', name: 'Sidney', title: 'Elite Four', region: 'Hoenn', sprite: `${TRAINERS_PATH}/sidney.png`,
    coreTeam: [359, 275, 332], extraTeam: [342, 430, 461] },
  { id: 'phoebe', name: 'Phoebe', title: 'Elite Four', region: 'Hoenn', sprite: `${TRAINERS_PATH}/phoebe.png`,
    coreTeam: [477, 354, 429], extraTeam: [302, 442, 94] },
  { id: 'glacia', name: 'Glacia', title: 'Elite Four', region: 'Hoenn', sprite: `${TRAINERS_PATH}/glacia.png`,
    coreTeam: [365, 362, 478], extraTeam: [460, 131, 473] },
  { id: 'drake', name: 'Drake', title: 'Elite Four', region: 'Hoenn', sprite: `${TRAINERS_PATH}/drake.png`,
    coreTeam: [373, 330, 334], extraTeam: [230, 149, 445] },

  // Champions
  { id: 'steven', name: 'Steven', title: 'Champion', region: 'Hoenn', sprite: `${TRAINERS_PATH}/steven.png`,
    coreTeam: [376, 306, 348], extraTeam: [346, 227, 344] },
  { id: 'wallace', name: 'Wallace', title: 'Champion', region: 'Hoenn', sprite: `${TRAINERS_PATH}/wallace.png`,
    coreTeam: [350, 130, 272], extraTeam: [340, 73, 230] },

  // ==================== SINNOH ====================

  // Gym Leaders
  { id: 'fantina', name: 'Fantina', title: 'Gym Leader', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/fantina.png`,
    coreTeam: [429, 94, 426], extraTeam: [354, 477, 442] },
  { id: 'maylene', name: 'Maylene', title: 'Gym Leader', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/maylene.png`,
    coreTeam: [448, 68, 308], extraTeam: [454, 214, 475] },
  { id: 'crasherwake', name: 'Crasher Wake', title: 'Gym Leader', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/crasherwake.png`,
    coreTeam: [130, 419, 195], extraTeam: [423, 395, 365] },
  { id: 'byron', name: 'Byron', title: 'Gym Leader', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/byron.png`,
    coreTeam: [411, 208, 82], extraTeam: [437, 306, 227] },
  { id: 'candice', name: 'Candice', title: 'Gym Leader', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/candice.png`,
    coreTeam: [460, 478, 473], extraTeam: [221, 471, 365] },
  { id: 'volkner', name: 'Volkner', title: 'Gym Leader', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/volkner.png`,
    coreTeam: [466, 405, 26], extraTeam: [135, 424, 224] },

  // Elite Four
  { id: 'aaron', name: 'Aaron', title: 'Elite Four', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/aaron.png`,
    coreTeam: [452, 416, 214], extraTeam: [469, 212, 267] },
  { id: 'bertha', name: 'Bertha', title: 'Elite Four', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/bertha.png`,
    coreTeam: [450, 464, 76], extraTeam: [340, 472, 423] },
  { id: 'flint', name: 'Flint', title: 'Elite Four', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/flint.png`,
    coreTeam: [392, 467, 229], extraTeam: [136, 78, 208] },
  { id: 'lucian', name: 'Lucian', title: 'Elite Four', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/lucian.png`,
    coreTeam: [437, 65, 196], extraTeam: [122, 475, 308] },

  // Champions & Rivals
  { id: 'cynthia', name: 'Cynthia', title: 'Champion', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/cynthia.png`,
    coreTeam: [445, 448, 442], extraTeam: [350, 468, 407] },
  { id: 'barry', name: 'Barry', title: 'Rival', region: 'Sinnoh', sprite: `${TRAINERS_PATH}/barry.png`,
    coreTeam: [395, 398, 214], extraTeam: [143, 407, 78] },
];

export const AI_TRAINERS_BY_ID: Record<string, AITrainer> = {};
for (const t of AI_TRAINERS) {
  AI_TRAINERS_BY_ID[t.id] = t;
}
