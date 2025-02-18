const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  profilePhoto: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    default: "Hey there, I am using Sierra",
    trim: true,
  },
  phone: {
    type: String,
    unique: true,
    required: true,
  },
});

module.exports = mongoose.model("User", UserSchema);
