# PokemonParty Battle Simulation & Animation Pipeline

## Overview
The battle system consists of three integrated layers:
1. **Server-side Battle Simulation** — Showdown engine running battles and generating logs
2. **Shared Type System** — Data structures passed between client and server
3. **Client-side Animation & Rendering** — Sequential playback with visual effects and sounds

---

## 1. SERVER-SIDE BATTLE SIMULATION (`server/src/showdown-battle.ts`)

### 1.1 Team Building (`buildShowdownTeam`)

**File:** `server/src/showdown-battle.ts`, lines 59-78

**Purpose:** Convert internal team entries into Pokémon Showdown format

**Input:** `BattleTeamEntry[]` — Array of team members with:
- `pokemon`: Pokemon species data
- `heldItem`: Optional item ID (e.g. 'leftovers', 'choice-band')
- `moves`: Two move strings
- `ivs`: Optional IV stats (defaults to 15 across all stats)
- `nature`: Optional nature (defaults to 'Serious')

**Process:**
1. Map held item IDs to Showdown names via `ITEM_ID_TO_SHOWDOWN` lookup
2. Fetch first ability from Gen 5 Dex for each species
3. Build moveset with Nature, IVs, EVs (all 0), Level 50
4. Pack all teams into Showdown's internal format via `Teams.pack()`

**Output:** Packed team string for Showdown Battle constructor

**Key Details:**
- Gen 5 Dex used (`Dex.forGen(5)`)
- Abilities pulled from species data, not customizable
- IVs default to 15 (low stats, fair play)
- EVs all 0 (level playing field)

---

### 1.2 Battle Creation & Execution (`runShowdownBattle`)

**File:** `server/src/showdown-battle.ts`, lines 122-215

**Purpose:** Run a complete Pokémon Showdown battle from team selection to conclusion

**Input:**
- `leftEntries[]`, `rightEntries[]`: Team configurations
- `fieldSize`: 1=Singles, 2=Doubles, 3+=Triples (default: 1)

**Process:**

1. **Build Teams** — Call `buildShowdownTeam()` for both sides

2. **Select Format** — Map fieldSize to Showdown format:
   - `fieldSize=1` → `'gen5customgame'` (Singles)
   - `fieldSize=2` → `'gen5doublescustomgame'` (Doubles)
   - `fieldSize≥3` → `'gen5triplescustomgame'` (Triples)

3. **Initialize Battle** — Create Showdown `Battle` instance with:
   - Format ID
   - Player names: 'Left', 'Right'
   - Packed team strings

4. **Team Preview** — `battle.makeChoices('default', 'default')`

5. **Main Battle Loop** — Run up to 50 turns:
   - Call `buildChoice()` for each side to generate move/switch decisions
   - Execute turn via `battle.makeChoices(p1choice, p2choice)`
   - Catch and recover from bad choices with fallback defaults
   - Exit early if battle ends or 50 turns reached

6. **Log Filtering** — Remove `|split|` markers (preserve first/private view only)

7. **Protocol Parsing** — Call `parseProtocol()` to convert Showdown events to `BattleLogEntry[]`

8. **Post-Processing** — Clean up invalid entries:
   - **Remove friendly fire** — Attacks by same-side pokémon on allies (aSide === tSide)
   - **Remove dead-target attacks** — Queued moves hitting fainted pokémon
   - **Track HP** — Use `hpState` to detect when targets die, update tracking

**Output:** `BattleSnapshot` with final state and full log

---

### 1.3 AI Move Selection (`buildChoice`)

**File:** `server/src/showdown-battle.ts`, lines 217-432

**Purpose:** Generate intelligent move choices for AI players each turn

**Input:**
- `battle`: Active Showdown battle instance
- `sideIndex`: 0=Left, 1=Right

**High-Level Logic:**

1. **Force Switches** — If team member fainted:
   - Iterate through required switches
   - Send first alive, non-active Pokémon
   - Fall back to 'pass' if none available

2. **Move Selection** — If choosing moves:
   - Extract active request for each field position
   - Count opponent alive Pokémon for context
   - **Score each move** using 12 policies (see below)
   - **Weighted random pick** based on scores
   - Generate choice string: `"move X [target]"` for multi-battles

**12 AI Policies:**

