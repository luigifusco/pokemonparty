#!/usr/bin/env node
// Generates shared/tm-learnsets.ts from pokemon-showdown/data/learnsets.ts.
// Includes EVERY move a Gen 1-5 species can learn through any source
// (level-up, TM/HM, tutor, egg, event) in any of Gens 1-5.
// Filters out Gen 6+ moves and Z/Max/Past-flagged moves so the AI/pack
// generator only ever sees moves the simulator can actually use.
//
// Usage: node scripts/gen-tm-learnsets.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function parseShowdownTS(filePath, varName) {
  const src = fs.readFileSync(filePath, 'utf8');
  const cleaned = src.replace(new RegExp(`^export const ${varName}:.*?= \\{`), 'module.exports = {');
  const tmpFile = `/tmp/_tmls_${varName.toLowerCase()}.js`;
  fs.writeFileSync(tmpFile, cleaned);
  delete require.cache[tmpFile];
  return require(tmpFile);
}

// Parse moves.ts for name / num / isNonstandard
function parseMovesTS(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const moves = {};
  let currentId = null;
  for (const rawLine of src.split('\n')) {
    const idMatch = rawLine.match(/^\t([a-z0-9]+): \{/);
    if (idMatch) {
      currentId = idMatch[1];
      moves[currentId] = {};
      continue;
    }
    if (!currentId) continue;
    const nameMatch = rawLine.match(/^\t\tname: "(.+?)"/);
    if (nameMatch) moves[currentId].name = nameMatch[1];
    const numMatch = rawLine.match(/^\t\tnum: (-?\d+)/);
    if (numMatch) moves[currentId].num = parseInt(numMatch[1], 10);
    const nonstdMatch = rawLine.match(/^\t\tisNonstandard: "(.+?)"/);
    if (nonstdMatch) moves[currentId].isNonstandard = nonstdMatch[1];
    const isZMatch = rawLine.match(/^\t\tisZ: /);
    if (isZMatch) moves[currentId].isZ = true;
    const isMaxMatch = rawLine.match(/^\t\tisMax: /);
    if (isMaxMatch) moves[currentId].isMax = true;
  }
  return moves;
}

const learnsets = parseShowdownTS(path.join(ROOT, 'pokemon-showdown/data/learnsets.ts'), 'Learnsets');
const showdownMoves = parseMovesTS(path.join(ROOT, 'pokemon-showdown/data/moves.ts'));
const dex = parseShowdownTS(path.join(ROOT, 'pokemon-showdown/data/pokedex.ts'), 'Pokedex');

// ─── Build allowed-move table ────────────────────────────────────────
// A move is "allowed" if:
//   - num <= 559 (Gen 1-5, some leeway)
//   - not isNonstandard "Past"/"Future"/"Unobtainable"/"LGPE"/"CAP"
//   - not Z-move / Max move
//   - has a name and num >= 1 (skip placeholder/struggle entries are fine)

const allowedMoveNames = {}; // moveId -> display name
for (const [id, m] of Object.entries(showdownMoves)) {
  if (!m.name || m.num == null) continue;
  if (m.num < 1) continue;
  if (m.num > 559) continue;
  if (m.isZ || m.isMax) continue;
  if (m.isNonstandard && m.isNonstandard !== 'Past') continue;
  allowedMoveNames[id] = m.name;
}
console.log(`Allowed Showdown moves (Gen 1-5): ${Object.keys(allowedMoveNames).length}`);

// Always-skip moves (broken / unimplemented in our sim / pointless for AI/pack)
const SKIP_MOVES = new Set([
  'struggle',
  'sketch',         // Smeargle's full-pool gimmick — handle separately
  'transform',      // Ditto's gimmick
  'metronome',
  'mirrormove',
  'naturepower',
  'assist',
  'mefirst',
  'copycat',
  'sleeptalk',
  'snore',
  'hiddenpower',    // keep type-less HP only via explicit entry
]);

// We DO want hidden power as a generic option
const FORCE_INCLUDE = new Set(['hiddenpower']);

// ─── Walk every species in pokedex (gen 1-5 base forms + select formes) ─
const MAX_DEX = 649;
const speciesList = [];
const seenNum = new Set();

// Take canonical base form per dex number (matches gen-all-pokemon.js behavior)
for (const [key, entry] of Object.entries(dex)) {
  if (!entry.num || entry.num < 1 || entry.num > MAX_DEX) continue;
  if (entry.forme) continue;
  if (seenNum.has(entry.num)) continue;
  seenNum.add(entry.num);
  speciesList.push({ key, name: entry.name });
}
speciesList.sort((a, b) => a.name.localeCompare(b.name));
console.log(`Species: ${speciesList.length}`);

// Walk pre-evos so children inherit their ancestors' moves (canonical PS rule)
function collectInherited(key, visited = new Set()) {
  if (visited.has(key)) return [];
  visited.add(key);
  const entry = dex[key];
  if (!entry) return [];
  const here = learnsets[key]?.learnset || {};
  const ids = new Set(Object.keys(here));
  if (entry.prevo) {
    const prevoKey = entry.prevo.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const id of collectInherited(prevoKey, visited)) ids.add(id);
  }
  return [...ids];
}

