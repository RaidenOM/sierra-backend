const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Updated Cloudinary Storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const fileType = file.mimetype.split("/")[0];

    // Check if file type is an image or video
    if (fileType === "image") {
      return {
        folder: "Sierra/images",
        allowedFormats: ["jpeg", "png", "jpg"],
      };
    } else if (fileType === "video") {
      return {
        folder: "Sierra/videos",
        allowedFormats: ["mp4", "mov"],
      };
    }

    throw new Error("Invalid file type");
  },
});

// Use the new storage configuration with multer
const upload = multer({ storage: storage });

module.exports = {
  cloudinary,
  storage,
};
