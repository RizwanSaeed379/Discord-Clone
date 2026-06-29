import type { Request, Response } from "express"
import { pool } from "../db/pool.js"

function makeInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function getServers(req: Request, res: Response) {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.icon_url, s.invite_code, s.owner_id
       FROM servers s
       JOIN server_members sm ON sm.server_id = s.id
      WHERE sm.user_id = $1
      ORDER BY sm.joined_at`,
    [req.userId],
  )
  res.json({ servers: rows })
}

export async function createServer(req: Request, res: Response) {
  const { name } = req.body as { name?: string }
  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" })
    return
  }

  let inviteCode: string
  for (;;) {
    inviteCode = makeInviteCode()
    const { rows } = await pool.query("SELECT 1 FROM servers WHERE invite_code = $1", [inviteCode])
    if (rows.length === 0) break
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const { rows: [server] } = await client.query(
      `INSERT INTO servers (name, owner_id, invite_code)
       VALUES ($1, $2, $3) RETURNING id, name, icon_url, invite_code, owner_id`,
      [name.trim(), req.userId, inviteCode],
    )
    await client.query(
      "INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, 'owner')",
      [server.id, req.userId],
    )
    const { rows: [channel] } = await client.query(
      `INSERT INTO channels (server_id, name, position)
       VALUES ($1, 'general', 0) RETURNING id, name, type, position, topic`,
      [server.id],
    )
    await client.query("COMMIT")
    res.status(201).json({ server, defaultChannel: channel })
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function joinServer(req: Request, res: Response) {
  const { inviteCode } = req.body as { inviteCode?: string }
  if (!inviteCode?.trim()) {
    res.status(400).json({ error: "Invite code is required" })
    return
  }

  const { rows: [server] } = await pool.query(
    "SELECT id, name, icon_url, invite_code, owner_id FROM servers WHERE invite_code = $1",
    [inviteCode.trim()],
  )
  if (!server) {
    res.status(404).json({ error: "Invalid invite code" })
    return
  }

  await pool.query(
    `INSERT INTO server_members (server_id, user_id, role)
     VALUES ($1, $2, 'member')
     ON CONFLICT (server_id, user_id) DO NOTHING`,
    [server.id, req.userId],
  )
  res.json({ server })
}

export async function getServer(req: Request, res: Response) {
  const serverId = Number(req.params.id)
  const { rows: [member] } = await pool.query(
    "SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2",
    [serverId, req.userId],
  )
  if (!member) {
    res.status(403).json({ error: "Not a member" })
    return
  }

  const { rows: [server] } = await pool.query(
    "SELECT id, name, icon_url, invite_code, owner_id FROM servers WHERE id = $1",
    [serverId],
  )
  if (!server) {
    res.status(404).json({ error: "Server not found" })
    return
  }
  res.json({ server })
}

export async function deleteServer(req: Request, res: Response) {
  const serverId = Number(req.params.id)
  const { rowCount } = await pool.query(
    "DELETE FROM servers WHERE id = $1 AND owner_id = $2",
    [serverId, req.userId],
  )
  if (!rowCount) {
    res.status(403).json({ error: "Not the owner" })
    return
  }
  res.json({ ok: true })
}

export async function getMembers(req: Request, res: Response) {
  const serverId = Number(req.params.id)
  const { rows: [isMember] } = await pool.query(
    "SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2",
    [serverId, req.userId],
  )
  if (!isMember) {
    res.status(403).json({ error: "Not a member" })
    return
  }

  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.email, sm.role
       FROM server_members sm
       JOIN users u ON u.id = sm.user_id
      WHERE sm.server_id = $1
      ORDER BY sm.role DESC, u.username`,
    [serverId],
  )
  res.json({ members: rows })
}

export async function updateServer(req: Request, res: Response) {
  const serverId = Number(req.params.id)
  const { name, icon_url } = req.body as { name?: string; icon_url?: string }

  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" })
    return
  }

  const { rows: [server] } = await pool.query(
    `UPDATE servers SET name = $1, icon_url = COALESCE($2, icon_url)
      WHERE id = $3 AND owner_id = $4
  RETURNING id, name, icon_url, invite_code, owner_id`,
    [name.trim(), icon_url ?? null, serverId, req.userId],
  )
  if (!server) {
    res.status(403).json({ error: "Not the owner" })
    return
  }
  res.json({ server })
}

export async function addMember(req: Request, res: Response) {
  const serverId = Number(req.params.id)
  const { username } = req.body as { username?: string }

  if (!username?.trim()) {
    res.status(400).json({ error: "Username is required" })
    return
  }

  const { rows: [requester] } = await pool.query(
    "SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
    [serverId, req.userId],
  )
  if (!requester || requester.role === "member") {
    res.status(403).json({ error: "Need admin or owner role" })
    return
  }

  const { rows: [target] } = await pool.query(
    "SELECT id, username FROM users WHERE username = $1",
    [username.trim()],
  )
  if (!target) {
    res.status(404).json({ error: "User not found" })
    return
  }

  await pool.query(
    `INSERT INTO server_members (server_id, user_id, role)
     VALUES ($1, $2, 'member')
     ON CONFLICT (server_id, user_id) DO NOTHING`,
    [serverId, target.id],
  )
  res.status(201).json({ ok: true, userId: target.id, username: target.username })
}

export async function removeMember(req: Request, res: Response) {
  const serverId = Number(req.params.id)
  const targetId = Number(req.params.userId)

  const { rows: [server] } = await pool.query(
    "SELECT owner_id FROM servers WHERE id = $1",
    [serverId],
  )
  if (!server) {
    res.status(404).json({ error: "Server not found" })
    return
  }

  if (targetId === server.owner_id) {
    res.status(400).json({ error: "Cannot remove the server owner" })
    return
  }

  const { rows: [requester] } = await pool.query(
    "SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
    [serverId, req.userId],
  )

  const isSelf = targetId === req.userId
  const isPrivileged = requester?.role === "owner" || requester?.role === "admin"

  if (!isSelf && !isPrivileged) {
    res.status(403).json({ error: "Need admin or owner role" })
    return
  }

  const { rowCount } = await pool.query(
    "DELETE FROM server_members WHERE server_id = $1 AND user_id = $2",
    [serverId, targetId],
  )
  if (!rowCount) {
    res.status(404).json({ error: "Member not found" })
    return
  }
  res.json({ ok: true })
}

export async function getChannels(req: Request, res: Response) {
  const serverId = Number(req.params.id)
  const { rows: [isMember] } = await pool.query(
    "SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2",
    [serverId, req.userId],
  )
  if (!isMember) {
    res.status(403).json({ error: "Not a member" })
    return
  }

  const { rows } = await pool.query(
    `SELECT id, name, type, position, topic
       FROM channels
      WHERE server_id = $1
      ORDER BY position, id`,
    [serverId],
  )
  res.json({ channels: rows })
}
