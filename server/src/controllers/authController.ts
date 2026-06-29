import type { Request, Response } from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { pool } from "../db/pool.js"

const JWT_SECRET = process.env.JWT_SECRET as string
const TOKEN_COOKIE = "token"
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173"
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string
const GOOGLE_CALLBACK_URL = `${process.env.SERVER_ORIGIN ?? "http://localhost:4000"}/api/auth/google/callback`

function setAuthCookie(res: Response, userId: number) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_MS,
  })
}

export async function signup(req: Request, res: Response) {
  const { username, email, password } = req.body ?? {}

  if (
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    username.length < 3 ||
    password.length < 8
  ) {
    res.status(400).json({ error: "Invalid username, email, or password" })
    return
  }

  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1 OR username = $2",
    [email, username],
  )
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "Username or email already in use" })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const result = await pool.query(
    "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
    [username, email, passwordHash],
  )
  const user = result.rows[0]

  setAuthCookie(res, user.id)
  res.status(201).json({ user })
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {}

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Invalid email or password" })
    return
  }

  const result = await pool.query(
    "SELECT id, username, email, password_hash FROM users WHERE email = $1",
    [email],
  )
  const user = result.rows[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" })
    return
  }

  setAuthCookie(res, user.id)
  res.json({ user: { id: user.id, username: user.username, email: user.email } })
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(TOKEN_COOKIE)
  res.json({ ok: true })
}

export async function me(req: Request, res: Response) {
  const result = await pool.query(
    "SELECT id, username, email FROM users WHERE id = $1",
    [req.userId],
  )
  const user = result.rows[0]

  if (!user) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  res.json({ user })
}

export function googleAuth(_req: Request, res: Response) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "email profile",
    access_type: "offline",
    prompt: "select_account",
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

export async function googleCallback(req: Request, res: Response) {
  const { code } = req.query

  if (typeof code !== "string") {
    res.redirect(`${CLIENT_ORIGIN}/login?error=oauth_failed`)
    return
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    })
    const tokenData = (await tokenRes.json()) as { access_token?: string }

    if (!tokenRes.ok || !tokenData.access_token) {
      res.redirect(`${CLIENT_ORIGIN}/login?error=oauth_failed`)
      return
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = (await profileRes.json()) as {
      id?: string
      email?: string
      name?: string
    }

    if (!profile.id || !profile.email) {
      res.redirect(`${CLIENT_ORIGIN}/login?error=oauth_failed`)
      return
    }

    let userId: number

    const byGoogleId = await pool.query("SELECT id FROM users WHERE google_id = $1", [profile.id])
    if (byGoogleId.rows.length > 0) {
      userId = byGoogleId.rows[0].id
    } else {
      const byEmail = await pool.query("SELECT id FROM users WHERE email = $1", [profile.email])
      if (byEmail.rows.length > 0) {
        await pool.query("UPDATE users SET google_id = $1 WHERE email = $2", [
          profile.id,
          profile.email,
        ])
        userId = byEmail.rows[0].id
      } else {
        const username = await generateUniqueUsername(
          profile.name ?? profile.email.split("@")[0],
        )
        const inserted = await pool.query(
          "INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING id",
          [username, profile.email, profile.id],
        )
        userId = inserted.rows[0].id
      }
    }

    setAuthCookie(res, userId)
    res.redirect(CLIENT_ORIGIN)
  } catch {
    res.redirect(`${CLIENT_ORIGIN}/login?error=oauth_failed`)
  }
}

async function generateUniqueUsername(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 28)

  let candidate = base
  for (;;) {
    const existing = await pool.query("SELECT 1 FROM users WHERE username = $1", [candidate])
    if (existing.rows.length === 0) return candidate
    candidate = `${base}_${Math.floor(Math.random() * 9000 + 1000)}`
  }
}
