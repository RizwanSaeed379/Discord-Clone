import { UserMinus } from "lucide-react"
import { type MemberWithPresence } from "@/hooks/useMembers"

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 }

interface Props {
  online: MemberWithPresence[]
  offline: MemberWithPresence[]
  canKick: boolean
  currentUserId: number
  onKick: (userId: number, username: string) => void
}

function MemberRow({
  member,
  canKick,
  currentUserId,
  onKick,
}: {
  member: MemberWithPresence
  canKick: boolean
  currentUserId: number
  onKick: (userId: number, username: string) => void
}) {
  const kickable = canKick && member.role !== "owner" && member.id !== currentUserId

  return (
    <li className="group flex cursor-pointer items-center gap-3 rounded-[4px] px-2 py-1.5 hover:bg-[#35373c] transition-colors">
      <div className="relative flex-none">
        <div
          className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white select-none"
          style={{
            background: member.online ? "#5865f2" : "#4e5058",
            opacity: member.online ? 1 : 0.5,
          }}
        >
          {member.username[0].toUpperCase()}
        </div>
        <div
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#2b2d31]"
          style={{ background: member.online ? "#23a55a" : "#80848e" }}
        />
      </div>

      <span
        className="min-w-0 flex-1 truncate text-sm font-medium"
        style={{ color: member.online ? "#f2f3f5" : "#4e5058" }}
      >
        {member.username}
        {member.role === "owner" && <span className="ml-1 text-xs text-[#f0b232]">👑</span>}
        {member.role === "admin" && (
          <span className="ml-1 text-[10px] text-[#949ba4] uppercase">admin</span>
        )}
      </span>

      {kickable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onKick(member.id, member.username)
          }}
          title={`Remove ${member.username}`}
          className="hidden rounded p-1 text-[#b5bac1] hover:bg-[#f23f43]/20 hover:text-[#f23f43] group-hover:flex transition-colors"
        >
          <UserMinus className="size-4" />
        </button>
      )}
    </li>
  )
}

function Section({
  label,
  members,
  canKick,
  currentUserId,
  onKick,
}: {
  label: string
  members: MemberWithPresence[]
  canKick: boolean
  currentUserId: number
  onKick: (userId: number, username: string) => void
}) {
  if (members.length === 0) return null
  return (
    <div className="mb-4">
      <p className="px-2 pb-1 pt-4 text-xs font-semibold uppercase text-[#949ba4]">
        {label} — {members.length}
      </p>
      <ul className="space-y-px">
        {[...members]
          .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
          .map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              canKick={canKick}
              currentUserId={currentUserId}
              onKick={onKick}
            />
          ))}
      </ul>
    </div>
  )
}

export function MemberList({ online, offline, canKick, currentUserId, onKick }: Props) {
  return (
    <aside className="flex w-60 flex-none flex-col overflow-y-auto bg-[#2b2d31] px-2">
      <Section
        label="Online"
        members={online}
        canKick={canKick}
        currentUserId={currentUserId}
        onKick={onKick}
      />
      <Section
        label="Offline"
        members={offline}
        canKick={canKick}
        currentUserId={currentUserId}
        onKick={onKick}
      />
    </aside>
  )
}
