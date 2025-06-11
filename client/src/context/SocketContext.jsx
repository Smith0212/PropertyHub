"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { io } from "socket.io-client"
import { AuthContext } from "./AuthContext"

export const SocketContext = createContext()

export const SocketContextProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext)
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [connectionStatus, setConnectionStatus] = useState("disconnected")

  useEffect(() => {
    if (currentUser) {
      console.log("🔌 Connecting to socket server...")
      
      const newSocket = io("https://propertyhub-j7dj.onrender.com", {
        transports: ["websocket", "polling"],
        timeout: 30000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        maxReconnectionAttempts: 10,
        withCredentials: true,
        autoConnect: true,
        forceNew: true,
        // Additional options for better connection stability
        upgrade: true,
        rememberUpgrade: true,
        secure: true,
        rejectUnauthorized: false
      })

      newSocket.on("connect", () => {
        console.log("✅ Connected to socket server with ID:", newSocket.id)
        setConnectionStatus("connected")
        newSocket.emit("newUser", currentUser.id)
      })

      newSocket.on("disconnect", (reason) => {
        console.log("❌ Disconnected from socket server:", reason)
        setConnectionStatus("disconnected")
        
        // If disconnect was due to transport error, try to reconnect
        if (reason === "transport error" || reason === "transport close") {
          console.log("🔄 Transport error, attempting manual reconnect...")
          setTimeout(() => {
            if (!newSocket.connected) {
              newSocket.connect()
            }
          }, 2000)
        }
      })

      newSocket.on("reconnect", (attemptNumber) => {
        console.log("🔄 Reconnected to socket server after", attemptNumber, "attempts")
        setConnectionStatus("connected")
        if (currentUser?.id) {
          newSocket.emit("newUser", currentUser.id)
        }
      })

      newSocket.on("reconnect_attempt", (attemptNumber) => {
        console.log("🔄 Attempting to reconnect:", attemptNumber)
        setConnectionStatus("reconnecting")
      })

      newSocket.on("reconnect_error", (error) => {
        console.error("❌ Reconnection failed:", error.message || error)
        setConnectionStatus("error")
      })

      newSocket.on("reconnect_failed", () => {
        console.error("❌ Failed to reconnect after maximum attempts")
        setConnectionStatus("failed")
      })

      newSocket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error.message || error)
        setConnectionStatus("error")
        
        // Try different transport on connection error
        if (error.message && error.message.includes('websocket')) {
          console.log("🔄 WebSocket failed, trying polling...")
          newSocket.io.opts.transports = ["polling"]
        }
      })

      // Socket event handlers
      newSocket.on("getOnlineUsers", (users) => {
        console.log("👥 Online users updated:", users)
        setOnlineUsers(users || [])
      })

      newSocket.on("userOnline", (userId) => {
        console.log("🟢 User came online:", userId)
        setOnlineUsers((prev) => [...new Set([...prev, userId])])
      })

      newSocket.on("userOffline", (userId) => {
        console.log("🔴 User went offline:", userId)
        setOnlineUsers((prev) => prev.filter((id) => id !== userId))
      })

      // Handle incoming messages
      newSocket.on("getMessage", (data) => {
        console.log("💬 Received message:", data)
        // You can dispatch this to a global state or handle it in your chat component
        // Example: dispatch({ type: 'NEW_MESSAGE', payload: data })
      })

      // Handle message confirmation
      newSocket.on("messageConfirmed", (data) => {
        console.log("✅ Message confirmed:", data)
        // Handle message confirmation in your chat component
      })

      // Handle typing indicators
      newSocket.on("userTyping", (data) => {
        console.log("⌨️ User typing:", data)
        // Handle typing indicator in your chat component
      })

      // Handle generic errors
      newSocket.on("error", (error) => {
        console.error("🚨 Socket error:", error)
      })

      setSocket(newSocket)

      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up socket connection...")
        if (newSocket) {
          newSocket.removeAllListeners()
          newSocket.close()
        }
        setSocket(null)
        setConnectionStatus("disconnected")
        setOnlineUsers([])
      }
    } else {
      // User is not authenticated
      if (socket) {
        console.log("🔐 User not authenticated, closing socket...")
        socket.removeAllListeners()
        socket.close()
        setSocket(null)
      }
      setOnlineUsers([])
      setConnectionStatus("disconnected")
    }
  }, [currentUser?.id]) // Only depend on currentUser.id to avoid unnecessary reconnections

  // Helper functions to use in your components
  const sendMessage = (receiverId, message, chatId) => {
    if (socket && socket.connected && currentUser) {
      console.log("📤 Sending message:", { receiverId, message, chatId })
      socket.emit("sendMessage", {
        senderId: currentUser.id,
        receiverId,
        message,
        chatId
      })
      return true
    } else {
      console.error("❌ Cannot send message: socket not connected or user not authenticated")
      return false
    }
  }

  const sendTyping = (receiverId, isTyping) => {
    if (socket && socket.connected && currentUser) {
      socket.emit("typing", {
        senderId: currentUser.id,
        receiverId,
        isTyping
      })
      return true
    }
    return false
  }

  // Function to manually reconnect
  const reconnect = () => {
    if (socket && !socket.connected) {
      console.log("🔄 Manual reconnection attempt...")
      socket.connect()
    }
  }

  // Function to check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId)
  }

  const contextValue = {
    socket,
    onlineUsers,
    connectionStatus,
    sendMessage,
    sendTyping,
    reconnect,
    isUserOnline,
    isConnected: socket?.connected || false
  }

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  )
}