| Policy | Type | Rule |
|--------|------|------|
| 1. No Friendly Fire | Hard | In multi-battles, always target a living opponent |
| 2. No Redundant Status | Hard | Don't apply status already on target |
| 3. No Capped Stats | Hard | Don't boost if stat already at +6 / don't lower if at -6 |
| 4. Prefer Super Effective | Soft | 3x score if super-effective, 0.01x if immune |
| 5. Don't Status Immune | Hard | Electric→immunity to paralysis, Fire→burn, Ice→freeze, Poison/Steel→poison, Grass→powder moves |
| 6. Priority When Low HP | Soft | 2x score for priority moves on low-HP targets (<30%) |
| 7. Prefer STAB | Soft | 1.3x score if move type matches Pokémon type |
| 8. Don't Boost Low HP | Soft | 0.1x score for stat boosts when self <30% HP |
| 9. Avoid Self-Destruct Early | Hard | Only allow self-destruct if last Pokémon or opp in KO range |
| 10. Don't Boost on Last Opp | Soft | 0.2x if only 1 opp left and <30% HP |
| 11. Weather Awareness | Soft | Don't repeat active weather (0.05x); boost weather-matching moves (1.5x) |
| 12. Focus Fire | Hard | In multi-battles, target lowest-HP living opponent |

**Scoring Process:**

```
score = 1 (baseline)
if (HARD_FILTER) score = 0  // Skip entirely if conditions met
else:
  apply soft scoring (0.01x to 3x multipliers)
  if score > 0: keep move, else: remove
pool = viable moves > 0 ? viable : all moves
pick = weighted random from pool by score
```

**Output:** Choice string:
- Singles: `"move 1"`, `"move 2"`, `"switch 1"`
- Doubles: `"move 1 1, move 2 2"`, `"switch 1 pass"`
- Fallback: `"default"`

---

### 1.4 Protocol Parsing (`parseProtocol`)

**File:** `server/src/showdown-battle.ts`, lines 434-1049

**Purpose:** Convert Pokémon Showdown protocol events to client-ready `BattleLogEntry[]` entries

**State Tracking:**

- **pokemonState** — Track each Pokémon's HP/MaxHP:
  ```typescript
  Record<ident, { hp, maxHp, side, name, species }>
  ```
  - Ident format: `"p1a: Victini"` (p1/p2 = player, a/b/c = slot)
  - Updated by `|switch|`, `|drag|`, `|-damage|`, `|-heal|`

- **identToInstanceId** — Map protocol ident to internal instance ID:
  ```typescript
  "p1a: Victini" → "l0" (left team, index 0)
  ```

- **Pending Move Buffer** — Collect move events before flushing:
  ```typescript
  { round, attackerIdent, moveName, targetIdent, damage, effectiveness, fainted, crit, statusChange }
  ```

**Event Processing:**

| Event | Action |
|-------|--------|
| `\|turn\|N` | Flush pending move, update round number |
| `\|switch\|`, `\|drag\|` | Flush pending, update pokemonState, log replacement if mid-battle |
| `\|replace\|` | Handle Illusion broken — remap ident to real Pokémon, transfer HP |
| `\|move\|` | Start pending move, check for [still] (charge turn) or [miss] tags |
| `\|-damage\|` | If pending move: calculate damage, else: log status/recoil damage |
| `\|-heal\|` | Log healing (Leftovers, Rest, etc.) |
| `\|-supereffective\|` | Mark pending effectiveness as 'super' |
| `\|-resisted\|` | Mark pending effectiveness as 'not-very' |
| `\|-immune\|` | Mark pending effectiveness as 'immune' + damage 0 |
| `\|-crit\|` | Mark pending as critical hit |
| `\|-miss\|`, `\|-notarget\|` | Flush pending with damage=0, fix message |
| `\|faint\|` | If target of pending: mark fainted, else: log faint directly |
| `\|-status\|` | If pending move: attach status as secondary effect, else: log independently |
| `\|-curestatus\|` | Log status curation |
| `\|-boost\|`, `\|-unboost\|` | Log stat changes with directional messages |
| `\|-weather\|` | Log weather (rain/sun/clear) with emoji |
| `\|win\|`, `\|tie\|` | Set winner |
| `\|cant\|` | Log "can't move" (sleep, freeze, paralysis, flinch) |
| `\|-ability\|` | Log ability activation (Intimidate, etc.) |
| `\|-item\|`, `\|-enditem\|` | Log item consumption |

