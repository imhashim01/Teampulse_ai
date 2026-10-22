import mongoose from "mongoose";

const notificationDeliverySchema = new mongoose.Schema({
    event: { type: String, required: true }, // assigned, submission, revision, reminder24h, overdue, nudge
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    channel: { type: String, enum: ["whatsapp"], default: "whatsapp" },
    to: { type: String },
    message: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Sent", "Failed", "Simulated"], default: "Pending" },
    error: { type: String },
    providerMessageId: { type: String },
    dedupeKey: { type: String, required: true, unique: true },
    attempts: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
}, { timestamps: true });

export const NotificationDelivery = mongoose.model("NotificationDelivery", notificationDeliverySchema);
