import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as promClient from 'prom-client';
import { initDb } from './db.js';
import { STARTING_ESSENCE, BOX_COSTS, PACK_COSTS } from '../../shared/essence.js';
import { STARTING_ELO, calculateEloChanges } from '../../shared/elo.js';
import { POKEMON_BY_ID } from '../../shared/pokemon-data.js';
import { randomNature, randomIVs } from '../../shared/natures.js';
import { STAT_MOVES, STATUS_MOVES, MOVE_SECONDARY_EFFECTS, getMoveAccuracy } from '../../shared/move-data.js';
import type { StatusCondition } from '../../shared/move-data.js';
import { canLearnMove, randomMovesForSpecies } from '../../shared/tm-learnsets.js';
import { getMoveInfo } from '../../shared/move-info.js';
import type { BattleSnapshot, BattlePokemonState, BattleLogEntry } from '../../shared/battle-types.js';
import type { Pokemon as AppPokemon } from '../../shared/types.js';
import { runShowdownBattle, randomAbilityForSpecies } from './showdown-battle.js';
import {
  calculate as calcDamage,
  Pokemon as CalcPokemon,
  Move as CalcMove,
  Field as CalcField,
  Generations,
  toID,
} from '../../damage-calc/calc/dist/index.js';

const GEN = 5;
const BATTLE_LEVEL = 100;
const calcGen = Generations.get(GEN);
const ZERO_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

// BASE_PATH env var controls the URL prefix (e.g. 'pokemonparty' → '/pokemonparty').
// Empty or unset means the app is served at root.
const rawBasePath = (process.env.BASE_PATH ?? 'pokemonparty').replace(/^\/|\/$/g, '');
const BASE_PATH = rawBasePath ? `/${rawBasePath}` : '';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  path: `${BASE_PATH}/socket.io`,
});

app.use(express.json());

const db = initDb();

// --- Prometheus metrics ---
const metricsRegistry = new promClient.Registry();
promClient.collectDefaultMetrics({ register: metricsRegistry });

const playersOnline = new promClient.Gauge({ name: 'pokemonparty_players_online', help: 'Currently connected players', registers: [metricsRegistry] });
const battlesTotal = new promClient.Counter({ name: 'pokemonparty_battles_total', help: 'Total battles completed', labelNames: ['field_size', 'total_pokemon', 'selection_mode', 'opponent_type'], registers: [metricsRegistry] });
const tradesTotal = new promClient.Counter({ name: 'pokemonparty_trades_total', help: 'Total trades completed', registers: [metricsRegistry] });
const battleRounds = new promClient.Histogram({ name: 'pokemonparty_battle_rounds', help: 'Rounds per battle', labelNames: ['field_size', 'total_pokemon'], buckets: [5, 10, 15, 20, 30, 40, 50], registers: [metricsRegistry] });
const playersRegistered = new promClient.Gauge({ name: 'pokemonparty_players_registered', help: 'Total registered players', registers: [metricsRegistry] });

// Seed metrics from DB on startup
const playerCount = (db.prepare('SELECT COUNT(*) as c FROM players').get() as any).c;
playersRegistered.set(playerCount);

const battleRows = db.prepare('SELECT field_size, total_pokemon, selection_mode, opponent_type, COUNT(*) as count FROM battles GROUP BY 1,2,3,4').all() as any[];
for (const row of battleRows) {
  battlesTotal.inc({ field_size: String(row.field_size), total_pokemon: String(row.total_pokemon), selection_mode: row.selection_mode, opponent_type: row.opponent_type }, row.count);
}
const tradeCount = (db.prepare('SELECT COUNT(*) as c FROM trades').get() as any).c;
tradesTotal.inc(tradeCount);

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

function makeCalcPokemon(p: AppPokemon, curHP?: number, boosts?: Record<string, number>): CalcPokemon {
  return new CalcPokemon(GEN, p.name, {
    level: BATTLE_LEVEL,
    evs: ZERO_EVS,
    nature: 'Serious',
    curHP,
    boosts,
  });
}

