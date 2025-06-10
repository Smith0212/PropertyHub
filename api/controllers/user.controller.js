import prisma from "../lib/prisma.js"
import bcrypt from "bcryptjs"

// Utility function to validate ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        isOnline: true,
        lastSeen: true,
      },
    })
    res.status(200).json(users)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to get users!" })
  }
}

export const getUser = async (req, res) => {
  const id = req.params.id

  try {
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format!" })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        isOnline: true,
        lastSeen: true,
        posts: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
            address: true,
            city: true,
            bedroom: true,
            bathroom: true,
            type: true,
            property: true,
            createdAt: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ message: "User not found!" })
    }

    res.status(200).json(user)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to get user!" })
  }
}

export const updateUser = async (req, res) => {
  const id = req.params.id
  const tokenUserId = req.userId
  const { password, avatar, ...inputs } = req.body

  try {
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format!" })
    }

    if (id !== tokenUserId) {
      return res.status(403).json({ message: "Not Authorized!" })
    }

    let updatedPassword = null

    // Validate input
    if (inputs.username && (inputs.username.length < 3 || inputs.username.length > 20)) {
      return res.status(400).json({ message: "Username must be between 3 and 20 characters!" })
    }

    if (inputs.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email)) {
      return res.status(400).json({ message: "Invalid email format!" })
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters!" })
      }
      updatedPassword = await bcrypt.hash(password, 10)
    }

    // Check if username or email already exists (excluding current user)
    if (inputs.username || inputs.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                inputs.username ? { username: inputs.username } : {},
                inputs.email ? { email: inputs.email } : {},
              ].filter((obj) => Object.keys(obj).length > 0),
            },
          ],
        },
      })

      if (existingUser) {
        if (existingUser.username === inputs.username) {
          return res.status(400).json({ message: "Username already exists!" })
        }
        if (existingUser.email === inputs.email) {
          return res.status(400).json({ message: "Email already exists!" })
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...inputs,
        ...(updatedPassword && { password: updatedPassword }),
        ...(avatar && { avatar }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.status(200).json(updatedUser)
  } catch (err) {
    console.log(err)
    if (err.code === "P2002") {
      return res.status(400).json({ message: "Username or email already exists!" })
    }
    res.status(500).json({ message: "Failed to update user!" })
  }
}

export const deleteUser = async (req, res) => {
  const id = req.params.id
  const tokenUserId = req.userId

  try {
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format!" })
    }

    if (id !== tokenUserId) {
      return res.status(403).json({ message: "Not Authorized!" })
    }

    await prisma.user.delete({
      where: { id },
    })
    res.status(200).json({ message: "User deleted successfully!" })
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to delete user!" })
  }
}

export const savePost = async (req, res) => {
  const { postId } = req.body
  const tokenUserId = req.userId

  try {
    if (!postId) {
      return res.status(400).json({ message: "Post ID is required!" })
    }

    // Validate ObjectId format
    if (!isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID format!" })
    }

    // Validate post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return res.status(404).json({ message: "Post not found!" })
    }

    // Check if already saved
    const savedPost = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId: tokenUserId,
          postId,
        },
      },
    })

    if (savedPost) {
      // Remove from saved
      await prisma.savedPost.delete({
        where: {
          id: savedPost.id,
        },
      })
      res.status(200).json({ message: "Post removed from saved list", isSaved: false })
    } else {
      // Add to saved
      await prisma.savedPost.create({
        data: {
          userId: tokenUserId,
          postId,
        },
      })
      res.status(200).json({ message: "Post saved successfully", isSaved: true })
    }
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to save/unsave post!" })
  }
}

export const profilePosts = async (req, res) => {
  const tokenUserId = req.userId

  try {
    const userPosts = await prisma.post.findMany({
      where: { userId: tokenUserId },
      orderBy: { createdAt: "desc" },
    })

    const saved = await prisma.savedPost.findMany({
      where: { userId: tokenUserId },
      include: {
        post: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const savedPosts = saved.map((item) => item.post)

    res.status(200).json({ userPosts, savedPosts })
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to get profile posts!" })
  }
}

export const getNotificationNumber = async (req, res) => {
  const tokenUserId = req.userId

  try {
    const number = await prisma.chat.count({
      where: {
        userIDs: {
          hasSome: [tokenUserId],
        },
        NOT: {
          seenBy: {
            hasSome: [tokenUserId],
          },
        },
      },
    })

    res.status(200).json(number)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to get notifications!" })
  }
}

export const updateOnlineStatus = async (req, res) => {
  const tokenUserId = req.userId
  const { isOnline } = req.body

  try {
    await prisma.user.update({
      where: { id: tokenUserId },
      data: {
        isOnline: isOnline,
        lastSeen: new Date(),
      },
    })

    res.status(200).json({ message: "Status updated successfully!" })
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to update status!" })
  }
}
