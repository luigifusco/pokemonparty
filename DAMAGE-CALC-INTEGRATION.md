# damage-calc Integration Investigation

## Overview

The `damage-calc/` directory contains the **Smogon damage calculator** (`@smogon/calc` v0.10.0), a full-featured Pokémon battle damage calculator used by competitive players. This document investigates how it can replace or enhance the current simplified damage formula in the party game's battle simulation.

---

## Current Battle Simulation (status quo)

**File:** `server/src/index.ts` (lines 25–96) + `server/src/battle.ts`

The current `simulateBattleFromIds()` is extremely simplified:
- **No real moves:** Pokémon don't use actual moves; instead a generic "Attack" or "Sp. Attack" is chosen based on whether `attack > spAtk`, with **random power (60–100)**.
- **No type effectiveness:** All attacks are logged as `'neutral'` — no STAB, no super-effective/not-very-effective.
- **No IVs/EVs/nature/level:** Stats are used as raw base stats directly from `pokemon-data.ts`.
- **No stat stages:** The inline battle in `index.ts` ignores modifiers; only `battle.ts` has stat-stage logic.
- **Two battle engines:** There's a mismatch — `battle.ts` has a more complete engine (with type effectiveness, stat stages, accuracy, status moves), but `index.ts` has its own inline simplified loop that's actually used in production.

---

## damage-calc Engine API

### Core Entry Point

```ts
import { calculate, Pokemon, Move, Field } from '@smogon/calc';

const result = calculate(
  gen,       // GenerationNum (1–9) or Generation object
  attacker,  // Pokemon instance
  defender,  // Pokemon instance
  move,      // Move instance
  field?     // Optional Field (weather, terrain, side conditions)
);
```

### Creating a Pokemon

```ts
const poke = new Pokemon(gen, 'Charizard', {
  level: 50,           // default: 100
  nature: 'Modest',    // default: 'Serious' (neutral)
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },  // default: all 31
  evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },    // default: all 0 (gen3+)
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },             // stat stages
  status: 'brn',       // slp, psn, brn, frz, par, tox
  curHP: 200,          // specific current HP
  item: 'Choice Specs', // held item
  ability: 'Blaze',    // ability
});
```

**Key properties available after construction:**
- `poke.rawStats` — computed stat table `{ hp, atk, def, spa, spd, spe }` based on base stats + IVs + EVs + nature + level
- `poke.stats` — same as rawStats (before any in-calc modifications)
- `poke.maxHP()` — maximum HP value
- `poke.types` — `['Fire', 'Flying']`

### Creating a Move

```ts
const move = new Move(gen, 'Flamethrower', {
  isCrit: false,
  hits: 1,             // for multi-hit moves
  overrides: { basePower: 90 },  // override move properties
});
```

### Creating a Field

```ts
const field = new Field({
  gameType: 'Singles',       // or 'Doubles'
  weather: 'Sun',            // Sand, Rain, Hail, Snow, etc.
  terrain: 'Electric',       // Grassy, Psychic, Misty
  attackerSide: {
    isReflect: true,
    isLightScreen: true,
    spikes: 1,               // 0–3
    isSR: true,              // Stealth Rock
    isTailwind: true,
  },
  defenderSide: { isProtected: true },
});
```

### Result Object

```ts
const result = calculate(3, attacker, defender, move, field);

result.damage;        // number | number[] | number[][]
                      //   - number for fixed damage
                      //   - number[16] for standard (16 damage rolls, index 0=min, 15=max)
                      //   - number[][] for multi-hit
result.range();       // [minDamage, maxDamage]
result.desc();        // "252 SpA Charizard Flamethrower vs. 0 HP / 0 SpD Blastoise: 194-230 ..."
result.kochance();    // KO probability info
result.fullDesc();    // Full description string
result.move.type;     // The move's type
result.defender.types; // Defender's types
```

### Stat Calculation

```ts
import { calcStat } from '@smogon/calc';

// Calculate a single stat value
const hpStat = calcStat(gen, 'hp', baseHP, iv, ev, level, nature);
const atkStat = calcStat(gen, 'atk', baseAtk, iv, ev, level, 'Adamant');
```

The formula (gen 3+):
- **HP:** `floor(((base * 2 + iv + floor(ev/4)) * level) / 100) + level + 10`
- **Other:** `floor((floor(((base * 2 + iv + floor(ev/4)) * level) / 100) + 5) * natureMod)`

---

## Generation Choice

The app uses a **Gen 3 type chart** (no Fairy type in `type-chart.ts`) and Pokémon from Gens 1–3 (with some Gen 4 like Bagon/Shelgon/Salamence). However, the Pokémon stats in `pokemon-data.ts` match modern stat distributions (e.g., Pikachu has separate SpAtk/SpDef).