**HP Snapshot (`getHpSnapshot`):**

After each entry, capture absolute HP of all active Pokémon:
```typescript
hpState: Record<instanceId, currentHp>
```
- Only includes Pokémon in pokemonState (via |switch|)
- Reserves NOT included (client initializes at maxHp)
- Used by client to sync HP state, eliminating desync

**Flush Pending Move (`flushPendingMove`):**

Converts buffered move data → BattleLogEntry:
```typescript
{
  round, attackerInstanceId, targetInstanceId, moveName,
  damage, effectiveness, targetFainted, message,
  statusChange, boostChanges, weather, replacement, itemConsumed,
  hpState  // ← Absolute HP snapshot after this event
}
```

Message includes:
- Move name and target
- "[Pokémon name] used [Move] on [Target]!"
- Effectiveness label ("It's super effective!", etc.)
- Damage amount
- Faint notification
- Crit indicator

**Final State Assembly:**

1. Use battle object's final HP as source-of-truth (`battle.sides[s].pokemon[j].hp`)
2. Build `BattleSnapshot`:
   ```typescript
   {
     left: BattlePokemonState[],
     right: BattlePokemonState[],
     log: BattleLogEntry[],
     winner: 'left' | 'right' | null,
     round: currentRound,
     fieldSize
   }
   ```
3. If no winner determined from protocol: fallback to total HP comparison

---

## 2. SHARED TYPE SYSTEM (`shared/battle-types.ts`)

### 2.1 Battle Configuration

```typescript
interface BattleConfig {
  fieldSize: 1 | 2 | 3;        // 1=Singles, 2=Doubles, 3=Triples
  totalPokemon: number;         // Team size
  selectionMode: 'blind' | 'draft';
}

const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  fieldSize: 1,
  totalPokemon: 3,
  selectionMode: 'blind',
};
```

### 2.2 Pokémon State (`BattlePokemonState`)

```typescript
interface BattlePokemonState {
  instanceId: string;           // "l0", "r1" (side + index)
  name: string;                 // Display name
  sprite: string;               // Image URL (GIF)
  types: string[];              // ["Fire", "Flying"]
  currentHp: number;            // Current health
  maxHp: number;                // Maximum health
  side: 'left' | 'right';       // Team side
  heldItem?: string | null;     // Item ID, nullable
}
```

### 2.3 Battle Log Entry (`BattleLogEntry`)

Core structure for all battle events:

```typescript
interface BattleLogEntry {
  // Positioning
  round: number;
  
  // Attack info (empty if non-move event)
  attackerInstanceId: string;
  attackerName: string;
  moveName: string;
  targetInstanceId: string;
  targetName: string;
  
  // Damage & effectiveness
  damage: number;
  effectiveness: 'super' | 'neutral' | 'not-very' | 'immune' | null;
  targetFainted: boolean;
  
  // Display
  message: string;              // Human-readable summary
  
  // Optional effects
  weather?: 'rain' | 'sun' | 'clear';
  boostChanges?: { instanceId: string; changes: Partial<Record<stat, number>> };
  statusChange?: { instanceId: string; status: string };
  statusDamage?: { instanceId: string; damage: number };
  replacement?: { instanceId: string; name: string; sprite: string; side: 'left' | 'right' };
  itemConsumed?: { instanceId: string; itemId: string };
  
  // HP snapshot (CRITICAL)
  hpState?: Record<string, number>;  // Absolute HP for ALL pokemon after this event
}
```

**Key Note:** `hpState` is the ground truth for HP state. Client uses it to synchronize state after each event, preventing desync from damage calculation differences.

### 2.4 Battle Snapshot (`BattleSnapshot`)

```typescript
interface BattleSnapshot {
  left: BattlePokemonState[];   // Left team final state
  right: BattlePokemonState[];  // Right team final state
  log: BattleLogEntry[];        // Full battle event log
  winner: 'left' | 'right' | null;  // Battle result
  round: number;                // Total rounds played
  fieldSize: number;            // Active slots on field
}
```

---

## 3. CLIENT-SIDE ANIMATION & RENDERING (`client/src/components/BattleScene.tsx`)

### 3.1 Animation State

