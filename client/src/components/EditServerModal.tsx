import { useState, useEffect, type FormEvent } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { serversApi, type Server } from "@/lib/api"

interface Props {
  server: Server
  open: boolean
  onClose: () => void
  onUpdated: (server: Server) => void
}

export function EditServerModal({ server, open, onClose, onUpdated }: Props) {
  const [name, setName] = useState(server.name)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (open) setName(server.name) }, [open, server.name])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const { server: updated } = await serversApi.update(server.id, { name: name.trim() })
      onUpdated(updated)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-[#313338] text-[#f2f3f5] shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Close
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-[#b5bac1] hover:text-[#f2f3f5] transition-colors"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>

          <form onSubmit={handleSubmit} className="p-8">
            <h2 className="text-xl font-bold">Server Settings</h2>
            <p className="mt-1 text-sm text-[#949ba4]">Update your server's name.</p>

            <div className="mt-6">
              <label className="block text-xs font-bold uppercase text-[#b5bac1] mb-2">
                Server Name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[3px] bg-[#1e1f22] px-3 py-2 text-[#dcddde] placeholder:text-[#4e5058] outline-none focus:ring-2 focus:ring-[#5865f2]"
                maxLength={100}
                required
              />
            </div>

            {error && <p className="mt-3 text-sm text-[#f23f43]">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[3px] px-4 py-2 text-sm font-medium text-[#b5bac1] hover:text-[#f2f3f5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim() || name === server.name}
                className="rounded-[3px] bg-[#5865f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
