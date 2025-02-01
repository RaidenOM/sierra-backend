const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Determine if the file is a video or image
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: "Sierra",
      allowed_formats: ["jpeg", "png", "jpg", "mp4", "mov"], // Use underscores for allowed_formats
      resource_type: isVideo ? "video" : "image", // Set resource_type dynamically
    };
  },
});

module.exports = {
  cloudinary,
  storage,
};