```typescript
interface AnimationState {
  introIndex: number;                    // -1 to introTotal
  introTotal: number;                    // Number of pokemon to reveal
  currentLogIndex: number;               // Current entry in log (-1 = not started)
  pokemonHp: Record<string, number>;     // Current HP for each pokemon
  pokemonBoosts: Record<string, Record<string, number>>;  // Stat boosts (-6 to +6)
  pokemonStatus: Record<string, string>; // Status condition (burn, sleep, etc)
  pokemonItems: Record<string, string | null>;  // Held items (nullable)
  attackingId: string | null;            // Pokemon currently attacking
  actionText: string | null;             // Text displayed in banner
  finished: boolean;                     // Battle complete
}
```

### 3.2 Initialization (`useEffect` lines 243-266)

**Purpose:** Set up initial state from snapshot

**Process:**

1. **Create entry order** — Alternating left/right for intro reveal:
   ```
   left[0], right[0], left[1], right[1], ...
   ```

2. **Initialize HP** — All pokemon at maxHp

3. **Initialize boosts** — All stats at 0

4. **Initialize status** — All empty strings

5. **Initialize items** — From snapshot.heldItem

6. **Set AnimationState** — introIndex starts at -1, currentLogIndex at -1

### 3.3 BGM & Cry Setup (lines 273-278)

```typescript
useEffect(() => {
  startBattleBgm(0.25, trainerId);           // Volume 0.25, optional trainer-specific track
  preloadCries(allNames);                     // Load all pokemon cries into browser cache
  return () => stopBattleBgm();               // Stop on unmount
}, []);
```

### 3.4 Intro Animation Sequence (lines 286-299)

**Purpose:** Reveal pokemon one by one with cries

**State Machine:**

- **introIndex = -1** → Wait 400ms, then start
- **introIndex = 0..N-1** → Wait 600ms per pokemon:
  - Play cry for next pokemon
  - Increment introIndex
- **introIndex = N** → Intro complete, ready for battle log playback

**Timeline Example (4 pokemon):**
```
t=0ms:    Set introIndex=0
t=400ms:  Play cry[0], set introIndex=1
t=1000ms: Play cry[1], set introIndex=2
t=1600ms: Play cry[2], set introIndex=3
t=2200ms: Play cry[3], set introIndex=4
t=2800ms: introDone = true, begin log playback
```

**Visibility Tracking:**

```typescript
visibleSet.current = new Set<string>();
for (let i = 0; i <= introIndex; i++) {
  visibleSet.current.add(entryOrder[i].instanceId);
}
```

Pokemon cards get CSS class `entered` (visible) or `hidden-entry` (faded out).

### 3.5 Log Entry Playback Loop (lines 310-495)

**Purpose:** Play battle events one by one with animations

**Flow Diagram:**

```
introDone && !finished && !animatingRef
  ↓
currentLogIndex + 1 < log.length?
  ├─ YES: Schedule timer(turnDelayMs)
  │   ├─ Show round banner if new round
  │   ├─ Handle event type:
  │   │   ├─ REPLACEMENT: Show text, apply hpState, add to visible set, play cry
  │   │   ├─ NON-MOVE (status, faint, boost): Show text, apply state, play faint SFX
  │   │   └─ MOVE: 3-phase animation (see below)
  │   └─ Increment currentLogIndex
  └─ NO: Set finished=true, stop BGM
```

**Non-Move Events** (lines 384-404):

For status condition, faint from recoil, etc.:

```typescript
setAnim((prev) => {
  const newHp = entry.hpState ? {...entry.hpState} : {...prev.pokemonHp};
  if (!entry.hpState && entry.statusDamage) {
    newHp[id] -= statusDamage;
  }
  const newStatus = entry.statusChange ? {...prev.pokemonStatus, [id]: status} : prev.pokemonStatus;
  return {...prev, currentLogIndex: nextIdx, pokemonHp: newHp, pokemonStatus: newStatus};
});
```

**Move Events** — 3-Phase Animation (lines 406-487):

**Phase 1: Show Move Text** (500ms pause)
```typescript
setAnim((prev) => ({
  ...prev,
  attackingId: entry.attackerInstanceId,
  actionText: `${attacker} used ${move} on ${target}!`
}));
```

**Phase 2: Play SFX & Animation** (0-1000ms)
```typescript
playSfx(getMoveSfxType(moveName));
const animConfig = getMoveAnim(moveName);
await runMoveAnimation(animConfig, arena, attackerEl, defenderEl);
```

