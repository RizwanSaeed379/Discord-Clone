import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import Login from "@/pages/Login"
import Signup from "@/pages/Signup"
import AppLayout from "@/pages/AppLayout"

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/channels/@me" element={<AppLayout />} />
          <Route path="/channels/:serverId" element={<AppLayout />} />
          <Route path="/channels/:serverId/:channelId" element={<AppLayout />} />
        </Route>
        <Route path="*" element={<Navigate to="/channels/@me" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
