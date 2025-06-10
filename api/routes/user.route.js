import express from "express"
import {
  deleteUser,
  getUsers,
  getUser,
  updateUser,
  savePost,
  profilePosts,
  getNotificationNumber,
  updateOnlineStatus,
} from "../controllers/user.controller.js"
import { verifyToken } from "../middleware/verifyToken.js"

const router = express.Router()

// Put specific routes BEFORE parameterized routes
router.get("/notification", verifyToken, getNotificationNumber)
router.get("/profilePosts", verifyToken, profilePosts)
router.post("/save", verifyToken, savePost)
router.put("/status", verifyToken, updateOnlineStatus)

// General routes
router.get("/", getUsers)
router.get("/:id", getUser)
router.put("/:id", verifyToken, updateUser)
router.delete("/:id", verifyToken, deleteUser)

export default router