**Phase 3: Apply Damage & Show Result** (immediate)
```typescript
setAnim((prev) => {
  // CRITICAL: Use hpState if provided (absolute sync)
  const newHp = entry.hpState 
    ? {...entry.hpState}
    : {...prev.pokemonHp};
  
  if (!entry.hpState) {
    // Manual damage only if no hpState
    if (entry.damage > 0) {
      newHp[target] = Math.max(0, newHp[target] - entry.damage);
    }
  }
  
  // Apply boosts, status, itemConsumed
  ...
  
  return {
    ...prev,
    currentLogIndex: nextIdx,
    pokemonHp: newHp,
    pokemonBoosts: newBoosts,
    pokemonStatus: newStatus,
    actionText: resultText
  };
});
```

**Result Text Examples:**
- Damage hit: `"It's super effective! Target fainted!"`
- Blocked: `"It had no effect..."`
- Miss: `"Attacker's attack missed!"`

### 3.6 Switch/Replacement Handling (lines 335-381)

**Purpose:** Swap pokemon on field when one faints

**Flow:**

1. **Log Entry:** `entry.replacement` = new pokemon data

2. **Update Visual State:**
   - Add to `visibleSet` (fade in new pokemon)
   - Find fainted pokemon in `displayedLeft` or `displayedRight`
   - Replace that slot with new pokemon full state
   - Reset boosts/status for new pokemon
   - Play cry

3. **HP Handling:**
   - If `entry.hpState`: Use it (new pokemon has full HP)
   - Else: Set new pokemon to maxHp

**Code:**
```typescript
setDisplayed((displayed) => {
  const faintedIdx = displayed.findIndex(p => (prev.pokemonHp[p.instanceId] ?? 0) <= 0);
  if (faintedIdx >= 0) {
    const next = [...displayed];
    next[faintedIdx] = fullState;  // fullState from snapshot
    return next;
  }
  return displayed;
});
```

### 3.7 HP State Consumption (lines 453-462)

**Key Principle:** `hpState` in BattleLogEntry is **absolute truth**

```typescript
// Priority order for setting new HP:
if (entry.hpState) {
  // Case 1: Server provided absolute snapshot — USE IT
  const newHp = {...prev.pokemonHp, ...entry.hpState};
} else {
  // Case 2: Manual calculation from damage fields
  let newHp = {...prev.pokemonHp};
  if (entry.damage > 0) {
    newHp[target] = Math.max(0, newHp[target] - entry.damage);
  }
  if (entry.statusDamage) {
    newHp[id] = Math.max(0, newHp[id] - statusDamage);
  }
}
```

**Why Two Paths?**

- **hpState present:** Server ran full sim, has authoritative HP
  - Use directly (merge with previous state to handle pokemon not in snapshot)
  - Eliminates desync from client-side rounding/precision differences

- **hpState absent:** Event is non-damaging (text-only, status, boost, replacement, item)
  - Use damage fields if present
  - Pure additive damage calculation

**Merge Behavior:**

```typescript
newHp = {...prev.pokemonHp, ...entry.hpState}
```

Previous HP values retained for pokemon NOT in hpState (e.g., bench pokemon).

---

## 4. POKEMON CARD RENDERING (`client/src/components/BattleScene.tsx`, lines 55-153)

### Component: `PokemonCard`

**Props:**
- `poke`: BattlePokemonState
- `currentHp`: Tracked HP from animation state
- `isAttacking`: Highlight when attacking
- `visible`: Fade in during intro
- `boosts`: Active stat changes
- `statusCondition`: Status badge (BRN, PAR, etc.)
- `heldItemId`: Item sprite overlay

**Rendering:**

1. **HP Bar:**
   ```
   color = getHpClass(current, max)
   color: 'high' (>50%), 'medium' (20-50%), 'low' (<20%)
   width = (current / max) * 100%
   ```

2. **Status Badge:**
   ```
   STATUS_DISPLAY = {
     burn: {label: 'BRN', cls: 'status-brn'},
     paralysis: {label: 'PAR', cls: 'status-par'},
     ...
   }
   ```

3. **Stat Boosts:**
   ```
   Display only non-zero boosts: ▲Atk+2, ▼SpD-3
   ```

4. **Faint Handling:**
   - On faint: Freeze GIF sprite by capturing to canvas
   - Converts animated GIF → static image for visual clarity
   - Add CSS class `fainted` (grayscale, opacity)

