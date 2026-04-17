# Story Mode Redesign — Multi-Storyline System

## Overview

Replace the single 25-chapter linear story with multiple shorter storylines that the player can tackle in parallel. Each storyline is a self-contained narrative arc (3–7 steps) with escalating difficulty. Some storylines unlock further storylines upon completion.

## Core Concepts

### Storyline
A sequence of steps forming a narrative arc. Has an ID, title, description, region, difficulty tier, prerequisite storylines, and a list of steps.

### Step Types
- **`battle`** — A trainer battle. Has a trainer name, sprite, team, field size, intro/win dialogue.
- **`dialogue`** — Pure story progression. Has a speaker, sprite, lines of text. No battle. Auto-completes when viewed.

### Difficulty Tiers
- **Beginner** — 1v1, 1–2 pokemon teams (common/uncommon tier pokemon)
- **Intermediate** — 1v1 to 2v2, 2–4 pokemon teams (uncommon/rare tier)
- **Advanced** — 2v2 to 3v3, 4–6 pokemon teams (rare/epic tier)
- **Expert** — 3v3, 6 pokemon teams (epic/legendary tier)

### Unlock System
- Some storylines are available from the start (beginner ones)
- Others require completing prerequisite storylines
- This creates a branching web, not a single linear path

### Completion Rewards
Each storyline has a final reward granted on first completion of the last step:
- Essence
- Pokemon (from packs)
- TMs, items, boosts

Individual battle steps within a storyline still give small essence rewards on first clear.

## Data Structure

```typescript
interface StoryStep {
  type: 'battle' | 'dialogue';
  // Dialogue fields
  speaker?: string;
  sprite?: string;
  lines?: string[];
  // Battle fields
  trainerName?: string;
  trainerTitle?: string;
  team?: number[];
  fieldSize?: 1 | 2 | 3;
  essenceReward?: number;
}

interface Storyline {
  id: string;
  title: string;
  description: string;
  region: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  icon: string;
  /** Storyline IDs that must be completed to unlock this one */
  requires: string[];
  /** How many of the `requires` storylines must be completed (default: all) */
  requiresCount?: number;
  steps: StoryStep[];
  /** Reward for completing the full storyline */
  completionReward: {
    essence: number;
    pack?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  };
}
```

## Database Changes

Replace the old `story_progress (player_id, chapter_id)` with step-level tracking using composite IDs:
- `chapter_id` becomes a string like `"kanto-gym:3"` (storyline_id:step_index)
- A storyline is "completed" when all its steps are in the table

## Available Trainer Sprites

Only these trainers have sprites (no grunts/NPCs):
aaron, barry, bertha, blaine, blue, brawly, brock, bruno, bugsy, byron,
candice, chuck, clair, crasherwake, cynthia, drake, erika, falkner, fantina,
flannery, flint, giovanni, glacia, janine, jasmine, karen, koga, lance,
ltsurge, lucian, maylene, misty, morty, norman, phoebe, pryce, red, roxanne,
sabrina, sidney, silver, steven, volkner, wallace, wattson, whitney, will, winona

## Storylines

### Available from Start

#### 1. "Brock's Challenge" (`brock-challenge`, Beginner, Kanto) 🪨
Brock tests new trainers to see if they have what it takes.
- Step 1: **dialogue** — Brock: "So you want to become a trainer? Show me you can handle rock-solid defense!"
- Step 2: **battle** — Brock — team: [74, 95], 1v1, 100 essence
- Step 3: **dialogue** — Brock: "Not bad! You've got potential. Keep training and you'll go far."
- **Reward:** 200 essence

#### 2. "Misty's Trial" (`misty-trial`, Beginner, Kanto) 🌊
Misty challenges trainers at the Cerulean Gym.
- Step 1: **dialogue** — Misty: "Think you can handle the power of water? Let's find out!"
- Step 2: **battle** — Misty — team: [120, 121], 1v1, 100 essence
- Step 3: **dialogue** — Misty: "Hmph... you got lucky. But I respect your skill."
- **Reward:** 200 essence

#### 3. "Whitney's Fury" (`whitney-fury`, Beginner, Johto) 🐄
Whitney is having a bad day and needs someone to battle.
- Step 1: **dialogue** — Whitney: "Everyone thinks I'm just a crybaby! I'll show you how strong I really am!"
- Step 2: **battle** — Whitney — team: [35, 241], 1v1, 100 essence
- Step 3: **dialogue** — Whitney: "*sniff*... Okay, you win. But next time I won't go easy!"
- **Reward:** 200 essence

