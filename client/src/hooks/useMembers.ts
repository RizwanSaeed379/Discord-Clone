import { useState, useEffect } from "react"
import { serversApi, type Member } from "@/lib/api"
import { getSocket } from "@/lib/socket"

export interface MemberWithPresence extends Member {
  online: boolean
}

export function useMembers(serverId: number | null) {
  const [members, setMembers] = useState<MemberWithPresence[]>([])

  useEffect(() => {
    if (!serverId) { setMembers([]); return }

    serversApi.members(serverId).then(({ members }) => {
      setMembers(members.map((m) => ({ ...m, online: false })))
    })

    const socket = getSocket()

    const onPresence = ({ userId, online }: { userId: number; online: boolean }) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, online } : m)),
      )
    }

    socket.on("presence:update", onPresence)
    return () => { socket.off("presence:update", onPresence) }
  }, [serverId])

  const addMember = (m: Member) =>
    setMembers((prev) =>
      prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, online: false }],
    )

  const removeMember = (userId: number) =>
    setMembers((prev) => prev.filter((m) => m.id !== userId))

  const online = members.filter((m) => m.online)
  const offline = members.filter((m) => !m.online)

  return { members, online, offline, addMember, removeMember }
}
