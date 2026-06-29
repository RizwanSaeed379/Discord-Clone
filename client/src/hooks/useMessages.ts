import { useState, useEffect, useRef, useCallback } from "react"
import { channelsApi, type Message } from "@/lib/api"
import { getSocket } from "@/lib/socket"

export function useMessages(channelId: number | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (!channelId) { setMessages([]); setHasMore(true); return }
    initialized.current = false
    setMessages([])
    setHasMore(true)

    channelsApi.messages(channelId).then(({ messages }) => {
      setMessages(messages)
      setHasMore(messages.length === 50)
      initialized.current = true
    })

    const socket = getSocket()
    socket.emit("channel:join", channelId)

    const onNew = (msg: Message) => {
      if (msg.channel_id !== channelId) return
      setMessages((prev) => [...prev, msg])
    }
    const onDeleted = ({ messageId }: { messageId: number }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }

    socket.on("message:new", onNew)
    socket.on("message:deleted", onDeleted)

    return () => {
      socket.emit("channel:leave", channelId)
      socket.off("message:new", onNew)
      socket.off("message:deleted", onDeleted)
    }
  }, [channelId])

  const loadMore = useCallback(async () => {
    if (!channelId || loadingMore || !hasMore || messages.length === 0) return
    setLoadingMore(true)
    try {
      const oldest = messages[0].id
      const { messages: older } = await channelsApi.messages(channelId, oldest)
      setMessages((prev) => [...older, ...prev])
      setHasMore(older.length === 50)
    } finally {
      setLoadingMore(false)
    }
  }, [channelId, loadingMore, hasMore, messages])

  const sendMessage = useCallback(
    (content: string) => {
      if (!channelId || !content.trim()) return
      const socket = getSocket()
      socket.emit("message:send", { channelId, content: content.trim() })
    },
    [channelId],
  )

  const deleteMessage = useCallback((messageId: number) => {
    getSocket().emit("message:delete", messageId)
  }, [])

  return { messages, hasMore, loadingMore, loadMore, sendMessage, deleteMessage }
}
