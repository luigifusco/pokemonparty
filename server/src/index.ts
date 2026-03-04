import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { initDb } from './db.js';
import { STARTING_ESSENCE, BOX_COSTS } from '../../shared/essence.js';
import { STARTING_ELO, calculateEloChanges } from '../../shared/elo.js';
import { POKEMON_BY_ID } from '../../shared/pokemon-data.js';
import { MOVE_NAMES } from '../../shared/move-names.js';
import type { BattleSnapshot, BattlePokemonState, BattleLogEntry } from '../../shared/battle-types.js';
import type { Pokemon as AppPokemon } from '../../shared/types.js';
import {
  calculate as calcDamage,
  Pokemon as CalcPokemon,
  Move as CalcMove,
  Generations,
  toID,
} from '../../damage-calc/calc/dist/index.js';

const GEN = 4;
const BATTLE_LEVEL = 50;
const calcGen = Generations.get(GEN);
const ZERO_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());

const db = initDb();

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  const typeData = calcGen.types.get(toID(moveType));
  if (!typeData) return 1;
  let mult = 1;
  for (const t of defenderTypes) {
    mult *= (typeData.effectiveness as Record<string, number>)[capitalize(t)] ?? 1;
  }
  return mult;
}

function effectivenessLabel(e: number): 'super' | 'neutral' | 'not-very' | 'immune' {
  if (e === 0) return 'immune';
  if (e > 1) return 'super';
  if (e < 1) return 'not-very';
  return 'neutral';
}

function makeCalcPokemon(p: AppPokemon, curHP?: number): CalcPokemon {
  return new CalcPokemon(GEN, p.name, {
    level: BATTLE_LEVEL,
    evs: ZERO_EVS,
    nature: 'Serious',
    curHP,
  });
}

