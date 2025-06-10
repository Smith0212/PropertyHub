-- Fix existing data to match new schema requirements

-- Add updatedAt field to existing posts that don't have it
db.Post.updateMany(
  { updatedAt: { $exists: false } },
  { $set: { updatedAt: new Date() } }
)

-- Add updatedAt field to existing users that don't have it
db.User.updateMany(
  { updatedAt: { $exists: false } },
  { $set: { updatedAt: new Date() } }
)

-- Add isOnline and lastSeen fields to existing users
db.User.updateMany(
  { isOnline: { $exists: false } },
  { $set: { isOnline: false, lastSeen: new Date() } }
)

-- Add isRead field to existing messages
db.Message.updateMany(
  { isRead: { $exists: false } },
  { $set: { isRead: false } }
)

-- Add lastMessageAt field to existing chats
db.Chat.updateMany(
  { lastMessageAt: { $exists: false } },
  { $set: { lastMessageAt: null } }
)

-- Add updatedAt field to existing chats
db.Chat.updateMany(
  { updatedAt: { $exists: false } },
  { $set: { updatedAt: new Date() } }
)

-- Update chats with their last message timestamp
db.Chat.find().forEach(function(chat) {
  var lastMessage = db.Message.findOne(
    { chatId: chat._id },
    { sort: { createdAt: -1 } }
  );
  
  if (lastMessage) {
    db.Chat.updateOne(
      { _id: chat._id },
      { 
        $set: { 
          lastMessageAt: lastMessage.createdAt,
          updatedAt: lastMessage.createdAt
        } 
      }
    );
  }
});
