import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { initDb } from './db.js';
import { STARTING_ESSENCE, BOX_COSTS } from '../../shared/essence.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());

const db = initDb();

// --- REST API ---

// Register a new player
app.post('/api/register', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const trimmed = name.trim();
  const existing = db.prepare('SELECT id FROM players WHERE name = ?').get(trimmed);
  if (existing) {
    return res.status(409).json({ error: 'Name already taken' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO players (id, name, essence) VALUES (?, ?, ?)').run(id, trimmed, STARTING_ESSENCE);

  const player = db.prepare('SELECT id, name, essence FROM players WHERE id = ?').get(id);
  return res.json({ player });
});

// Login (just look up by name)
app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const player = db.prepare('SELECT id, name, essence FROM players WHERE name = ?').get(name.trim()) as any;
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // Also fetch their pokemon collection
  const pokemon = db.prepare('SELECT id, pokemon_id FROM owned_pokemon WHERE player_id = ?').all(player.id);
  return res.json({ player, pokemon });
});

// Get player data
app.get('/api/player/:id', (req, res) => {
  const player = db.prepare('SELECT id, name, essence FROM players WHERE id = ?').get(req.params.id) as any;
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const pokemon = db.prepare('SELECT id, pokemon_id FROM owned_pokemon WHERE player_id = ?').all(player.id);
  return res.json({ player, pokemon });
});

// Update player essence
app.post('/api/player/:id/essence', (req, res) => {
  const { essence } = req.body;
  if (typeof essence !== 'number') return res.status(400).json({ error: 'Invalid essence' });
  db.prepare('UPDATE players SET essence = ? WHERE id = ?').run(essence, req.params.id);
  return res.json({ ok: true });
});

// Add pokemon to player collection
app.post('/api/player/:id/pokemon', (req, res) => {
  const { pokemonIds } = req.body;
  if (!Array.isArray(pokemonIds)) return res.status(400).json({ error: 'Invalid pokemonIds' });

  const insert = db.prepare('INSERT INTO owned_pokemon (id, player_id, pokemon_id) VALUES (?, ?, ?)');
  for (const pid of pokemonIds) {
    insert.run(uuidv4(), req.params.id, pid);
  }
  return res.json({ ok: true });
});

// Remove pokemon from player collection (by pokemon_id, removes N copies)
app.post('/api/player/:id/pokemon/remove', (req, res) => {
  const { pokemonId, count } = req.body;
  if (typeof pokemonId !== 'number' || typeof count !== 'number') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const rows = db.prepare(
    'SELECT id FROM owned_pokemon WHERE player_id = ? AND pokemon_id = ? LIMIT ?'
  ).all(req.params.id, pokemonId, count) as any[];

  const del = db.prepare('DELETE FROM owned_pokemon WHERE id = ?');
  for (const row of rows) {
    del.run(row.id);
  }
  return res.json({ ok: true, removed: rows.length });
});

// --- Socket.IO: Battle matching ---

// Track challenges: Map<challengerName, targetName>
const pendingChallenges = new Map<string, string>();
// Track connected players: Map<playerName, socketId>
const connectedPlayers = new Map<string, string>();
// Track active battles: Map<battleId, battle state>
interface ActiveBattle {
  id: string;
  player1: string;
  player2: string;
  player1Team: number[] | null;
  player2Team: number[] | null;
}
const activeBattles = new Map<string, ActiveBattle>();

