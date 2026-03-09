# Game Design

## Concept

Pokémon Party is a webapp designed to be played on phones during a real-life party. A TV screen displays the live leaderboard. Players collect Pokémon, build teams, and battle each other throughout the evening.

## Core Mechanics

### Players
- Register with a name, receive starting essence
- Tracked stats: essence (currency), ELO rating, collection, items

### Pokémon
- **Roster:** 386 Pokémon (Gen 1–3), only base forms obtainable from boxes
- **Stats:** HP, Attack, Defense, Sp.Atk, Sp.Def, Speed (official base stats)
- **IVs:** 0–31 per stat, randomly rolled on acquisition, boostable to 31 via items
- **Natures:** 25 standard natures with ±10% stat modifiers
- **Moves:** 2 moves per Pokémon (species defaults, overridable with TMs)
- **Types:** Full Gen 3 type chart, dual types supported

### Evolution
- **Shard** a Pokémon to convert it into a token of its species
- Spend 3 tokens of a species + 1 instance to evolve it to the next stage
- Evolution preserves IVs and nature, changes species

### Essence Economy

| Source | Amount |
|--------|--------|
| Battle win | 20 base + tier bonus of opponent's team |
| Release (shard) | Converts to a token (not direct essence) |

**Tier strength values:** Common 10, Uncommon 25, Rare 50, Epic 100, Legendary 200

### Expansion Boxes
Four tiers of randomized Pokémon packs with increasing cost and strength:
- **Common** — basic Pokémon (Rattata, Pidgey, etc.)
- **Uncommon** — mid-tier (Eevee, Growlithe, etc.)
- **Rare** — strong lines (Dratini, Larvitar, etc.)
- **Legendary** — pseudo-legendaries and legendaries

### Battles
- **Team size:** 3 Pokémon per side
- **Format:** Fully automated, simultaneous — speed determines turn order
- **Move selection:** Random (from the Pokémon's 2 moves)
- **Damage:** Gen 4 formula via `@smogon/calc` (STAB, type effectiveness, IVs, natures)
- **Modes:**
  - **AI Battle** (`/battle-demo`): pick 3 from collection, fight random AI team, earn essence
  - **PvP Battle** (`/battle`): challenge another player by name, both pick teams, server simulates
  - **Draft modes** (`/draft`, `/draft-demo`): alternating draft picks before battle

### ELO Rating
- Starting: 1000, K-factor: 32
- Updated on PvP wins/losses (AI battles don't affect ELO)

### Trading
- 1-for-1 Pokémon swaps between connected players via Socket.IO

### Items
| Type | Effect |
|------|--------|
| TM | Teaches a move to a Pokémon (replaces one of its 2 moves) |
| Boost | Maxes out one IV (sets to 31) |
| Token | Species shard used for evolution (3 tokens + 1 instance → evolved form) |

### TV View
Public `/tv` route (no login required) showing the leaderboard — ELO rankings, essence totals, and top Pokémon per player.