#### 4. "Roxanne's Lesson" (`roxanne-lesson`, Beginner, Hoenn) 📖
Roxanne, the studious Rock-type leader, offers a learning battle.
- Step 1: **dialogue** — Roxanne: "Type matchups are the foundation of strategy. Allow me to demonstrate!"
- Step 2: **battle** — Roxanne — team: [74, 299], 1v1, 100 essence
- Step 3: **dialogue** — Roxanne: "Excellent application of type advantages! You learn fast."
- **Reward:** 200 essence

### Unlocked by completing any 2 Beginner storylines

#### 5. "Kanto Gym Circuit" (`kanto-gyms`, Intermediate, Kanto) 🏛️
Challenge the Kanto gym leaders in sequence.
- Step 1: **dialogue** — Brock: "Ready for the real challenge? The Kanto gyms await."
- Step 2: **battle** — Brock — team: [95, 76, 141], 1v1, 150 essence
- Step 3: **battle** — Misty — team: [121, 131, 130], 1v1, 150 essence
- Step 4: **battle** — Lt. Surge — team: [26, 101, 135], 1v1, 150 essence
- Step 5: **battle** — Erika — team: [45, 114, 3], 2v2, 200 essence
- Step 6: **battle** — Sabrina — team: [65, 196, 122], 2v2, 200 essence
- Step 7: **dialogue** — Sabrina: "I foresee great things in your future... The Elite Four awaits."
- **Reward:** 1000 essence, uncommon pack

#### 6. "Johto Gym Circuit" (`johto-gyms`, Intermediate, Johto) 🏛️
Challenge the Johto gym leaders.
- Step 1: **dialogue** — Falkner: "Johto's gym leaders are no pushovers. Are you ready?"
- Step 2: **battle** — Falkner — team: [22, 164], 1v1, 100 essence
- Step 3: **battle** — Bugsy — team: [123, 214], 1v1, 150 essence
- Step 4: **battle** — Whitney — team: [241, 36, 210], 1v1, 200 essence
- Step 5: **battle** — Morty — team: [94, 200, 429], 2v2, 200 essence
- Step 6: **battle** — Chuck — team: [62, 107], 1v1, 150 essence
- Step 7: **battle** — Jasmine — team: [208, 82, 227], 2v2, 200 essence
- Step 8: **dialogue** — Jasmine: "Your bond with your Pokémon is beautiful. Keep going!"
- **Reward:** 1000 essence, uncommon pack

#### 7. "Hoenn Gym Circuit" (`hoenn-gyms`, Intermediate, Hoenn) 🏛️
Challenge the Hoenn gym leaders.
- Step 1: **battle** — Roxanne — team: [76, 299, 306], 1v1, 150 essence
- Step 2: **battle** — Brawly — team: [296, 297], 1v1, 150 essence
- Step 3: **battle** — Wattson — team: [82, 310, 181], 1v1, 150 essence
- Step 4: **battle** — Flannery — team: [323, 219, 324], 2v2, 200 essence
- Step 5: **battle** — Norman — team: [289, 335, 128], 2v2, 200 essence
- Step 6: **battle** — Winona — team: [334, 277, 227], 2v2, 200 essence
- **Reward:** 1000 essence, uncommon pack

#### 8. "Sinnoh Gym Circuit" (`sinnoh-gyms`, Intermediate, Sinnoh) 🏛️
Challenge the Sinnoh gym leaders.
- Step 1: **battle** — Maylene — team: [308, 448, 214], 1v1, 150 essence
- Step 2: **battle** — Crasher Wake — team: [130, 195, 419], 1v1, 150 essence
- Step 3: **battle** — Fantina — team: [429, 426, 94], 2v2, 200 essence
- Step 4: **battle** — Byron — team: [411, 208, 306], 2v2, 200 essence
- Step 5: **battle** — Candice — team: [473, 461, 460], 2v2, 200 essence
- Step 6: **battle** — Volkner — team: [466, 405, 135, 26], 2v2, 250 essence
- **Reward:** 1000 essence, uncommon pack

### Unlocked by completing the region's Gym Circuit

#### 9. "Kanto Elite Four" (`kanto-e4`, Advanced, Kanto) ⭐
Face the Kanto Elite Four and Champion.
- Requires: `kanto-gyms`
- Step 1: **dialogue** — Lance: "The Elite Four awaits. Only the strongest may pass."
- Step 2: **battle** — Bruno — team: [68, 107, 106, 95], 2v2, 300 essence
- Step 3: **battle** — Agatha — team: [94, 169, 110, 429], 2v2, 300 essence
- Step 4: **battle** — Lance — team: [149, 130, 142, 6], 2v2, 400 essence
- Step 5: **dialogue** — Lance: "You are truly worthy. But there is one more challenger..."
- Step 6: **battle** — Blue — team: [9, 65, 59, 103, 112, 130], 3v3, 500 essence
- **Reward:** 2000 essence, rare pack

