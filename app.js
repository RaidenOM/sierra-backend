require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Message = require("./models/Message");

const app = express();
mongoose.connect("mongodb://127.0.0.1:27017/sierra");

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

    // If no messages are found
    if (messages.length === 0) {
      return res
        .status(404)
        .json({ message: "No messages found between these users." });
    }

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

app.listen(3000, (req, res) => {
  console.log("Server running on PORT: 3000");
});
