const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profilePhoto: {
    type: String,
  },
  bio: {
    type: String,
    default: "Hey there, I am using Sierra",
  },
});

module.exports = mongoose.model("User", UserSchema);
