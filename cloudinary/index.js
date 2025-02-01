const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Sierra",
    allowedFormats: ["jpeg", "png", "jpg", "mp4", "mp3", "mov"],
  },
  resource_type: "auto",
});

module.exports = {
  cloudinary,
  storage,
};