5. **Attack Animation:**
   - CSS class `attacking` added while `isAttacking === true`
   - Sprite gets `attacking` styles (glow, scale, etc.)

---

## 5. BATTLE ANIMATION ENGINE (`client/src/components/BattleAnimationEngine.ts`)

### Purpose: DOM-based move animations with CSS transitions

### Key Functions:

**1. `runMoveAnimation(config, arena, attackerEl, defenderEl)`**

Main entry point. Routes to animation style:

```typescript
switch (config.style) {
  case 'projectile':    animateProjectile(...) + shake(defender)
  case 'contact':       animateContact(...) + shake(defender)
  case 'beam':          animateBeam(...) + shake(defender)
  case 'aoe':           animateAoe(...) + shake(defender)
  case 'self':          flash(arena) only
  default:              shake(defender)
}
```

**Config Structure:**
```typescript
interface MoveAnimConfig {
  style: 'projectile' | 'contact' | 'beam' | 'aoe' | 'self';
  sprite?: string;              // FX sprite name (fx/fireball.png)
  bgFlash?: string;             // Background color (#FF0000)
  bgFlashDuration?: number;     // ms
  shakeIntensity?: number;      // 0-10
  count?: number;               // Number of projectiles/AOE hits
}
```

**2. `animateProjectile(arena, sprite, from, to, count, duration)`**

Launches count projectiles from attacker to defender:

```
for each projectile i in count:
  ├─ Create FX img at from position
  ├─ Force reflow: void img.offsetWidth
  ├─ Animate to target: opacity 1, translate to to
  ├─ Sleep 60% of duration (projectile in flight)
  ├─ Fade out: opacity 0
  └─ Sleep 50%, remove DOM
```

**3. `animateContact(attackerEl, defenderEl, arena, sprite)`**

Physical move (Tackle, Close Combat):

```
├─ Calculate direction: (defender - attacker) * 0.3
├─ Lunge attacker 150ms
├─ Show impact sprite at defender center (48px)
├─ Impact fade out 200ms + 150ms
└─ Return attacker to base position
```

**4. `animateBeam(arena, sprite, from, to, count)`**

Charged beam (Thunderbolt, Solar Beam):

```
for steps in count:
  ├─ Position sprite at lerp(from, to, t)
  ├─ Create FX img, fade to 0.9 opacity
  └─ Sleep 80ms per step
All step FX fade out in 200ms
```

**5. `animateAoe(arena, defenderEl, sprite, count)`**

Area effect (Earthquake, Surf):

```
for hit in count:
  ├─ Random offset within 60px radius of defender
  ├─ Create FX img, scale 1.2, opacity 0.9
  └─ Sleep 100ms per hit
All FX scale down & fade, then remove
```

**6. `flashBackground(arena, color, duration)`**

Quick flash effect:

```
├─ Create overlay div
├─ Animate opacity 0 → 0.3 (50% of duration)
├─ Then 0.3 → 0 (50% of duration)
└─ Remove overlay
```

**7. `shakeElement(el, intensity, duration)`**

Damage shake:

```
6 steps over duration:
  ├─ Random offset: dx in [-intensity, +intensity] * 2
  ├─ Random offset: dy in [-intensity/2, +intensity/2]
  └─ Apply transform, then return to base
```

**Helper Utilities:**

- `getCenter(el, arena)`: Get center coordinates relative to arena
- `createFxImg(arena, sprite, x, y, size)`: Create positioned FX image
- `sleep(ms)`: Promise-based delay

---

## 6. BATTLE SOUNDS & MUSIC (`client/src/components/BattleSounds.ts`)

### 6.1 Sound Effects (`playSfx`)

**Synthesized SFX Types:**

Built using Web Audio API oscillators + noise generators:

```typescript
type SfxType = 
  | 'hit' | 'hit-hard' | 'hit-weak'
  | 'electric' | 'fire' | 'water' | 'ice' | 'grass'
  | 'psychic' | 'ghost' | 'poison' | 'ground'
  | 'rock' | 'fighting' | 'flying' | 'dragon' | 'steel'
  | 'normal' | 'bug'
  | 'weather' | 'faint' | 'miss';
```

**Implementation:**

- **`playTone(ac, freq, duration, type, volume, detune)`**
  - Create sine/square/triangle/sawtooth oscillator
  - Exponential ramp to silence over duration
  - Example: `hit` = 200Hz square + noise