// ─── Build the output table ──────────────────────────────────────────
// Filter each species' moves to:
//   - present in allowedMoveNames
//   - not in SKIP_MOVES (unless FORCE_INCLUDE)
//   - the source set contains a Gen 1-5 origin (codes starting with 1-5)
function isGen15Source(src) {
  return /^[12345]/.test(src);
}

const out = {};
let totalEntries = 0;
let totalMoves = 0;
const distinctMoves = new Set();

for (const sp of speciesList) {
  const ls = learnsets[sp.key]?.learnset || {};
  const inheritedIds = collectInherited(sp.key);
  const moveIds = new Set();
  for (const id of inheritedIds) {
    if (SKIP_MOVES.has(id) && !FORCE_INCLUDE.has(id)) continue;
    if (!allowedMoveNames[id]) continue;
    const sources = ls[id] || []; // own learnset sources
    // For inherited moves we accept the inherited entry too — Showdown's gen-1-5
    // PS validator effectively merges chains. So accept if EITHER own sources
    // include a 1-5 entry, OR ancestor's learnset had a 1-5 entry.
    let ok = sources.length === 0 || sources.some(isGen15Source);
    if (!ok) {
      // walk ancestors
      let ancestorKey = dex[sp.key]?.prevo;
      while (ancestorKey) {
        const aKey = ancestorKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        const asrc = learnsets[aKey]?.learnset?.[id];
        if (asrc && asrc.some(isGen15Source)) { ok = true; break; }
        ancestorKey = dex[aKey]?.prevo;
      }
    }
    if (!ok) continue;
    moveIds.add(id);
  }

  if (moveIds.size === 0) continue;
  const moveNames = [...moveIds]
    .map(id => allowedMoveNames[id])
    .sort();
  out[sp.name] = moveNames;
  totalEntries++;
  totalMoves += moveNames.length;
  for (const m of moveNames) distinctMoves.add(m);
}

console.log(`Wrote ${totalEntries} species, avg moves/species: ${(totalMoves/totalEntries).toFixed(1)}, distinct moves: ${distinctMoves.size}`);

// ─── Emit shared/tm-learnsets.ts (preserving exported helpers) ───────
const HEADER = `// Auto-generated learnset data for AI move-choice and pack-move rolling.
// Built from pokemon-showdown/data/learnsets.ts via scripts/gen-tm-learnsets.js.
// Includes ALL Gen 1-5 sources (level-up, TM/HM, tutor, egg, event).
// Pre-evos contribute moves to their evolutions (Showdown chain rule).

export const TM_LEARNSETS: Record<string, string[]> = {
`;

