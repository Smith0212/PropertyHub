"use client"

import "./register.scss"
import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import apiRequest from "../../lib/apiRequest"

function Register() {
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    setSuccess(false)

    const formData = new FormData(e.target)
    const username = formData.get("username")
    const email = formData.get("email")
    const password = formData.get("password")

    // Client-side validation
    if (!username || !email || !password) {
      setError("Please fill in all fields")
      setIsLoading(false)
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    try {
      console.log("Attempting registration for user:", username)

      const res = await apiRequest.post("/auth/register", {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      })

      console.log("Registration successful:", res.data)
      setSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login")
      }, 2000)
    } catch (err) {
      console.error("Registration error:", err)

      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.code === "ERR_NETWORK") {
        setError("Network error. Please check your connection and try again.")
      } else if (err.message?.includes("CORS")) {
        setError("Connection error. Please try again later.")
      } else {
        setError("Registration failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="registerPage">
        <div className="formContainer">
          <div className="successMessage">
            <h1>Registration Successful!</h1>
            <p>Your account has been created successfully.</p>
            <p>Redirecting to login page...</p>
          </div>
        </div>
        <div className="imgContainer">
          <img src="/bg.png" alt="" />
        </div>
      </div>
    )
  }

  return (
    <div className="registerPage">
      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <h1>Create an Account</h1>
          <input
            name="username"
            type="text"
            placeholder="Username"
            required
            minLength={3}
            maxLength={20}
            disabled={isLoading}
          />
          <input name="email" type="email" placeholder="Email" required disabled={isLoading} />
          <input name="password" type="password" placeholder="Password" required minLength={6} disabled={isLoading} />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Register"}
          </button>
          {error && <span className="error">{error}</span>}
          <Link to="/login">Do you have an account?</Link>
        </form>
      </div>
      <div className="imgContainer">
        <img src="/bg.png" alt="" />
      </div>
    </div>
  )
}

export default Register
