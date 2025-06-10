import prisma from "../lib/prisma.js"

// Utility function to validate ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export const addMessage = async (req, res) => {
  const tokenUserId = req.userId
  const chatId = req.params.chatId
  const { text } = req.body

  try {
    // Validate ObjectId format
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID format!" })
    }

    // Validate input
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Message text is required!" })
    }

    if (text.length > 1000) {
      return res.status(400).json({ message: "Message is too long!" })
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

    // Create message
    const message = await prisma.message.create({
      data: {
        text: text.trim(),
        chatId,
        userId: tokenUserId,
        createdAt: new Date(),
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
    })

    // Update chat with last message info
    await prisma.chat.update({
      where: {
        id: chatId,
      },
      data: {
        seenBy: [tokenUserId],
        lastMessage: text.trim(),
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      },
    })

    res.status(201).json(message)
  } catch (err) {
    console.log("Error in addMessage:", err)
    res.status(500).json({ message: "Failed to send message!" })
  }
}

export const getMessages = async (req, res) => {
  const tokenUserId = req.userId
  const chatId = req.params.chatId
  const page = Number.parseInt(req.query.page) || 1
  const limit = Number.parseInt(req.query.limit) || 50
  const skip = (page - 1) * limit

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

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: {
        chatId: chatId,
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
      orderBy: {
        createdAt: "desc",
      },
      skip: skip,
      take: limit,
    })

    // Get total count for pagination
    const totalMessages = await prisma.message.count({
      where: {
        chatId: chatId,
      },
    })

    res.status(200).json({
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limit),
      },
    })
  } catch (err) {
    console.log("Error in getMessages:", err)
    res.status(500).json({ message: "Failed to get messages!" })
  }
}

export const deleteMessage = async (req, res) => {
  const tokenUserId = req.userId
  const messageId = req.params.messageId

  try {
    // Validate ObjectId format
    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message ID format!" })
    }

    // Find message and validate ownership
    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
      include: {
        chat: true,
      },
    })

    if (!message) {
      return res.status(404).json({ message: "Message not found!" })
    }

    // Check if user owns the message or has access to the chat
    if (message.userId !== tokenUserId && !message.chat.userIDs.includes(tokenUserId)) {
      return res.status(403).json({ message: "Not authorized!" })
    }

    // Delete message
    await prisma.message.delete({
      where: {
        id: messageId,
      },
    })

    // Update chat's last message if this was the last message
    const lastMessage = await prisma.message.findFirst({
      where: {
        chatId: message.chatId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    await prisma.chat.update({
      where: {
        id: message.chatId,
      },
      data: {
        lastMessage: lastMessage?.text || null,
        lastMessageAt: lastMessage?.createdAt || null,
        updatedAt: new Date(),
      },
    })

    res.status(200).json({ message: "Message deleted successfully!" })
  } catch (err) {
    console.log("Error in deleteMessage:", err)
    res.status(500).json({ message: "Failed to delete message!" })
  }
}
