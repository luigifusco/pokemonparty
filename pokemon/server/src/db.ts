import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { STARTING_ELO } from '../../shared/elo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDb() {
  const dataDir = path.join(__dirname, '../../data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'game.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');

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

  return db;
}