function simulateBattleFromIds(leftIds: number[], rightIds: number[]): BattleSnapshot {
  const leftPokemon = leftIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean);
  const rightPokemon = rightIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean);

  // Compute real stats via damage-calc for HP and speed
  const calcInstances: Record<string, CalcPokemon> = {};
  const buildEntry = (p: AppPokemon, instanceId: string) => {
    const cp = makeCalcPokemon(p);
    calcInstances[instanceId] = cp;
    return cp;
  };

  const left: BattlePokemonState[] = leftPokemon.map((p, i) => {
    const cp = buildEntry(p, `l${i}`);
    return {
      instanceId: `l${i}`, name: p.name, sprite: p.sprite, types: p.types,
      currentHp: cp.maxHP(), maxHp: cp.maxHP(), side: 'left' as const,
    };
  });
  const right: BattlePokemonState[] = rightPokemon.map((p, i) => {
    const cp = buildEntry(p, `r${i}`);
    return {
      instanceId: `r${i}`, name: p.name, sprite: p.sprite, types: p.types,
      currentHp: cp.maxHP(), maxHp: cp.maxHP(), side: 'right' as const,
    };
  });

  const hp: Record<string, number> = {};
  for (const p of [...left, ...right]) hp[p.instanceId] = p.maxHp;

  const allPokemon = [
    ...leftPokemon.map((p, i) => ({ ...p, instanceId: `l${i}`, side: 'left' as const })),
    ...rightPokemon.map((p, i) => ({ ...p, instanceId: `r${i}`, side: 'right' as const })),
  ];

  const log: BattleLogEntry[] = [];
  let round = 0;

  while (round < 50) {
    const alive = allPokemon.filter((p) => hp[p.instanceId] > 0);
    const leftAlive = alive.filter((p) => p.side === 'left');
    const rightAlive = alive.filter((p) => p.side === 'right');
    if (leftAlive.length === 0 || rightAlive.length === 0) break;

    round++;
    // Sort by damage-calc computed speed stat
    const sorted = [...alive].sort((a, b) => {
      const spdA = calcInstances[a.instanceId].rawStats.spe;
      const spdB = calcInstances[b.instanceId].rawStats.spe;
      if (spdB !== spdA) return spdB - spdA;
      return Math.random() - 0.5;
    });

    for (const attacker of sorted) {
      if (hp[attacker.instanceId] <= 0) continue;
      const opponents = allPokemon.filter((p) => p.side !== attacker.side && hp[p.instanceId] > 0);
      if (opponents.length === 0) continue;

      const target = opponents[Math.floor(Math.random() * opponents.length)];

      // Pick a random move from the Pokémon's two moves
      const moveId = attacker.moves[Math.floor(Math.random() * attacker.moves.length)];
      const moveName = MOVE_NAMES[moveId] || 'Tackle';

      // Create fresh calc objects with current HP
      const atkCalc = makeCalcPokemon(attacker, hp[attacker.instanceId]);
      const defCalc = makeCalcPokemon(target, hp[target.instanceId]);
      const moveCalc = new CalcMove(GEN, moveName);

      const result = calcDamage(GEN, atkCalc, defCalc, moveCalc);
      const [minDmg, maxDmg] = result.range();

      // Pick a random roll between min and max
      let damage: number;
      if (Array.isArray(result.damage) && (result.damage as number[]).length === 16) {
        // Standard 16 damage rolls — pick one at random
        const rolls = result.damage as number[];
        damage = rolls[Math.floor(Math.random() * rolls.length)];
      } else {
        damage = minDmg + Math.floor(Math.random() * (maxDmg - minDmg + 1));
      }

      const moveType = moveCalc.type;
      const effectiveness = getTypeEffectiveness(
        moveType, target.types
      );

      hp[target.instanceId] = Math.max(0, hp[target.instanceId] - damage);
      const fainted = hp[target.instanceId] <= 0;

      let message = `${attacker.name} used ${moveName} on ${target.name}!`;
      if (damage === 0 && effectiveness === 0) {
        message += ` It had no effect...`;
      } else if (damage === 0) {
        message += ` It missed!`;
      } else {
        if (effectiveness > 1) message += ` It's super effective!`;
        else if (effectiveness < 1 && effectiveness > 0) message += ` It's not very effective...`;
        message += ` (${damage} dmg)`;
      }
      if (fainted) message += ` ${target.name} fainted!`;

      log.push({
        round,
        attackerInstanceId: attacker.instanceId,
        attackerName: attacker.name,
        moveName,
        targetInstanceId: target.instanceId,
        targetName: target.name,
        damage,
        effectiveness: effectivenessLabel(effectiveness),
        targetFainted: fainted,
        message,
      });
    }
  }

  // Update snapshot HP from simulation state
  for (const p of left) p.currentHp = hp[p.instanceId];
  for (const p of right) p.currentHp = hp[p.instanceId];

  const leftHp = left.reduce((s, p) => s + p.currentHp, 0);
  const rightHp = right.reduce((s, p) => s + p.currentHp, 0);
  let winner: 'left' | 'right' | null = null;
  if (leftHp > 0 && rightHp <= 0) winner = 'left';
  else if (rightHp > 0 && leftHp <= 0) winner = 'right';
  else winner = leftHp >= rightHp ? 'left' : 'right';

  return { left, right, log, winner, round };
}

function flipSnapshot(snapshot: BattleSnapshot): BattleSnapshot {
  const flipSide = (s: 'left' | 'right') => s === 'left' ? 'right' : 'left';
  return {
    left: snapshot.right.map((p) => ({ ...p, side: 'left' as const })),
    right: snapshot.left.map((p) => ({ ...p, side: 'right' as const })),
    log: snapshot.log.map((e) => ({ ...e })),
    winner: snapshot.winner ? flipSide(snapshot.winner) : null,
    round: snapshot.round,
  };
}

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
  db.prepare('INSERT INTO players (id, name, essence, elo) VALUES (?, ?, ?, ?)').run(id, trimmed, STARTING_ESSENCE, STARTING_ELO);

  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE id = ?').get(id);
  return res.json({ player });
});