function simulateBattleFromIds(leftIds: number[], rightIds: number[], fieldSize?: number, leftHeldItems?: (string | null)[], rightHeldItems?: (string | null)[], leftMoves?: ([string, string] | null)[], rightMoves?: ([string, string] | null)[], leftAbilities?: (string | null)[], rightAbilities?: (string | null)[]): BattleSnapshot {
  const activeFieldSize = fieldSize ?? leftIds.length;

  const leftEntries = leftIds.map((id, i) => {
    const base = POKEMON_BY_ID[id];
    if (!base) return null;
    const moves = leftMoves?.[i] ?? null;
    return {
      pokemon: base,
      moves: (moves ?? base.moves) as [string, string],
      heldItem: leftHeldItems?.[i] ?? null,
      ability: leftAbilities?.[i] ?? undefined,
    };
  }).filter(Boolean) as { pokemon: AppPokemon; moves: [string, string]; heldItem?: string | null; ability?: string }[];

  const rightEntries = rightIds.map((id, i) => {
    const base = POKEMON_BY_ID[id];
    if (!base) return null;
    const moves = rightMoves?.[i] ?? null;
    return {
      pokemon: base,
      moves: (moves ?? base.moves) as [string, string],
      heldItem: rightHeldItems?.[i] ?? null,
      ability: rightAbilities?.[i] ?? undefined,
    };
  }).filter(Boolean) as { pokemon: AppPokemon; moves: [string, string]; heldItem?: string | null; ability?: string }[];

  return runShowdownBattle(leftEntries, rightEntries, activeFieldSize > 1 ? activeFieldSize : 1);
}

function flipSnapshot(snapshot: BattleSnapshot): BattleSnapshot {
  const flipSide = (s: 'left' | 'right') => s === 'left' ? 'right' : 'left';
  return {
    left: snapshot.right.map((p) => ({ ...p, side: 'left' as const })),
    right: snapshot.left.map((p) => ({ ...p, side: 'right' as const })),
    log: snapshot.log.map((e) => ({
      ...e,
      replacement: e.replacement ? { ...e.replacement, side: flipSide(e.replacement.side) } : undefined,
    })),
    winner: snapshot.winner ? flipSide(snapshot.winner) : null,
    round: snapshot.round,
    fieldSize: snapshot.fieldSize,
  };
}

// --- REST API ---

// Get distinct pokemon IDs used in a player's last 3 battles
function getRecentPokemonIds(playerId: string): number[] {
  const rows = db.prepare(`
    SELECT DISTINCT bte.pokemon_id
    FROM battle_team_entries bte
    WHERE bte.player_id = ? AND bte.battle_id IN (
      SELECT b.id FROM battles b
      WHERE b.winner_id = ? OR b.loser_id = ?
      ORDER BY b.created_at DESC
      LIMIT 3
    )
  `).all(playerId, playerId, playerId) as any[];
  return rows.map((r: any) => r.pokemon_id);
}

// Register a new player
app.post(`${BASE_PATH}/api/register`, (req, res) => {
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
  playersRegistered.inc();

  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE id = ?').get(id);
  return res.json({ player });
});

// Login (just look up by name)
app.post(`${BASE_PATH}/api/login`, (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE name = ?').get(name.trim()) as any;
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // Also fetch their pokemon collection
  const pokemon = db.prepare('SELECT id, pokemon_id, nature, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, move_1, move_2, held_item, ability FROM owned_pokemon WHERE player_id = ?').all(player.id);
  const items = db.prepare('SELECT id, item_type, item_data FROM owned_items WHERE player_id = ?').all(player.id);
  const recentPokemonIds = getRecentPokemonIds(player.id);
  return res.json({ player, pokemon, items, recentPokemonIds });
});

// Get player data
app.get(`${BASE_PATH}/api/player/:id`, (req, res) => {
  const player = db.prepare('SELECT id, name, essence, elo FROM players WHERE id = ?').get(req.params.id) as any;
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const pokemon = db.prepare('SELECT id, pokemon_id, nature, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, move_1, move_2, held_item, ability FROM owned_pokemon WHERE player_id = ?').all(player.id);
  const items = db.prepare('SELECT id, item_type, item_data FROM owned_items WHERE player_id = ?').all(player.id);
  const recentPokemonIds = getRecentPokemonIds(player.id);
  return res.json({ player, pokemon, items, recentPokemonIds });
});

