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
    profilePicture: { type: String, default: "https://res.cloudinary.com/df5q2q5/image/upload/v1710761735/default-profile-picture.png" }, // Default Cloudinary URL
    phone: { type: String, trim: true }, // E.164, e.g. +923001234567. Only set after WhatsApp verification.
    whatsappOptIn: { type: Boolean, default: false }, // consent to WhatsApp notifications
    whatsappVerified: { type: Boolean, default: false },
    whatsappVerifiedAt: { type: Date },
    whatsappPrefs: {
        projectAdded: { type: Boolean, default: true },
        taskSubmitted: { type: Boolean, default: true },
        deadlineReminders: { type: Boolean, default: true },
        overdue: { type: Boolean, default: true },
        taskUpdates: { type: Boolean, default: true }, // assignments, revisions, lead messages
    },
    // Pending verification. Only a hash of the code is stored; select: false keeps these out of API responses.
    whatsappPendingPhone: { type: String, select: false },
    whatsappOtpHash: { type: String, select: false },
    whatsappOtpExpiresAt: { type: Date, select: false },
    whatsappOtpAttempts: { type: Number, default: 0, select: false },
    whatsappOtpLastSentAt: { type: Date, select: false },
    whatsappOtpSendWindowStart: { type: Date, select: false },
    whatsappOtpSendCount: { type: Number, default: 0, select: false },
    isDemo: { type: Boolean, default: false }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);