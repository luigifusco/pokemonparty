// Type effectiveness chart (Gen 3)
// Rows = attacking type, Columns = defending type
// Order: normal, fire, water, electric, grass, ice, fighting, poison, ground,
//        flying, psychic, bug, rock, ghost, dragon, dark, steel

import { PokemonType } from './types.js';

const TYPES: PokemonType[] = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel',
];

// prettier-ignore
const CHART: number[][] = [
//         nor  fir  wat  ele  gra  ice  fig  poi  gro  fly  psy  bug  roc  gho  dra  dar  ste
/*nor*/  [ 1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,  .5,   0,   1,   1,  .5],
/*fir*/  [ 1,  .5,  .5,   1,   2,   2,   1,   1,   1,   1,   1,   2,  .5,   1,  .5,   1,   2],
/*wat*/  [ 1,   2,  .5,   1,  .5,   1,   1,   1,   2,   1,   1,   1,   2,   1,  .5,   1,   1],
/*ele*/  [ 1,   1,   2,  .5,  .5,   1,   1,   1,   0,   2,   1,   1,   1,   1,  .5,   1,   1],
/*gra*/  [ 1,  .5,   2,   1,  .5,   1,   1,  .5,   2,  .5,   1,  .5,   2,   1,  .5,   1,  .5],
/*ice*/  [ 1,  .5,  .5,   1,   2,  .5,   1,   1,   2,   2,   1,   1,   1,   1,   2,   1,  .5],
/*fig*/  [ 2,   1,   1,   1,   1,   2,   1,  .5,   1,  .5,  .5,  .5,   2,   0,   1,   2,   2],
/*poi*/  [ 1,   1,   1,   1,   2,   1,   1,  .5,  .5,   1,   1,   1,  .5,  .5,   1,   1,   0],
/*gro*/  [ 1,   2,   1,   2,  .5,   1,   1,   2,   1,   0,   1,  .5,   2,   1,   1,   1,   2],
/*fly*/  [ 1,   1,   1,  .5,   2,   1,   2,   1,   1,   1,   1,   2,  .5,   1,   1,   1,  .5],
/*psy*/  [ 1,   1,   1,   1,   1,   1,   2,   2,   1,   1,  .5,   1,   1,   1,   1,   0,  .5],
/*bug*/  [ 1,  .5,   1,   1,   2,   1,  .5,  .5,   1,  .5,   2,   1,   1,  .5,   1,   2,  .5],
/*roc*/  [ 1,   2,   1,   1,   1,   2,  .5,   1,  .5,   2,   1,   2,   1,   1,   1,   1,  .5],
/*gho*/  [ 0,   1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   1,   1,   2,   1,  .5,  .5],
/*dra*/  [ 1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   1,  .5],
/*dar*/  [ 1,   1,   1,   1,   1,   1,  .5,   1,   1,   1,   2,   1,   1,   2,   1,  .5,  .5],
/*ste*/  [ 1,  .5,  .5,  .5,   1,   2,   1,   1,   1,   1,   1,   1,   2,   1,   1,   1,  .5],
];

export function getEffectiveness(attackType: PokemonType, defenderTypes: PokemonType[]): number {
  const atkIdx = TYPES.indexOf(attackType);
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const defIdx = TYPES.indexOf(defType);
    multiplier *= CHART[atkIdx][defIdx];
  }
  return multiplier;
}
