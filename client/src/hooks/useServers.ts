import { useState, useEffect, useCallback } from "react"
import { serversApi, type Server } from "@/lib/api"

export function useServers() {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { servers } = await serversApi.list()
      setServers(servers)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const addServer = (s: Server) => setServers((prev) => [...prev, s])
  const removeServer = (id: number) => setServers((prev) => prev.filter((s) => s.id !== id))

  return { servers, loading, refresh, addServer, removeServer }
}