// Update player essence
app.post(`${BASE_PATH}/api/player/:id/essence`, (req, res) => {
  const { essence } = req.body;
  if (typeof essence !== 'number') return res.status(400).json({ error: 'Invalid essence' });
  db.prepare('UPDATE players SET essence = ? WHERE id = ?').run(essence, req.params.id);
  return res.json({ ok: true });
});

// Add pokemon to player collection
app.post(`${BASE_PATH}/api/player/:id/pokemon`, (req, res) => {
  const { pokemonIds } = req.body;
  if (!Array.isArray(pokemonIds)) return res.status(400).json({ error: 'Invalid pokemonIds' });

  const insert = db.prepare(
    'INSERT INTO owned_pokemon (id, player_id, pokemon_id, nature, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, ability, move_1, move_2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const discover = db.prepare(
    'INSERT OR IGNORE INTO pokedex (player_id, pokemon_id) VALUES (?, ?)'
  );
  const created: any[] = [];
  for (const pid of pokemonIds) {
    const id = uuidv4();
    const nature = randomNature();
    const ivs = randomIVs();
    const species = POKEMON_BY_ID[pid];
    const ability = species ? randomAbilityForSpecies(species.name) : null;
    const moves = species
      ? randomMovesForSpecies(species.name, getMoveInfo, species.moves as [string, string])
      : [null, null];
    insert.run(id, req.params.id, pid, nature, ivs.hp, ivs.attack, ivs.defense, ivs.spAtk, ivs.spDef, ivs.speed, ability, moves[0], moves[1]);
    discover.run(req.params.id, pid);
    created.push({ id, pokemon_id: pid, nature, iv_hp: ivs.hp, iv_atk: ivs.attack, iv_def: ivs.defense, iv_spa: ivs.spAtk, iv_spd: ivs.spDef, iv_spe: ivs.speed, ability, move_1: moves[0], move_2: moves[1] });
  }
  return res.json({ ok: true, pokemon: created });
});

// Remove pokemon from player collection (by pokemon_id, removes N copies)
// Returns held items to inventory
app.post(`${BASE_PATH}/api/player/:id/pokemon/remove`, (req, res) => {
  const { pokemonId, count } = req.body;
  if (typeof pokemonId !== 'number' || typeof count !== 'number') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const rows = db.prepare(
    'SELECT id, held_item FROM owned_pokemon WHERE player_id = ? AND pokemon_id = ? LIMIT ?'
  ).all(req.params.id, pokemonId, count) as any[];

  const del = db.prepare('DELETE FROM owned_pokemon WHERE id = ?');
  const insertItem = db.prepare(
    'INSERT INTO owned_items (id, player_id, item_type, item_data) VALUES (?, ?, ?, ?)'
  );
  const returnedItems: string[] = [];
  for (const row of rows) {
    // Return held item to inventory if present
    if (row.held_item) {
      const itemDbId = require('crypto').randomUUID();
      insertItem.run(itemDbId, req.params.id, 'held_item', row.held_item);
      returnedItems.push(row.held_item);
    }
    del.run(row.id);
  }
  return res.json({ ok: true, removed: rows.length, returnedItems });
});

// Add items to player inventory
app.post(`${BASE_PATH}/api/player/:id/items`, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid items' });

  const insert = db.prepare(
    'INSERT INTO owned_items (id, player_id, item_type, item_data) VALUES (?, ?, ?, ?)'
  );
  const created: any[] = [];
  for (const item of items) {
    const id = uuidv4();
    insert.run(id, req.params.id, item.itemType, item.itemData);
    created.push({ id, item_type: item.itemType, item_data: item.itemData });
  }
  return res.json({ ok: true, items: created });
});

// Remove items from player inventory
app.post(`${BASE_PATH}/api/player/:id/items/remove`, (req, res) => {
  const { itemType, itemData, count } = req.body;
  if (typeof itemType !== 'string' || typeof itemData !== 'string' || typeof count !== 'number') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const rows = db.prepare(
    'SELECT id FROM owned_items WHERE player_id = ? AND item_type = ? AND item_data = ? LIMIT ?'
  ).all(req.params.id, itemType, itemData, count) as any[];

  const del = db.prepare('DELETE FROM owned_items WHERE id = ?');
  for (const row of rows) {
    del.run(row.id);
  }
  return res.json({ ok: true, removed: rows.length });
});