**Recommendation: Use Gen 3 (`gen = 3`).** This matches the type chart, the pre-physical/special split era feel, and the Pokémon pool. However, note that in Gen 3, move categories are determined by type (all Fire moves are Special, all Fighting moves are Physical), not per-move. Gen 4+ has the physical/special split. The app already defines move `category` per-move, so **Gen 4 (`gen = 4`)** might be more appropriate if we want moves with explicit physical/special categories.

---

## What damage-calc Handles That the Current Engine Doesn't

| Feature | Current Engine | damage-calc |
|---------|---------------|-------------|
| Damage formula | Simplified `((22 * power * atk / def) / 50 + 2) * random` | Full Gen-accurate formula with all modifiers |
| Type effectiveness | None (hardcoded `'neutral'`) | Full type chart built-in |
| STAB | None | 1.5× automatically applied |
| Random factor | 0.85–1.0 | 16 discrete damage rolls (0.85–1.0 in steps of 0.01) |
| Abilities | None | ~400 abilities, full interactions |
| Items | None | ~300 items, type-boosting, choice, berries |
| Weather | None | Sun, Rain, Sand, Hail, Snow |
| Terrain | None | Electric, Grassy, Psychic, Misty |
| Critical hits | None | Proper crit formula |
| Stat stages | Basic (in battle.ts) | Full boost mechanics |
| Status conditions | None | Burn halves Atk, Paralysis halves Spe |
| IVs/EVs/Nature | None | Full stat calculation |
| Level | Fixed 50 | Configurable |
| Multi-hit moves | None | Proper multi-hit (2-5, fixed 2, etc.) |
| Recoil/Drain | None | Proper recoil/drain moves |

---

## Species Name Compatibility

**All 46 Pokémon in the app exist in damage-calc's species database.** Names match exactly (e.g., `'Charizard'`, `'Pikachu'`, `'Metagross'`). The damage-calc uses PascalCase names with proper casing (matching the app's `pokemon-data.ts`).

---

## Integration Approach

### Option A: Direct Library Integration (Recommended)

Use `@smogon/calc` as a dependency in the server, calling `calculate()` for each attack during battle simulation.

**Steps:**
1. Build the `damage-calc/calc` package: `cd damage-calc/calc && npm install && npm run build`
2. Import from the built dist: `import { calculate, Pokemon, Move, Field } from '../../damage-calc/calc/src/index'`
3. Map app Pokémon to damage-calc Pokémon objects
4. Map app moves to damage-calc Move objects (by name strings)
5. Call `calculate()` and extract `result.range()` → pick a random roll

**Mapping app Pokémon → damage-calc Pokemon:**

```ts
import { Pokemon as CalcPokemon, Move as CalcMove, calculate } from '@smogon/calc';

function toCalcPokemon(pokemon: AppPokemon, options?: {
  level?: number;
  ivs?: Partial<StatsTable>;
  evs?: Partial<StatsTable>;
  nature?: string;
  boosts?: Partial<StatsTable>;
  status?: string;
  curHP?: number;
}): CalcPokemon {
  return new CalcPokemon(GEN, pokemon.name, {
    level: options?.level ?? 50,
    ivs: options?.ivs ?? { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: options?.evs ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: options?.nature ?? 'Serious',
    boosts: options?.boosts,
    status: options?.status,
    curHP: options?.curHP,
  });
}
```

**Stat name mapping (app → damage-calc):**
| App (`shared/types.ts`) | damage-calc |
|------------------------|-------------|
| `hp` | `hp` |
| `attack` | `atk` |
| `defense` | `def` |
| `spAtk` | `spa` |
| `spDef` | `spd` |
| `speed` | `spe` |

**Using moves by name:**

The app currently references moves by numeric ID. The damage-calc references moves by name string (e.g., `'Flamethrower'`, `'Earthquake'`). When assigning real moves to Pokémon, we'd need move name strings that exist in the damage-calc's move database.

```ts
const move = new CalcMove(GEN, 'Flamethrower');
const result = calculate(GEN, attacker, defender, move);
const [min, max] = result.range();
const damage = min + Math.floor(Math.random() * (max - min + 1));
```

### Option B: Extract Formula Only

Use damage-calc's damage formula logic without the full library. This would mean reimplementing parts of `mechanics/gen3.ts` or `mechanics/gen4.ts`. **Not recommended** — the formula has many edge cases and the library handles them all.

---

## Integrating Into Battle Simulation

### Revised `simulateBattleFromIds` Flow

```
For each round:
  1. Collect alive Pokémon
  2. Sort by speed (using damage-calc's computed stats, accounting for boosts/paralysis)
  3. For each attacker:
     a. Pick a move (from the Pokémon's known moves)
     b. Pick a target
     c. Create CalcPokemon for attacker (with current HP, stat stages, status)
     d. Create CalcPokemon for defender (same)
     e. Create CalcMove for the chosen move
     f. Call calculate(GEN, attacker, defender, move, field)
     g. Extract damage range, pick random roll
     h. Apply damage, check faints
     i. Log the result with effectiveness info from the result
```

