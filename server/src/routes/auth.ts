import { Router } from "express"
import { signup, login, logout, me, googleAuth, googleCallback } from "../controllers/authController.js"
import { requireAuth } from "../middleware/auth.js"

export const authRouter = Router()

authRouter.post("/signup", signup)
authRouter.post("/login", login)
authRouter.post("/logout", logout)
authRouter.get("/me", requireAuth, me)
authRouter.get("/google", googleAuth)
authRouter.get("/google/callback", googleCallback)
