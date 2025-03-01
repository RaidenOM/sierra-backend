require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Message = require("./models/Message");
const http = require("http");
const { Server } = require("socket.io");
const { verifyToken, validateMessage } = require("./middleware");
const methodOverride = require("method-override");
const catchAsync = require("./utilities/catchAsync");
const multer = require("multer");
const { storage } = require("./cloudinary/index");
const { default: axios } = require("axios");
const upload = multer({ storage });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: false,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/sierra";

mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("Connected to database");
  })
  .catch((err) => {
    console.log("Error connecting to database");
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.post(
  "/register",
  catchAsync(async (req, res) => {
    const { username, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username: username,
      phone: phone,
      password: hashedPassword,
    });
    const savedUser = await user.save();
    const token = createToken(savedUser.id);
    res.json({ token: token });
  })
);

app.post(
  "/login",
  catchAsync(async (req, res) => {
    const { username, password } = req.body;

    // check if user with given username exists
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    // if user exists verify the password
    const verifyPassword = await bcrypt.compare(password, user.password);
    if (!verifyPassword) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = createToken(user.id);
    res.json({ token: token });
  })
);

app.get(
  "/profile",
  verifyToken,
  catchAsync(async (req, res) => {
    const { id } = req.user;
    const user = await User.findById(id);
    res.json(user);
  })
);

// Get user profile by id
app.get(
  "/users/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  })
);

// update profile
app.put(
  "/users/:id",
  upload.single("profilePhoto"),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { bio } = req.body;
    const unsetProfilePhoto = req.body.unsetProfilePhoto === "true";
    const profilePhoto = req.file ? req.file.path : null;

    const updatedFields = { bio: bio || "Hey there, I am using Sierra!" };

    if (unsetProfilePhoto) {
      updatedFields.profilePhoto = null;
    } else if (profilePhoto) {
      updatedFields.profilePhoto = profilePhoto;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updatedFields);

    res.json(updatedUser);
  })
);

// Search for a user
app.get(
  "/search/:username",
  catchAsync(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username: username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  })
);

app.post(
  "/match-phone",
  catchAsync(async (req, res) => {
    const { phoneNumbers } = req.body;

    const users = await User.find({ phone: { $in: phoneNumbers } });

    res.json(users);
  })
);

// Route to fetch messages between two users
app.get(
  "/messages/:otherUserId",
  verifyToken,
  catchAsync(async (req, res) => {
    const { otherUserId } = req.params;
    const { id: currentUserId } = req.user;

    const messages = await Message.find({
      $or: [
        { senderId: otherUserId, receiverId: currentUserId },
        { senderId: currentUserId, receiverId: otherUserId },
      ],
    })
      .sort({ sentAt: 1 })
      .populate("senderId")
      .populate("receiverId");

    res.json(messages);
  })
);

app.post(
  "/messages",
  verifyToken,
  upload.single("mediaURL"),
  catchAsync(async (req, res) => {
    const { message, senderId, receiverId, mediaType } = req.body;
    const mediaURL = req.file ? req.file.path : null;

    // Save the message to the database
    const savedMessage = await new Message({
      senderId: senderId,
      receiverId: receiverId,
      message: message,
      mediaURL: mediaURL,
      mediaType: mediaType,
      sentAt: new Date().toISOString(),
    }).save();

    // Populate senderId and receiverId
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate("senderId")
      .populate("receiverId")
      .exec();

    const unreadCount = await Message.countDocuments({
      senderId: senderId,
      receiverId: receiverId,
      isRead: false,
    });

    // Notify the receiver with the new message
    io.to(receiverId).emit("new-message", {
      ...populatedMessage.toObject(),
      unreadCount: unreadCount,
    });

    // Notify the sender (optional confirmation)
    io.to(senderId).emit("message-sent", populatedMessage);

    // send push notifications
    if (populatedMessage.receiverId.pushTokens?.length > 0) {
      const notificationPromises = populatedMessage.receiverId.pushTokens.map(
        async (token) => {
          return axios.post(
            "https://exp.host/--/api/v2/push/send",
            {
              to: token,
              title: populatedMessage.senderId.username,
              body: populatedMessage.message
                ? populatedMessage.message
                : populatedMessage.mediaType === "image"
                ? "📷 Photo"
                : populatedMessage.mediaType === "video"
                ? "🎥 Video"
                : "🎧 Audio",
              data: {
                receiverId: populatedMessage.senderId._id,
                url: `sierra://chat?receiverId=${populatedMessage.senderId._id}`,
              },
              sound: "default",
              channelId: "default",
            },
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
            }
          );
        }
      );

      await Promise.all(notificationPromises);
    }

    res.json({ message: "Save successfully", savedMessage: savedMessage });
  })
);

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
}

