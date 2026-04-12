# API Reference

## REST Endpoints

All routes are prefixed with `BASE_PATH` (default: `/pokemonparty`).

### Authentication

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/register` | `{ name }` | `{ player }` |
| POST | `/api/login` | `{ name }` | `{ player, pokemon, items }` |

### Player Data

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/player/:id` | — | `{ player, pokemon, items }` |
| POST | `/api/player/:id/essence` | `{ essence }` | `{ ok }` |

### Collection

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/player/:id/pokemon` | `{ pokemonIds: number[] }` | `{ ok, pokemon }` |
| POST | `/api/player/:id/pokemon/remove` | `{ pokemonId, count }` | `{ ok, removed }` |
| POST | `/api/player/:id/pokemon/evolve` | `{ instanceId, newPokemonId }` | `{ ok }` |
| POST | `/api/player/:id/pokemon/teach-tm` | `{ instanceId, moveName, moveSlot }` | `{ ok }` |
| POST | `/api/player/:id/pokemon/use-boost` | `{ instanceId, stat }` | `{ ok }` |

### Items

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/player/:id/items` | `{ items: [{itemType, itemData}] }` | `{ ok, items }` |
| POST | `/api/player/:id/items/remove` | `{ itemType, itemData, count }` | `{ ok, removed }` |

### Battle & Leaderboard

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/battle/simulate` | `{ leftTeam: number[], rightTeam: number[] }` | `{ snapshot }` |
| GET | `/api/leaderboard` | — | `{ players: [{name, elo, essence, topPokemon}] }` |

### Settings

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/settings/rarity-weights` | — | `{ common, uncommon, rare, epic, legendary }` |

### Admin

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/admin/players` | — | `{ players }` |
| GET | `/api/admin/stats` | — | `{ playerCount, pokemonCount, battleCount, itemCount }` |
| GET | `/api/admin/settings` | — | `{ rarity_weights, ... }` |
| PUT | `/api/admin/settings` | `{ key, value }` | `{ ok }` |
| POST | `/api/admin/player/:id/set-essence` | `{ essence }` | `{ ok }` |
| POST | `/api/admin/player/:id/set-elo` | `{ elo }` | `{ ok }` |
| POST | `/api/admin/player/:id/wipe-pokemon` | — | `{ ok }` |
| POST | `/api/admin/player/:id/delete` | — | `{ ok }` |
| POST | `/api/admin/wipe-all-pokemon` | — | `{ ok }` |

## Socket.IO Events

Socket.IO path: `{BASE_PATH}/socket.io`

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `player:identify` | `playerName` | Associate socket with player name |
| `battle:challenge` | `targetName` | Challenge another player (mutual = auto-match) |
| `battle:cancel` | — | Cancel pending challenge |
| `battle:selectTeam` | `pokemonIds: number[]` | Submit 3-Pokémon team for matched battle |
| `trade:offer` | `{ to, pokemonInstanceId }` | Offer a trade |
| `trade:accept` | `{ from, pokemonInstanceId }` | Accept with own Pokémon |
| `trade:cancel` | — | Cancel pending trade |
| `draft:challenge` | `targetName` | Challenge for draft battle |
| `draft:cancel` | — | Cancel draft challenge |
| `draft:pick` | `pokemonId` | Pick a Pokémon during draft phase |
| `draft:selectTeam` | `pokemonIds: number[]` | Submit team after draft |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `battle:matched` | `{ battleId, opponent }` | Both players challenged each other |
| `battle:start` | `{ snapshot, eloUpdate }` | Battle result with full snapshot |
| `battle:cancelled` | — | Opponent cancelled |
| `trade:incoming` | `{ from, pokemonId }` | Trade offer received |
| `trade:completed` | `{ yourNew, theirOld }` | Trade executed |
| `trade:cancelled` | — | Trade cancelled |
| `draft:matched` | `{ battleId, opponent }` | Draft battle matched |
| `draft:update` | `draftState` | Draft state update (pool, picks, turn) |
| `draft:battle` | `{ snapshot, eloUpdate }` | Draft battle result |

## Key Types (from `shared/`)

```typescript
interface BattleSnapshot {
  left: BattlePokemonState[];     // Player's team
  right: BattlePokemonState[];    // Opponent's team
  log: BattleLogEntry[];          // Turn-by-turn battle log
  winner: 'left' | 'right' | 'draw';
}

interface BattlePokemonState {
  instanceId: string;
  name: string;
  types: string[];
  maxHp: number;
  currentHp: number;
  speed: number;
  spriteUrl: string;
  fainted: boolean;
}

interface PokemonInstance {
  instanceId: string;
  pokemon: Pokemon;
  nature: NatureName;
  ivs: IVs;
  learnedMoves?: [MoveId, MoveId];
}

interface EloUpdate {
  winnerOldElo: number;
  winnerNewElo: number;
  loserOldElo: number;
  loserNewElo: number;
}
```
