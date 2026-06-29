import { Router } from "express"
import { updateChannel, deleteChannel } from "../controllers/channelController.js"
import {
  createMessage,
  getMessages,
  deleteMessage,
  editMessage,
} from "../controllers/messageController.js"
import { requireAuth } from "../middleware/auth.js"

export const channelsRouter = Router()

channelsRouter.use(requireAuth)

channelsRouter.patch("/:id", updateChannel)
channelsRouter.delete("/:id", deleteChannel)
channelsRouter.get("/:id/messages", getMessages)
channelsRouter.post("/:id/messages", createMessage)
channelsRouter.delete("/messages/:id", deleteMessage)
channelsRouter.patch("/messages/:id", editMessage)
