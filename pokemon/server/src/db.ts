import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

  return db;
}
