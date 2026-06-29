import "dotenv/config"
import { pool } from "./pool.js"

async function migrateGoogle() {
  await pool.query(`
    ALTER TABLE users
      ALTER COLUMN password_hash DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
  `)
  console.log("Google OAuth migration complete.")
  await pool.end()
}

migrateGoogle().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
