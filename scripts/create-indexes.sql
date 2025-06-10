-- Create indexes for better performance
-- Note: MongoDB automatically creates indexes for _id fields

-- Index for posts search
db.Post.createIndex({ "city": 1 })
db.Post.createIndex({ "type": 1 })
db.Post.createIndex({ "property": 1 })
db.Post.createIndex({ "price": 1 })
db.Post.createIndex({ "createdAt": -1 })

-- Compound index for common search patterns
db.Post.createIndex({ "city": 1, "type": 1, "price": 1 })

-- Index for user posts
db.Post.createIndex({ "userId": 1, "createdAt": -1 })

-- Index for saved posts
db.SavedPost.createIndex({ "userId": 1, "createdAt": -1 })
db.SavedPost.createIndex({ "postId": 1 })

-- Index for chats
db.Chat.createIndex({ "userIDs": 1 })
db.Chat.createIndex({ "updatedAt": -1 })

-- Index for messages
db.Message.createIndex({ "chatId": 1, "createdAt": 1 })
db.Message.createIndex({ "userId": 1 })
db.Message.createIndex({ "chatId": 1, "isRead": 1 })

-- Index for users
db.User.createIndex({ "email": 1 })
db.User.createIndex({ "username": 1 })
db.User.createIndex({ "isOnline": 1 })
