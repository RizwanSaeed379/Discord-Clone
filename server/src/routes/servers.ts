import { Router } from "express"
import {
  getServers,
  createServer,
  joinServer,
  getServer,
  updateServer,
  deleteServer,
  getMembers,
  addMember,
  removeMember,
  getChannels,
} from "../controllers/serverController.js"
import { createChannel } from "../controllers/channelController.js"
import { requireAuth } from "../middleware/auth.js"

export const serversRouter = Router()

serversRouter.use(requireAuth)

serversRouter.get("/", getServers)
serversRouter.post("/", createServer)
serversRouter.post("/join", joinServer)
serversRouter.get("/:id", getServer)
serversRouter.patch("/:id", updateServer)
serversRouter.delete("/:id", deleteServer)
serversRouter.get("/:id/members", getMembers)
serversRouter.post("/:id/members", addMember)
serversRouter.delete("/:id/members/:userId", removeMember)
serversRouter.get("/:id/channels", getChannels)
serversRouter.post("/:id/channels", createChannel)
