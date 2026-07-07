const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDb() {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      is_admin INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS flashcard_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id INTEGER,
      role_id INTEGER,
      skill_id INTEGER,
      role TEXT,
      topic TEXT,
      skill_level TEXT,
      question TEXT,
      answer TEXT,
      coding_example TEXT,
      challenges TEXT,
      note TEXT,
      FOREIGN KEY (set_id) REFERENCES flashcard_sets(id),
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (skill_id) REFERENCES skills(id)
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id INTEGER,
      name TEXT,
      FOREIGN KEY (set_id) REFERENCES flashcard_sets(id)
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER,
      name TEXT,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS candidate_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      flashcard_id INTEGER,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
      UNIQUE(candidate_id, flashcard_id)
    );
  `);

  // Migration: Add new columns if they don't exist
  const columnsToAdd = [
    { table: 'flashcards', column: 'role_id', type: 'INTEGER' },
    { table: 'flashcards', column: 'skill_id', type: 'INTEGER' },
    { table: 'flashcards', column: 'note', type: 'TEXT' },
    { table: 'flashcards', column: 'coding_example', type: 'TEXT' },
    { table: 'flashcards', column: 'challenges', type: 'TEXT' },
    { table: 'flashcards', column: 'role', type: 'TEXT' },
    { table: 'flashcards', column: 'skill_level', type: 'TEXT' },
    { table: 'users', column: 'is_admin', type: 'INTEGER DEFAULT 0' }
  ];

  for (const { table, column, type } of columnsToAdd) {
    try {
      await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (e) {
      // Column likely already exists
    }
  }

  console.log('Database initialized');
  return db;
}

function getDb() {
  return db;
}

module.exports = { initDb, getDb };
