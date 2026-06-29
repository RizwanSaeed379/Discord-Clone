import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ServerList } from "@/components/ServerList"
import { ChannelSidebar } from "@/components/ChannelSidebar"
import { MessageView } from "@/components/MessageView"
import { MemberList } from "@/components/MemberList"
import { useServers } from "@/hooks/useServers"
import { useChannels } from "@/hooks/useChannels"
import { useMembers } from "@/hooks/useMembers"
import { useAuth } from "@/context/useAuth"
import { connectSocket, disconnectSocket } from "@/lib/socket"
import { serversApi, type Server, type Channel, type Member } from "@/lib/api"
import { Hash } from "lucide-react"

export default function AppLayout() {
  const { serverId: serverIdParam, channelId: channelIdParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showMemberList, setShowMemberList] = useState(true)

  const serverId = serverIdParam && serverIdParam !== "@me" ? Number(serverIdParam) : null
  const channelId = channelIdParam ? Number(channelIdParam) : null

  const { servers, addServer, removeServer, refresh: refreshServers } = useServers()
  const { channels, addChannel, removeChannel, refresh: refreshChannels } = useChannels(serverId)
  const { online, offline, addMember, removeMember } = useMembers(
    showMemberList ? serverId : null,
  )

  const activeServer = servers.find((s) => s.id === serverId) ?? null
  const activeChannel = channels.find((c) => c.id === channelId) ?? null

  useEffect(() => {
    connectSocket()
    return () => disconnectSocket()
  }, [])

  function handleServerCreated(server: Server, defaultChannel: Channel) {
    addServer(server)
    if (defaultChannel.id) {
      navigate(`/channels/${server.id}/${defaultChannel.id}`)
    } else {
      navigate(`/channels/${server.id}`)
    }
  }

  function handleServerUpdated(updated: Server) {
    refreshServers()
    // Update active server name in the list immediately
    const idx = servers.findIndex((s) => s.id === updated.id)
    if (idx !== -1) {
      servers[idx] = updated
    }
  }

  function handleServerDeleted(id: number) {
    removeServer(id)
    navigate("/channels/@me")
  }

  function handleChannelCreated(ch: Channel) {
    addChannel(ch)
  }

  function handleChannelUpdated(ch: Channel) {
    refreshChannels()
  }

  function handleChannelDeleted(id: number) {
    removeChannel(id)
    if (channelId === id) navigate(`/channels/${serverId}`)
  }

  const handleKick = useCallback(
    async (userId: number, username: string) => {
      if (!serverId) return
      if (!confirm(`Remove ${username} from the server?`)) return
      try {
        await serversApi.removeMember(serverId, userId)
        removeMember(userId)
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to remove member")
      }
    },
    [serverId, removeMember],
  )

  function handleMemberAdded(m: Member) {
    addMember(m)
  }

  const isOwnerOrAdmin = (() => {
    if (!activeServer || !user) return false
    return activeServer.owner_id === user.id
  })()

  return (
    <div className="flex h-screen overflow-hidden bg-[#313338]">
      <ServerList servers={servers} onServerCreated={handleServerCreated} />

      <ChannelSidebar
        server={activeServer}
        channels={channels}
        onChannelCreated={handleChannelCreated}
        onChannelUpdated={handleChannelUpdated}
        onChannelDeleted={handleChannelDeleted}
        onServerUpdated={handleServerUpdated}
        onServerDeleted={handleServerDeleted}
        onMemberAdded={handleMemberAdded}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeChannel ? (
          <div className="flex flex-1 overflow-hidden">
            <MessageView
              channel={activeChannel}
              serverId={serverId!}
              showMemberList={showMemberList}
              onToggleMemberList={() => setShowMemberList((v) => !v)}
            />
            {showMemberList && (
              <MemberList
                online={online}
                offline={offline}
                canKick={isOwnerOrAdmin}
                currentUserId={user?.id ?? 0}
                onKick={handleKick}
              />
            )}
          </div>
        ) : (
          <EmptyState
            serverName={activeServer?.name}
            hasChannels={channels.length > 0}
            onFirstChannel={() =>
              channels[0] && navigate(`/channels/${serverId}/${channels[0].id}`)
            }
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({
  serverName,
  hasChannels,
  onFirstChannel,
}: {
  serverName?: string
  hasChannels: boolean
  onFirstChannel: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#313338] text-[#949ba4]">
      {serverName ? (
        <>
          <div className="flex size-20 items-center justify-center rounded-full bg-[#404249]">
            <Hash className="size-10 text-[#b5bac1]" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-[#f2f3f5]">{serverName}</h3>
            <p className="mt-2 text-sm">
              {hasChannels
                ? "Select a channel to start chatting."
                : "No channels yet — create one!"}
            </p>
            {hasChannels && (
              <button
                onClick={onFirstChannel}
                className="mt-4 rounded-[3px] bg-[#5865f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4] transition-colors"
              >
                Open first channel
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="text-lg font-semibold text-[#f2f3f5]">Welcome to Discord!</p>
          <p className="mt-2 text-sm">Select or create a server to get started.</p>
        </div>
      )}
    </div>
  )
}