// Evolve a pokemon instance in-place (keeps IVs/nature, changes pokemon_id)
app.post(`${BASE_PATH}/api/player/:id/pokemon/evolve`, (req, res) => {
  const { instanceId, newPokemonId } = req.body;
  if (typeof instanceId !== 'string' || typeof newPokemonId !== 'number') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const row = db.prepare(
    'SELECT id FROM owned_pokemon WHERE id = ? AND player_id = ?'
  ).get(instanceId, req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }

  db.prepare('UPDATE owned_pokemon SET pokemon_id = ? WHERE id = ?').run(newPokemonId, instanceId);
  return res.json({ ok: true });
});

// Teach a TM to a pokemon (replace one of its moves, consume the TM)
app.post(`${BASE_PATH}/api/player/:id/pokemon/teach-tm`, (req, res) => {
  const { instanceId, moveName, moveSlot } = req.body;
  if (typeof instanceId !== 'string' || typeof moveName !== 'string' || (moveSlot !== 0 && moveSlot !== 1)) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const pokemon = db.prepare(
    'SELECT id, pokemon_id, move_1, move_2 FROM owned_pokemon WHERE id = ? AND player_id = ?'
  ).get(instanceId, req.params.id) as any;
  if (!pokemon) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }

  // Get current effective moves (learned or species defaults)
  const species = POKEMON_BY_ID[pokemon.pokemon_id];
  if (!species) return res.status(404).json({ error: 'Unknown pokemon species' });

  // Validate the pokemon can learn this move
  if (!canLearnMove(species.name, moveName)) {
    return res.status(400).json({ error: `${species.name} cannot learn ${moveName}` });
  }

  const currentMove1 = pokemon.move_1 ?? species.moves[0];
  const currentMove2 = pokemon.move_2 ?? species.moves[1];

  const newMove1 = moveSlot === 0 ? moveName : currentMove1;
  const newMove2 = moveSlot === 1 ? moveName : currentMove2;

  db.prepare('UPDATE owned_pokemon SET move_1 = ?, move_2 = ? WHERE id = ?').run(newMove1, newMove2, instanceId);

  // Remove one TM from inventory
  const tmRow = db.prepare(
    'SELECT id FROM owned_items WHERE player_id = ? AND item_type = ? AND item_data = ? LIMIT 1'
  ).get(req.params.id, 'tm', moveName) as any;
  if (tmRow) {
    db.prepare('DELETE FROM owned_items WHERE id = ?').run(tmRow.id);
  }

  return res.json({ ok: true });
});

// Use a boost item on a pokemon (max out one IV, consume the item)
app.post(`${BASE_PATH}/api/player/:id/pokemon/use-boost`, (req, res) => {
  const { instanceId, stat } = req.body;
  const validStats = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
  if (typeof instanceId !== 'string' || typeof stat !== 'string' || !validStats.includes(stat)) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const pokemon = db.prepare(
    'SELECT id FROM owned_pokemon WHERE id = ? AND player_id = ?'
  ).get(instanceId, req.params.id) as any;
  if (!pokemon) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }

  const colMap: Record<string, string> = {
    hp: 'iv_hp', attack: 'iv_atk', defense: 'iv_def',
    spAtk: 'iv_spa', spDef: 'iv_spd', speed: 'iv_spe',
  };
  const col = colMap[stat];
  db.prepare(`UPDATE owned_pokemon SET ${col} = 31 WHERE id = ?`).run(instanceId);

  // Remove one boost item from inventory
  const boostRow = db.prepare(
    'SELECT id FROM owned_items WHERE player_id = ? AND item_type = ? AND item_data = ? LIMIT 1'
  ).get(req.params.id, 'boost', stat) as any;
  if (boostRow) {
    db.prepare('DELETE FROM owned_items WHERE id = ?').run(boostRow.id);
  }

  return res.json({ ok: true });
});

