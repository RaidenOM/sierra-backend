import mongoose from "mongoose";

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
    select: false,
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
  contacts: [
    {
      phone: String,
      savedName: String,
    },
  ],
  pushTokens: [String],
});

export default mongoose.model("User", UserSchema);
