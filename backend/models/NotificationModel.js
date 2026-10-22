import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    type: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    dedupeKey: { type: String, unique: true, sparse: true }, // prevents duplicate reminders
    isDemo: { type: Boolean, default: false },
}, { timestamps: true });

export const Notification = mongoose.model("Notification", notificationSchema);
