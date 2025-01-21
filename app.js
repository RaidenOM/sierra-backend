require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Message = require("./models/Message");
const http = require("http");
const { Server } = require("socket.io");
const { messages } = require("../backend");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: false,
  },
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

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username: username, password: hashedPassword });
  const savedUser = await user.save();
  const token = createToken(savedUser.id);
  res.json({ token: token });
});

app.post("/login", async (req, res) => {
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
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  //check if token exists
  if (!token) {
    return res.status(401).json({ message: "Authorization token required" });
  }

  //verify the token
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = payload;
    next();
  });
}

app.get("/profile", verifyToken, async (req, res) => {
  const { id } = req.user;
  const user = await User.findById(id);
  res.json(user);
});

app.get("/users", async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// Get user profile by id
app.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    // If user is not found, return a 404 error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
});

// Search for a user
app.get("/search/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username: username });

    // If user is not found, return a 404 error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
});

// Route to fetch messages between two users
app.get("/messages/:userId1/:userId2", async (req, res) => {
  const { userId1, userId2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    }).sort({ sentAt: 1 }); // Sort messages by sentAt in ascending order

    // Return the messages as a response
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

app.post("/messages", async (req, res) => {
  const { message, senderId, receiverId } = req.body;
  const newMessage = new Message({
    senderId,
    receiverId,
    message,
    sentAt: new Date().toISOString(),
  });

  await newMessage.save();
  res
    .status(201)
    .json({ message: "Save successfully", savedMessage: newMessage });
});

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
}

app.get("/latest-messages", verifyToken, async (req, res) => {
  const { id: userId } = req.user; // Get the user ID from the token

  try {
    const relatedMessages = await Message.aggregate([
      {
        // Step 1: Match messages where the user is either sender or receiver
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        // Step 2: Sort messages by sentAt (descending) to get the latest ones first
        $sort: { sentAt: -1 },
      },
      {
        // Step 3: Group by the other user's ID (senderId or receiverId)
        $group: {
          _id: {
            // If the sender is the user, group by receiverId, else by senderId
            $cond: [
              { $eq: ["$senderId", userId] },
              "$receiverId", // If the user is the sender, group by receiver
              "$senderId", // Otherwise, group by sender
            ],
          },
          latestMessage: { $first: "$$ROOT" }, // Pick the latest message (first after sorting)
        },
      },
      {
        // Optional: Project the latest message data
        $project: {
          _id: 0, // Remove _id
          contactId: "$_id", // Rename _id to contactId
          message: "$latestMessage.message", // Include the message text
          sentAt: "$latestMessage.sentAt", // Include the sentAt timestamp
        },
      },
    ]);

    // The relatedMessages array will contain the latest message for each contact
    console.log(relatedMessages); // Log to check the result
    res.json(relatedMessages); // Return the result to the client
  } catch (error) {
    console.error("Error fetching latest messages:", error);
    res.status(500).json({ message: "Error fetching latest messages" });
  }
});

app.get("/mark-read/:id", async (req, res) => {
  const { id } = req.params;
  const updatedMessage = await Message.findByIdAndUpdate(id, { isRead: true });
  res.json(updatedMessage);
});

// Real time chat setup
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Create room for every user using their id
  socket.on("join-room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined a room ${userId}`);
  });

  // listen for messages
  socket.on("send-message", async (data) => {
    const { senderId, receiverId, message } = data;
    const savedMessage = await new Message({
      senderId: senderId,
      receiverId: receiverId,
      message: message,
      sentAt: new Date().toISOString(),
    }).save();

    // notify just the receiver
    io.to(receiverId).emit("new-message", savedMessage);

    // Notify the sender (optional confirmation)
    io.to(senderId).emit("message-sent", savedMessage);

    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
    });
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
