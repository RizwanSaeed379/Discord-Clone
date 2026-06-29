import { useState, useEffect, useCallback } from "react"
import { serversApi, type Channel } from "@/lib/api"

export function useChannels(serverId: number | null) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!serverId) { setChannels([]); return }
    setLoading(true)
    try {
      const { channels } = await serversApi.channels(serverId)
      setChannels(channels)
    } finally {
      setLoading(false)
    }
  }, [serverId])

  useEffect(() => { refresh() }, [refresh])

  const addChannel = (ch: Channel) => setChannels((prev) => [...prev, ch])
  const removeChannel = (id: number) => setChannels((prev) => prev.filter((c) => c.id !== id))

  return { channels, loading, refresh, addChannel, removeChannel }
}
