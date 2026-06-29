import type { Request, Response } from "express"
import { pool } from "../db/pool.js"

export async function getMessages(req: Request, res: Response) {
  const channelId = Number(req.params.id)
  const before = req.query.before ? Number(req.query.before) : null
  const limit = Math.min(Number(req.query.limit ?? 50), 100)

  const { rows: [ch] } = await pool.query(
    "SELECT server_id FROM channels WHERE id = $1",
    [channelId],
  )
  if (!ch) {
    res.status(404).json({ error: "Channel not found" })
    return
  }

  const { rows: [isMember] } = await pool.query(
    "SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2",
    [ch.server_id, req.userId],
  )
  if (!isMember) {
    res.status(403).json({ error: "Not a member" })
    return
  }

  const { rows } = before
    ? await pool.query(
        `SELECT m.id, m.channel_id, m.content, m.is_edited, m.created_at, m.updated_at,
                u.id AS author_id, u.username AS author_username
           FROM messages m
           JOIN users u ON u.id = m.author_id
          WHERE m.channel_id = $1 AND m.id < $2
          ORDER BY m.created_at DESC
          LIMIT $3`,
        [channelId, before, limit],
      )
    : await pool.query(
        `SELECT m.id, m.channel_id, m.content, m.is_edited, m.created_at, m.updated_at,
                u.id AS author_id, u.username AS author_username
           FROM messages m
           JOIN users u ON u.id = m.author_id
          WHERE m.channel_id = $1
          ORDER BY m.created_at DESC
          LIMIT $2`,
        [channelId, limit],
      )

  res.json({ messages: rows.reverse() })
}

export async function createMessage(req: Request, res: Response) {
  const channelId = Number(req.params.id)
  const { content } = req.body as { content?: string }

  if (!content?.trim() || content.length > 2000) {
    res.status(400).json({ error: "Content is required (max 2000 chars)" })
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

  const { rows: [isMember] } = await pool.query(
    "SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2",
    [ch.server_id, req.userId],
  )
  if (!isMember) {
    res.status(403).json({ error: "Not a member" })
    return
  }

  const { rows: [msg] } = await pool.query(
    `INSERT INTO messages (channel_id, author_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, channel_id, author_id, content, is_edited, created_at, updated_at`,
    [channelId, req.userId, content.trim()],
  )
  const { rows: [user] } = await pool.query(
    "SELECT username FROM users WHERE id = $1",
    [req.userId],
  )
  res.status(201).json({ message: { ...msg, author_username: user.username } })
}

export async function deleteMessage(req: Request, res: Response) {
  const messageId = Number(req.params.id)

  const { rows: [msg] } = await pool.query(
    `SELECT m.author_id, c.server_id
       FROM messages m
       JOIN channels c ON c.id = m.channel_id
      WHERE m.id = $1`,
    [messageId],
  )
  if (!msg) {
    res.status(404).json({ error: "Message not found" })
    return
  }

  if (msg.author_id !== req.userId) {
    const { rows: [member] } = await pool.query(
      "SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
      [msg.server_id, req.userId],
    )
    if (!member || member.role === "member") {
      res.status(403).json({ error: "Cannot delete this message" })
      return
    }
  }

  await pool.query("DELETE FROM messages WHERE id = $1", [messageId])
  res.json({ ok: true })
}

export async function editMessage(req: Request, res: Response) {
  const messageId = Number(req.params.id)
  const { content } = req.body as { content?: string }

  if (!content?.trim()) {
    res.status(400).json({ error: "Content is required" })
    return
  }

  const { rows: [msg] } = await pool.query(
    "SELECT author_id FROM messages WHERE id = $1",
    [messageId],
  )
  if (!msg) {
    res.status(404).json({ error: "Message not found" })
    return
  }
  if (msg.author_id !== req.userId) {
    res.status(403).json({ error: "Cannot edit this message" })
    return
  }

  const { rows: [updated] } = await pool.query(
    `UPDATE messages
        SET content = $1, is_edited = true, updated_at = now()
      WHERE id = $2
  RETURNING id, content, is_edited, updated_at`,
    [content.trim(), messageId],
  )
  res.json({ message: updated })
}
