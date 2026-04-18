// Damage estimator using @smogon/calc
// ====================================================================
// Converts Showdown battle state (Pokemon/Move/Field) into @smogon/calc
// inputs and calls calculate() to get a real damage roll array.
// The calc library is pure and stateless, so every call is independent.

import {
  calculate as calcDamage,
  Pokemon as CalcPokemon,
  Move as CalcMove,
  Field as CalcField,
  Generations,
} from '../../../damage-calc/calc/dist/index.js';

const GEN = 5;
const calcGen = Generations.get(GEN);

const WEATHER_SHOWDOWN_TO_CALC: Record<string, string> = {
  raindance: 'Rain',
  primordialsea: 'Heavy Rain',
  sunnyday: 'Sun',
  desolateland: 'Harsh Sunshine',
  sandstorm: 'Sand',
  hail: 'Hail',
  snow: 'Snow',
  snowscape: 'Snow',
};

const TERRAIN_SHOWDOWN_TO_CALC: Record<string, string> = {
  electricterrain: 'Electric',
  grassyterrain: 'Grassy',
  mistyterrain: 'Misty',
  psychicterrain: 'Psychic',
};

const STATUS_SHOWDOWN_TO_CALC: Record<string, string> = {
  brn: 'brn',
  par: 'par',
  slp: 'slp',
  psn: 'psn',
  tox: 'tox',
  frz: 'frz',
};

export interface DamageEstimate {
  min: number;
  max: number;
  avg: number;
  /** Fraction of target's current HP an avg-roll would deal. Clamped 0..2. */
  avgFrac: number;
  /** Probability the move KOs (crude: 0 if even max < hp, 1 if min >= hp, else 0.5). */
  koChance: 0 | 0.5 | 1;
  /** Probability-of-hit factor (accuracy × host/target ability/item modifiers). */
  accFactor: number;
}

function toStatsTable(stats: any) {
  if (!stats) return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  return {
    hp: stats.hp ?? 0,
    atk: stats.atk ?? 0,
    def: stats.def ?? 0,
    spa: stats.spa ?? 0,
    spd: stats.spd ?? 0,
    spe: stats.spe ?? 0,
  };
}

function mapBoosts(b: any) {
  if (!b) return undefined;
  return {
    atk: b.atk ?? 0,
    def: b.def ?? 0,
    spa: b.spa ?? 0,
    spd: b.spd ?? 0,
    spe: b.spe ?? 0,
  };
}

function buildCalcPokemon(showdownPkmn: any): any {
  const set = showdownPkmn.set || {};
  const speciesName = showdownPkmn.species?.name || showdownPkmn.speciesid || set.species;
  const abilityName = showdownPkmn.ability ? showdownPkmn.battle?.dex?.abilities?.get(showdownPkmn.ability)?.name || '' : '';
  const itemName = showdownPkmn.item ? showdownPkmn.battle?.dex?.items?.get(showdownPkmn.item)?.name || '' : '';
  const statusKey = showdownPkmn.status as string;
  const mappedStatus = STATUS_SHOWDOWN_TO_CALC[statusKey] || '';

  return new CalcPokemon(calcGen, speciesName, {
    level: showdownPkmn.level || 100,
    ability: abilityName || undefined,
    item: itemName || undefined,
    nature: set.nature || 'Serious',
    evs: toStatsTable(set.evs),
    ivs: toStatsTable(set.ivs),
    boosts: mapBoosts(showdownPkmn.boosts),
    curHP: showdownPkmn.hp,
    status: (mappedStatus || '') as any,
  });
}

