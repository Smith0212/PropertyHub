import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { createServer } from "http"
import { Server } from "socket.io"
import authRoute from "./routes/auth.route.js"
import postRoute from "./routes/post.route.js"
import testRoute from "./routes/test.route.js"
import userRoute from "./routes/user.route.js"
import chatRoute from "./routes/chat.route.js"
import messageRoute from "./routes/message.route.js"
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js"

const app = express()
const server = createServer(app)

// TEMPORARY: Allow all origins for debugging
// TODO: Restrict this once we confirm it's working
const corsOptions = {
  origin: true, // This allows ALL origins - TEMPORARY for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}

console.log('🔧 CORS configured to allow ALL origins - THIS IS TEMPORARY FOR DEBUGGING')

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins temporarily
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
})

// Store online users
const onlineUsers = new Map()

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`)

  // Handle new user joining
  socket.on("newUser", (userId) => {
    if (userId) {
      onlineUsers.set(socket.id, userId)
      console.log(`User ${userId} is now online`)
      
      // Send updated online users list to all clients
      const userIds = Array.from(onlineUsers.values())
      io.emit("getOnlineUsers", userIds)
      
      // Notify others that this user came online
      socket.broadcast.emit("userOnline", userId)
    }
  })

  // Handle sending messages
  socket.on("sendMessage", (data) => {
    const { receiverId, message, senderId, chatId } = data
    
    // Find receiver's socket
    const receiverSocketId = Array.from(onlineUsers.entries())
      .find(([socketId, userId]) => userId === receiverId)?.[0]
    
    if (receiverSocketId) {
      // Send message to specific receiver
      io.to(receiverSocketId).emit("getMessage", {
        senderId,
        message,
        chatId,
        timestamp: new Date()
      })
    }
    
    // Also send back to sender for confirmation
    socket.emit("messageConfirmed", {
      senderId,
      receiverId,
      message,
      chatId,
      timestamp: new Date()
    })
  })

  // Handle typing indicators
  socket.on("typing", (data) => {
    const { receiverId, isTyping, senderId } = data
    const receiverSocketId = Array.from(onlineUsers.entries())
      .find(([socketId, userId]) => userId === receiverId)?.[0]
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", {
        userId: senderId,
        isTyping
      })
    }
  })

  // Handle user disconnect
  socket.on("disconnect", () => {
    const userId = onlineUsers.get(socket.id)
    if (userId) {
      onlineUsers.delete(socket.id)
      console.log(`User ${userId} disconnected`)
      
      // Send updated online users list
      const userIds = Array.from(onlineUsers.values())
      io.emit("getOnlineUsers", userIds)
      
      // Notify others that this user went offline
      socket.broadcast.emit("userOffline", userId)
    }
  })
})

// Apply CORS middleware
app.use(cors(corsOptions))
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cookieParser())

// Add a middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`)
  next()
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    onlineUsers: onlineUsers.size,
    corsMode: "ALLOW_ALL_ORIGINS_TEMPORARY",
    requestOrigin: req.headers.origin
  })
})

// API routes
app.use("/api/auth", authRoute)
app.use("/api/users", userRoute)
app.use("/api/posts", postRoute)
app.use("/api/test", testRoute)
app.use("/api/chats", chatRoute)
app.use("/api/messages", messageRoute)

app.get("/", (req, res) => {
  res.json({
    message: "PropertyHub API is running!",
    version: "1.0.0",
    corsMode: "ALLOW_ALL_ORIGINS_TEMPORARY",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      posts: "/api/posts",
      chats: "/api/chats",
      messages: "/api/messages",
    }
  })
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

const port = process.env.PORT || 8800

server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`)
  console.log(`📍 Health check: http://localhost:${port}/health`)
  console.log(`🌐 API base URL: http://localhost:${port}/api`)
  console.log(`🔌 Socket.IO server running on port ${port}`)
  console.log(`⚠️  CORS: ALLOWING ALL ORIGINS - TEMPORARY FOR DEBUGGING`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  io.close(() => {
    server.close(() => {
      process.exit(0)
    })
  })
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully")
  io.close(() => {
    server.close(() => {
      process.exit(0)
    })
  })
})

// Handle unhandled promise rejections
process.on("unhandled Rejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
})

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)
  process.exit(1)
})

// Export io for use in other files if needed
export { io }

// run: "npx prisma generate" to load environment variables