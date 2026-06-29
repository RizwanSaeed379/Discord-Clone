const API_BASE = "/api"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.error ?? "Something went wrong", res.status)
  return data as T
}

export interface AuthUser {
  id: number
  username: string
  email: string
}

export interface Server {
  id: number
  name: string
  icon_url: string | null
  invite_code: string
  owner_id: number
}

export interface Channel {
  id: number
  server_id?: number
  name: string
  type: "text"
  position: number
  topic: string | null
}

export interface Message {
  id: number
  channel_id: number
  author_id: number
  author_username: string
  content: string
  is_edited: boolean
  created_at: string
  updated_at: string
}

export interface Member {
  id: number
  username: string
  email: string
  role: "owner" | "admin" | "member"
}

export const authApi = {
  signup: (body: { username: string; email: string; password: string }) =>
    request<{ user: AuthUser }>("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: AuthUser }>("/auth/me"),
}

export const serversApi = {
  list: () => request<{ servers: Server[] }>("/servers"),
  create: (name: string) =>
    request<{ server: Server; defaultChannel: Channel }>("/servers", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  join: (inviteCode: string) =>
    request<{ server: Server }>("/servers/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    }),
  get: (id: number) => request<{ server: Server }>(`/servers/${id}`),
  update: (id: number, data: { name: string; icon_url?: string }) =>
    request<{ server: Server }>(`/servers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<{ ok: true }>(`/servers/${id}`, { method: "DELETE" }),
  members: (id: number) => request<{ members: Member[] }>(`/servers/${id}/members`),
  addMember: (serverId: number, username: string) =>
    request<{ ok: true; userId: number; username: string }>(`/servers/${serverId}/members`, {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
  removeMember: (serverId: number, userId: number) =>
    request<{ ok: true }>(`/servers/${serverId}/members/${userId}`, { method: "DELETE" }),
  channels: (id: number) => request<{ channels: Channel[] }>(`/servers/${id}/channels`),
  createChannel: (serverId: number, name: string) =>
    request<{ channel: Channel }>(`/servers/${serverId}/channels`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
}

export const channelsApi = {
  update: (id: number, data: { name: string; topic?: string }) =>
    request<{ channel: Channel }>(`/channels/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<{ ok: true }>(`/channels/${id}`, { method: "DELETE" }),
  messages: (id: number, before?: number) =>
    request<{ messages: Message[] }>(
      `/channels/${id}/messages${before ? `?before=${before}` : ""}`,
    ),
  sendMessage: (id: number, content: string) =>
    request<{ message: Message }>(`/channels/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  deleteMessage: (id: number) =>
    request<{ ok: true }>(`/channels/messages/${id}`, { method: "DELETE" }),
  editMessage: (id: number, content: string) =>
    request<{ message: Message }>(`/channels/messages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),
}
