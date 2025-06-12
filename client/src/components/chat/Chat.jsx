"use client"

import { useContext, useEffect, useRef, useState } from "react"
import "./chat.scss"
import { AuthContext } from "../../context/AuthContext"
import apiRequest from "../../lib/apiRequest"
import { format } from "timeago.js"
import { SocketContext } from "../../context/SocketContext"
import { useNotificationStore } from "../../lib/notificationStore"

function Chat({ chats: initialChats, initialChatId }) {
  const [chats, setChats] = useState(initialChats || [])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [typingUsers, setTypingUsers] = useState({})
  const [showChatList, setShowChatList] = useState(true) // New state to control view
  const { currentUser } = useContext(AuthContext)
  const { socket, onlineUsers } = useContext(SocketContext)

  const messageEndRef = useRef()
  const textareaRef = useRef()
  const typingTimeoutRef = useRef(null)

  const decrease = useNotificationStore((state) => state.decrease)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Open initial chat if provided
  useEffect(() => {
    if (initialChatId && initialChats) {
      const selectedChat = initialChats.find((c) => c.id === initialChatId)
      if (selectedChat) {
        handleOpenChat(initialChatId, selectedChat.receiver)
      }
    }
  }, [initialChatId, initialChats])

  // Socket.io event listeners
  useEffect(() => {
    if (!socket) return

    // Handle incoming messages
    const handleGetMessage = (data) => {
      console.log("Received message:", data)

      // Update messages if current chat is open
      if (activeChat && activeChat.id === data.chatId) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id || Date.now().toString(),
            text: data.message,
            userId: data.senderId,
            chatId: data.chatId,
            createdAt: data.timestamp || new Date().toISOString(),
            sender: {
              id: data.senderId,
              username: data.senderUsername || "User",
              avatar: data.senderAvatar || null,
            },
            isRead: false,
          },
        ])

        // Mark as read
        apiRequest.put(`/chats/read/${data.chatId}`).catch((err) => console.log(err))
      }

      // Update chat list with new message
      setChats((prev) => {
        const updatedChats = prev.map((c) => {
          if (c.id === data.chatId) {
            return {
              ...c,
              lastMessage: data.message,
              lastMessageAt: data.timestamp || new Date().toISOString(),
              unreadCount: activeChat && activeChat.id === data.chatId ? 0 : (c.unreadCount || 0) + 1,
            }
          }
          return c
        })

        // Sort chats to put the one with new message at top
        return updatedChats.sort((a, b) => {
          if (a.id === data.chatId) return -1
          if (b.id === data.chatId) return 1
          return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
        })
      })
    }

    // Handle message confirmation
    const handleMessageConfirmed = (data) => {
      console.log("Message confirmed:", data)

      if (activeChat && activeChat.id === data.chatId) {
        // Replace temp message with confirmed message or add if not exists
        setMessages((prev) => {
          const messageExists = prev.some(
            (msg) => msg.isTemp && msg.text === data.message && msg.userId === data.senderId,
          )

          if (messageExists) {
            return prev.map((msg) =>
              msg.isTemp && msg.text === data.message && msg.userId === data.senderId
                ? {
                    id: data.id || msg.id,
                    text: data.message,
                    userId: data.senderId,
                    chatId: data.chatId,
                    createdAt: data.timestamp || msg.createdAt,
                    sender: msg.sender,
                    isRead: false,
                    isTemp: false,
                  }
                : msg,
            )
          } else {
            return [
              ...prev,
              {
                id: data.id || Date.now().toString(),
                text: data.message,
                userId: data.senderId,
                chatId: data.chatId,
                createdAt: data.timestamp || new Date().toISOString(),
                sender: {
                  id: data.senderId,
                  username: currentUser.username,
                  avatar: currentUser.avatar,
                },
                isRead: false,
              },
            ]
          }
        })
      }

      // Update chat list
      setChats((prev) => {
        const updatedChats = prev.map((c) => {
          if (c.id === data.chatId) {
            return {
              ...c,
              lastMessage: data.message,
              lastMessageAt: data.timestamp || new Date().toISOString(),
            }
          }
          return c
        })

        // Sort chats to put the one with new message at top
        return updatedChats.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
      })
    }

    // Handle typing indicators
    const handleUserTyping = (data) => {
      if (data.isTyping) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: true }))
      } else {
        setTypingUsers((prev) => {
          const updated = { ...prev }
          delete updated[data.userId]
          return updated
        })
      }
    }

    // Handle online status updates
    const handleUserOnline = (userId) => {
      setChats((prev) =>
        prev.map((c) =>
          c.receiver.id === userId
            ? {
                ...c,
                receiver: {
                  ...c.receiver,
                  isOnline: true,
                  lastSeen: new Date().toISOString(),
                },
              }
            : c,
        ),
      )

      if (activeChat?.receiver.id === userId) {
        setActiveChat((prev) => ({
          ...prev,
          receiver: {
            ...prev.receiver,
            isOnline: true,
            lastSeen: new Date().toISOString(),
          },
        }))
      }
    }

    // Handle offline status updates
    const handleUserOffline = (userId) => {
      const now = new Date().toISOString()
      setChats((prev) =>
        prev.map((c) =>
          c.receiver.id === userId
            ? {
                ...c,
                receiver: {
                  ...c.receiver,
                  isOnline: false,
                  lastSeen: now,
                },
              }
            : c,
        ),
      )

      if (activeChat?.receiver.id === userId) {
        setActiveChat((prev) => ({
          ...prev,
          receiver: {
            ...prev.receiver,
            isOnline: false,
            lastSeen: now,
          },
        }))
      }
    }

    socket.on("getMessage", handleGetMessage)
    socket.on("messageConfirmed", handleMessageConfirmed)
    socket.on("userTyping", handleUserTyping)
    socket.on("userOnline", handleUserOnline)
    socket.on("userOffline", handleUserOffline)

    return () => {
      socket.off("getMessage", handleGetMessage)
      socket.off("messageConfirmed", handleMessageConfirmed)
      socket.off("userTyping", handleUserTyping)
      socket.off("userOnline", handleUserOnline)
      socket.off("userOffline", handleUserOffline)
    }
  }, [socket, activeChat, currentUser, decrease])

  // Update online status of users in chats based on onlineUsers array
  useEffect(() => {
    if (!onlineUsers || !chats.length) return

    setChats((prev) =>
      prev.map((chat) => {
        const isOnline = onlineUsers.includes(chat.receiver.id)
        if (isOnline !== chat.receiver.isOnline) {
          return {
            ...chat,
            receiver: {
              ...chat.receiver,
              isOnline,
              lastSeen: isOnline ? new Date().toISOString() : chat.receiver.lastSeen,
            },
          }
        }
        return chat
      }),
    )

    if (activeChat) {
      const isReceiverOnline = onlineUsers.includes(activeChat.receiver.id)
      if (isReceiverOnline !== activeChat.receiver.isOnline) {
        setActiveChat((prev) => ({
          ...prev,
          receiver: {
            ...prev.receiver,
            isOnline: isReceiverOnline,
            lastSeen: isReceiverOnline ? new Date().toISOString() : prev.receiver.lastSeen,
          },
        }))
      }
    }
  }, [onlineUsers, chats.length, activeChat])

  // Refresh chats periodically
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await apiRequest("/chats")
        setChats(res.data)
      } catch (err) {
        console.log("Error refreshing chats:", err)
      }
    }

    const interval = setInterval(fetchChats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const handleOpenChat = async (id, receiver) => {
    setError("")
    setLoading(true)

    try {
      const res = await apiRequest("/chats/" + id)

      // Mark as read
      if (!res.data.seenBy.includes(currentUser.id)) {
        decrease()
        await apiRequest.put(`/chats/read/${id}`)
      }

      // Update active chat
      setActiveChat({ ...res.data, receiver })

      // Set messages
      setMessages(res.data.messages || [])

      // Update chat in list to mark as read
      setChats((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                unreadCount: 0,
                seenBy: [...(c.seenBy || []), currentUser.id],
              }
            : c,
        ),
      )

      // Hide chat list and show chat messages
      setShowChatList(false)

      // Focus on textarea
      setTimeout(() => textareaRef.current?.focus(), 100)
    } catch (err) {
      console.log(err)
      setError("Failed to load chat")
    } finally {
      setLoading(false)
    }
  }

  const handleCloseChat = () => {
    setActiveChat(null)
    setMessages([])
    setShowChatList(true)
    setError("")
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
      id: `temp-${Date.now()}`,
      text,
      userId: currentUser.id,
      chatId: activeChat.id,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
      },
      isTemp: true,
    }

    // Optimistic update
    setMessages((prev) => [...prev, tempMessage])
    setNewMessage("")

    try {
      const res = await apiRequest.post("/messages/" + activeChat.id, { text })

      // Replace temp message with real message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
            ? {
                ...res.data,
                sender: {
                  id: currentUser.id,
                  username: currentUser.username,
                  avatar: currentUser.avatar,
                },
              }
            : msg,
        ),
      )

      // Update chat in list with new message
      setChats((prev) => {
        const updatedChats = prev.map((c) =>
          c.id === activeChat.id
            ? {
                ...c,
                lastMessage: text,
                lastMessageAt: new Date().toISOString(),
              }
            : c,
        )

        // Sort chats to put the one with new message at top
        return updatedChats.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
      })

      // Send socket message
      if (socket) {
        socket.emit("sendMessage", {
          receiverId: activeChat.receiver.id,
          message: text,
          senderId: currentUser.id,
          chatId: activeChat.id,
          senderUsername: currentUser.username,
          senderAvatar: currentUser.avatar,
        })
      }
    } catch (err) {
      console.log(err)
      setError("Failed to send message")

      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)

    if (!socket || !activeChat) return

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send typing indicator
    socket.emit("typing", {
      receiverId: activeChat.receiver.id,
      senderId: currentUser.id,
      isTyping: true,
    })

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        receiverId: activeChat.receiver.id,
        senderId: currentUser.id,
        isTyping: false,
      })
    }, 2000)
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return
    }

    try {
      await apiRequest.delete(`/messages/${messageId}`)
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    } catch (err) {
      console.log(err)
      setError("Failed to delete message")
    }
  }

  const isTyping = activeChat?.receiver && typingUsers[activeChat.receiver.id]

  return (
    <div className="chat-container single-view">
      {/* Show Chat List */}
      {showChatList && (
        <div className="chat-list-view">
          <div className="chat-list-header">
            <h2>Messages</h2>
          </div>
          <div className="chat-contacts">
            {chats?.length === 0 ? (
              <div className="no-chats">
                <div className="no-chats-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h3>No conversations yet</h3>
                <p>Start chatting by contacting property owners</p>
              </div>
            ) : (
              chats?.map((c) => (
                <div
                  className={`chat-contact-item ${!c.seenBy?.includes(currentUser.id) ? "unread" : ""}`}
                  key={c.id}
                  onClick={() => handleOpenChat(c.id, c.receiver)}
                >
                  <div className="contact-avatar">
                    <img src={c.receiver?.avatar || "/noavatar.jpg"} alt="" />
                    {c.receiver?.isOnline && <span className="online-indicator"></span>}
                  </div>
                  <div className="contact-info">
                    <div className="contact-header">
                      <h4>{c.receiver?.username || "Unknown User"}</h4>
                      <span className="contact-time">{c.lastMessageAt ? format(c.lastMessageAt) : ""}</span>
                    </div>
                    <div className="contact-preview">
                      <p>{c.lastMessage || "No messages yet"}</p>
                      {c.unreadCount > 0 && <span className="unread-badge">{c.unreadCount}</span>}
                    </div>
                    <div className="contact-status">
                      {c.receiver?.isOnline ? (
                        <span className="status-online">Online</span>
                      ) : (
                        <span className="status-offline">Last seen {format(c.receiver?.lastSeen)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Show Active Chat */}
      {!showChatList && activeChat && (
        <div className="chat-view">
          <div className="chat-header">
            <button className="back-button" onClick={handleCloseChat}>
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
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="chat-contact">
              <div className="chat-avatar">
                <img src={activeChat.receiver?.avatar || "/noavatar.jpg"} alt="" />
                {activeChat.receiver?.isOnline && <span className="online-indicator"></span>}
              </div>
              <div className="chat-contact-info">
                <h3>{activeChat.receiver?.username || "Unknown User"}</h3>
                <span className="chat-status">
                  {isTyping ? (
                    <span className="typing-indicator">typing...</span>
                  ) : activeChat.receiver?.isOnline ? (
                    "Online"
                  ) : (
                    `Last seen ${format(activeChat.receiver?.lastSeen)}`
                  )}
                </span>
              </div>
            </div>
            <button className="close-chat" onClick={handleCloseChat}>
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
            </button>
          </div>

          <div className="chat-messages">
            {loading ? (
              <div className="loading-messages">
                <div className="loading-spinner"></div>
                <p>Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="no-messages">
                <div className="no-messages-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h3>No messages yet</h3>
                <p>Start the conversation with {activeChat.receiver?.username}!</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isOwn = message.userId === currentUser.id
                  const showAvatar = !isOwn && (index === 0 || messages[index - 1].userId !== message.userId)
                  const showDate =
                    index === 0 ||
                    new Date(message.createdAt).toDateString() !==
                      new Date(messages[index - 1].createdAt).toDateString()

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="message-date-divider">
                          <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className={`message ${isOwn ? "own" : ""}`}>
                        {!isOwn && showAvatar && (
                          <div className="message-avatar">
                            <img src={message.sender?.avatar || "/noavatar.jpg"} alt="" />
                          </div>
                        )}
                        <div className="message-content">
                          <div className="message-bubble">
                            <p>{message.text}</p>
                          </div>
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isOwn && (
                              <>
                                {message.isTemp ? (
                                  <span className="message-status sending">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="message-status sent">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  </span>
                                )}
                                {!message.isTemp && (
                                  <button
                                    className="delete-message"
                                    onClick={() => handleDeleteMessage(message.id)}
                                    title="Delete message"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {isTyping && (
                  <div className="message">
                    <div className="message-avatar">
                      <img src={activeChat.receiver?.avatar || "/noavatar.jpg"} alt="" />
                    </div>
                    <div className="message-content">
                      <div className="message-bubble typing">
                        <span className="typing-animation">
                          <span></span>
                          <span></span>
                          <span></span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messageEndRef}></div>
          </div>

          {error && <div className="chat-error">{error}</div>}

          <form onSubmit={handleSubmit} className="chat-input">
            <textarea
              ref={textareaRef}
              name="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows="1"
              maxLength="1000"
            />
            <button type="submit" disabled={!newMessage.trim() || loading} className="send-button">
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
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Chat
