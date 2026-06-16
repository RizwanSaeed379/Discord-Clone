import type { Request, Response } from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { pool } from "../db/pool.js"

const JWT_SECRET = process.env.JWT_SECRET as string
const TOKEN_COOKIE = "token"
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

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
