import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");

    return {
      folder: "Sierra",
      allowed_formats: [
        "jpeg",
        "png",
        "jpg",
        "mp4",
        "mov",
        "mp3",
        "wav",
        "ogg",
      ],
      resource_type: isVideo ? "video" : isAudio ? "raw" : "image", // Audio files should be "raw"
    };
  },
});

export { cloudinary, storage };
