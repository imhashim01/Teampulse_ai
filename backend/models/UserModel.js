import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    lastLogin: { type: Date, default: Date.now() },
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    profilePicture: { type: String, default: "https://res.cloudinary.com/df5q2q5/image/upload/v1710761735/default-profile-picture.png" } // Default Cloudinary URL
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);