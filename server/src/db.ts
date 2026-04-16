import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { STARTING_ELO } from '../../shared/elo.js';
import { NATURES } from '../../shared/natures.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDb() {
  const dataDir = path.join(__dirname, '../../data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'game.db');
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      essence INTEGER NOT NULL DEFAULT 0,
      elo INTEGER NOT NULL DEFAULT ${STARTING_ELO},
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS owned_pokemon (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      pokemon_id INTEGER NOT NULL,
      nature TEXT NOT NULL DEFAULT 'Serious',
      iv_hp INTEGER NOT NULL DEFAULT 0,
      iv_atk INTEGER NOT NULL DEFAULT 0,
      iv_def INTEGER NOT NULL DEFAULT 0,
      iv_spa INTEGER NOT NULL DEFAULT 0,
      iv_spd INTEGER NOT NULL DEFAULT 0,
      iv_spe INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS battles (
      id TEXT PRIMARY KEY,
      winner_id TEXT REFERENCES players(id),
      loser_id TEXT REFERENCES players(id),
      essence_gained INTEGER NOT NULL,
      winner_elo_delta INTEGER NOT NULL DEFAULT 0,
      loser_elo_delta INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      player1_id TEXT REFERENCES players(id),
      player2_id TEXT REFERENCES players(id),
      pokemon1_id TEXT REFERENCES owned_pokemon(id),
      pokemon2_id TEXT REFERENCES owned_pokemon(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS battle_pokemon_usage (
      player_id TEXT NOT NULL REFERENCES players(id),
      pokemon_id INTEGER NOT NULL,
      times_used INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (player_id, pokemon_id)
    );

    CREATE TABLE IF NOT EXISTS battle_team_entries (
      battle_id TEXT NOT NULL REFERENCES battles(id),
      player_id TEXT NOT NULL REFERENCES players(id),
      pokemon_id INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owned_items (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      item_type TEXT NOT NULL,
      item_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add elo column if it doesn't exist (migration for existing DBs)
  const cols = db.prepare("PRAGMA table_info(players)").all() as any[];
  if (!cols.find((c: any) => c.name === 'elo')) {
    db.exec(`ALTER TABLE players ADD COLUMN elo INTEGER NOT NULL DEFAULT ${STARTING_ELO}`);
  }
  const battleCols = db.prepare("PRAGMA table_info(battles)").all() as any[];
  if (!battleCols.find((c: any) => c.name === 'winner_elo_delta')) {
    db.exec(`ALTER TABLE battles ADD COLUMN winner_elo_delta INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE battles ADD COLUMN loser_elo_delta INTEGER NOT NULL DEFAULT 0`);
  }

  // Add move override columns if they don't exist (migration for TM teaching)
  const pokemonCols2 = db.prepare("PRAGMA table_info(owned_pokemon)").all() as any[];
  if (!pokemonCols2.find((c: any) => c.name === 'move_1')) {
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN move_1 TEXT DEFAULT NULL`);
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN move_2 TEXT DEFAULT NULL`);
  }

  // Add held_item column if it doesn't exist (migration for held items)
  if (!pokemonCols2.find((c: any) => c.name === 'held_item')) {
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN held_item TEXT DEFAULT NULL`);
  }

  // Add ability column if it doesn't exist (migration for abilities)
  // Drop all owned pokemon and recreate with NOT NULL ability
  if (!pokemonCols2.find((c: any) => c.name === 'ability')) {
    db.exec(`DELETE FROM owned_pokemon`);
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN ability TEXT NOT NULL DEFAULT ''`);
  }

  // Add IV and nature columns if they don't exist (migration for existing DBs)
  const pokemonCols = db.prepare("PRAGMA table_info(owned_pokemon)").all() as any[];
  if (!pokemonCols.find((c: any) => c.name === 'nature')) {
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN nature TEXT NOT NULL DEFAULT 'Serious'`);
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN iv_hp INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN iv_atk INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN iv_def INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN iv_spa INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN iv_spd INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE owned_pokemon ADD COLUMN iv_spe INTEGER NOT NULL DEFAULT 0`);

    // Backfill existing rows with random IVs and natures
    const allOwned = db.prepare('SELECT id FROM owned_pokemon').all() as any[];
    const update = db.prepare(
      'UPDATE owned_pokemon SET nature = ?, iv_hp = ?, iv_atk = ?, iv_def = ?, iv_spa = ?, iv_spd = ?, iv_spe = ? WHERE id = ?'
    );
    const rand = () => Math.floor(Math.random() * 32);
    for (const row of allOwned) {
      const nature = NATURES[Math.floor(Math.random() * NATURES.length)].name;
      update.run(nature, rand(), rand(), rand(), rand(), rand(), rand(), row.id);
    }
  }

  // Add battle config columns if they don't exist
  const battleCols2 = db.prepare("PRAGMA table_info(battles)").all() as any[];
  if (!battleCols2.find((c: any) => c.name === 'field_size')) {
    db.exec(`ALTER TABLE battles ADD COLUMN field_size INTEGER NOT NULL DEFAULT 3`);
    db.exec(`ALTER TABLE battles ADD COLUMN total_pokemon INTEGER NOT NULL DEFAULT 3`);
    db.exec(`ALTER TABLE battles ADD COLUMN selection_mode TEXT NOT NULL DEFAULT 'blind'`);
    db.exec(`ALTER TABLE battles ADD COLUMN opponent_type TEXT NOT NULL DEFAULT 'pvp'`);
    db.exec(`ALTER TABLE battles ADD COLUMN rounds INTEGER NOT NULL DEFAULT 0`);
  }

  // Story progress table
  db.exec(`
    CREATE TABLE IF NOT EXISTS story_progress (
      player_id TEXT NOT NULL REFERENCES players(id),
      chapter_id INTEGER NOT NULL,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, chapter_id)
    )
  `);

  // Game settings table (key-value store for admin-adjustable settings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Seed default rarity weights if not present
  const hasWeights = db.prepare("SELECT 1 FROM game_settings WHERE key = 'rarity_weights'").get();
  if (!hasWeights) {
    db.prepare("INSERT INTO game_settings (key, value) VALUES (?, ?)").run(
      'rarity_weights',
      JSON.stringify({ common: 50, uncommon: 30, rare: 13, epic: 5, legendary: 2 })
    );
  }

  // Pokedex: track which Pokemon a player has ever owned
  db.exec(`
    CREATE TABLE IF NOT EXISTS pokedex (
      player_id TEXT NOT NULL REFERENCES players(id),
      pokemon_id INTEGER NOT NULL,
      discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, pokemon_id)
    )
  `);

  // Tournaments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      field_size INTEGER NOT NULL DEFAULT 1,
      total_pokemon INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'registration',
      registration_end INTEGER NOT NULL,
      match_time_limit INTEGER NOT NULL DEFAULT 300,
      bracket TEXT NOT NULL DEFAULT '[]',
      participants TEXT NOT NULL DEFAULT '[]',
      current_round INTEGER NOT NULL DEFAULT 0,
      winner TEXT,
      fixed_team INTEGER NOT NULL DEFAULT 0,
      frozen_teams TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add fixed_team columns if missing (migration for existing DBs)
  const tournCols = db.prepare("PRAGMA table_info(tournaments)").all() as any[];
  if (tournCols.length > 0 && !tournCols.find((c: any) => c.name === 'fixed_team')) {
    db.exec(`ALTER TABLE tournaments ADD COLUMN fixed_team INTEGER NOT NULL DEFAULT 0`);
    db.exec(`ALTER TABLE tournaments ADD COLUMN frozen_teams TEXT NOT NULL DEFAULT '{}'`);
  }

  return db;
}
