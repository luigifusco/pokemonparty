// Shared metadata for the AI character profiles.
// Server uses this for the move-choice engine; client uses it for selection UI.

export type ProfileName = 'balanced' | 'setupSweeper' | 'statusSpammer' | 'glassCannon';

export interface ProfileInfo {
  name: ProfileName;
  label: string;
  blurb: string;
  icon: string;
  color: string;
}

export const PROFILE_NAMES: ProfileName[] = ['balanced', 'setupSweeper', 'statusSpammer', 'glassCannon'];

export const PROFILE_INFO: Record<ProfileName, ProfileInfo> = {
  balanced: {
    name: 'balanced',
    label: 'Balanced',
    blurb: 'Mixes damage, status, and setup; reasonable defaults for any situation.',
    icon: '⚖️',
    color: '#6da6e6',
  },
  setupSweeper: {
    name: 'setupSweeper',
    label: 'Setup Sweeper',
    blurb: 'Boosts stats first, then sweeps. Loves Dragon Dance, Swords Dance, Calm Mind.',
    icon: '📈',
    color: '#e5a44a',
  },
  statusSpammer: {
    name: 'statusSpammer',
    label: 'Status Spammer',
    blurb: 'Spreads burns/toxic, sets hazards, stalls. Damage is a last resort.',
    icon: '☠️',
    color: '#a373d4',
  },
  glassCannon: {
    name: 'glassCannon',
    label: 'Glass Cannon',
    blurb: 'All-in on damage and KOs. Ignores recoil; takes risks; favors priority.',
    icon: '💥',
    color: '#e85a5a',
  },
};

export const SPECIES_CHARACTER: Record<string, ProfileName> = {
  // ── glassCannon: frail, hard-hitting offense ──
  alakazam: 'glassCannon',
  gengar: 'glassCannon',
  garchomp: 'glassCannon',
  hydreigon: 'glassCannon',
  haxorus: 'glassCannon',
  weavile: 'glassCannon',
  mienshao: 'glassCannon',
  darmanitan: 'glassCannon',
  electrode: 'glassCannon',
  sceptile: 'glassCannon',
  infernape: 'glassCannon',
  greninja: 'glassCannon',
  tauros: 'glassCannon',
  kingler: 'glassCannon',
  persian: 'glassCannon',
  pikachu: 'glassCannon',
  raichu: 'glassCannon',

  // ── setupSweeper ──
  gyarados: 'setupSweeper',
  dragonite: 'setupSweeper',
  scizor: 'setupSweeper',
  volcarona: 'setupSweeper',
  salamence: 'setupSweeper',
  tyranitar: 'setupSweeper',
  kingdra: 'setupSweeper',
  feraligatr: 'setupSweeper',
  lucario: 'setupSweeper',
  conkeldurr: 'setupSweeper',
  charizard: 'setupSweeper',
  machamp: 'setupSweeper',
  blaziken: 'setupSweeper',
  metagross: 'setupSweeper',
  absol: 'setupSweeper',
  crobat: 'setupSweeper',

  // ── statusSpammer ──
  blissey: 'statusSpammer',
  chansey: 'statusSpammer',
  ferrothorn: 'statusSpammer',
  forretress: 'statusSpammer',
  amoonguss: 'statusSpammer',
  gliscor: 'statusSpammer',
  whimsicott: 'statusSpammer',
  sableye: 'statusSpammer',
  jynx: 'statusSpammer',
  clefable: 'statusSpammer',
  venusaur: 'statusSpammer',
  gardevoir: 'statusSpammer',
  dusknoir: 'statusSpammer',
  cofagrigus: 'statusSpammer',
  umbreon: 'statusSpammer',
};

export function normalizeSpeciesKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getSpeciesDefaultCharacter(speciesName: string): ProfileName {
  return SPECIES_CHARACTER[normalizeSpeciesKey(speciesName)] ?? 'balanced';
}

export function resolveCharacterName(
  instanceCharacter: string | null | undefined,
  speciesName: string,
): ProfileName {
  if (instanceCharacter && (PROFILE_INFO as any)[instanceCharacter]) return instanceCharacter as ProfileName;
  return getSpeciesDefaultCharacter(speciesName);
}
