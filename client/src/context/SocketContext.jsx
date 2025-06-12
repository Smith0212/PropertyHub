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
      // Connect to the same port as your backend server
      const newSocket = io("https://propertyhub-j7dj.onrender.com", {
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        maxReconnectionAttempts: 5,
        withCredentials: true,
      })

      newSocket.on("connect", () => {
        console.log("Connected to socket server")
        setConnectionStatus("connected")
        newSocket.emit("newUser", currentUser.id)
      })

      newSocket.on("disconnect", (reason) => {
        console.log("Disconnected from socket server:", reason)
        setConnectionStatus("disconnected")
      })

      newSocket.on("reconnect", (attemptNumber) => {
        console.log("Reconnected to socket server after", attemptNumber, "attempts")
        setConnectionStatus("connected")
        newSocket.emit("newUser", currentUser.id)
      })

      newSocket.on("reconnect_attempt", (attemptNumber) => {
        console.log("Attempting to reconnect:", attemptNumber)
        setConnectionStatus("reconnecting")
      })

      newSocket.on("reconnect_error", (error) => {
        console.error("Reconnection failed:", error)
        setConnectionStatus("error")
      })

      newSocket.on("reconnect_failed", () => {
        console.error("Failed to reconnect after maximum attempts")
        setConnectionStatus("failed")
      })

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error)
        setConnectionStatus("error")
      })

      newSocket.on("getOnlineUsers", (users) => {
        console.log("Online users updated:", users)
        setOnlineUsers(users || [])
      })

      newSocket.on("userOnline", (userId) => {
        console.log("User came online:", userId)
        setOnlineUsers((prev) => [...new Set([...prev, userId])])
      })

      newSocket.on("userOffline", (userId) => {
        console.log("User went offline:", userId)
        setOnlineUsers((prev) => prev.filter((id) => id !== userId))
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
        setConnectionStatus("disconnected")
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
      }
      setOnlineUsers([])
      setConnectionStatus("disconnected")
    }
  }, [currentUser])

  // Update online status periodically
  useEffect(() => {
    if (!currentUser || !socket) return

    const updateStatus = async () => {
      try {
        await fetch("https://propertyhub-j7dj.onrender.com/api/users/status", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ isOnline: true }),
        })
      } catch (err) {
        console.error("Failed to update online status:", err)
      }
    }

    // Update status immediately and then every 30 seconds
    updateStatus()
    const interval = setInterval(updateStatus, 30000)

    return () => {
      clearInterval(interval)
      // Set offline status when unmounting
      fetch("https://propertyhub-j7dj.onrender.com/api/users/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ isOnline: false }),
      }).catch((err) => console.error("Failed to update offline status:", err))
    }
  }, [currentUser, socket])

  // Helper functions to use in your components
  const sendMessage = (receiverId, message, chatId) => {
    if (socket && currentUser) {
      socket.emit("sendMessage", {
        senderId: currentUser.id,
        receiverId,
        message,
        chatId,
        senderUsername: currentUser.username,
        senderAvatar: currentUser.avatar,
      })
    }
  }

  const sendTyping = (receiverId, isTyping) => {
    if (socket && currentUser) {
      socket.emit("typing", {
        senderId: currentUser.id,
        receiverId,
        isTyping,
      })
    }
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        connectionStatus,
        sendMessage,
        sendTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
