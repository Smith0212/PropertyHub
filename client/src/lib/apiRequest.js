import axios from "axios"

const apiRequest = axios.create({
  baseURL: "https://propertyhub-j7dj.onrender.com/api",
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
})

// Request interceptor
apiRequest.interceptors.request.use(
  (config) => {
    // Log request for debugging
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    
    // Ensure proper headers
    if (!config.headers['Content-Type'] && config.data) {
      config.headers['Content-Type'] = 'application/json'
    }
    
    // Add any auth headers if available
    const user = localStorage.getItem("user")
    if (user) {
      try {
        const userData = JSON.parse(user)
        if (userData.token) {
          config.headers.Authorization = `Bearer ${userData.token}`
        }
      } catch (error) {
        console.warn("Failed to parse user data from localStorage")
      }
    }
    
    return config
  },
  (error) => {
    console.error("🚨 Request interceptor error:", error)
    return Promise.reject(error)
  }
)

// Response interceptor
apiRequest.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`)
    return response
  },
  (error) => {
    // Enhanced error handling
    const { response, request, message, code } = error
    
    console.error("🚨 API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: response?.status,
      message: message,
      code: code
    })

    if (response) {
      // Server responded with error status
      const status = response.status
      const data = response.data
      
      switch (status) {
        case 400:
          console.error("❌ Bad Request:", data?.message || "Invalid request")
          break
        case 401:
          console.error("🔐 Unauthorized - redirecting to login")
          localStorage.removeItem("user")
          // Only redirect if we're not already on the login page
          if (window.location.pathname !== "/login") {
            window.location.href = "/login"
          }
          break
        case 403:
          console.error("🚫 Forbidden:", data?.message || "Access denied")
          break
        case 404:
          console.error("🔍 Not Found:", data?.message || "Resource not found")
          break
        case 429:
          console.error("⏰ Rate Limited:", data?.message || "Too many requests")
          break
        case 500:
          console.error("🔥 Server Error:", data?.message || "Internal server error")
          break
        case 502:
          console.error("🌐 Bad Gateway:", data?.message || "Server is down")
          break
        case 503:
          console.error("🚧 Service Unavailable:", data?.message || "Server maintenance")
          break
        default:
          console.error(`❓ HTTP ${status}:`, data?.message || "Unknown error")
      }
    } else if (request) {
      // Network error - request made but no response
      if (code === "ECONNABORTED" || message.includes("timeout")) {
        console.error("⏰ Request timeout - server is taking too long to respond")
      } else if (code === "ERR_NETWORK" || message.includes("Network Error")) {
        console.error("🌐 Network error - please check your internet connection")
      } else if (code === "ERR_INTERNET_DISCONNECTED") {
        console.error("📡 No internet connection")
      } else {
        console.error("🔌 Connection error:", message)
      }
    } else {
      // Something else happened
      console.error("❓ Unexpected error:", message)
    }
    
    return Promise.reject(error)
  }
)

// Helper function to handle common API patterns
export const handleApiError = (error, defaultMessage = "Something went wrong") => {
  if (error.response?.data?.message) {
    return error.response.data.message
  } else if (error.message) {
    return error.message
  } else {
    return defaultMessage
  }
}

// Helper function to check if error is network related
export const isNetworkError = (error) => {
  return !error.response && (
    error.code === "ERR_NETWORK" || 
    error.code === "ECONNABORTED" ||
    error.message.includes("Network Error") ||
    error.message.includes("timeout")
  )
}

// Helper function to retry requests
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      if (i === maxRetries - 1 || !isNetworkError(error)) {
        throw error
      }
      console.log(`🔄 Retrying request (${i + 1}/${maxRetries}) in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
}

export default apiRequest