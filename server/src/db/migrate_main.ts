import "dotenv/config"
import { pool } from "./pool.js"

async function migrateMain() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS servers (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      icon_url   TEXT,
      owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invite_code VARCHAR(10) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS server_members (
      server_id  INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      role       VARCHAR(20) NOT NULL DEFAULT 'member'
                   CHECK (role IN ('owner','admin','member')),
      joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (server_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id         SERIAL PRIMARY KEY,
      server_id  INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      name       VARCHAR(100) NOT NULL,
      type       VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text')),
      position   INTEGER NOT NULL DEFAULT 0,
      topic      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      author_id  INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      content    TEXT    NOT NULL,
      is_edited  BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS channel_reads (
      user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, channel_id)
    );

    CREATE INDEX IF NOT EXISTS messages_channel_created
      ON messages(channel_id, created_at DESC);
  `)
  console.log("Main migration complete.")
  await pool.end()
}

migrateMain().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