// Trade state
const pendingTrades = new Map<string, string>(); // initiator -> target
interface ActiveTrade {
  id: string;
  player1: string;
  player2: string;
  player1Pokemon: number | null;
  player2Pokemon: number | null;
  player1Confirmed: boolean;
  player2Confirmed: boolean;
}
const activeTrades = new Map<string, ActiveTrade>();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let playerName: string | null = null;

  socket.on('player:identify', (name: string) => {
    playerName = name;
    connectedPlayers.set(name, socket.id);
    console.log(`Player identified: ${name}`);
  });

  socket.on('battle:challenge', (targetName: string) => {
    if (!playerName) return;
    pendingChallenges.set(playerName, targetName);
    console.log(`${playerName} challenges ${targetName}`);

    // Check if there's a mutual challenge
    const otherChallenge = pendingChallenges.get(targetName);
    if (otherChallenge === playerName) {
      // Match found!
      pendingChallenges.delete(playerName);
      pendingChallenges.delete(targetName);

      const battleId = uuidv4();
      const battle: ActiveBattle = {
        id: battleId,
        player1: playerName,
        player2: targetName,
        player1Team: null,
        player2Team: null,
      };
      activeBattles.set(battleId, battle);

      // Notify both players
      const socket1 = connectedPlayers.get(playerName);
      const socket2 = connectedPlayers.get(targetName);
      if (socket1) io.to(socket1).emit('battle:matched', { battleId, opponent: targetName });
      if (socket2) io.to(socket2).emit('battle:matched', { battleId, opponent: playerName });
      console.log(`Battle matched: ${playerName} vs ${targetName} (${battleId})`);
    } else {
      // Notify challenger they're waiting
      socket.emit('battle:waiting', { target: targetName });
      // Notify target they've been challenged
      const targetSocket = connectedPlayers.get(targetName);
      if (targetSocket) io.to(targetSocket).emit('battle:challenged', { challenger: playerName });
    }
  });

  socket.on('battle:cancel', () => {
    if (!playerName) return;
    pendingChallenges.delete(playerName);
    socket.emit('battle:cancelled');
  });

  socket.on('battle:selectTeam', ({ battleId, team }: { battleId: string; team: number[] }) => {
    if (!playerName) return;
    const battle = activeBattles.get(battleId);
    if (!battle) return;

    if (battle.player1 === playerName) battle.player1Team = team;
    else if (battle.player2 === playerName) battle.player2Team = team;

    // Check if both teams are selected
    if (battle.player1Team && battle.player2Team) {
      const socket1 = connectedPlayers.get(battle.player1);
      const socket2 = connectedPlayers.get(battle.player2);

      const battleData = {
        battleId,
        player1: battle.player1,
        player2: battle.player2,
        player1Team: battle.player1Team,
        player2Team: battle.player2Team,
      };

      if (socket1) io.to(socket1).emit('battle:start', battleData);
      if (socket2) io.to(socket2).emit('battle:start', battleData);
      console.log(`Battle starting: ${battle.player1} vs ${battle.player2}`);
      activeBattles.delete(battleId);
    } else {
      socket.emit('battle:waitingForOpponent');
    }
  });

  // --- Trade events ---

  socket.on('trade:request', (targetName: string) => {
    if (!playerName) return;
    pendingTrades.set(playerName, targetName);
    console.log(`${playerName} wants to trade with ${targetName}`);

    const otherRequest = pendingTrades.get(targetName);
    if (otherRequest === playerName) {
      pendingTrades.delete(playerName);
      pendingTrades.delete(targetName);

      const tradeId = uuidv4();
      const trade: ActiveTrade = {
        id: tradeId,
        player1: playerName,
        player2: targetName,
        player1Pokemon: null,
        player2Pokemon: null,
        player1Confirmed: false,
        player2Confirmed: false,
      };
      activeTrades.set(tradeId, trade);

      const socket1 = connectedPlayers.get(playerName);
      const socket2 = connectedPlayers.get(targetName);
      if (socket1) io.to(socket1).emit('trade:matched', { tradeId, partner: targetName });
      if (socket2) io.to(socket2).emit('trade:matched', { tradeId, partner: playerName });
      console.log(`Trade matched: ${playerName} <-> ${targetName} (${tradeId})`);
    } else {
      socket.emit('trade:waiting', { target: targetName });
      const targetSocket = connectedPlayers.get(targetName);
      if (targetSocket) io.to(targetSocket).emit('trade:incoming', { from: playerName });
    }
  });

  socket.on('trade:cancel', () => {
    if (!playerName) return;
    pendingTrades.delete(playerName);
    socket.emit('trade:cancelled');
  });

  socket.on('trade:selectPokemon', ({ tradeId, pokemonId }: { tradeId: string; pokemonId: number }) => {
    if (!playerName) return;
    const trade = activeTrades.get(tradeId);
    if (!trade) return;

    if (trade.player1 === playerName) {
      trade.player1Pokemon = pokemonId;
      trade.player1Confirmed = false;
    } else if (trade.player2 === playerName) {
      trade.player2Pokemon = pokemonId;
      trade.player2Confirmed = false;
    }

    // Notify both when both have selected
    if (trade.player1Pokemon !== null && trade.player2Pokemon !== null) {
      const socket1 = connectedPlayers.get(trade.player1);
      const socket2 = connectedPlayers.get(trade.player2);
      const data = {
        tradeId,
        player1Pokemon: trade.player1Pokemon,
        player2Pokemon: trade.player2Pokemon,
      };
      if (socket1) io.to(socket1).emit('trade:bothSelected', data);
      if (socket2) io.to(socket2).emit('trade:bothSelected', data);
    } else {
      socket.emit('trade:waitingForPartner');
    }
  });

  socket.on('trade:confirm', ({ tradeId }: { tradeId: string }) => {
    if (!playerName) return;
    const trade = activeTrades.get(tradeId);
    if (!trade) return;

    if (trade.player1 === playerName) trade.player1Confirmed = true;
    else if (trade.player2 === playerName) trade.player2Confirmed = true;

    if (trade.player1Confirmed && trade.player2Confirmed) {
      const socket1 = connectedPlayers.get(trade.player1);
      const socket2 = connectedPlayers.get(trade.player2);
      const data = {
        tradeId,
        player1: trade.player1,
        player2: trade.player2,
        player1Pokemon: trade.player1Pokemon,
        player2Pokemon: trade.player2Pokemon,
      };
      if (socket1) io.to(socket1).emit('trade:execute', data);
      if (socket2) io.to(socket2).emit('trade:execute', data);
      activeTrades.delete(tradeId);
      console.log(`Trade executed: ${trade.player1} <-> ${trade.player2}`);
    } else {
      socket.emit('trade:waitingConfirm');
    }
  });

  socket.on('disconnect', () => {
    if (playerName) {
      connectedPlayers.delete(playerName);
      pendingChallenges.delete(playerName);
      pendingTrades.delete(playerName);
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