#### 10. "Johto Elite Four" (`johto-e4`, Advanced, Johto) ⭐
Face the Johto Elite Four and Champion.
- Requires: `johto-gyms`
- Step 1: **battle** — Will — team: [178, 80, 103, 196], 2v2, 300 essence
- Step 2: **battle** — Koga — team: [169, 110, 89, 49], 2v2, 300 essence
- Step 3: **battle** — Karen — team: [197, 229, 215, 359], 2v2, 400 essence
- Step 4: **battle** — Lance — team: [149, 130, 142, 6, 148, 230], 3v3, 500 essence
- **Reward:** 2000 essence, rare pack

#### 11. "Hoenn Elite Four" (`hoenn-e4`, Advanced, Hoenn) ⭐
Face the Hoenn Elite Four and Champion Steven.
- Requires: `hoenn-gyms`
- Step 1: **battle** — Sidney — team: [275, 319, 332, 359], 2v2, 300 essence
- Step 2: **battle** — Phoebe — team: [356, 354, 429, 477], 2v2, 300 essence
- Step 3: **battle** — Glacia — team: [362, 365, 461, 473], 2v2, 400 essence
- Step 4: **battle** — Steven — team: [376, 306, 348, 346, 227, 344], 3v3, 500 essence
- **Reward:** 2500 essence, rare pack

#### 12. "Sinnoh Elite Four" (`sinnoh-e4`, Advanced, Sinnoh) ⭐
Face the Sinnoh Elite Four and Champion Cynthia.
- Requires: `sinnoh-gyms`
- Step 1: **battle** — Aaron — team: [416, 214, 469, 402], 2v2, 300 essence
- Step 2: **battle** — Bertha — team: [450, 76, 340, 464], 2v2, 300 essence
- Step 3: **battle** — Flint — team: [392, 467, 136, 59], 2v2, 400 essence
- Step 4: **battle** — Cynthia — team: [445, 448, 442, 350, 407, 468], 3v3, 600 essence
- **Reward:** 3000 essence, epic pack

### Expert Tier (Endgame)

#### 13. "The Red Challenge" (`red-challenge`, Expert, Kanto) 🏔️
Face the legendary trainer Red atop Mt. Silver.
- Requires: `kanto-e4`, `johto-e4`
- Step 1: **dialogue** — Blue: "You've proven yourself against every gym and Elite Four... but Red is on another level. He doesn't speak. He just battles."
- Step 2: **battle** — Red — team: [25, 143, 131, 3, 6, 9], 3v3, 1000 essence
- Step 3: **dialogue** — Red: "..." (Red nods approvingly and walks away into the snow.)
- **Reward:** 5000 essence, legendary pack

#### 14. "Cynthia's Rematch" (`cynthia-rematch`, Expert, Sinnoh) 🌟
The Champion of Sinnoh seeks a worthy challenger.
- Requires: `sinnoh-e4`
- Step 1: **dialogue** — Cynthia: "I've been training since our last battle. No holding back this time."
- Step 2: **battle** — Cynthia — team: [445, 448, 442, 350, 407, 468], 3v3, 1000 essence
- **Reward:** 5000 essence, epic pack

## Unlock Graph

```
brock-challenge ──┐
misty-trial ──────┤─ (any 2) ──→ kanto-gyms ──→ kanto-e4 ──┐
whitney-fury ─────┤                                         ├─→ red-challenge
roxanne-lesson ───┤─ (any 2) ──→ johto-gyms ──→ johto-e4 ──┘
                  ├─ (any 2) ──→ hoenn-gyms ──→ hoenn-e4
                  └─ (any 2) ──→ sinnoh-gyms ─→ sinnoh-e4 ──→ cynthia-rematch
```

## UI Design

### Story Hub Screen
- Grid/list of storyline cards
- Each card shows: icon, title, region, difficulty badge, progress (e.g. "3/5"), lock status
- Completed storylines dimmed with ✅
- Locked ones show padlock + requirement text
- Tapping an unlocked storyline enters the step sequence

### Step Flow
- Dialogue steps: show speaker sprite, text, "Continue →" button
- Battle steps: intro dialogue → team select → battle → win/loss dialogue
- After final step: show completion reward screen → return to hub
