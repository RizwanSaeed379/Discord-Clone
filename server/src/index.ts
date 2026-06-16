import "dotenv/config"
import express, { type ErrorRequestHandler } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { authRouter } from "./routes/auth.js"

const app = express()
const PORT = process.env.PORT ?? 4000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173"

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRouter)

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: "Internal server error" })
}
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
