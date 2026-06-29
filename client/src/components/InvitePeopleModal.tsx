import { useState, type FormEvent } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X, Copy, Check, UserPlus } from "lucide-react"
import { serversApi, type Server, type Member } from "@/lib/api"

interface Props {
  server: Server
  open: boolean
  onClose: () => void
  canManageMembers: boolean
  onMemberAdded: (member: Member) => void
}

export function InvitePeopleModal({
  server,
  open,
  onClose,
  canManageMembers,
  onMemberAdded,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const inviteLink = `${window.location.origin}/invite/${server.invite_code}`

  function handleCopy() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!username.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await serversApi.addMember(server.id, username.trim())
      onMemberAdded({
        id: result.userId,
        username: result.username,
        email: "",
        role: "member",
      })
      setSuccess(`${result.username} was added to the server.`)
      setUsername("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "User not found")
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setUsername("")
    setError(null)
    setSuccess(null)
    onClose()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-[#313338] text-[#f2f3f5] shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Close
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full p-1 text-[#b5bac1] hover:text-[#f2f3f5] transition-colors"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>

          <div className="p-6">
            <h2 className="text-xl font-bold">Invite people to {server.name}</h2>

            {/* Invite link */}
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase text-[#b5bac1]">
                Share this link
              </p>
              <div className="flex items-center gap-2 rounded-[3px] bg-[#1e1f22] p-2">
                <code className="flex-1 truncate text-sm text-[#dcddde]">{inviteLink}</code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-[3px] bg-[#5865f2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4] transition-colors flex-none"
                >
                  {copied ? (
                    <><Check className="size-4" /> Copied</>
                  ) : (
                    <><Copy className="size-4" /> Copy</>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-[#949ba4]">
                Invite code: <span className="font-mono text-[#dcddde]">{server.invite_code}</span>
              </p>
            </div>

            {/* Add by username (admin/owner only) */}
            {canManageMembers && (
              <div className="mt-6 border-t border-[#3f4147] pt-6">
                <p className="mb-2 text-xs font-bold uppercase text-[#b5bac1]">
                  Add by username
                </p>
                <form onSubmit={handleAdd} className="flex gap-2">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter a username"
                    className="flex-1 rounded-[3px] bg-[#1e1f22] px-3 py-2 text-sm text-[#dcddde] placeholder:text-[#4e5058] outline-none focus:ring-2 focus:ring-[#5865f2]"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !username.trim()}
                    className="flex items-center gap-1.5 rounded-[3px] bg-[#5865f2] px-3 py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors flex-none"
                  >
                    <UserPlus className="size-4" />
                    Add
                  </button>
                </form>
                {error && <p className="mt-2 text-sm text-[#f23f43]">{error}</p>}
                {success && <p className="mt-2 text-sm text-[#23a55a]">{success}</p>}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
