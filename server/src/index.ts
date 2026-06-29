import "dotenv/config"
import { createServer } from "http"
import express, { type ErrorRequestHandler } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { authRouter } from "./routes/auth.js"
import { serversRouter } from "./routes/servers.js"
import { channelsRouter } from "./routes/channels.js"
import { setupSocket } from "./socket/index.js"

const app = express()
const PORT = process.env.PORT ?? 4000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173"

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRouter)
app.use("/api/servers", serversRouter)
app.use("/api/channels", channelsRouter)

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err)
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : (err as Error)?.message ?? "Internal server error"
  res.status(500).json({ error: message })
}
app.use(errorHandler)

const httpServer = createServer(app)
setupSocket(httpServer)

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
