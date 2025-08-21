import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { User } from "../models/UserModel.js";
import { streamUpload, upload } from "../utils/fileUploader.js";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

router.put("/update-profile-picture", verifyToken, upload.single("profilePicture"), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If there's a previous profile picture (not the default), delete it from Cloudinary
    if (user.profilePicture && user.profilePicture !== "https://res.cloudinary.com/df5q2q5/image/upload/v1710761735/default-profile-picture.png") {
      const publicId = user.profilePicture.split("/").pop().split(".")[0]; // Extract public ID from URL
      await cloudinary.uploader.destroy(publicId);
    }

    // Upload new image to Cloudinary
    const result = await streamUpload(req);
    user.profilePicture = result.secure_url;
    await user.save();

    res.status(200).json({ message: "Profile picture updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;