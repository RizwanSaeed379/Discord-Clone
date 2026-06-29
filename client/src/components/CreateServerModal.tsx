import { useState, type FormEvent } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { serversApi, type Server, type Channel } from "@/lib/api"

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (server: Server, defaultChannel: Channel) => void
}

export function CreateServerModal({ open, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<"pick" | "create" | "join">("pick")
  const [name, setName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleClose() {
    setMode("pick")
    setName("")
    setInviteCode("")
    setError(null)
    onClose()
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const { server, defaultChannel } = await serversApi.create(name.trim())
      onCreated(server, defaultChannel)
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const { server } = await serversApi.join(inviteCode.trim())
      onCreated(server, { id: 0, name: "", type: "text", position: 0, topic: null })
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid invite code")
    } finally {
      setSubmitting(false)
    }
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

          {mode === "pick" && (
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold">Create your server</h2>
              <p className="mt-2 text-sm text-[#949ba4]">
                Your server is where you and your friends hang out. Make yours and start talking.
              </p>
              <button
                onClick={() => setMode("create")}
                className="mt-6 flex w-full items-center gap-4 rounded-[3px] border border-[#3f4147] px-4 py-3 hover:bg-[#35373c] transition-colors"
              >
                <span className="text-2xl">🚀</span>
                <div className="text-left">
                  <p className="font-semibold">Create My Own</p>
                </div>
                <span className="ml-auto text-[#b5bac1]">›</span>
              </button>
              <div className="mt-6">
                <p className="text-xs uppercase font-semibold text-[#949ba4] mb-3">
                  Already have an invite?
                </p>
                <button
                  onClick={() => setMode("join")}
                  className="w-full rounded-[3px] bg-[#4e5058] py-2 font-medium hover:bg-[#6d6f78] transition-colors"
                >
                  Join a Server
                </button>
              </div>
            </div>
          )}

          {mode === "create" && (
            <form onSubmit={handleCreate} className="p-8">
              <button
                type="button"
                onClick={() => setMode("pick")}
                className="mb-4 flex items-center gap-1 text-sm text-[#b5bac1] hover:text-[#f2f3f5] transition-colors"
              >
                ‹ Back
              </button>
              <h2 className="text-2xl font-bold">Customize your server</h2>
              <p className="mt-2 text-sm text-[#949ba4]">
                Give your new server a personality with a name. You can always change it later.
              </p>

              <div className="mt-6">
                <label className="block text-xs font-bold uppercase text-[#b5bac1] mb-2">
                  Server Name
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Server"
                  className="w-full rounded-[3px] bg-[#1e1f22] px-3 py-2 text-[#dcddde] placeholder:text-[#4e5058] outline-none focus:ring-2 focus:ring-[#5865f2]"
                  maxLength={100}
                  required
                />
              </div>

              {error && <p className="mt-3 text-sm text-[#f23f43]">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="mt-6 w-full rounded-[3px] bg-[#5865f2] py-2 font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </form>
          )}

          {mode === "join" && (
            <form onSubmit={handleJoin} className="p-8">
              <button
                type="button"
                onClick={() => setMode("pick")}
                className="mb-4 flex items-center gap-1 text-sm text-[#b5bac1] hover:text-[#f2f3f5] transition-colors"
              >
                ‹ Back
              </button>
              <h2 className="text-2xl font-bold">Join a Server</h2>
              <p className="mt-2 text-sm text-[#949ba4]">
                Enter an invite code below to join an existing server.
              </p>

              <div className="mt-6">
                <label className="block text-xs font-bold uppercase text-[#b5bac1] mb-2">
                  Invite Code
                </label>
                <input
                  autoFocus
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. xQf3kzRa"
                  className="w-full rounded-[3px] bg-[#1e1f22] px-3 py-2 text-[#dcddde] placeholder:text-[#4e5058] outline-none focus:ring-2 focus:ring-[#5865f2]"
                  required
                />
              </div>

              {error && <p className="mt-3 text-sm text-[#f23f43]">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !inviteCode.trim()}
                className="mt-6 w-full rounded-[3px] bg-[#5865f2] py-2 font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Joining..." : "Join Server"}
              </button>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
