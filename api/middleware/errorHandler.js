// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err)

  // Prisma errors
  if (err.code) {
    switch (err.code) {
      case "P2002":
        return res.status(400).json({
          message: "A record with this information already exists",
          field: err.meta?.target,
        })
      case "P2025":
        return res.status(404).json({
          message: "Record not found",
        })
      case "P2023":
        return res.status(400).json({
          message: "Invalid ID format",
        })
      case "P2032":
        return res.status(400).json({
          message: "Invalid data format",
          details: err.meta,
        })
      default:
        return res.status(500).json({
          message: "Database error occurred",
        })
    }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Invalid token",
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Token expired",
    })
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation error",
      details: err.message,
    })
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  })
}

// 404 handler
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  })
}
