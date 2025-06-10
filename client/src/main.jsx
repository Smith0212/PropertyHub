import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./index.scss"
import { AuthContextProvider } from "./context/AuthContext.jsx"
import { SocketContextProvider } from "./context/SocketContext.jsx"
import ErrorBoundary from "./components/errorBoundary/ErrorBoundary.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthContextProvider>
        <SocketContextProvider>
          <App />
        </SocketContextProvider>
      </AuthContextProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
