# Architecture

## Tech Stack

- **Frontend:** React 18 + TypeScript, Vite, React Router v6
- **Backend:** Express + TypeScript (run via `tsx`), Socket.IO 4.7
- **Database:** SQLite via `better-sqlite3` (WAL mode)
- **Battle math:** `@smogon/calc` (Gen 4 damage formula, git submodule at `damage-calc/`)
- **Deployment:** Docker (single container serves API + static files)

## Data Flow

```
┌─────────────────────────────────────────────────┐
│  Browser (React SPA)                            │
│  ├── REST (fetch)  → /api/*    → Express routes │
│  └── WebSocket     → socket.io → Socket.IO      │
└─────────────────────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │  Express Server    │
              │  ├── REST API      │
              │  ├── Socket.IO     │
              │  ├── Battle engine │
              │  └── Static files  │
              └─────────┬──────────┘
                        │
                   SQLite (game.db)
```

- **REST API** handles: registration, login, player data, collection CRUD, leaderboard, AI battle simulation.
- **Socket.IO** handles: real-time PvP challenges, team selection, battle resolution, trading, draft mode.
- **Battle engine** runs entirely server-side using `@smogon/calc` for damage. Both players get the same `BattleSnapshot` (flipped so each sees themselves on the left).

## Client Architecture

**Routing** (React Router, all under configurable `BASE_PATH`):

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/play` | MenuScreen | ✓ | Homepage: name, essence, elo, nav buttons |
| `/collection` | CollectionScreen | ✓ | View/evolve/shard owned Pokémon |
| `/pokemon/:idx` | PokemonDetailScreen | ✓ | Individual Pokémon stats |
| `/pokedex` | PokedexScreen | ✓ | Browse all species |
| `/store` | StoreScreen | ✓ | Buy expansion boxes |
| `/shop` | ShopScreen | ✓ | Buy items (TMs, boosts) |
| `/items` | ItemsScreen | ✓ | Use TMs and boost items |
| `/trade` | TradeScreen | ✓ | 1-for-1 Pokémon trades via Socket.IO |
| `/battle` | BattleMultiplayer | ✓ | PvP battle (Socket.IO) |
| `/battle-demo` | BattleDemo | ✓ | AI battle (HTTP) |
| `/draft` | DraftMultiplayer | ✓ | PvP draft battle (Socket.IO) |
| `/draft-demo` | DraftBattle | ✓ | AI draft battle (HTTP) |
| `/tv` | TVView | ✗ | Public leaderboard for TV display |
| `*` | LoginScreen | ✗ | Register/login by name |

**State management:** All game state (player, essence, elo, collection, items) lives in `App.tsx` and is passed as props. No external state library.

**Key client files:**
- `config.ts` — exports `BASE_PATH` from Vite's `import.meta.env.BASE_URL`
- `api.ts` — all REST calls (essence sync, collection CRUD, evolve, teach TM, boost)
- `socket.ts` — Socket.IO client singleton
- `components/BattleScene.tsx` — animated battle playback from a `BattleSnapshot`
- `components/BattleAnimationEngine.ts` — DOM-based move animation (projectile, beam, contact, AoE)

## Server Architecture

Single file (`server/src/index.ts`, ~1200 lines) containing:

1. **Battle engine** (~550 lines): `simulateBattleFromIds()` — full Gen 4 battle simulation using `@smogon/calc`. Handles speed tiers, move selection, type effectiveness, STAB, secondary effects, status conditions, multi-hit moves.
2. **REST API** (~250 lines): 13 endpoints for player/collection/item CRUD.
3. **Socket.IO events** (~400 lines): PvP challenges, team selection, battle resolution, trading, draft mode.
4. **Static serving**: In production, serves `client/dist/` with SPA fallback.

## Database Schema

Six tables in SQLite (`data/game.db`):

```sql
players           (id, name, essence, elo, created_at)
owned_pokemon     (id, player_id, pokemon_id, nature, iv_hp..iv_spe, move_1, move_2, created_at)
owned_items       (id, player_id, item_type, item_data, created_at)
battles           (id, winner_id, loser_id, essence_gained, winner_elo_delta, loser_elo_delta, created_at)
battle_pokemon_usage  (player_id, pokemon_id, times_used)  -- PRIMARY KEY (player_id, pokemon_id)
trades            (id, player1_id, player2_id, pokemon1_id, pokemon2_id, created_at)
```

`db.ts` handles schema creation and migrations (adds columns for IVs, natures, moves, elo retroactively).

## Shared Module (`shared/`)

TypeScript files imported by both client and server:

| File | Contents |
|------|----------|
| `types.ts` | `Pokemon`, `PokemonInstance`, `OwnedItem`, `Stats`, `IVs`, `NatureName` |
| `battle-types.ts` | `BattleSnapshot`, `BattlePokemonState`, `BattleLogEntry`, `EloUpdate` |
| `pokemon-data.ts` | All 386 Pokémon (Gen 1–3) with stats, types, moves, evolution chains |
| `move-data.ts` | Move metadata: power, accuracy, type, category, secondary effects |
| `type-chart.ts` | Type effectiveness matrix |
| `natures.ts` | 25 natures with stat multipliers, `randomNature()`, `randomIVs()` |
| `essence.ts` | Tier strength values, `calculateBattleEssence()`, box costs |
| `elo.ts` | ELO calculation (K=32, starting 1000) |
| `boxes.ts` | Expansion box definitions (which Pokémon in each tier) |
| `boost-data.ts` | IV boost constants (`MAX_IV = 31`) |
| `shop-data.ts` | Shop item definitions |
| `species-data.ts` | Species metadata |
| `move-info.ts` | Extended move information |
