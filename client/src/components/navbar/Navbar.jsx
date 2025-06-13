"use client"

import { useContext, useEffect, useState } from "react"
import "./navbar.scss"
import { Link, useLocation } from "react-router-dom"
import { AuthContext } from "../../context/AuthContext"
import { useNotificationStore } from "../../lib/notificationStore"

function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { currentUser } = useContext(AuthContext)
  const location = useLocation()

  const fetch = useNotificationStore((state) => state.fetch)
  const number = useNotificationStore((state) => state.number)

  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        fetch()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [currentUser, fetch])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // useEffect(() => {
  //   if (currentUser) fetch()
  // }, [currentUser, fetch])

  // Close mobile menu when route changes
  useEffect(() => {
    setOpen(false)
  }, [location])

  return (
    <nav className={scrolled ? "scrolled" : ""}>
      <div className="nav-container">
        <div className="left">
          <Link to="/" className="logo">
            <img src="/logo.png" alt="PropertyHub Logo" />
            <span>PROPERTY HUB</span>
          </Link>
          <div className="nav-links">
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
              Home
            </Link>
            <Link to="/list" className={location.pathname === "/list" ? "active" : ""}>
              Properties
            </Link>
            <Link to="/about" className={location.pathname === "/about" ? "active" : ""}>
              About
            </Link>
            {currentUser && (
              <Link to="/add" className={location.pathname === "/add" ? "active" : ""}>
                Add Property
              </Link>
            )}
          </div>
        </div>
        <div className="right">
          {currentUser ? (
            <div className="user">
              <div className="user-info">
                <img src={currentUser.avatar || "/noavatar.jpg"} alt={currentUser.username} />
                <span>{currentUser.username}</span>
              </div>
              <Link to="/profile" className="profile-link">
                {number > 0 && <div className="notification">{number}</div>}
                <span>Profile</span>
              </Link>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="login-btn">
                Sign in
              </Link>
              <Link to="/register" className="register-btn">
                Sign up
              </Link>
            </div>
          )}
          <button className="menu-toggle" onClick={() => setOpen((prev) => !prev)}>
            {open ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
          <div className={`mobile-menu ${open ? "active" : ""}`}>
            <Link to="/">Home</Link>
            <Link to="/list">Properties</Link>
            <Link to="/about">About</Link>
            {currentUser ? (
              <>
                <Link to="/profile">Profile {number > 0 && <span className="mobile-notification">{number}</span>}</Link>
                <Link to="/add">Add Property</Link>
              </>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
