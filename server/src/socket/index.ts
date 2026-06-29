import type { Server as HttpServer } from "http"
import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import { pool } from "../db/pool.js"

const JWT_SECRET = process.env.JWT_SECRET as string
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173"

const onlineUsers = new Map<number, Set<string>>()

function addOnline(userId: number, socketId: string) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
  onlineUsers.get(userId)!.add(socketId)
}

function removeOnline(userId: number, socketId: string) {
  const sockets = onlineUsers.get(userId)
  if (!sockets) return
  sockets.delete(socketId)
  if (sockets.size === 0) onlineUsers.delete(userId)
}

export function isOnline(userId: number) {
  return onlineUsers.has(userId)
}

export function getOnlineUserIds(): number[] {
  return Array.from(onlineUsers.keys())
}

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: CLIENT_ORIGIN, credentials: true },
  })

  io.use((socket, next) => {
    const raw = socket.handshake.headers.cookie ?? ""
    const token = raw
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("token="))
      ?.slice("token=".length)

    if (!token) return next(new Error("Not authenticated"))

    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error("Invalid token"))
    }
  })

  io.on("connection", async (socket) => {
    const userId: number = socket.data.userId
    addOnline(userId, socket.id)

    const { rows: myServers } = await pool.query(
      "SELECT server_id FROM server_members WHERE user_id = $1",
      [userId],
    )
    for (const { server_id } of myServers) {
      socket.join(`server:${server_id}`)
      io.to(`server:${server_id}`).emit("presence:update", {
        userId,
        online: true,
      })
    }

    socket.on("channel:join", (channelId: number) => {
      socket.join(`channel:${channelId}`)
    })

    socket.on("channel:leave", (channelId: number) => {
      socket.leave(`channel:${channelId}`)
    })

    socket.on(
      "message:send",
      async (data: { channelId: number; content: string }, ack?: (msg: unknown) => void) => {
        const content = data?.content?.trim()
        if (!content || content.length > 2000) return

        const { rows: [ch] } = await pool.query(
          "SELECT server_id FROM channels WHERE id = $1",
          [data.channelId],
        )
        if (!ch) return

        const { rows: [isMember] } = await pool.query(
          "SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2",
          [ch.server_id, userId],
        )
        if (!isMember) return

        const { rows: [msg] } = await pool.query(
          `INSERT INTO messages (channel_id, author_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, channel_id, author_id, content, is_edited, created_at`,
          [data.channelId, userId, content],
        )

        const { rows: [user] } = await pool.query(
          "SELECT username FROM users WHERE id = $1",
          [userId],
        )

        const payload = {
          ...msg,
          author_username: user.username,
        }

        io.to(`channel:${data.channelId}`).emit("message:new", payload)
        if (ack) ack(payload)
      },
    )

    socket.on("typing:start", (channelId: number) => {
      socket.to(`channel:${channelId}`).emit("typing:update", {
        channelId,
        userId,
        typing: true,
      })
    })

    socket.on("typing:stop", (channelId: number) => {
      socket.to(`channel:${channelId}`).emit("typing:update", {
        channelId,
        userId,
        typing: false,
      })
    })

    socket.on("message:delete", async (messageId: number) => {
      const { rows: [msg] } = await pool.query(
        `SELECT m.id, m.author_id, m.channel_id, c.server_id
           FROM messages m JOIN channels c ON c.id = m.channel_id
          WHERE m.id = $1`,
        [messageId],
      )
      if (!msg) return

      if (msg.author_id !== userId) {
        const { rows: [member] } = await pool.query(
          "SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2",
          [msg.server_id, userId],
        )
        if (!member || member.role === "member") return
      }

      await pool.query("DELETE FROM messages WHERE id = $1", [messageId])
      io.to(`channel:${msg.channel_id}`).emit("message:deleted", { messageId })
    })

    socket.on("disconnect", async () => {
      removeOnline(userId, socket.id)
      const stillOnline = isOnline(userId)

      if (!stillOnline) {
        const { rows: myServers2 } = await pool.query(
          "SELECT server_id FROM server_members WHERE user_id = $1",
          [userId],
        )
        for (const { server_id } of myServers2) {
          io.to(`server:${server_id}`).emit("presence:update", {
            userId,
            online: false,
          })
        }
      }
    })
  })

  return io
}
