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

// Define allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://property-hub-ebon.vercel.app",
  "https://property-hub-smit-sutariyas-projects.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean) // Remove any undefined values

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log(`CORS blocked origin: ${origin}`)
      console.log(`Allowed origins: ${allowedOrigins.join(", ")}`)
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200,
  preflightContinue: false,
}

// Apply CORS middleware
app.use(cors(corsOptions))

// Handle preflight requests explicitly
app.options("*", cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cookieParser())

// Security headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("X-Content-Type-Options", "nosniff")
  res.header("X-Frame-Options", "DENY")
  res.header("X-XSS-Protection", "1; mode=block")
  next()
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    allowedOrigins: allowedOrigins,
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
    environment: process.env.NODE_ENV || "development",
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

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`)
  console.log(`📍 Health check: http://localhost:${port}/health`)
  console.log(`🌐 API base URL: http://localhost:${port}/api`)
  console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(", ")}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`)
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
