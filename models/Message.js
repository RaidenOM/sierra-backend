import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    default: "",
  },
  mediaURL: {
    type: String,
    default: null,
  },
  mediaType: {
    type: String,
    default: null,
  },
  sentAt: {
    type: Date,
    default: Date.now(),
  },
  isRead: {
    type: Boolean,
    required: true,
    default: false,
  },
});

export default mongoose.model("Message", MessageSchema);
