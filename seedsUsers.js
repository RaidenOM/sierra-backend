require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User"); // Adjust the path if the User model is elsewhere

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/sierra", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to the database!");
});

// Example user data with real-person images
const users = [
  {
    username: "johndoe",
    password: "password123",
    profilePhoto: "https://randomuser.me/api/portraits/men/1.jpg",
    bio: "Hello, I'm John! I love coding and hiking.",
  },
  {
    username: "janedoe",
    password: "securepass456",
    profilePhoto: "https://randomuser.me/api/portraits/women/2.jpg",
    bio: "Hi there! Jane here. I enjoy painting and exploring new cuisines.",
  },
  {
    username: "mikesmith",
    password: "mypassword789",
    profilePhoto: "https://randomuser.me/api/portraits/men/3.jpg",
    bio: "Mike here. A tech enthusiast and avid gamer.",
  },
  {
    username: "emilyjones",
    password: "emilypass321",
    profilePhoto: "https://randomuser.me/api/portraits/women/4.jpg",
    bio: "Emily's the name! Coffee lover and bookworm.",
  },
  {
    username: "sarahbrown",
    password: "sarahsecure1",
    profilePhoto: "https://randomuser.me/api/portraits/women/5.jpg",
    bio: "Sarah here. Passionate about fitness and photography.",
  },
];

// Function to hash passwords and insert users
const populateDB = async () => {
  try {
    await User.deleteMany({}); // Clear the collection before inserting new users

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10); // Hash the password
      const newUser = new User({
        username: user.username,
        password: hashedPassword,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
      });

      await newUser.save(); // Save the user to the database
      console.log(`User ${user.username} created successfully!`);
    }

    console.log("Database populated successfully!");
    mongoose.connection.close(); // Close the connection after finishing
  } catch (err) {
    console.error("Error populating the database:", err);
  }
};

// Run the population script
populateDB();
