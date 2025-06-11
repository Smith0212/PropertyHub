import axios from "axios"

// Determine the API URL based on environment
const getApiUrl = () => {
  if (typeof window !== "undefined") {
    // Client-side
    if (window.location.hostname === "localhost") {
      return "http://localhost:8800/api"
    }
    return "https://propertyhub-j7dj.onrender.com/api"
  }
  // Server-side or build time
  return "https://propertyhub-j7dj.onrender.com/api"
}

const apiRequest = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  timeout: 30000, // Increased timeout for production
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
apiRequest.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    console.error("Request error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor
apiRequest.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error("API Error:", error)

    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const message = error.response.data?.message || "An error occurred"

      switch (status) {
        case 401:
          // Unauthorized - clear local storage and redirect to login
          localStorage.removeItem("user")
          if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
            window.location.href = "/login"
          }
          break
        case 403:
          console.error("Access forbidden:", message)
          break
        case 404:
          console.error("Resource not found:", message)
          break
        case 429:
          console.error("Too many requests:", message)
          break
        case 500:
        case 502:
        case 503:
        case 504:
          console.error("Server error:", message)
          break
        default:
          console.error("HTTP error:", status, message)
      }
    } else if (error.request) {
      // Network error
      console.error("Network error - please check your connection")

      // Check if it's a CORS error
      if (error.message?.includes("CORS") || error.code === "ERR_NETWORK") {
        console.error("CORS error detected. Please check server configuration.")
      }
    } else {
      // Something else happened
      console.error("Request setup error:", error.message)
    }

    return Promise.reject(error)
  },
)

export default apiRequest