// Login (just look up by name)
app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE name = ?').get(name.trim()) as any;
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // Also fetch their pokemon collection
  const pokemon = db.prepare('SELECT id, pokemon_id FROM owned_pokemon WHERE player_id = ?').all(player.id);
  return res.json({ player, pokemon });
});

// Get player data
app.get('/api/player/:id', (req, res) => {
  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE id = ?').get(req.params.id) as any;
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

// Get leaderboard (ranked by Elo)
app.get('/api/leaderboard', (_req, res) => {
  const players = db.prepare('SELECT id, name, elo, essence FROM players ORDER BY elo DESC').all() as any[];
  const topPokemonStmt = db.prepare(
    'SELECT pokemon_id FROM battle_pokemon_usage WHERE player_id = ? ORDER BY times_used DESC LIMIT 3'
  );
  const result = players.map((p: any) => ({
    name: p.name,
    elo: p.elo,
    essence: p.essence,
    topPokemon: (topPokemonStmt.all(p.id) as any[]).map((r: any) => r.pokemon_id),
  }));
  return res.json({ players: result });
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

      // Simulate battle on server so both players see the same result
      const snapshot = simulateBattleFromIds(battle.player1Team, battle.player2Team);

      const battleDataP1 = {
        battleId,
        player1: battle.player1,
        player2: battle.player2,
        player1Team: battle.player1Team,
        player2Team: battle.player2Team,
        snapshot,
      };
      const battleDataP2 = {
        battleId,
        player1: battle.player1,
        player2: battle.player2,
        player1Team: battle.player1Team,
        player2Team: battle.player2Team,
        snapshot: flipSnapshot(snapshot),
      };

      if (socket1) io.to(socket1).emit('battle:start', battleDataP1);
      if (socket2) io.to(socket2).emit('battle:start', battleDataP2);
      console.log(`Battle starting: ${battle.player1} vs ${battle.player2}`);

      // Report result immediately from server simulation
      const winnerName = snapshot.winner === 'left' ? battle.player1 : battle.player2;
      const loserName = snapshot.winner === 'left' ? battle.player2 : battle.player1;

      const winnerRow = db.prepare('SELECT id, elo FROM players WHERE name = ?').get(winnerName) as any;
      const loserRow = db.prepare('SELECT id, elo FROM players WHERE name = ?').get(loserName) as any;
      if (winnerRow && loserRow) {
        const { winnerNewElo, loserNewElo, winnerDelta, loserDelta } = calculateEloChanges(winnerRow.elo, loserRow.elo);
        db.prepare('UPDATE players SET elo = ? WHERE id = ?').run(winnerNewElo, winnerRow.id);
        db.prepare('UPDATE players SET elo = ? WHERE id = ?').run(loserNewElo, loserRow.id);

        const eloUpdate = { winnerName, loserName, winnerNewElo, loserNewElo, winnerDelta, loserDelta };
        if (socket1) io.to(socket1).emit('battle:eloUpdate', eloUpdate);
        if (socket2) io.to(socket2).emit('battle:eloUpdate', eloUpdate);

        const p1Row = snapshot.winner === 'left' ? winnerRow : loserRow;
        const p2Row = snapshot.winner === 'left' ? loserRow : winnerRow;
        const recordUsage = db.prepare(
          'INSERT INTO battle_pokemon_usage (player_id, pokemon_id, times_used) VALUES (?, ?, 1) ON CONFLICT(player_id, pokemon_id) DO UPDATE SET times_used = times_used + 1'
        );
        for (const pid of battle.player1Team) recordUsage.run(p1Row.id, pid);
        for (const pid of battle.player2Team) recordUsage.run(p2Row.id, pid);

        console.log(`Elo update: ${winnerName} ${winnerRow.elo}→${winnerNewElo} (+${winnerDelta}), ${loserName} ${loserRow.elo}→${loserNewElo} (${loserDelta})`);
      }

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