- **`playNoise(ac, duration, volume)`**
  - Generate white noise via random buffer
  - Exponential envelope (fade-out)

**Move → SFX Mapping (`MOVE_SFX`):**

```typescript
{
  'Ember': 'fire',
  'Thunderbolt': 'electric',
  'Water Gun': 'water',
  ...
}
getMoveSfxType(moveName) → returns SfxType or 'hit' default
```

### 6.2 Background Music (`startBattleBgm`)

**Track List (14 tracks):**
```typescript
BgmTrack {
  url: 'audio/dpp-trainer.mp3',
  loopStart: 13.440,
  loopEnd: 96.959
}
```

- DPP, HGSS, BW, BW2, XY, ORAS, SM variants

**Trainer-Specific BGM:**

```typescript
TRAINER_BGM: Record<string, BgmTrack> = {
  'brock': BGM_KANTO_GYM,
  'cynthia': BGM_CHAMPION_DPP,
  'red': BGM_RED,
  ...
}
```

**Playback Loop:**

```typescript
startBattleBgm(volume=0.25, trainerId?) {
  track = trainerId && TRAINER_BGM[trainerId] ? TRAINER_BGM[trainerId] : random;
  audio.addEventListener('timeupdate', () => {
    if (audio.currentTime >= track.loopEnd) {
      audio.currentTime = track.loopStart;  // Seamless loop
    }
  });
  audio.play();
}
```

### 6.3 Pokémon Cries (`playCry`)

**Source:** Pokémon Showdown CDN
```
https://play.pokemonshowdown.com/audio/cries/{id}.mp3
```

**Functions:**

- **`playCry(pokemonName, volume=0.3, playbackRate=1.0)`**
  - Always create fresh Audio object (allows overlapping cries)
  - Sanitize name: lowercase, remove special chars
  - Optional playback rate (0.6 = lower pitch for fainting)

- **`preloadCries(pokemonNames)`**
  - Fetch URLs into browser cache during load
  - No playback, just cache hit
  - Ensures instant playback during animation

---

## Integration Summary

### Server → Client Flow

```
runShowdownBattle()
  ├─ buildShowdownTeam() × 2
  ├─ battle.makeChoices() × N turns
  │   └─ buildChoice() × 2 sides (AI policies)
  ├─ parseProtocol(battle.log)
  │   └─ BattleLogEntry[] with hpState snapshots
  └─ return BattleSnapshot

Client receives BattleSnapshot:
  ├─ Intro sequence: reveal pokemon + cries
  ├─ Log playback loop:
  │   ├─ Non-move: Show text, apply state
  │   ├─ Move: 3-phase (text → animation → result)
  │   └─ Replacement: Swap pokemon, play cry
  ├─ Update HP/boosts/status from entry
  │   └─ Use hpState for ground truth sync
  ├─ Play SFX/animations via engine
  └─ Finish when log exhausted
```

### Critical Data Points

1. **hpState in BattleLogEntry** — Absolute HP snapshot, eliminates desync
2. **AI Policies** — 12-rule system ensures intelligent, varied moves
3. **Protocol Parsing** — Converts PS protocol to readable log entries
4. **Animation Pipeline** — 3-phase moves keep battles engaging
5. **Sound Design** — Synthesized SFX + cached cries + looping BGM

---

## Testing & Debugging Notes

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| HP desync between client & server | Client calculating damage without hpState | Always use hpState if present; fallback to damage fields |
| Pokemon appearing in wrong slots | identToInstanceId mapping incorrect | Verify switch events map correctly by pokemon name |
| Frozen sprite not displaying | Canvas render during faint race condition | Wrap freeze in `if (!frozenSrc.current && fainted)` check |
| Sound cutting off | Web Audio context suspended | Call `getCtx().resume()` on user interaction |
| BGM not looping | Loop points incorrect | Verify loopStart < current < loopEnd in timeupdate handler |
| Double animations stacking | animatingRef not properly cleared | Always set `animatingRef.current = false` in finally block |

### Performance Tuning

- **Large battles (3v3+):** Reduce turnDelayMs if animations lag
- **Animation count:** MoveAnimConfig.count affects FX sprite creation; limit to 5-10
- **Image preloading:** Pre-cache common pokemon sprites via `<img loading="lazy" />`
- **Audio:** Cries preload on mount; BGM fetched from CDN (consider caching policy)

