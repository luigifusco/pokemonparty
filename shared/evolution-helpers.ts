// Helpers for inspecting a pokemon's evolution chain.
import { POKEMON_BY_ID } from './pokemon-data';
import type { Pokemon } from './types';
import type { EvolutionStep } from './evolution';

/** Walk back up the chain to find the root (pokemon with no evolutionFrom). */
function getLineRoot(p: Pokemon): Pokemon {
  let cur: Pokemon = p;
  let safety = 5;
  while (cur.evolutionFrom && safety-- > 0) {
    const prev = POKEMON_BY_ID[cur.evolutionFrom];
    if (!prev) break;
    cur = prev;
  }
  return cur;
}

/** Max depth from root (1 = single-stage, 2 = two-stage, 3 = three-stage). */
function chainLengthFromRoot(root: Pokemon): number {
  if (!root.evolutionTo || root.evolutionTo.length === 0) return 1;
  let maxChild = 0;
  for (const childId of root.evolutionTo) {
    const child = POKEMON_BY_ID[childId];
    if (!child) continue;
    const sub = chainLengthFromRoot(child);
    if (sub > maxChild) maxChild = sub;
  }
  return 1 + maxChild;
}

/** Depth of `p` in its line (root = 1). */
function depthOf(p: Pokemon): number {
  let depth = 1;
  let cur: Pokemon = p;
  let safety = 5;
  while (cur.evolutionFrom && safety-- > 0) {
    const prev = POKEMON_BY_ID[cur.evolutionFrom];
    if (!prev) break;
    cur = prev;
    depth++;
  }
  return depth;
}

/** Classify the pending evolution from `p` as one of the three steps,
 *  or null if `p` does not evolve. */
export function evolutionStepFor(p: Pokemon): EvolutionStep | null {
  if (!p.evolutionTo || p.evolutionTo.length === 0) return null;
  const root = getLineRoot(p);
  const total = chainLengthFromRoot(root);
  const here = depthOf(p);
  if (total === 2) return 'only-of-two';
  if (total === 3 && here === 1) return 'first-of-three';
  if (total === 3 && here === 2) return 'second-of-three';
  // Fallback (e.g., 4-stage if it ever existed): treat as second-of-three
  return 'second-of-three';
}
