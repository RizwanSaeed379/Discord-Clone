import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
  type FormEvent,
} from "react"
import { Hash, Users, Inbox, HelpCircle, SmilePlus, Trash2, MoreHorizontal } from "lucide-react"
import { type Channel, type Message } from "@/lib/api"
import { useMessages } from "@/hooks/useMessages"
import { useAuth } from "@/context/useAuth"
import { cn } from "@/lib/utils"

const SEVEN_MINUTES_MS = 7 * 60 * 1000

function isGroupStart(messages: Message[], index: number): boolean {
  if (index === 0) return true
  const prev = messages[index - 1]
  const curr = messages[index]
  if (prev.author_id !== curr.author_id) return true
  const gap = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
  return gap > SEVEN_MINUTES_MS
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  if (msgDay.getTime() === today.getTime()) return `Today at ${time}`
  if (msgDay.getTime() === yesterday.getTime()) return `Yesterday at ${time}`
  return `${d.toLocaleDateString()} ${time}`
}

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const USERNAME_COLORS = [
  "#e91e63", "#9c27b0", "#3f51b5", "#2196f3",
  "#009688", "#4caf50", "#ff9800", "#795548",
]
function usernameColor(id: number) {
  return USERNAME_COLORS[id % USERNAME_COLORS.length]
}

function MessageItem({
  msg,
  isStart,
  isOwn,
  onDelete,
}: {
  msg: Message
  isStart: boolean
  isOwn: boolean
  onDelete: (id: number) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn(
        "group relative flex gap-4 px-4 py-0.5 transition-colors",
        isStart ? "mt-4 pt-0.5" : "",
        hovered ? "bg-[#2e3035]" : "",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar / left spacer */}
      <div className="w-10 flex-none pt-0.5">
        {isStart ? (
          <div
            className="flex size-10 items-center justify-center rounded-full text-xs font-bold text-white select-none"
            style={{ background: usernameColor(msg.author_id) }}
          >
            {msg.author_username[0].toUpperCase()}
          </div>
        ) : (
          <span
            className={cn(
              "block text-right text-[11px] text-[#4e5058] leading-[1.375rem]",
              hovered ? "visible" : "invisible",
            )}
          >
            {formatShortTime(msg.created_at)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isStart && (
          <div className="flex items-baseline gap-2">
            <span
              className="cursor-pointer text-sm font-semibold hover:underline"
              style={{ color: usernameColor(msg.author_id) }}
            >
              {msg.author_username}
            </span>
            <span className="text-xs text-[#4e5058]">{formatTimestamp(msg.created_at)}</span>
          </div>
        )}
        <p className="break-words text-sm leading-[1.375rem] text-[#dcddde]">
          {msg.content}
          {msg.is_edited && (
            <span className="ml-1 text-[10px] text-[#4e5058]">(edited)</span>
          )}
        </p>
      </div>

      {/* Hover action bar */}
      {hovered && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-1 rounded-[4px] border border-[#1e1f22] bg-[#2b2d31] p-0.5 shadow-lg">
          <ActionBtn title="Add Reaction">
            <SmilePlus className="size-4" />
          </ActionBtn>
          <ActionBtn title="More">
            <MoreHorizontal className="size-4" />
          </ActionBtn>
          {isOwn && (
            <ActionBtn title="Delete Message" danger onClick={() => onDelete(msg.id)}>
              <Trash2 className="size-4" />
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  title,
  danger,
  onClick,
  children,
}: {
  title: string
  danger?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "rounded p-1 transition-colors",
        danger
          ? "text-[#b5bac1] hover:bg-[#f23f43] hover:text-white"
          : "text-[#b5bac1] hover:bg-[#404249] hover:text-[#f2f3f5]",
      )}
    >
      {children}
    </button>
  )
}

interface Props {
  channel: Channel
  serverId: number
  showMemberList: boolean
  onToggleMemberList: () => void
}

export function MessageView({ channel, showMemberList, onToggleMemberList }: Props) {
  const { user } = useAuth()
  const { messages, hasMore, loadingMore, loadMore, sendMessage, deleteMessage } = useMessages(
    channel.id,
  )
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)

  // Scroll to bottom on initial load and new messages when at bottom
  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" })
    }
  }, [messages])

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = distFromBottom < 80

    if (el.scrollTop < 120 && hasMore && !loadingMore) {
      loadMore()
    }
  }, [hasMore, loadingMore, loadMore])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    if (!draft.trim()) return
    sendMessage(draft)
    setDraft("")
    atBottomRef.current = true
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#313338]">
      {/* Channel header */}
      <header className="flex h-12 flex-none items-center gap-2 border-b border-black/20 px-4 shadow-sm">
        <Hash className="size-5 flex-none text-[#949ba4]" />
        <h2 className="font-semibold text-[#f2f3f5]">{channel.name}</h2>
        {channel.topic && (
          <>
            <div className="h-5 w-px bg-[#35373c]" />
            <p className="truncate text-sm text-[#949ba4]">{channel.topic}</p>
          </>
        )}
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={onToggleMemberList}
            title="Toggle Member List"
            className={cn(
              "transition-colors",
              showMemberList ? "text-[#f2f3f5]" : "text-[#949ba4] hover:text-[#dbdee1]",
            )}
          >
            <Users className="size-5" />
          </button>
          <button className="text-[#949ba4] hover:text-[#dbdee1] transition-colors" title="Inbox">
            <Inbox className="size-5" />
          </button>
          <button className="text-[#949ba4] hover:text-[#dbdee1] transition-colors" title="Help">
            <HelpCircle className="size-5" />
          </button>
        </div>
      </header>

      {/* Message list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-scroll"
      >
        {/* Channel start banner */}
        {!hasMore && (
          <div className="px-4 pt-14 pb-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#404249] mb-4">
              <Hash className="size-8 text-[#f2f3f5]" />
            </div>
            <h3 className="text-2xl font-bold text-[#f2f3f5]">Welcome to #{channel.name}!</h3>
            <p className="mt-1 text-sm text-[#949ba4]">
              This is the start of the #{channel.name} channel.
            </p>
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center py-2">
            <span className="text-xs text-[#949ba4]">Loading older messages…</span>
          </div>
        )}

        <div className="pb-4">
          {messages.map((msg, i) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              isStart={isGroupStart(messages, i)}
              isOwn={msg.author_id === user?.id}
              onDelete={deleteMessage}
            />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <div className="flex-none px-4 pb-6">
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); submit() }}
          className="flex items-center gap-2 rounded-lg bg-[#383a40] px-4"
        >
          <button
            type="button"
            className="flex-none text-[#949ba4] hover:text-[#dbdee1] transition-colors py-3"
          >
            <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
            rows={1}
            className="flex-1 resize-none bg-transparent py-3 text-sm text-[#dcddde] placeholder:text-[#4e5058] outline-none"
            style={{ maxHeight: "50vh" }}
            maxLength={2000}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = "auto"
              t.style.height = t.scrollHeight + "px"
            }}
          />
          <div className="flex flex-none items-center gap-2 py-3 text-[#949ba4]">
            <button type="button" className="hover:text-[#dbdee1] transition-colors" title="Emoji">
              <SmilePlus className="size-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
