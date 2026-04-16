# Tournament System Design

## Format
Single elimination bracket. Admin creates tournament, players join during registration window, then bracket is generated and matches proceed round by round with time limits.

## Lifecycle
1. **Created** — Admin creates tournament with rules (fieldSize, totalPokemon, registration deadline)
2. **Registration** — Players join via Tournaments menu. Notification broadcast on creation.
3. **Active** — Registration closes, bracket generated (random seeding, byes for non-power-of-2). Round 1 starts.
4. **Round N** — Each match has a time limit. Players get notified. If a player doesn't show, opponent advances (forfeit). When all matches in round finish, next round starts.
5. **Completed** — Final match done. Winner announced. Rewards distributed.

## Data Model

### Tournament (server state + DB)
```typescript
interface Tournament {
  id: string;
  name: string;
  fieldSize: 1 | 2 | 3;
  totalPokemon: number;
  status: 'registration' | 'active' | 'completed';
  registrationEnd: number; // Unix timestamp
  matchTimeLimit: number;  // seconds per match (time to submit team)
  participants: string[];  // player names
  bracket: TournamentMatch[];
  currentRound: number;
  winner?: string;
  createdAt: number;
}

interface TournamentMatch {
  id: string;
  round: number;
  position: number; // position in bracket
  player1: string | null; // null = TBD (waiting for previous round)
  player2: string | null; // null = bye
  winner: string | null;
  status: 'pending' | 'active' | 'completed' | 'forfeit';
  deadline?: number; // Unix timestamp
  battleId?: string; // links to ActiveBattle
}
```

### DB Table
```sql
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  field_size INTEGER NOT NULL DEFAULT 1,
  total_pokemon INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'registration',
  registration_end INTEGER NOT NULL,
  match_time_limit INTEGER NOT NULL DEFAULT 300,
  bracket TEXT NOT NULL DEFAULT '[]', -- JSON
  participants TEXT NOT NULL DEFAULT '[]', -- JSON
  current_round INTEGER NOT NULL DEFAULT 0,
  winner TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Socket Events

### Server → Client
- `tournament:created` — New tournament announced (all connected players)
- `tournament:updated` — Tournament state changed (participants, bracket, status)
- `tournament:matchReady` — Your match is ready, go fight! (targeted to match players)
- `tournament:matchResult` — Match result (to spectators/participants)

### Client → Server
- `tournament:join` — Join a tournament during registration
- `tournament:leave` — Leave during registration

## Admin API
- `POST /api/admin/tournament/create` — Create tournament
- `POST /api/admin/tournament/:id/start` — Force-start (close registration early)
- `POST /api/admin/tournament/:id/cancel` — Cancel tournament

## Public API
- `GET /api/tournaments` — List active/upcoming tournaments
- `GET /api/tournament/:id` — Get tournament details + bracket

## Client Pages
- Tournaments menu item in main menu
- Tournament list (upcoming + active)
- Tournament detail view with bracket visualization
- Re-use existing team select + battle scene for matches

## Bracket Generation
- Shuffle participants randomly
- If count is not power of 2, add byes in round 1
- Standard single-elimination tree

## Match Flow
1. Round starts → matches created with deadline
2. Both players notified via socket
3. Players navigate to tournament → see their match → select team (reuses battle:selectTeam)
4. If both submit within time → battle simulated, winner advances
5. If one doesn't submit → forfeit, opponent advances
6. When all round matches complete → next round starts automatically

## Rewards
- Winner: Large essence reward + rare/epic/legendary pack
- Runner-up: Medium essence reward
- Participation: Small essence reward
