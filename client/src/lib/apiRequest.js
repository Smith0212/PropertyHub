import axios from "axios"

const apiRequest = axios.create({
  baseURL: "https://propertyhub-j7dj.onrender.com/api", 
  withCredentials: true,
  timeout: 10000,
})

// Request interceptor
apiRequest.interceptors.request.use(
  (config) => {
    // Add any auth headers or other config here
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor
apiRequest.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem("user")
      window.location.href = "/login"
    } else if (error.response?.status === 403) {
      // Forbidden
      console.error("Access forbidden")
    } else if (error.response?.status >= 500) {
      // Server error
      console.error("Server error:", error.response?.data?.message || "Internal server error")
    } else if (error.code === "ECONNABORTED") {
      // Timeout
      console.error("Request timeout")
    } else if (!error.response) {
      // Network error
      console.error("Network error - please check your connection")
    }

    return Promise.reject(error)
  },
)

export default apiRequest
