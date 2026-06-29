import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipPrimitive.Provider delayDuration={300}>
        <App />
      </TooltipPrimitive.Provider>
    </BrowserRouter>
  </StrictMode>,
)