function buildCalcField(battle: any, attackerSide: any, defenderSide: any): any {
  const weatherId = battle.field?.weatherState?.id || '';
  const terrainId = battle.field?.terrainState?.id || '';
  const weather = WEATHER_SHOWDOWN_TO_CALC[weatherId] as any;
  const terrain = TERRAIN_SHOWDOWN_TO_CALC[terrainId] as any;

  const attSide = attackerSide.sideConditions || {};
  const defSide = defenderSide.sideConditions || {};

  return new CalcField({
    weather,
    terrain,
    attackerSide: {
      isReflect: !!attSide.reflect,
      isLightScreen: !!attSide.lightscreen,
      isAuroraVeil: !!attSide.auroraveil,
      isSR: !!attSide.stealthrock,
      spikes: attSide.spikes?.layers || 0,
    } as any,
    defenderSide: {
      isReflect: !!defSide.reflect,
      isLightScreen: !!defSide.lightscreen,
      isAuroraVeil: !!defSide.auroraveil,
      isSR: !!defSide.stealthrock,
      spikes: defSide.spikes?.layers || 0,
    } as any,
  });
}

/**
 * Estimate damage for `attacker` using `moveId` against `defender` in the
 * given battle context. Returns null if the calc fails (e.g. unrecognised
 * species/move — fall back to heuristic).
 */
export function estimateDamage(
  battle: any,
  attacker: any,
  defender: any,
  moveId: string,
): DamageEstimate | null {
  if (!attacker || !defender || !moveId) return null;
  const md = battle.dex.moves.get(moveId);
  if (!md || md.category === 'Status') return null;

  try {
    // buildCalcPokemon needs a back-reference to battle for ability/item name lookup.
    (attacker as any).battle = battle;
    (defender as any).battle = battle;

    const moveName = md.name;
    const calcAtk = buildCalcPokemon(attacker);
    const calcDef = buildCalcPokemon(defender);
    const attackerSide = attacker.side || battle.sides[0];
    const defenderSide = defender.side || battle.sides[1];
    const field = buildCalcField(battle, attackerSide, defenderSide);

    const move = new CalcMove(calcGen, moveName, {
      ability: calcAtk.ability,
      item: calcAtk.item,
      species: calcAtk.name,
    } as any);

    const result = calcDamage(calcGen, calcAtk, calcDef, move, field);
    const dmg = result.damage;
    let min: number, max: number, avg: number;

    if (Array.isArray(dmg)) {
      // Handle nested arrays (multi-hit) by summing each hit's distribution
      if (Array.isArray(dmg[0])) {
        const nested = dmg as unknown as number[][];
        const hits = nested.length;
        const firstLen = nested[0].length;
        const sumRolls: number[] = new Array(firstLen).fill(0);
        for (const roll of nested) for (let i = 0; i < firstLen; i++) sumRolls[i] += (roll[i] ?? 0);
        // approximate as scalar rolls per hit-group
        min = sumRolls[0];
        max = sumRolls[sumRolls.length - 1];
        avg = sumRolls.reduce((a, b) => a + b, 0) / sumRolls.length;
        const expectedHits = md.multihit ? (Array.isArray(md.multihit) ? 3.17 : md.multihit) : 1;
        // Nested damage already includes all hits; don't multiply.
        void expectedHits;
      } else {
        const flat = dmg as number[];
        min = flat[0] || 0;
        max = flat[flat.length - 1] || 0;
        avg = flat.reduce((a, b) => a + b, 0) / flat.length;
      }
    } else if (typeof dmg === 'number') {
      min = max = avg = dmg;
    } else {
      return null;
    }

    const defHp = defender.hp > 0 ? defender.hp : 1;
    const avgFrac = Math.min(2, avg / defHp);

    let koChance: 0 | 0.5 | 1;
    if (min >= defHp) koChance = 1;
    else if (max >= defHp) koChance = 0.5;
    else koChance = 0;

    // Accuracy — some moves have accuracy=true meaning always hits.
    const rawAcc = md.accuracy === true ? 100 : Math.max(30, (md.accuracy as number) || 100);
    const accFactor = rawAcc / 100;

    return { min, max, avg, avgFrac, koChance, accFactor };
  } catch (e) {
    return null;
  }
}
