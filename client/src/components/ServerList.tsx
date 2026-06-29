import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { Plus, Compass } from "lucide-react"
import { type Server, type Channel } from "@/lib/api"
import { CreateServerModal } from "./CreateServerModal"

const SERVER_COLORS = [
  "#e91e63", "#9c27b0", "#3f51b5", "#2196f3",
  "#009688", "#4caf50", "#ff9800", "#795548",
]

function serverColor(id: number) {
  return SERVER_COLORS[id % SERVER_COLORS.length]
}

function ServerTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="right"
          sideOffset={16}
          className="z-50 rounded-[4px] bg-[#111214] px-3 py-1.5 text-sm font-semibold text-white shadow-lg"
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-[#111214]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

function ServerIcon({
  server,
  isActive,
  hasUnread,
  onClick,
}: {
  server: Server
  isActive: boolean
  hasUnread: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const active = isActive || hovered

  return (
    <ServerTooltip label={server.name}>
      <div
        className="relative flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="absolute -left-3 w-1 rounded-r-full bg-white transition-all duration-200"
          style={{
            height: isActive ? 40 : hasUnread ? 8 : hovered ? 20 : 0,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
        <button
          onClick={onClick}
          className="flex size-12 items-center justify-center text-sm font-bold text-white transition-all duration-200 overflow-hidden flex-shrink-0"
          style={{
            background: server.icon_url ? "transparent" : serverColor(server.id),
            borderRadius: active ? "30%" : "50%",
          }}
        >
          {server.icon_url ? (
            <img src={server.icon_url} alt={server.name} className="size-full object-cover" />
          ) : (
            <span className="select-none">
              {server.name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </span>
          )}
        </button>
      </div>
    </ServerTooltip>
  )
}

function IconButton({
  label,
  color,
  hoverColor,
  onClick,
  children,
}: {
  label: string
  color: string
  hoverColor: string
  onClick?: () => void
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <ServerTooltip label={label}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex size-12 items-center justify-center text-white transition-all duration-200 flex-shrink-0"
        style={{
          background: hovered ? hoverColor : color,
          borderRadius: hovered ? "30%" : "50%",
        }}
      >
        {children}
      </button>
    </ServerTooltip>
  )
}

interface Props {
  servers: Server[]
  onServerCreated: (server: Server, defaultChannel: Channel) => void
}

export function ServerList({ servers, onServerCreated }: Props) {
  const { serverId } = useParams()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <nav className="flex w-[72px] flex-none flex-col items-center gap-2 overflow-y-auto overflow-x-hidden bg-[#1e1f22] py-3">
        <IconButton
          label="Direct Messages"
          color="#5865f2"
          hoverColor="#23a55a"
          onClick={() => navigate("/channels/@me")}
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="white">
            <path d="M23.0244 1.67566C21.2873 0.872188 19.4336 0.287918 17.4999 -0.000488281C17.2469 0.448472 16.9508 1.05299 16.7486 1.53389C14.6919 1.24034 12.6537 1.24034 10.6354 1.53389C10.4332 1.05299 10.1307 0.448472 9.87538 -0.000488281C7.93932 0.287918 6.08335 0.874386 4.34625 1.68046C0.842381 6.93697 -0.110556 12.0614 0.366009 17.1105C2.68441 18.8214 4.93118 19.8446 7.14051 20.4998C7.70336 19.7299 8.20561 18.9125 8.63825 18.0491C7.81786 17.7429 7.03258 17.3639 6.28994 16.9245C6.49217 16.7753 6.69019 16.6197 6.88243 16.4583C11.2636 18.4865 16.0145 18.4865 20.3443 16.4583C20.5387 16.6197 20.7367 16.7753 20.9368 16.9245C20.192 17.3661 19.4046 17.745 18.5842 18.0513C19.0168 18.9125 19.5169 19.7321 20.0818 20.502C22.2933 19.8467 24.5423 18.8235 26.8607 17.1105C27.4192 11.2659 25.8991 6.18972 23.0244 1.67566ZM9.02167 14.0516C7.67345 14.0516 6.56773 12.8285 6.56773 11.3349C6.56773 9.84127 7.64916 8.61601 9.02167 8.61601C10.3942 8.61601 11.5 9.83907 11.4756 11.3349C11.478 12.8285 10.3942 14.0516 9.02167 14.0516ZM18.2051 14.0516C16.8569 14.0516 15.7512 12.8285 15.7512 11.3349C15.7512 9.84127 16.8326 8.61601 18.2051 8.61601C19.5776 8.61601 20.6834 9.83907 20.659 11.3349C20.659 12.8285 19.5776 14.0516 18.2051 14.0516Z" />
          </svg>
        </IconButton>

        <div className="h-px w-8 rounded-full bg-[#35373c]" />

        {servers.map((server) => (
          <ServerIcon
            key={server.id}
            server={server}
            isActive={serverId === String(server.id)}
            hasUnread={false}
            onClick={() => navigate(`/channels/${server.id}`)}
          />
        ))}

        <div className="h-px w-8 rounded-full bg-[#35373c]" />

        <IconButton
          label="Add a Server"
          color="#313338"
          hoverColor="#23a55a"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </IconButton>

        <IconButton label="Explore Public Servers" color="#313338" hoverColor="#5865f2">
          <Compass className="size-6" />
        </IconButton>
      </nav>

      <CreateServerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(server, ch) => {
          onServerCreated(server, ch)
          setModalOpen(false)
        }}
      />
    </>
  )
}
