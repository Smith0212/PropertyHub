"use client"

import Chat from "../../components/chat/Chat"
import List from "../../components/list/List"
import "./profilePage.scss"
import apiRequest from "../../lib/apiRequest"
import { Await, Link, useLoaderData, useNavigate, useSearchParams } from "react-router-dom"
import { Suspense, useContext, useState } from "react"
import { AuthContext } from "../../context/AuthContext"

function ProfilePage() {
  const data = useLoaderData()
  const [searchParams] = useSearchParams()
  const { updateUser, currentUser } = useContext(AuthContext)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("posts")

  const chatId = searchParams.get("chat")

  const handleLogout = async () => {
    try {
      await apiRequest.post("/auth/logout")
      updateUser(null)
      navigate("/")
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className="profilePage">
      <div className="details">
        <div className="wrapper">
          <div className="title">
            <h1>User Information</h1>
            <Link to="/profile/update">
              <button>Update Profile</button>
            </Link>
          </div>
          <div className="info">
            <span>
              Avatar:
              <img src={currentUser.avatar || "/noavatar.jpg"} alt="" />
            </span>
            <span>
              Username: <b>{currentUser.username}</b>
            </span>
            <span>
              E-mail: <b>{currentUser.email}</b>
            </span>
            <button onClick={handleLogout}>Logout</button>
          </div>

          <div className="tabs">
            <button className={activeTab === "posts" ? "active" : ""} onClick={() => setActiveTab("posts")}>
              My Posts
            </button>
            <button className={activeTab === "saved" ? "active" : ""} onClick={() => setActiveTab("saved")}>
              Saved Posts
            </button>
          </div>

          {activeTab === "posts" && (
            <>
              <div className="title">
                <h1>My List</h1>
                <Link to="/add">
                  <button>Create New Post</button>
                </Link>
              </div>
              <Suspense fallback={<p>Loading...</p>}>
                <Await resolve={data.postResponse} errorElement={<p>Error loading posts!</p>}>
                  {(postResponse) => (
                    <div className="postsContainer">
                      {postResponse.data.userPosts.length === 0 ? (
                        <div className="noPosts">
                          <p>You have not created any posts yet</p>
                          <Link to="/add">
                            <button>Create Your First Post</button>
                          </Link>
                        </div>
                      ) : (
                        <List posts={postResponse.data.userPosts} />
                      )}
                    </div>
                  )}
                </Await>
              </Suspense>
            </>
          )}

          {activeTab === "saved" && (
            <>
              <div className="title">
                <h1>Saved List</h1>
              </div>
              <Suspense fallback={<p>Loading...</p>}>
                <Await resolve={data.postResponse} errorElement={<p>Error loading posts!</p>}>
                  {(postResponse) => (
                    <div className="postsContainer">
                      {postResponse.data.savedPosts.length === 0 ? (
                        <div className="noPosts">
                          <p>You have not saved any posts yet</p>
                          <Link to="/list">
                            <button>Browse Properties</button>
                          </Link>
                        </div>
                      ) : (
                        <List posts={postResponse.data.savedPosts.map((item) => ({ ...item, isSaved: true }))} />
                      )}
                    </div>
                  )}
                </Await>
              </Suspense>
            </>
          )}
        </div>
      </div>
      <div className="chatContainer">
        <div className="wrapper">
          <Suspense fallback={<p>Loading...</p>}>
            <Await resolve={data.chatResponse} errorElement={<p>Error loading chats!</p>}>
              {(chatResponse) => <Chat chats={chatResponse.data} initialChatId={chatId} />}
            </Await>
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