// Give a held item to a pokemon (consumes the item from inventory)
app.post(`${BASE_PATH}/api/player/:id/pokemon/give-item`, (req, res) => {
  const { instanceId, itemId } = req.body;
  if (typeof instanceId !== 'string' || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const pokemon = db.prepare(
    'SELECT id, held_item FROM owned_pokemon WHERE id = ? AND player_id = ?'
  ).get(instanceId, req.params.id) as any;
  if (!pokemon) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }

  // If pokemon already holds an item, return it to inventory first
  if (pokemon.held_item) {
    const returnId = require('crypto').randomUUID();
    db.prepare(
      'INSERT INTO owned_items (id, player_id, item_type, item_data) VALUES (?, ?, ?, ?)'
    ).run(returnId, req.params.id, 'held_item', pokemon.held_item);
  }

  // Assign new held item
  db.prepare('UPDATE owned_pokemon SET held_item = ? WHERE id = ?').run(itemId, instanceId);

  // Consume item from inventory
  const itemRow = db.prepare(
    'SELECT id FROM owned_items WHERE player_id = ? AND item_type = ? AND item_data = ? LIMIT 1'
  ).get(req.params.id, 'held_item', itemId) as any;
  if (itemRow) {
    db.prepare('DELETE FROM owned_items WHERE id = ?').run(itemRow.id);
  }

  return res.json({ ok: true, returnedItem: pokemon.held_item ?? null });
});

// Take a held item from a pokemon (returns it to inventory)
app.post(`${BASE_PATH}/api/player/:id/pokemon/take-item`, (req, res) => {
  const { instanceId } = req.body;
  if (typeof instanceId !== 'string') {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const pokemon = db.prepare(
    'SELECT id, held_item FROM owned_pokemon WHERE id = ? AND player_id = ?'
  ).get(instanceId, req.params.id) as any;
  if (!pokemon) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }
  if (!pokemon.held_item) {
    return res.status(400).json({ error: 'Pokemon is not holding an item' });
  }

  // Return item to inventory
  const newItemId = require('crypto').randomUUID();
  db.prepare(
    'INSERT INTO owned_items (id, player_id, item_type, item_data) VALUES (?, ?, ?, ?)'
  ).run(newItemId, req.params.id, 'held_item', pokemon.held_item);

  const takenItem = pokemon.held_item;
  db.prepare('UPDATE owned_pokemon SET held_item = NULL WHERE id = ?').run(instanceId);

  return res.json({ ok: true, itemId: takenItem, newItemDbId: newItemId });
});

