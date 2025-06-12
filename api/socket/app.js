import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import authRoute from "./routes/auth.route.js"
import postRoute from "./routes/post.route.js"
import testRoute from "./routes/test.route.js"
import userRoute from "./routes/user.route.js"
import chatRoute from "./routes/chat.route.js"
import messageRoute from "./routes/message.route.js"
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js"

const app = express()

// Comprehensive CORS configuration
const allowedOrigins = [
  'https://property-hub-ebon.vercel.app',
  'https://propertyhub-j7dj.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
]

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cookie',
    'Set-Cookie',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}

console.log('🔧 CORS configured for origins:', allowedOrigins)

// Apply CORS middleware FIRST, before any other middleware
app.use(cors(corsOptions))

// Handle preflight requests explicitly
app.options('*', cors(corsOptions))

// Additional CORS headers middleware (fallback)
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cookie,Set-Cookie')
  res.header('Access-Control-Expose-Headers', 'Set-Cookie')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  next()
})

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cookieParser())

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`)
  next()
})

// Socket.IO setup with comprehensive CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cookie"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
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

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    onlineUsers: onlineUsers.size,
    corsOrigins: allowedOrigins,
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
    corsOrigins: allowedOrigins,
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      posts: "/api/posts",
      chats: "/api/chats",
      messages: "/api/messages",
      health: "/health",
    },
  })
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

const port = process.env.PORT || 8800

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${port}`)
  console.log(`📍 Health check: http://localhost:${port}/health`)
  console.log(`🌐 API base URL: http://localhost:${port}/api`)
  console.log(`🔌 Socket.IO server running on port ${port}`)
  console.log(`✅ CORS configured for origins:`, allowedOrigins)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully")
  process.exit(0)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
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
