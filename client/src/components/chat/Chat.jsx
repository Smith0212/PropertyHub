"use client"

import { useContext, useEffect, useRef, useState } from "react"
import "./chat.scss"
import { AuthContext } from "../../context/AuthContext"
import apiRequest from "../../lib/apiRequest"
import { format } from "timeago.js"
import { SocketContext } from "../../context/SocketContext"
import { useNotificationStore } from "../../lib/notificationStore"

function Chat({ chats }) {
  const [chat, setChat] = useState(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { currentUser } = useContext(AuthContext)
  const { socket } = useContext(SocketContext)

  const messageEndRef = useRef()
  const textareaRef = useRef()

  const decrease = useNotificationStore((state) => state.decrease)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat?.messages])

  const handleOpenChat = async (id, receiver) => {
    setError("")
    setLoading(true)

    try {
      const res = await apiRequest("/chats/" + id)
      if (!res.data.seenBy.includes(currentUser.id)) {
        decrease()
      }
      setChat({ ...res.data, receiver })
    } catch (err) {
      console.log(err)
      setError("Failed to load chat")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const text = newMessage.trim()
    if (!text) return

    if (text.length > 1000) {
      setError("Message is too long (max 1000 characters)")
      return
    }

    setError("")
    const tempMessage = {
      id: Date.now().toString(),
      text,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
      },
      isTemp: true,
    }

    // Optimistic update
    setChat((prev) => ({
      ...prev,
      messages: [...prev.messages, tempMessage],
    }))
    setNewMessage("")

    try {
      const res = await apiRequest.post("/messages/" + chat.id, { text })

      // Replace temp message with real message
      setChat((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) => (msg.id === tempMessage.id ? res.data : msg)),
      }))

      // Send socket message
      if (socket) {
        socket.emit("sendMessage", {
          receiverId: chat.receiver.id,
          data: res.data,
        })
      }
    } catch (err) {
      console.log(err)
      setError("Failed to send message")

      // Remove temp message on error
      setChat((prev) => ({
        ...prev,
        messages: prev.messages.filter((msg) => msg.id !== tempMessage.id),
      }))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return
    }

    try {
      await apiRequest.delete(`/messages/${messageId}`)
      setChat((prev) => ({
        ...prev,
        messages: prev.messages.filter((msg) => msg.id !== messageId),
      }))
    } catch (err) {
      console.log(err)
      setError("Failed to delete message")
    }
  }

  useEffect(() => {
    const read = async () => {
      try {
        await apiRequest.put("/chats/read/" + chat.id)
      } catch (err) {
        console.log(err)
      }
    }

    if (chat && socket) {
      socket.on("getMessage", (data) => {
        if (chat.id === data.chatId) {
          setChat((prev) => ({ ...prev, messages: [...prev.messages, data] }))
          read()
        }
      })
    }
    return () => {
      socket?.off("getMessage")
    }
  }, [socket, chat])

  return (
    <div className="chat">
      <div className="messages">
        <h1>Messages</h1>
        {chats?.length === 0 ? (
          <div className="noChats">
            <p>No conversations yet</p>
            <small>Start chatting by contacting property owners</small>
          </div>
        ) : (
          chats?.map((c) => (
            <div
              className="message"
              key={c.id}
              style={{
                backgroundColor: c.seenBy.includes(currentUser.id) || chat?.id === c.id ? "white" : "#fecd514e",
              }}
              onClick={() => handleOpenChat(c.id, c.receiver)}
            >
              <div className="messageHeader">
                <img src={c.receiver?.avatar || "/noavatar.jpg"} alt="" />
                <div className="messageInfo">
                  <span className="username">{c.receiver?.username || "Unknown User"}</span>
                  <div className="status">
                    {c.receiver?.isOnline ? (
                      <span className="online">Online</span>
                    ) : (
                      <span className="offline">Last seen {format(c.receiver?.lastSeen)}</span>
                    )}
                  </div>
                </div>
                {c.unreadCount > 0 && <div className="unreadBadge">{c.unreadCount}</div>}
              </div>
              <p className="lastMessage">{c.lastMessage || "No messages yet"}</p>
              {c.lastMessageAt && <small className="timestamp">{format(c.lastMessageAt)}</small>}
            </div>
          ))
        )}
      </div>

      {chat && (
        <div className="chatBox">
          <div className="top">
            <div className="user">
              <img src={chat.receiver?.avatar || "/noavatar.jpg"} alt="" />
              <div className="userInfo">
                <span className="username">{chat.receiver?.username || "Unknown User"}</span>
                <span className="status">
                  {chat.receiver?.isOnline ? "Online" : `Last seen ${format(chat.receiver?.lastSeen)}`}
                </span>
              </div>
            </div>
            <span className="close" onClick={() => setChat(null)}>
              ✕
            </span>
          </div>

          <div className="center">
            {loading ? (
              <div className="loading">Loading messages...</div>
            ) : chat.messages?.length === 0 ? (
              <div className="noMessages">
                <p>No messages yet</p>
                <small>Start the conversation!</small>
              </div>
            ) : (
              chat.messages?.map((message) => (
                <div className={`chatMessage ${message.userId === currentUser.id ? "own" : ""}`} key={message.id}>
                  <div className="messageContent">
                    <p>{message.text}</p>
                    <div className="messageFooter">
                      <span className="timestamp">{format(message.createdAt)}</span>
                      {message.userId === currentUser.id && !message.isTemp && (
                        <button
                          className="deleteBtn"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      )}
                      {message.isTemp && <span className="sending">Sending...</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messageEndRef}></div>
          </div>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleSubmit} className="bottom">
            <textarea
              ref={textareaRef}
              name="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows="1"
              maxLength="1000"
            />
            <button type="submit" disabled={!newMessage.trim() || loading}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Chat
