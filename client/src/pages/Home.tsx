import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/useAuth"

export default function Home() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Welcome, {user?.username}</h1>
      <p className="text-muted-foreground">{user?.email}</p>
      <Button onClick={() => logout()}>Log out</Button>
    </div>
  )
}
