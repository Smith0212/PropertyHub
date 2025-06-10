import prisma from "../lib/prisma.js"

// Utility function to validate ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export const getChats = async (req, res) => {
  const tokenUserId = req.userId

  try {
    const chats = await prisma.chat.findMany({
      where: {
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Get receiver information for each chat
    const chatsWithReceivers = await Promise.all(
      chats.map(async (chat) => {
        const receiverId = chat.userIDs.find((id) => id !== tokenUserId)

        if (!receiverId) {
          return { ...chat, receiver: null, unreadCount: 0 }
        }

        const receiver = await prisma.user.findUnique({
          where: {
            id: receiverId,
          },
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
            lastSeen: true,
          },
        })

        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            chatId: chat.id,
            userId: { not: tokenUserId },
            isRead: false,
          },
        })

        return {
          ...chat,
          receiver,
          unreadCount,
        }
      }),
    )

    res.status(200).json(chatsWithReceivers)
  } catch (err) {
    console.log("Error in getChats:", err)
    res.status(500).json({ message: "Failed to get chats!" })
  }
}

export const getChat = async (req, res) => {
  const tokenUserId = req.userId
  const chatId = req.params.id

  try {
    // Validate ObjectId format
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID format!" })
    }

    // Validate chat exists and user has access
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    if (!chat) {
      return res.status(404).json({ message: "Chat not found!" })
    }

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        chatId: chatId,
        userId: { not: tokenUserId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    // Update chat seenBy
    const updatedSeenBy = chat.seenBy.includes(tokenUserId) ? chat.seenBy : [...chat.seenBy, tokenUserId]

    await prisma.chat.update({
      where: {
        id: chatId,
      },
      data: {
        seenBy: updatedSeenBy,
        updatedAt: new Date(),
      },
    })

    res.status(200).json(chat)
  } catch (err) {
    console.log("Error in getChat:", err)
    res.status(500).json({ message: "Failed to get chat!" })
  }
}

export const addChat = async (req, res) => {
  const tokenUserId = req.userId
  const { receiverId } = req.body

  try {
    // Validate ObjectId format
    if (!isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID format!" })
    }

    // Validate receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    })

    if (!receiver) {
      return res.status(404).json({ message: "User not found!" })
    }

    if (receiverId === tokenUserId) {
      return res.status(400).json({ message: "Cannot create chat with yourself!" })
    }

    // Check if chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [{ userIDs: { hasSome: [tokenUserId] } }, { userIDs: { hasSome: [receiverId] } }],
      },
    })

    if (existingChat) {
      return res.status(200).json(existingChat)
    }

    // Create new chat
    const newChat = await prisma.chat.create({
      data: {
        userIDs: [tokenUserId, receiverId],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        messages: true,
      },
    })

    res.status(201).json(newChat)
  } catch (err) {
    console.log("Error in addChat:", err)
    res.status(500).json({ message: "Failed to create chat!" })
  }
}

export const readChat = async (req, res) => {
  const tokenUserId = req.userId
  const chatId = req.params.id

  try {
    // Validate ObjectId format
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID format!" })
    }

    // Validate chat exists and user has access
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    })

    if (!chat) {
      return res.status(404).json({ message: "Chat not found!" })
    }

    // Mark all messages in this chat as read
    await prisma.message.updateMany({
      where: {
        chatId: chatId,
        userId: { not: tokenUserId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    // Update chat seenBy
    const updatedChat = await prisma.chat.update({
      where: {
        id: chatId,
      },
      data: {
        seenBy: [tokenUserId],
        updatedAt: new Date(),
      },
    })

    res.status(200).json(updatedChat)
  } catch (err) {
    console.log("Error in readChat:", err)
    res.status(500).json({ message: "Failed to mark chat as read!" })
  }
}

export const deleteChat = async (req, res) => {
  const tokenUserId = req.userId
  const chatId = req.params.id

  try {
    // Validate ObjectId format
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID format!" })
    }

    // Validate chat exists and user has access
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    })

    if (!chat) {
      return res.status(404).json({ message: "Chat not found!" })
    }

    // Delete all messages first (due to foreign key constraints)
    await prisma.message.deleteMany({
      where: {
        chatId: chatId,
      },
    })

    // Delete the chat
    await prisma.chat.delete({
      where: {
        id: chatId,
      },
    })

    res.status(200).json({ message: "Chat deleted successfully!" })
  } catch (err) {
    console.log("Error in deleteChat:", err)
    res.status(500).json({ message: "Failed to delete chat!" })
  }
}
