"use client"

import { useContext, useState } from "react"
import "./login.scss"
import { Link, useNavigate } from "react-router-dom"
import apiRequest from "../../lib/apiRequest"
import { AuthContext } from "../../context/AuthContext"

function Login() {
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { updateUser } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.target)
    const username = formData.get("username")
    const password = formData.get("password")

    // Client-side validation
    if (!username || !password) {
      setError("Please fill in all fields")
      setIsLoading(false)
      return
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters")
      setIsLoading(false)
      return
    }

    try {
      console.log("Attempting login for user:", username)

      const res = await apiRequest.post("/auth/login", {
        username: username.trim(),
        password,
      })

      console.log("Login successful:", res.data)
      updateUser(res.data)
      navigate("/")
    } catch (err) {
      console.error("Login error:", err)

      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.code === "ERR_NETWORK") {
        setError("Network error. Please check your connection and try again.")
      } else if (err.message?.includes("CORS")) {
        setError("Connection error. Please try again later.")
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login">
      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            type="text"
            placeholder="Username"
            disabled={isLoading}
          />
          <input name="password" type="password" required minLength={6} placeholder="Password" disabled={isLoading} />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
          {error && <span className="error">{error}</span>}
          <Link to="/register">{"Don't"} you have an account?</Link>
        </form>
      </div>
      <div className="imgContainer">
        <img src="/bg.png" alt="" />
      </div>
    </div>
  )
}

export default Login
