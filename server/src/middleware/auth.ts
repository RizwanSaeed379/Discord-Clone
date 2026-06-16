import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET as string

export interface AuthPayload {
  userId: number
}

declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token

  if (!token) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired session" })
  }
}
