# Pokémon Party Game — Game Design Document

## Overview

A party game played throughout an evening via a mobile webapp. Players collect, trade, battle, and evolve Pokémon. A TV screen displays a live leaderboard and stats. There is no formal win condition — the game is open-ended and social.

## Players

- Any number of players can join at any time via their phone
- Each player has a **collection** of Pokémon and an **essence** balance

## Pokémon

### Roster

The game includes Pokémon from **Generations 1–3** (386 Pokémon). Only **base-form** Pokémon can be obtained from expansion boxes. Evolved forms are obtained exclusively through the evolution mechanic.

### Stats

Each Pokémon has the following stats:

| Stat    | Description                        |
|---------|------------------------------------|
| HP      | Hit points                         |
| Attack  | Physical attack power              |
| Defense | Physical damage reduction          |
| Sp. Atk | Special attack power              |
| Sp. Def | Special damage reduction           |
| Speed   | Determines turn order in battle    |

Stats follow the official base stats from the main Pokémon games.

### Moves

Each Pokémon has exactly **2 predetermined moves**. Moves have:

- **Name**
- **Type** (fire, water, etc.)
- **Category** (physical or special)
- **Power**
- **Accuracy** (% chance to hit)

### Types

The game uses the **standard Pokémon type chart** (Gen 3) for type effectiveness (super effective = ×2, not very effective = ×0.5, immune = ×0). Dual types are supported.

### Evolution

- **4 copies** of the same base Pokémon can be combined to evolve it into its next stage
- 4 copies of a stage-1 Pokémon can be combined to evolve into a stage-2 Pokémon (if one exists)
- The resulting evolved Pokémon inherits higher base stats and potentially different moves/types

## Essence

Essence is the in-game currency.

| Action                  | Essence effect           |
|-------------------------|--------------------------|
| Win a battle            | +20 base + opponent tier bonus |
| Lose a battle           | No change                |
| Release a Pokémon       | +essence (tier × evolution stage) |
| Buy an expansion box    | −cost (varies by tier)   |

### Essence Values

**Battle reward** = 20 + sum of opponent team tier values:
- Common Pokémon: 10 each
- Uncommon: 25 each  
- Rare: 50 each
- Legendary: 100 each

**Release value** (base × stage multiplier):
| Tier      | Base | Stage 0 | Stage 1 | Stage 2 |
|-----------|------|---------|---------|---------|
| Common    | 5    | 5       | 10      | 15      |
| Uncommon  | 15   | 15      | 30      | 45      |
| Rare      | 35   | 35      | 70      | 105     |
| Legendary | 75   | 75      | 150     | 225     |

**Box costs**:
| Tier      | Cost |
|-----------|------|
| Common    | 30   |
| Uncommon  | 75   |
| Rare      | 150  |
| Legendary | 300  |

### Starting essence

Each player begins the game with enough essence to open one **Common** expansion box for free.

## Expansion Boxes

There are **4 tiers** of expansion boxes:

| Tier       | Cost       | Contents                                      |
|------------|------------|-----------------------------------------------|
| Common     | Low        | Weak evolution lines (e.g., Rattata, Pidgey)  |
| Uncommon   | Medium     | Moderate evolution lines (e.g., Machop, Abra) |
| Rare       | High       | Strong evolution lines (e.g., Dratini, Larvitar) |
| Legendary  | Very High  | Legendary/pseudo-legendary Pokémon (e.g., Beldum) |

- Each box yields **3 random base-form Pokémon** from the corresponding pool
- Stronger boxes contain Pokémon with stronger final evolutions

## Battles

### Challenge

Any player can challenge any other player at any time.

### Team Selection

Each player selects a team of **3 Pokémon** from their collection for the battle.

### Battle Flow (Auto, Simultaneous Rounds)

1. Both players pick their team of 3 — no further player input is required
2. The battle proceeds in **rounds**. Each round, all living Pokémon act once
3. Within a round, Pokémon act in **Speed order** (ties broken randomly)
4. On its turn, each Pokémon automatically:
   - Picks one of its 2 moves **at random**
   - Picks a **random target**:
     - Offensive moves → random living opponent
     - Buff/support moves → random living ally (or self)
   - If the chosen target has fainted before the Pokémon's turn, it **retargets** to another random valid target
5. Damage calculation uses the standard Pokémon formula:
   - Uses Attack/Sp. Atk vs Defense/Sp. Def based on move category
   - Applies type effectiveness multipliers (standard type chart)
   - Includes a small random factor (85%–100%)
6. Support moves follow existing Pokémon move effects (stat boosts, heals, shields, etc. — details TBD)
7. When a Pokémon faints (HP ≤ 0), it is removed from the round
8. The battle ends when one side has no Pokémon remaining

### Rewards

- The winner gains essence; the loser loses essence
- The net essence across both players is **always positive** (new essence is generated per battle)
- Reward amount scales with the strength of the teams involved

## Trading

- Any two players can agree to trade Pokémon at any time
- Trades are 1-for-1 Pokémon swaps
- Both players must confirm the trade on their devices

## Releasing

- A player can release any Pokémon from their collection
- Releasing a Pokémon grants essence based on its rarity tier and evolution stage
- Evolved Pokémon are worth more than base forms

## TV Screen

The TV displays a shared dashboard visible to all partygoers:

- **Leaderboard**: players ranked by total essence
- **Collection stats**: number of unique Pokémon per player
- **Recent activity feed**: recent battles (winner/loser), trades, evolutions
- **Rarest Pokémon**: highlights the rarest Pokémon currently owned

## Mobile Interface (per player)

- **My Collection**: view owned Pokémon, stats, and moves
- **Expansion Shop**: buy boxes with essence
- **Battle**: challenge another player, pick a team
- **Trade**: initiate or accept a trade
- **Evolve/Release**: combine 4 copies to evolve, or release for essence
