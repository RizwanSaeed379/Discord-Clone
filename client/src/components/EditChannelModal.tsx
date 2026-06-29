import { useState, useEffect, type FormEvent } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { channelsApi, type Channel } from "@/lib/api"

interface Props {
  channel: Channel
  open: boolean
  onClose: () => void
  onUpdated: (channel: Channel) => void
  onDeleted: (channelId: number) => void
}

export function EditChannelModal({ channel, open, onClose, onUpdated, onDeleted }: Props) {
  const [name, setName] = useState(channel.name)
  const [topic, setTopic] = useState(channel.topic ?? "")
  const [tab, setTab] = useState<"overview" | "delete">("overview")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(channel.name)
      setTopic(channel.topic ?? "")
      setTab("overview")
      setError(null)
    }
  }, [open, channel])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const { channel: updated } = await channelsApi.update(channel.id, {
        name: name.trim(),
        topic: topic.trim() || undefined,
      })
      onUpdated(updated)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete #${channel.name}? All messages will be lost.`)) return
    setSubmitting(true)
    try {
      await channelsApi.delete(channel.id)
      onDeleted(channel.id)
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
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex w-[600px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[4px] bg-[#313338] text-[#f2f3f5] shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Sidebar */}
          <div className="w-44 flex-none bg-[#2b2d31] p-4">
            <p className="mb-2 text-xs font-bold uppercase text-[#949ba4] px-2">
              #{channel.name}
            </p>
            <button
              onClick={() => setTab("overview")}
              className={`w-full rounded-[4px] px-2 py-1.5 text-left text-sm transition-colors ${
                tab === "overview"
                  ? "bg-[#404249] text-[#f2f3f5]"
                  : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
              }`}
            >
              Overview
            </button>
            <div className="my-2 h-px bg-[#3f4147]" />
            <button
              onClick={() => setTab("delete")}
              className="w-full rounded-[4px] px-2 py-1.5 text-left text-sm text-[#f23f43] hover:bg-[#f23f43]/10 transition-colors"
            >
              Delete Channel
            </button>
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-y-auto p-8">
            <DialogPrimitive.Close
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-[#b5bac1] hover:text-[#f2f3f5] transition-colors"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>

            {tab === "overview" && (
              <form onSubmit={handleSave}>
                <h2 className="text-xl font-bold">Channel Settings</h2>

                <div className="mt-6">
                  <label className="block text-xs font-bold uppercase text-[#b5bac1] mb-2">
                    Channel Name
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-[3px] bg-[#1e1f22] px-3 py-2 text-[#dcddde] outline-none focus:ring-2 focus:ring-[#5865f2]"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase text-[#b5bac1] mb-2">
                    Channel Topic
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={3}
                    placeholder="Let everyone know how to use this channel!"
                    className="w-full resize-none rounded-[3px] bg-[#1e1f22] px-3 py-2 text-[#dcddde] placeholder:text-[#4e5058] outline-none focus:ring-2 focus:ring-[#5865f2]"
                    maxLength={1024}
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
                    disabled={submitting || !name.trim()}
                    className="rounded-[3px] bg-[#5865f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {tab === "delete" && (
              <div>
                <h2 className="text-xl font-bold text-[#f23f43]">Delete Channel</h2>
                <p className="mt-2 text-sm text-[#949ba4]">
                  Are you sure you want to delete{" "}
                  <strong className="text-[#f2f3f5]">#{channel.name}</strong>? This will
                  permanently delete all messages in this channel. This action cannot be undone.
                </p>
                {error && <p className="mt-3 text-sm text-[#f23f43]">{error}</p>}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={onClose}
                    className="rounded-[3px] bg-[#4e5058] px-4 py-2 text-sm font-medium text-[#f2f3f5] hover:bg-[#6d6f78] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={submitting}
                    className="rounded-[3px] bg-[#f23f43] px-4 py-2 text-sm font-medium text-white hover:bg-[#da373c] disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "Deleting..." : "Delete Channel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