// Get leaderboard (ranked by Elo)
app.get(`${BASE_PATH}/api/leaderboard`, (_req, res) => {
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

// Online players endpoint
app.get(`${BASE_PATH}/api/players/online`, (_req, res) => {
  const names = Array.from(connectedPlayers.keys());
  return res.json({ players: names });
});

// Prometheus metrics endpoint
app.get(`${BASE_PATH}/metrics`, async (_req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

// Analytics endpoint — battle stats breakdown
app.get(`${BASE_PATH}/api/analytics/battles`, (_req, res) => {
  const byMode = db.prepare(`
    SELECT field_size, total_pokemon, selection_mode, opponent_type,
           COUNT(*) as count, AVG(rounds) as avg_rounds
    FROM battles
    GROUP BY field_size, total_pokemon, selection_mode, opponent_type
    ORDER BY count DESC
  `).all();

  const byDay = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM battles
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 30
  `).all();

  const topPlayers = db.prepare(`
    SELECT p.name,
           COUNT(*) as battles,
           SUM(CASE WHEN b.winner_id = p.id THEN 1 ELSE 0 END) as wins
    FROM players p
    JOIN battles b ON b.winner_id = p.id OR b.loser_id = p.id
    WHERE b.opponent_type = 'pvp'
    GROUP BY p.id
    ORDER BY battles DESC
    LIMIT 20
  `).all();

  return res.json({ byMode, byDay, topPlayers });
});

// ─── Admin endpoints ────────────────────────────────────────────────

app.get(`${BASE_PATH}/api/admin/players`, (_req, res) => {
  const players = db.prepare(`
    SELECT p.id, p.name, p.essence, p.elo, p.created_at,
           (SELECT COUNT(*) FROM owned_pokemon op WHERE op.player_id = p.id) as pokemon_count
    FROM players p ORDER BY p.created_at DESC
  `).all();
  return res.json({ players });
});

app.post(`${BASE_PATH}/api/admin/player/:id/set-essence`, (req, res) => {
  const { essence } = req.body;
  if (typeof essence !== 'number') return res.status(400).json({ error: 'Invalid essence' });
  db.prepare('UPDATE players SET essence = ? WHERE id = ?').run(essence, req.params.id);
  return res.json({ ok: true });
});

app.post(`${BASE_PATH}/api/admin/player/:id/set-elo`, (req, res) => {
  const { elo } = req.body;
  if (typeof elo !== 'number') return res.status(400).json({ error: 'Invalid elo' });
  db.prepare('UPDATE players SET elo = ? WHERE id = ?').run(elo, req.params.id);
  return res.json({ ok: true });
});

app.post(`${BASE_PATH}/api/admin/player/:id/wipe-pokemon`, (req, res) => {
  db.prepare('DELETE FROM owned_pokemon WHERE player_id = ?').run(req.params.id);
  return res.json({ ok: true });
});

app.post(`${BASE_PATH}/api/admin/player/:id/delete`, (req, res) => {
  db.prepare('DELETE FROM owned_pokemon WHERE player_id = ?').run(req.params.id);
  db.prepare('DELETE FROM owned_items WHERE player_id = ?').run(req.params.id);
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  return res.json({ ok: true });
});

app.post(`${BASE_PATH}/api/admin/wipe-all-pokemon`, (_req, res) => {
  db.exec('DELETE FROM owned_pokemon');
  return res.json({ ok: true });
});

app.get(`${BASE_PATH}/api/admin/stats`, (_req, res) => {
  const playerCount = (db.prepare('SELECT COUNT(*) as c FROM players').get() as any).c;
  const pokemonCount = (db.prepare('SELECT COUNT(*) as c FROM owned_pokemon').get() as any).c;
  const battleCount = (db.prepare('SELECT COUNT(*) as c FROM battles').get() as any).c;
  const itemCount = (db.prepare('SELECT COUNT(*) as c FROM owned_items').get() as any).c;
  return res.json({ playerCount, pokemonCount, battleCount, itemCount });
});

// ─── Game settings endpoints ────────────────────────────────────────

app.get(`${BASE_PATH}/api/admin/settings`, (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM game_settings').all() as any[];
  const settings: Record<string, any> = {};
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  return res.json(settings);
});

app.put(`${BASE_PATH}/api/admin/settings`, (req, res) => {
  const { key, value } = req.body;
  if (typeof key !== 'string') return res.status(400).json({ error: 'Invalid key' });
  db.prepare('INSERT OR REPLACE INTO game_settings (key, value) VALUES (?, ?)').run(
    key, JSON.stringify(value)
  );
  return res.json({ ok: true });
});

// Public endpoint for rarity weights (needed by client for pack opening)
app.get(`${BASE_PATH}/api/settings/rarity-weights`, (_req, res) => {
  const row = db.prepare("SELECT value FROM game_settings WHERE key = 'rarity_weights'").get() as any;
  if (!row) return res.json({ common: 50, uncommon: 30, rare: 13, epic: 5, legendary: 2 });
  return res.json(JSON.parse(row.value));
});

// Public endpoint for feature flags
app.get(`${BASE_PATH}/api/settings/features`, (_req, res) => {
  const row = db.prepare("SELECT value FROM game_settings WHERE key = 'tm_shop_enabled'").get() as any;
  return res.json({ tmShopEnabled: row ? JSON.parse(row.value) : false });
});

// ─── Story mode endpoints ────────────────────────────────────────────

app.get(`${BASE_PATH}/api/player/:id/story`, (req, res) => {
  const completed = db.prepare('SELECT chapter_id FROM story_progress WHERE player_id = ?').all(req.params.id) as any[];
  return res.json({ completed: completed.map((r: any) => String(r.chapter_id)) });
});

app.post(`${BASE_PATH}/api/player/:id/story/complete`, (req, res) => {
  const { chapterId } = req.body;
  if (!chapterId) return res.status(400).json({ error: 'Invalid chapterId' });
  const key = String(chapterId);
  const existing = db.prepare('SELECT 1 FROM story_progress WHERE player_id = ? AND chapter_id = ?').get(req.params.id, key);
  const firstClear = !existing;
  if (firstClear) {
    db.prepare('INSERT INTO story_progress (player_id, chapter_id) VALUES (?, ?)').run(req.params.id, key);
  }
  return res.json({ ok: true, firstClear });
});

// ─── Pokédex endpoints ────────────────────────────────────────────────

app.get(`${BASE_PATH}/api/player/:id/pokedex`, (req, res) => {
  const rows = db.prepare('SELECT pokemon_id FROM pokedex WHERE player_id = ?').all(req.params.id) as any[];
  return res.json({ discovered: rows.map((r: any) => r.pokemon_id) });
});

// Backfill pokedex from currently owned pokemon (for existing players)
app.post(`${BASE_PATH}/api/player/:id/pokedex/backfill`, (req, res) => {
  const owned = db.prepare('SELECT DISTINCT pokemon_id FROM owned_pokemon WHERE player_id = ?').all(req.params.id) as any[];
  const discover = db.prepare('INSERT OR IGNORE INTO pokedex (player_id, pokemon_id) VALUES (?, ?)');
  for (const row of owned) {
    discover.run(req.params.id, row.pokemon_id);
  }
  return res.json({ ok: true, discovered: owned.length });
});

// AI / demo battle endpoint
app.post(`${BASE_PATH}/api/battle/simulate`, (req, res) => {
  const { leftTeam, rightTeam, fieldSize, selectionMode, leftHeldItems, rightHeldItems, leftMoves, rightMoves, leftAbilities, rightAbilities } = req.body;
  if (!Array.isArray(leftTeam) || !Array.isArray(rightTeam)) {
    return res.status(400).json({ error: 'leftTeam and rightTeam must be arrays of pokemon IDs' });
  }
  const fs = fieldSize ?? leftTeam.length;
  const mode = selectionMode ?? 'blind';
  const snapshot = simulateBattleFromIds(leftTeam, rightTeam, fieldSize, leftHeldItems, rightHeldItems, leftMoves, rightMoves, leftAbilities, rightAbilities);

  const labels = { field_size: String(fs), total_pokemon: String(leftTeam.length), selection_mode: mode, opponent_type: 'ai' };
  battlesTotal.inc(labels);
  battleRounds.observe({ field_size: String(fs), total_pokemon: String(leftTeam.length) }, snapshot.round);

  // Record in DB (no player IDs for AI battles)
  db.prepare(
    'INSERT INTO battles (id, winner_id, loser_id, essence_gained, field_size, total_pokemon, selection_mode, opponent_type, rounds) VALUES (?, NULL, NULL, 0, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), fs, leftTeam.length, mode, 'ai', snapshot.round);

  return res.json({ snapshot });
});

// --- Socket.IO: Battle matching ---

// Track challenges: Map<challengerName, targetName>
const pendingChallenges = new Map<string, string>();
const pendingChallengeConfigs = new Map<string, { fieldSize: number; totalPokemon: number }>();
// Track connected players: Map<playerName, socketId>
const connectedPlayers = new Map<string, string>();
// Track active battles: Map<battleId, battle state>
interface ActiveBattle {
  id: string;
  player1: string;
  player2: string;
  player1Team: number[] | null;
  player2Team: number[] | null;
  fieldSize: number;
  totalPokemon: number;
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
    playersOnline.set(connectedPlayers.size);
    console.log(`Player identified: ${name}`);
  });

  socket.on('battle:challenge', (data: string | { target: string; fieldSize?: number; totalPokemon?: number }) => {
    if (!playerName) return;
    const targetName = typeof data === 'string' ? data : data.target;
    const fieldSize = (typeof data === 'object' ? data.fieldSize : undefined) ?? 3;
    const totalPokemon = (typeof data === 'object' ? data.totalPokemon : undefined) ?? 3;
    pendingChallenges.set(playerName, targetName);
    pendingChallengeConfigs.set(playerName, { fieldSize, totalPokemon });
    console.log(`${playerName} challenges ${targetName}`);

    // Check if there's a mutual challenge
    const otherChallenge = pendingChallenges.get(targetName);
    if (otherChallenge === playerName) {
      // Match found!
      pendingChallenges.delete(playerName);
      pendingChallenges.delete(targetName);

      const config = pendingChallengeConfigs.get(targetName) ?? { fieldSize: 3, totalPokemon: 3 };
      pendingChallengeConfigs.delete(playerName);
      pendingChallengeConfigs.delete(targetName);
      const battleId = uuidv4();
      const battle: ActiveBattle = {
        id: battleId,
        player1: playerName,
        player2: targetName,
        player1Team: null,
        player2Team: null,
        fieldSize: config.fieldSize,
        totalPokemon: config.totalPokemon,
      };
      activeBattles.set(battleId, battle);

      // Notify both players
      const socket1 = connectedPlayers.get(playerName);
      const socket2 = connectedPlayers.get(targetName);
      if (socket1) io.to(socket1).emit('battle:matched', { battleId, opponent: targetName, fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
      if (socket2) io.to(socket2).emit('battle:matched', { battleId, opponent: playerName, fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
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
    pendingChallengeConfigs.delete(playerName);
    socket.emit('battle:cancelled');
  });

  socket.on('battle:selectTeam', ({ battleId, team, heldItems, moves, abilities }: { battleId: string; team: number[]; heldItems?: (string | null)[]; moves?: ([string, string] | null)[]; abilities?: (string | null)[] }) => {
    if (!playerName) return;
    const battle = activeBattles.get(battleId);
    if (!battle) return;

    if (battle.player1 === playerName) { battle.player1Team = team; (battle as any).player1HeldItems = heldItems ?? []; (battle as any).player1Moves = moves ?? []; (battle as any).player1Abilities = abilities ?? []; }
    else if (battle.player2 === playerName) { battle.player2Team = team; (battle as any).player2HeldItems = heldItems ?? []; (battle as any).player2Moves = moves ?? []; (battle as any).player2Abilities = abilities ?? []; }

    // Check if both teams are selected
    if (battle.player1Team && battle.player2Team) {
      const socket1 = connectedPlayers.get(battle.player1);
      const socket2 = connectedPlayers.get(battle.player2);

      // Simulate battle on server so both players see the same result
      const snapshot = simulateBattleFromIds(battle.player1Team, battle.player2Team, battle.fieldSize, (battle as any).player1HeldItems, (battle as any).player2HeldItems, (battle as any).player1Moves, (battle as any).player2Moves, (battle as any).player1Abilities, (battle as any).player2Abilities);

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

        // Record battle in DB with config
        const recordBattle = db.prepare(
          'INSERT INTO battles (id, winner_id, loser_id, essence_gained, winner_elo_delta, loser_elo_delta, field_size, total_pokemon, selection_mode, opponent_type, rounds) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)'
        );
        recordBattle.run(battleId, winnerRow.id, loserRow.id, winnerDelta, loserDelta, battle.fieldSize, battle.totalPokemon, 'blind', 'pvp', snapshot.round);

        // Record team entries for recent-pokemon tracking
        const recordTeamEntry = db.prepare(
          'INSERT INTO battle_team_entries (battle_id, player_id, pokemon_id) VALUES (?, ?, ?)'
        );
        for (const pid of battle.player1Team) recordTeamEntry.run(battleId, p1Row.id, pid);
        for (const pid of battle.player2Team) recordTeamEntry.run(battleId, p2Row.id, pid);
      }

      activeBattles.delete(battleId);
      const labels = { field_size: String(battle.fieldSize), total_pokemon: String(battle.totalPokemon), selection_mode: 'blind', opponent_type: 'pvp' };
      battlesTotal.inc(labels);
      battleRounds.observe({ field_size: String(battle.fieldSize), total_pokemon: String(battle.totalPokemon) }, snapshot.round);
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
      tradesTotal.inc();
      console.log(`Trade executed: ${trade.player1} <-> ${trade.player2}`);
    } else {
      socket.emit('trade:waitingConfirm');
    }
  });

  socket.on('disconnect', () => {
    if (playerName) {
      connectedPlayers.delete(playerName);
      playersOnline.set(connectedPlayers.size);
      pendingChallenges.delete(playerName);
      pendingChallengeConfigs.delete(playerName);
      pendingTrades.delete(playerName);
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

// Serve built client files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(BASE_PATH || '/', express.static(clientDistPath));
  app.get(`${BASE_PATH}/*`, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
