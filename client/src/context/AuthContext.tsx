import { useEffect, useState, type ReactNode } from "react"
import { authApi, type AuthUser } from "@/lib/api"
import { AuthContext } from "@/context/auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const { user } = await authApi.login({ email, password })
    setUser(user)
  }

  async function signup(username: string, email: string, password: string) {
    const { user } = await authApi.signup({ username, email, password })
    setUser(user)
  }

  async function logout() {
    await authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