app.get(
  "/latest-messages",
  verifyToken,
  catchAsync(async (req, res) => {
    const { id: userId } = req.user;

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Step 1: Retrieve all messages where the user is involved either as sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .sort({ sentAt: -1 })
      .populate("senderId")
      .populate("receiverId")
      .exec();

    if (!messages || messages.length === 0) {
      return res.json([]);
    }

    // Step 2: Group the latest message per contact (sender/receiver)
    const latestMessages = [];
    const contacts = new Set();

    for (const message of messages) {
      const contactId =
        message.senderId._id.toString() === userObjectId.toString()
          ? message.receiverId._id.toString()
          : message.senderId._id.toString();

      // If the contactId is not already in the latestMessages array, add the latest message
      if (!contacts.has(contactId)) {
        const unreadCount = await Message.countDocuments({
          senderId: contactId,
          receiverId: userObjectId,
          isRead: false,
        });
        latestMessages.push({
          ...message.toObject(),
          unreadCount: unreadCount,
        });
        contacts.add(contactId); // Add contactId to the set
      }
    }

    // Step 3: Send the latest messages response
    res.json(latestMessages);
  })
);

app.put(
  "/messages/mark-read/:otherUserId",
  verifyToken,
  catchAsync(async (req, res) => {
    const { otherUserId } = req.params;
    const { id: currentUserId } = req.user;

    const otherUserIdObject = new mongoose.Types.ObjectId(otherUserId);
    const currentUserIdObject = new mongoose.Types.ObjectId(currentUserId);

    const result = await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    res
      .status(200)
      .json({ message: "Messages marked as read successfully", result });
  })
);

app.delete(
  "/messages/:otherUserId",
  verifyToken,
  catchAsync(async (req, res) => {
    const { otherUserId } = req.params;
    const { id: currentUserId } = req.user;

    const id1 = new mongoose.Types.ObjectId(currentUserId);
    const id2 = new mongoose.Types.ObjectId(otherUserId);

    const deletedMessages = await Message.deleteMany({
      $or: [
        { senderId: id1, receiverId: id2 },
        { senderId: id2, receiverId: id1 },
      ],
    });

    io.to(currentUserId).emit("delete-chat", { receiverId: otherUserId });
    io.to(otherUserId).emit("delete-chat", { receiverId: currentUserId });

    res.json(deletedMessages);
  })
);

app.delete(
  "/profile",
  verifyToken,
  catchAsync(async (req, res) => {
    const { id } = req.user;
    const deletedUser = await User.findByIdAndDelete(id);
    const deletedMessages = await Message.deleteMany({
      $or: [{ senderId: id }, { receiverId: id }],
    });
    res.json({ deletedUser: deletedUser, deletedMessages: deletedMessages });
  })
);

app.put(
  "/store-push-token",
  verifyToken,
  catchAsync(async (req, res) => {
    const { id } = req.user;
    const { pushToken } = req.body;

    // Use $addToSet to add only if pushToken is not already in the array
    await User.findByIdAndUpdate(id, { $addToSet: { pushTokens: pushToken } });
    res.json({ success: true, message: "Push token saved!" });
  })
);

app.put(
  "/delete-push-token",
  verifyToken,
  catchAsync(async (req, res) => {
    const { id } = req.user;
    const { pushToken } = req.body;

    const user = await User.findById(id);
    user.pushTokens = user.pushTokens.filter((token) => token !== pushToken);
    await user.save();

    res.json({ success: true, message: "Push token deleted!" });
  })
);

// Real time chat setup
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Create a room for every user using their id
  socket.on("join-room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined a room ${userId}`);
  });

  // Handler to handle typing events
  socket.on("typing", ({ senderId, receiverId }) => {
    socket.to(receiverId).emit("typing", { senderId: senderId });
  });

  socket.on("stop-typing", ({ senderId, receiverId }) => {
    socket.to(receiverId).emit("stop-typing", { senderId: senderId });
  });

  // Handler to handle room leaving
  socket.on("leave-room", (userId) => {
    socket.leave(userId);
    console.log(`User ${userId} left room ${userId}`);
  });

  // Handle user disconnecting
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

//ERROR HANDLER
app.use((err, req, res, next) => {
  const { message, status = 500 } = err;
  if (!err.message) err.message = "Something went wrong";
  res.status(status).json({ message });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
