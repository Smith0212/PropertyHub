"use client"

import { Link } from "react-router-dom"
import { useContext, useState } from "react"
import "./card.scss"
import { AuthContext } from "../../context/AuthContext"
import apiRequest from "../../lib/apiRequest"

function Card({ item }) {
  const { currentUser } = useContext(AuthContext)
  const [saved, setSaved] = useState(item.isSaved || false)
  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUser) {
      // Redirect to login if not authenticated
      window.location.href = "/login"
      return
    }

    if (loading) return

    setLoading(true)
    const previousSaved = saved
    setSaved(!saved) // Optimistic update

    try {
      const res = await apiRequest.post("/users/save", { postId: item.id })
      setSaved(res.data.isSaved)
    } catch (err) {
      console.log(err)
      setSaved(previousSaved) // Revert on error
      alert("Failed to save/unsave post. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleChat = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUser) {
      window.location.href = "/login"
      return
    }

    if (item.userId === currentUser.id) {
      alert("You cannot chat with yourself!")
      return
    }

    try {
      const res = await apiRequest.post("/chats", { receiverId: item.userId })
      window.location.href = `/profile?chat=${res.data.id}`
    } catch (err) {
      console.log(err)
      alert("Failed to start chat. Please try again.")
    }
  }

  return (
    <div className="card">
      <Link to={`/property/${item.id}`} className="imageContainer">
        <img src={item.images[0] || "/placeholder.svg"} alt={item.title} />
      </Link>
      <div className="textContainer">
        <h2 className="title">
          <Link to={`/property/${item.id}`}>{item.title}</Link>
        </h2>
        <p className="address">
          <img src="/pin.png" alt="" />
          <span>{item.address}</span>
        </p>
        <p className="price">₹ {item.price.toLocaleString()}</p>
        <div className="bottom">
          <div className="features">
            <div className="feature">
              <img src="/bed.png" alt="" />
              <span>
                {item.bedroom} bedroom{item.bedroom !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="feature">
              <img src="/bath.png" alt="" />
              <span>
                {item.bathroom} bathroom{item.bathroom !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="icons">
            <div
              className={`icon ${saved ? "saved" : ""} ${loading ? "loading" : ""}`}
              onClick={handleSave}
              title={saved ? "Remove from saved" : "Save property"}
            >
              <img src={saved ? "/saved.png" : "/save.png"} alt="Save" />
            </div>
            {currentUser && item.userId !== currentUser.id && (
              <div className="icon" onClick={handleChat} title="Chat with owner">
                <img src="/chat.png" alt="Chat" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Card