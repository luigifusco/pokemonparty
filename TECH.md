# Pokémon Party Game — Technology Stack

## Overview

The game is a real-time multiplayer webapp. Players use their phones to interact, and a TV screen shows a shared leaderboard/stats dashboard. All communication is real-time via WebSockets.

## Stack

| Layer          | Technology                     |
|----------------|--------------------------------|
| Frontend       | React + TypeScript (Vite)      |
| Backend        | Node.js + Express + TypeScript |
| Real-time      | Socket.IO                      |
| Database       | SQLite (via better-sqlite3)    |
| Structure      | Separate `client/` and `server/` packages, `shared/` for common types |

## Project Structure

```
pokemon/
├── assets/              # Gen 3 sprites
├── shared/              # Shared TypeScript types & static data
│   ├── types.ts         # Interfaces (Pokemon, Move, Player, etc.)
│   └── data/            # Static JSON (pokemon stats, moves, type chart)
├── server/              # Express + Socket.IO backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts     # Entry point, Express + Socket.IO setup
│       ├── db.ts        # SQLite setup & queries
│       ├── game.ts      # Game logic (battles, essence, evolution)
│       ├── battle.ts    # Battle simulation engine
│       └── routes.ts    # REST endpoints (if needed)
├── client/              # React + Vite frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx          # Entry point
│       ├── App.tsx           # Router (mobile vs TV view)
│       ├── socket.ts         # Socket.IO client setup
│       ├── pages/
│       │   ├── PlayerView.tsx    # Mobile: collection, shop, battle, trade
│       │   └── TVView.tsx        # TV: leaderboard, activity feed
│       └── components/       # Reusable UI components
├── DESIGN.md
├── TECH.md              # (this file)
├── init.md
└── README.md
```

## Frontend Details

- **Vite** for fast dev server and builds
- **React Router** for switching between mobile player view and TV view
- **Socket.IO client** for real-time updates
- Sprites served from `assets/` directory
- Single app with two entry views:
  - `/play` — mobile player interface
  - `/tv` — TV dashboard (no interaction, display only)

## Backend Details

- **Express** serves the REST API and static files
- **Socket.IO** handles real-time events:
  - Player join/leave
  - Battle challenge, team selection, battle results
  - Trade requests, confirmations
  - Evolution/release actions
  - Leaderboard updates → TV
- **better-sqlite3** for synchronous, lightweight SQLite access
- Game state persisted to SQLite (survives server restarts)

## Database Schema (SQLite)

```sql
-- Players
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  essence INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Owned Pokémon instances
CREATE TABLE owned_pokemon (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  pokemon_id INTEGER NOT NULL,  -- references static pokemon data
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Battle log
CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  winner_id TEXT REFERENCES players(id),
  loser_id TEXT REFERENCES players(id),
  essence_gained INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Trade log
CREATE TABLE trades (
  id TEXT PRIMARY KEY,
  player1_id TEXT REFERENCES players(id),
  player2_id TEXT REFERENCES players(id),
  pokemon1_id TEXT REFERENCES owned_pokemon(id),
  pokemon2_id TEXT REFERENCES owned_pokemon(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Shared Data

Static Pokémon data lives in `shared/data/` as JSON:

- **pokemon.json** — All Gen 1–3 Pokémon: id, name, types, base stats, evolution chain, tier
- **moves.json** — All moves used in the game: id, name, type, category, power, accuracy, effect
- **type-chart.json** — Type effectiveness multipliers (18×18 matrix)
- **boxes.json** — Expansion box definitions: tier, cost, eligible Pokémon pools

## Real-time Events (Socket.IO)

| Event                | Direction       | Description                          |
|----------------------|-----------------|--------------------------------------|
| `player:join`        | Client → Server | Player joins the game                |
| `player:update`      | Server → Client | Player state changed                 |
| `battle:challenge`   | Client → Server | Challenge another player             |
| `battle:accept`      | Client → Server | Accept a challenge                   |
| `battle:result`      | Server → All    | Battle outcome (broadcast)           |
| `trade:offer`        | Client → Server | Propose a trade                      |
| `trade:accept`       | Client → Server | Accept a trade                       |
| `trade:complete`     | Server → Both   | Trade finalized                      |
| `box:open`           | Client → Server | Buy and open an expansion box        |
| `box:result`         | Server → Client | Pokémon received from box            |
| `evolve`             | Client → Server | Combine 4 Pokémon to evolve          |
| `release`            | Client → Server | Release a Pokémon for essence        |
| `leaderboard:update` | Server → TV     | Updated leaderboard data             |
| `activity:new`       | Server → TV     | New activity for the feed            |
