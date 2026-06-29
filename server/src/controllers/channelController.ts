import type { Request, Response } from "express"
import { pool } from "../db/pool.js"

export async function createChannel(req: Request, res: Response) {
  const serverId = Number(req.params.id)
  const { name } = req.body as { name?: string }

  if (!name?.trim()) {
    res.status(400).json({ error: "Channel name is required" })
    return
  }

  const { rows: [member] } = await pool.query(
    "SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
    [serverId, req.userId],
  )
  if (!member || member.role === "member") {
    res.status(403).json({ error: "Need admin or owner role" })
    return
  }

  const { rows: [{ max }] } = await pool.query(
    "SELECT COALESCE(MAX(position), -1) AS max FROM channels WHERE server_id = $1",
    [serverId],
  )

  const { rows: [channel] } = await pool.query(
    `INSERT INTO channels (server_id, name, position)
     VALUES ($1, $2, $3)
     RETURNING id, name, type, position, topic`,
    [serverId, name.trim().toLowerCase().replace(/\s+/g, "-"), Number(max) + 1],
  )
  res.status(201).json({ channel })
}

export async function updateChannel(req: Request, res: Response) {
  const channelId = Number(req.params.id)
  const { name, topic } = req.body as { name?: string; topic?: string }

  if (!name?.trim()) {
    res.status(400).json({ error: "Channel name is required" })
    return
  }

  const { rows: [ch] } = await pool.query(
    "SELECT server_id FROM channels WHERE id = $1",
    [channelId],
  )
  if (!ch) {
    res.status(404).json({ error: "Channel not found" })
    return
  }

  const { rows: [member] } = await pool.query(
    "SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
    [ch.server_id, req.userId],
  )
  if (!member || member.role === "member") {
    res.status(403).json({ error: "Need admin or owner role" })
    return
  }

  const { rows: [channel] } = await pool.query(
    `UPDATE channels
        SET name  = $1,
            topic = $2
      WHERE id = $3
  RETURNING id, name, type, position, topic`,
    [name.trim().toLowerCase().replace(/\s+/g, "-"), topic?.trim() ?? null, channelId],
  )
  res.json({ channel })
}

export async function deleteChannel(req: Request, res: Response) {
  const channelId = Number(req.params.id)

  const { rows: [ch] } = await pool.query(
    "SELECT server_id FROM channels WHERE id = $1",
    [channelId],
  )
  if (!ch) {
    res.status(404).json({ error: "Channel not found" })
    return
  }

  const { rows: [member] } = await pool.query(
    "SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
    [ch.server_id, req.userId],
  )
  if (!member || member.role === "member") {
    res.status(403).json({ error: "Need admin or owner role" })
    return
  }

  await pool.query("DELETE FROM channels WHERE id = $1", [channelId])
  res.json({ ok: true })
}
