const mongoose = require("mongoose");
const User = require("./models/User"); // Assuming you have a User model
const Message = require("./models/Message"); // Your Message model

// MongoDB URI (Update if necessary)
mongoose
  .connect("mongodb://127.0.0.1:27017/sierra", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

const seedMessages = async () => {
  try {
    // Find all users
    const users = await User.find({});

    // Check if we have enough users
    if (users.length < 2) {
      console.log("Not enough users to send messages.");
      return;
    }

    // Sample messages to seed
    const messages = [
      {
        senderId: users[0]._id,
        receiverId: users[1]._id,
        message: "Hey Jane, how are you doing?",
      },
      {
        senderId: users[1]._id,
        receiverId: users[0]._id,
        message: "I'm good, John! How about you?",
      },
      {
        senderId: users[2]._id,
        receiverId: users[3]._id,
        message: "Hey Emily, have you tried that new gaming console?",
      },
      {
        senderId: users[3]._id,
        receiverId: users[2]._id,
        message: "Not yet, Mike! I'm planning to check it out this weekend.",
      },
      {
        senderId: users[4]._id,
        receiverId: users[5]._id,
        message: "Sarah, do you have any good photo editing tips?",
      },
      {
        senderId: users[5]._id,
        receiverId: users[4]._id,
        message: "Sure, Emily! I'll send you some resources.",
      },
      {
        senderId: users[0]._id,
        receiverId: users[4]._id,
        message: "Hi Emily, long time no see! How's life?",
      },
      {
        senderId: users[4]._id,
        receiverId: users[0]._id,
        message: "Hey John, everything's going great! How about you?",
      },
      {
        senderId: users[3]._id,
        receiverId: users[1]._id,
        message: "Hi Jane! I saw your latest painting, it's amazing!",
      },
      {
        senderId: users[1]._id,
        receiverId: users[3]._id,
        message: "Thank you, Emily! That means a lot to me.",
      },
    ];

    // Insert the messages into the database
    await Message.insertMany(messages);

    console.log("Messages have been seeded successfully!");
  } catch (err) {
    console.error("Error seeding messages:", err);
  } finally {
    // Close the database connection after seeding
    mongoose.connection.close();
  }
};

// Call the seed function to insert messages
seedMessages();
