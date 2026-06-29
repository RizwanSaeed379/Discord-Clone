import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Hash,
  ChevronDown,
  Plus,
  Settings,
  Mic,
  Headphones,
  LogOut,
  UserPlus,
} from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { type Server, type Channel } from "@/lib/api"
import { useAuth } from "@/context/useAuth"
import { EditServerModal } from "./EditServerModal"
import { EditChannelModal } from "./EditChannelModal"
import { InvitePeopleModal } from "./InvitePeopleModal"
import { type Member } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Props {
  server: Server | null
  channels: Channel[]
  onChannelCreated: (ch: Channel) => void
  onChannelUpdated: (ch: Channel) => void
  onChannelDeleted: (id: number) => void
  onServerUpdated: (s: Server) => void
  onServerDeleted: (id: number) => void
  onMemberAdded: (m: Member) => void
}

export function ChannelSidebar({
  server,
  channels,
  onChannelCreated,
  onChannelUpdated,
  onChannelDeleted,
  onServerUpdated,
  onServerDeleted,
  onMemberAdded,
}: Props) {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState("")
  const [editServerOpen, setEditServerOpen] = useState(false)
  const [editChannel, setEditChannel] = useState<Channel | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const isOwner = server?.owner_id === user?.id
  const canManage = isOwner

  async function handleCreateChannel() {
    if (!server || !newChannelName.trim()) return
    try {
      const { serversApi } = await import("@/lib/api")
      const { channel } = await serversApi.createChannel(server.id, newChannelName.trim())
      onChannelCreated(channel)
      setNewChannelName("")
      setCreatingChannel(false)
      navigate(`/channels/${server.id}/${channel.id}`)
    } catch {}
  }

  async function handleDeleteServer() {
    if (!server) return
    if (!confirm(`Delete "${server.name}"? This cannot be undone.`)) return
    try {
      const { serversApi } = await import("@/lib/api")
      await serversApi.delete(server.id)
      onServerDeleted(server.id)
      navigate("/channels/@me")
    } catch {}
  }

  if (!server) {
    return (
      <div className="flex w-60 flex-none flex-col bg-[#2b2d31]">
        <div className="flex h-12 items-center px-4 shadow-[0_1px_0_rgba(4,4,5,0.2),0_1.5px_0_rgba(6,6,7,0.05)]">
          <span className="font-semibold text-[#f2f3f5]">Direct Messages</span>
        </div>
        <div className="flex-1" />
        <UserPanel user={user} onLogout={logout} />
      </div>
    )
  }

  return (
    <>
      <div className="flex w-60 flex-none flex-col bg-[#2b2d31]">
        {/* Server name header */}
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <button className="flex h-12 w-full items-center justify-between px-4 font-semibold text-[#f2f3f5] hover:bg-[#35373c] transition-colors shadow-[0_1px_0_rgba(4,4,5,0.2),0_1.5px_0_rgba(6,6,7,0.05)]">
              <span className="truncate">{server.name}</span>
              <ChevronDown className="size-4 flex-none text-[#b5bac1]" />
            </button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              className="z-50 min-w-[220px] rounded-[4px] bg-[#111214] p-1.5 shadow-xl"
              sideOffset={4}
              align="start"
            >
              <DropdownMenuPrimitive.Item
                onSelect={() => setInviteOpen(true)}
                className="flex cursor-pointer items-center gap-2 rounded-[3px] px-2 py-1.5 text-sm text-[#dcddde] hover:bg-[#5865f2] hover:text-white outline-none"
              >
                <UserPlus className="size-4" />
                Invite People
              </DropdownMenuPrimitive.Item>
              {isOwner && (
                <DropdownMenuPrimitive.Item
                  onSelect={() => setEditServerOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-[3px] px-2 py-1.5 text-sm text-[#dcddde] hover:bg-[#404249] hover:text-white outline-none"
                >
                  <Settings className="size-4" />
                  Server Settings
                </DropdownMenuPrimitive.Item>
              )}
              <DropdownMenuPrimitive.Separator className="my-1 h-px bg-[#3f4147]" />
              {isOwner && (
                <DropdownMenuPrimitive.Item
                  onSelect={handleDeleteServer}
                  className="flex cursor-pointer items-center gap-2 rounded-[3px] px-2 py-1.5 text-sm text-[#f23f43] hover:bg-[#f23f43] hover:text-white outline-none"
                >
                  Delete Server
                </DropdownMenuPrimitive.Item>
              )}
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto pt-4">
          <div className="mb-1 px-2">
            <div className="group flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase text-[#949ba4]">
                Text Channels
              </span>
              {canManage && (
                <button
                  onClick={() => setCreatingChannel(true)}
                  className="hidden text-[#949ba4] hover:text-[#dbdee1] group-hover:block"
                  title="Create Channel"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>

            {creatingChannel && (
              <div className="mt-1 px-1">
                <input
                  autoFocus
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateChannel()
                    if (e.key === "Escape") {
                      setCreatingChannel(false)
                      setNewChannelName("")
                    }
                  }}
                  placeholder="new-channel"
                  className="w-full rounded-[3px] bg-[#1e1f22] px-2 py-1 text-sm text-[#dcddde] placeholder:text-[#4e5058] outline-none"
                  maxLength={100}
                />
              </div>
            )}
          </div>

          <ul className="mt-1 space-y-px px-2">
            {channels.map((ch) => (
              <li key={ch.id}>
                <button
                  onClick={() => navigate(`/channels/${server.id}/${ch.id}`)}
                  className={cn(
                    "group flex w-full items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-sm transition-colors",
                    channelId === String(ch.id)
                      ? "bg-[#404249] text-[#f2f3f5]"
                      : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]",
                  )}
                >
                  <Hash className="size-4 flex-none opacity-80" />
                  <span className="flex-1 truncate text-left">{ch.name}</span>
                  {canManage && channelId !== String(ch.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditChannel(ch)
                      }}
                      className="hidden size-4 items-center justify-center text-[#b5bac1] hover:text-[#f2f3f5] group-hover:flex"
                      title="Edit Channel"
                    >
                      <Settings className="size-3.5" />
                    </button>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <UserPanel user={user} onLogout={logout} />
      </div>

      {/* Modals */}
      {editServerOpen && (
        <EditServerModal
          server={server}
          open={editServerOpen}
          onClose={() => setEditServerOpen(false)}
          onUpdated={onServerUpdated}
        />
      )}

      {editChannel && (
        <EditChannelModal
          channel={editChannel}
          open={!!editChannel}
          onClose={() => setEditChannel(null)}
          onUpdated={(ch) => { onChannelUpdated(ch); setEditChannel(null) }}
          onDeleted={(id) => {
            onChannelDeleted(id)
            setEditChannel(null)
            if (channelId === String(id)) navigate(`/channels/${server.id}`)
          }}
        />
      )}

      <InvitePeopleModal
        server={server}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        canManageMembers={canManage}
        onMemberAdded={onMemberAdded}
      />
    </>
  )
}

function UserPanel({
  user,
  onLogout,
}: {
  user: { id: number; username: string; email: string } | null
  onLogout: () => void
}) {
  if (!user) return null
  return (
    <div className="flex h-[52px] flex-none items-center gap-2 bg-[#232428] px-2">
      <div className="relative flex-none">
        <div className="flex size-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white select-none">
          {user.username[0].toUpperCase()}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#232428] bg-[#23a55a]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-[#f2f3f5]">{user.username}</span>
        <span className="truncate text-xs text-[#949ba4]">Online</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          className="rounded p-1 text-[#b5bac1] hover:bg-[#35373c] hover:text-[#f2f3f5] transition-colors"
          title="Mute"
        >
          <Mic className="size-4" />
        </button>
        <button
          className="rounded p-1 text-[#b5bac1] hover:bg-[#35373c] hover:text-[#f2f3f5] transition-colors"
          title="Deafen"
        >
          <Headphones className="size-4" />
        </button>
        <button
          onClick={onLogout}
          className="rounded p-1 text-[#b5bac1] hover:bg-[#35373c] hover:text-[#f2f3f5] transition-colors"
          title="Log Out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  )
}
