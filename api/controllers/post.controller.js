import prisma from "../lib/prisma.js"
import jwt from "jsonwebtoken"

// Utility function to validate ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export const getPosts = async (req, res) => {
  const query = req.query

  try {
    // Build where clause with proper type conversion
    const where = {}

    if (query.city && query.city.trim() !== "") {
      where.city = { contains: query.city.trim(), mode: "insensitive" }
    }

    if (query.type && query.type !== "") {
      where.type = query.type
    }

    if (query.property && query.property !== "") {
      where.property = query.property
    }

    if (query.bedroom && !isNaN(Number.parseInt(query.bedroom))) {
      where.bedroom = Number.parseInt(query.bedroom)
    }

    // Handle price range
    const minPrice =
      query.minPrice && !isNaN(Number.parseInt(query.minPrice)) ? Number.parseInt(query.minPrice) : undefined
    const maxPrice =
      query.maxPrice && !isNaN(Number.parseInt(query.maxPrice)) ? Number.parseInt(query.maxPrice) : undefined

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {}
      if (minPrice !== undefined && minPrice > 0) {
        where.price.gte = minPrice
      }
      if (maxPrice !== undefined && maxPrice > 0) {
        where.price.lte = maxPrice
      }
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: {
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
    })

    res.status(200).json(posts)
  } catch (err) {
    console.log("Error in getPosts:", err)
    res.status(500).json({ message: "Failed to get posts" })
  }
}

export const getPost = async (req, res) => {
  const id = req.params.id

  try {
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post ID format!" })
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        postDetail: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    if (!post) {
      return res.status(404).json({ message: "Post not found!" })
    }

    let isSaved = false

    // Check if user is logged in and if post is saved
    const token = req.cookies?.token
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET_KEY)
        const saved = await prisma.savedPost.findUnique({
          where: {
            userId_postId: {
              postId: id,
              userId: payload.id,
            },
          },
        })
        isSaved = !!saved
      } catch (err) {
        // Token invalid, continue with isSaved = false
        console.log("Token verification failed:", err.message)
      }
    }

    res.status(200).json({ ...post, isSaved })
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to get post" })
  }
}

export const addPost = async (req, res) => {
  const body = req.body
  const tokenUserId = req.userId

  try {
    // Validate required fields
    if (!body.postData || !body.postDetail) {
      return res.status(400).json({ message: "Missing required data!" })
    }

    const { postData, postDetail } = body

    // Validate postData
    if (!postData.title || !postData.price || !postData.address || !postData.city) {
      return res.status(400).json({ message: "Missing required post fields!" })
    }

    if (postData.price < 0) {
      return res.status(400).json({ message: "Price cannot be negative!" })
    }

    if (postData.bedroom < 0 || postData.bathroom < 0) {
      return res.status(400).json({ message: "Bedroom and bathroom count cannot be negative!" })
    }

    if (!postData.images || postData.images.length === 0) {
      return res.status(400).json({ message: "At least one image is required!" })
    }

    const newPost = await prisma.post.create({
      data: {
        ...postData,
        price: Number.parseInt(postData.price),
        bedroom: Number.parseInt(postData.bedroom),
        bathroom: Number.parseInt(postData.bathroom),
        userId: tokenUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        postDetail: {
          create: {
            ...postDetail,
            size: postDetail.size ? Number.parseInt(postDetail.size) : null,
            school: postDetail.school ? Number.parseInt(postDetail.school) : null,
            bus: postDetail.bus ? Number.parseInt(postDetail.bus) : null,
            restaurant: postDetail.restaurant ? Number.parseInt(postDetail.restaurant) : null,
          },
        },
      },
      include: {
        postDetail: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    res.status(201).json(newPost)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to create post" })
  }
}

export const updatePost = async (req, res) => {
  const id = req.params.id
  const tokenUserId = req.userId
  const body = req.body

  try {
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post ID format!" })
    }

    // Check if post exists and user owns it
    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: { postDetail: true },
    })

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found!" })
    }

    if (existingPost.userId !== tokenUserId) {
      return res.status(403).json({ message: "Not authorized!" })
    }

    const { postData, postDetail } = body

    // Update post and postDetail
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        ...postData,
        price: postData.price ? Number.parseInt(postData.price) : undefined,
        bedroom: postData.bedroom ? Number.parseInt(postData.bedroom) : undefined,
        bathroom: postData.bathroom ? Number.parseInt(postData.bathroom) : undefined,
        updatedAt: new Date(),
        postDetail: postDetail
          ? {
              update: {
                ...postDetail,
                size: postDetail.size ? Number.parseInt(postDetail.size) : undefined,
                school: postDetail.school ? Number.parseInt(postDetail.school) : undefined,
                bus: postDetail.bus ? Number.parseInt(postDetail.bus) : undefined,
                restaurant: postDetail.restaurant ? Number.parseInt(postDetail.restaurant) : undefined,
              },
            }
          : undefined,
      },
      include: {
        postDetail: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    res.status(200).json(updatedPost)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to update post" })
  }
}

export const deletePost = async (req, res) => {
  const id = req.params.id
  const tokenUserId = req.userId

  try {
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post ID format!" })
    }

    const post = await prisma.post.findUnique({
      where: { id },
    })

    if (!post) {
      return res.status(404).json({ message: "Post not found!" })
    }

    if (post.userId !== tokenUserId) {
      return res.status(403).json({ message: "Not Authorized!" })
    }

    await prisma.post.delete({
      where: { id },
    })

    res.status(200).json({ message: "Post deleted successfully" })
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Failed to delete post" })
  }
}