### Key Design Decisions

1. **Generation:** Use Gen 4 (`gen = 4`) for physical/special split per-move, or Gen 3 if we want type-based categories.

2. **Level:** Use a fixed level (e.g., 50) for all Pokémon, or scale by evolution stage.

3. **IVs/EVs:** 
   - Simplest: All Pokémon have 31 IVs, 0 EVs, neutral nature → stats determined purely by base stats + level.
   - More interesting: Randomize IVs per owned Pokémon instance (adds uniqueness).
   - Advanced: Let players allocate EVs as a progression mechanic.

4. **Moves:** The app's Pokémon currently have 2 moves each (referenced by numeric IDs). These need to map to real move names. The existing `Move` type in `shared/types.ts` has `name`, `type`, `category`, `power`, `accuracy`, `effect` — these should align with damage-calc move names.

5. **Abilities/Items:** Start without them (don't pass ability/item to CalcPokemon). Add later as game features.

6. **HP Computation:** Currently the app uses raw base stats as HP. With damage-calc, HP would be computed from the formula: at level 50 with 31 IVs, 0 EVs, `HP = floor(((base*2 + 31) * 50) / 100) + 50 + 10`. For example:
   - Charizard (base 78): `floor(((78*2 + 31) * 50) / 100) + 60 = floor(9350/100) + 60 = 93 + 60 = 153`
   - Snorlax (base 160): `floor(((160*2 + 31) * 50) / 100) + 60 = floor(17550/100) + 60 = 175 + 60 = 235`
   - Pikachu (base 35): `floor(((35*2 + 31) * 50) / 100) + 60 = floor(5050/100) + 60 = 50 + 60 = 110`

   This is significantly higher than raw base stats, which makes battles last longer and more interesting.

---

## Extracting Effectiveness from Results

The damage-calc doesn't directly return effectiveness as a label. However, you can compute it from the move type and defender types using the built-in type chart:

```ts
import { Generations } from '@smogon/calc';

const gen = Generations.get(4);
const fireType = gen.types.get('fire');  // Note: IDs are lowercase
const effectiveness = fireType.effectiveness['Grass'];  // 2 (super effective)
```

Or more simply, keep using the app's own `getEffectiveness()` from `shared/type-chart.ts` since it already works, just capitalize the type names to match.

Alternatively, if `result.damage` is 0 and the move has power > 0, the target is immune. Otherwise check the type chart directly.

---

## Practical Example

```ts
import { calculate, Pokemon, Move, Generations } from '@smogon/calc';

const gen = 4; // Gen 4 for physical/special split

// Charizard uses Flamethrower on Metagross
const charizard = new Pokemon(gen, 'Charizard', {
  level: 50,
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  nature: 'Serious',
});

const metagross = new Pokemon(gen, 'Metagross', {
  level: 50,
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  nature: 'Serious',
});

const flamethrower = new Move(gen, 'Flamethrower');

const result = calculate(gen, charizard, metagross, flamethrower);
console.log(result.range());    // e.g., [76, 90]
console.log(result.fullDesc()); // "0 SpA Charizard Flamethrower vs. 0 HP / 0 SpD Metagross: 76-90 (...)"
// Flamethrower is Fire (super effective vs Steel), STAB for Charizard
```

---

## Risks and Considerations

1. **Build step required:** The `damage-calc/calc` package needs `npm install && npm run build` to produce `dist/`. The server would need to reference the built output or the TypeScript source directly (the server already uses `tsx` which can handle TS imports).

2. **Move data gap:** The app's Pokémon have move IDs (numbers) that map to the app's own `Move` type, not damage-calc move names. The app needs a mapping from its move IDs to real move name strings. This is the main integration work.

3. **Species database size:** The damage-calc includes all ~1000+ Pokémon. Only 46 are used. This is fine for server-side use (no bundle size concern).

4. **Type casing:** The app uses lowercase types (`'fire'`), damage-calc uses PascalCase (`'Fire'`). Need to handle this in effectiveness display.

5. **The `battle.ts` file:** Currently there are two battle engines. The one in `index.ts` is used in production. The one in `battle.ts` is more feature-complete but unused for the main game loop. Integration should target the actual production path (`index.ts:simulateBattleFromIds`).

---

## Summary

The `@smogon/calc` library is well-suited for integration. It provides:
- Accurate damage calculations across all generations
- Full STAB, type effectiveness, stat calculation
- Support for IVs, EVs, natures, levels, items, abilities
- Clean API: `calculate(gen, attacker, defender, move, field) → Result`

**Next steps to integrate:**
1. Install/build the `damage-calc/calc` package
2. Define real Pokémon moves (name strings) for each Pokémon in the app
3. Replace the simplified damage formula in `index.ts` with `calculate()` calls
4. Use damage-calc's stat computation for HP (replacing raw base stats)
5. Extract and display effectiveness from results
6. Optionally: add IVs/EVs/natures as player-visible features later
