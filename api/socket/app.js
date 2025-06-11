import { Server } from "socket.io"

// CORS configuration
// Define allowed origins for both development and production
const allowedOrigins = [
  "http://localhost:5173", // Local development
  "https://property-hub-ebon.vercel.app/", // Your production frontend
  process.env.CLIENT_URL // Environment variable if set
].filter(Boolean) // Remove any undefined values

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
})

let onlineUsers = []

const addUser = (userId, socketId) => {
  try {
    const userExists = onlineUsers.find((user) => user.userId === userId)
    if (!userExists) {
      onlineUsers.push({ userId, socketId })
      console.log(`✅ User ${userId} connected`)
    } else {
      // Update socket ID if user reconnects
      userExists.socketId = socketId
      console.log(`🔄 User ${userId} reconnected`)
    }
  } catch (error) {
    console.error("Error adding user:", error)
  }
}

const removeUser = (socketId) => {
  try {
    const user = onlineUsers.find((user) => user.socketId === socketId)
    if (user) {
      console.log(`❌ User ${user.userId} disconnected`)
    }
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socketId)
  } catch (error) {
    console.error("Error removing user:", error)
  }
}

const getUser = (userId) => {
  return onlineUsers.find((user) => user.userId === userId)
}

const getOnlineUsers = () => {
  return onlineUsers.map((user) => user.userId)
}

io.on("connection", (socket) => {
  console.log("🔌 A user connected:", socket.id)

  socket.on("newUser", (userId) => {
    try {
      if (userId && typeof userId === "string") {
        addUser(userId, socket.id)

        // Broadcast online users to all clients
        io.emit("getOnlineUsers", getOnlineUsers())

        // Notify others that this user is online
        socket.broadcast.emit("userOnline", userId)
      } else {
        console.error("Invalid userId provided:", userId)
      }
    } catch (error) {
      console.error("Error handling newUser:", error)
    }
  })

  socket.on("sendMessage", ({ receiverId, data }) => {
    try {
      if (!receiverId || !data) {
        console.error("Invalid message data:", { receiverId, data })
        return
      }

      const receiver = getUser(receiverId)
      if (receiver) {
        io.to(receiver.socketId).emit("getMessage", {
          ...data,
          chatId: data.chatId,
        })
        console.log(`📨 Message sent from ${data.userId} to ${receiverId}`)
      } else {
        console.log(`📱 User ${receiverId} is offline`)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  })

  socket.on("joinChat", (chatId) => {
    try {
      if (chatId && typeof chatId === "string") {
        socket.join(chatId)
        console.log(`🏠 Socket ${socket.id} joined chat ${chatId}`)
      }
    } catch (error) {
      console.error("Error joining chat:", error)
    }
  })

  socket.on("leaveChat", (chatId) => {
    try {
      if (chatId && typeof chatId === "string") {
        socket.leave(chatId)
        console.log(`🚪 Socket ${socket.id} left chat ${chatId}`)
      }
    } catch (error) {
      console.error("Error leaving chat:", error)
    }
  })

  socket.on("typing", ({ chatId, userId, isTyping }) => {
    try {
      if (chatId && userId && typeof isTyping === "boolean") {
        socket.to(chatId).emit("userTyping", { userId, isTyping })
      }
    } catch (error) {
      console.error("Error handling typing:", error)
    }
  })

  socket.on("disconnect", (reason) => {
    console.log("🔌 User disconnected:", socket.id, "Reason:", reason)

    try {
      const user = onlineUsers.find((user) => user.socketId === socket.id)

      if (user) {
        // Notify others that this user is offline
        socket.broadcast.emit("userOffline", user.userId)
      }

      removeUser(socket.id)

      // Broadcast updated online users list
      io.emit("getOnlineUsers", getOnlineUsers())
    } catch (error) {
      console.error("Error handling disconnect:", error)
    }
  })

  // Handle connection errors
  socket.on("error", (error) => {
    console.error("🚨 Socket error:", error)
  })
})

const PORT = process.env.SOCKET_PORT || 4000

const server = io.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`)
  console.log(`📊 Online users: ${onlineUsers.length}`)
})

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("🛑 Shutting down Socket.IO server...")

  // Notify all clients about server shutdown
  io.emit("serverShutdown", "Server is shutting down")

  // Close all connections
  io.close(() => {
    console.log("✅ Socket.IO server closed")
    process.exit(0)
  })
}

process.on("SIGTERM", gracefulShutdown)
process.on("SIGINT", gracefulShutdown)

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason)
})

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error)
  gracefulShutdown()
})

export default server