const FOOTER = `};

const learnsetSets = new Map<string, Set<string>>();
function getLearnset(pokemonName: string): Set<string> {
  let s = learnsetSets.get(pokemonName);
  if (!s) {
    s = new Set(TM_LEARNSETS[pokemonName] ?? []);
    learnsetSets.set(pokemonName, s);
  }
  return s;
}

export function canLearnMove(pokemonName: string, moveName: string): boolean {
  return getLearnset(pokemonName).has(moveName);
}

/**
 * Pick two random moves for a species, weighted so stronger moves are more likely.
 * Weight = max(bp, 10) so status moves still have a small chance.
 * Falls back to species default moves if learnset is empty.
 */
export function randomMovesForSpecies(
  pokemonName: string,
  moveInfoLookup: (name: string) => { bp: number },
  defaultMoves: [string, string],
): [string, string] {
  const learnset = TM_LEARNSETS[pokemonName];
  if (!learnset || learnset.length < 2) return defaultMoves;

  const pool: { name: string; weight: number }[] = [];
  let totalWeight = 0;
  for (const move of learnset) {
    const info = moveInfoLookup(move);
    const w = Math.max(info.bp, 10);
    pool.push({ name: move, weight: w });
    totalWeight += w;
  }

  const pick = (): string => {
    let roll = Math.random() * totalWeight;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) return entry.name;
    }
    return pool[pool.length - 1].name;
  };

  const move1 = pick();
  const idx = pool.findIndex((e) => e.name === move1);
  if (idx >= 0) {
    totalWeight -= pool[idx].weight;
    pool.splice(idx, 1);
  }
  if (pool.length === 0) return [move1, defaultMoves[1]];
  const move2 = pick();
  return [move1, move2];
}
`;

const lines = [];
for (const name of Object.keys(out).sort()) {
  const moves = out[name].map(m => `'${m.replace(/'/g, "\\'")}'`).join(', ');
  lines.push(`  '${name.replace(/'/g, "\\'")}': [${moves}],`);
}

const outPath = path.join(ROOT, 'shared/tm-learnsets.ts');
fs.writeFileSync(outPath, HEADER + lines.join('\n') + '\n' + FOOTER);
console.log(`Wrote ${outPath}`);

// ─── Also emit a plain-JS sibling for runtime imports that use .js paths ──
const HEADER_JS = `// Auto-generated learnset data — JS sibling of tm-learnsets.ts.
// Built by scripts/gen-tm-learnsets.js. Do not edit by hand.

export const TM_LEARNSETS = {
`;

const FOOTER_JS = `};

const learnsetSets = new Map();
function getLearnset(pokemonName) {
  let s = learnsetSets.get(pokemonName);
  if (!s) {
    s = new Set(TM_LEARNSETS[pokemonName] ?? []);
    learnsetSets.set(pokemonName, s);
  }
  return s;
}

export function canLearnMove(pokemonName, moveName) {
  return getLearnset(pokemonName).has(moveName);
}

export function randomMovesForSpecies(pokemonName, moveInfoLookup, defaultMoves) {
  const learnset = TM_LEARNSETS[pokemonName];
  if (!learnset || learnset.length < 2) return defaultMoves;
  const pool = [];
  let totalWeight = 0;
  for (const move of learnset) {
    const info = moveInfoLookup(move);
    const w = Math.max(info.bp, 10);
    pool.push({ name: move, weight: w });
    totalWeight += w;
  }
  const pick = () => {
    let roll = Math.random() * totalWeight;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) return entry.name;
    }
    return pool[pool.length - 1].name;
  };
  const move1 = pick();
  const idx = pool.findIndex((e) => e.name === move1);
  if (idx >= 0) {
    totalWeight -= pool[idx].weight;
    pool.splice(idx, 1);
  }
  if (pool.length === 0) return [move1, defaultMoves[1]];
  const move2 = pick();
  return [move1, move2];
}
`;
const outPathJs = path.join(ROOT, 'shared/tm-learnsets.js');
fs.writeFileSync(outPathJs, HEADER_JS + lines.join('\n') + '\n' + FOOTER_JS);
console.log(`Wrote ${outPathJs}`);
