import mongoose from "mongoose";

// Lifecycle: Queued -> Accepted (Meta accepted the request) -> Sent -> Delivered -> Read (from webhooks)
// Failed: provider or config error. Skipped: recipient not eligible (unverified, opted out, preference off).
// Simulated: WHATSAPP_ENABLED=false, nothing was sent. "Pending" is kept for records created before this change.
export const DELIVERY_STATUSES = ["Queued", "Accepted", "Sent", "Delivered", "Read", "Failed", "Skipped", "Simulated", "Pending"];

const notificationDeliverySchema = new mongoose.Schema({
    event: { type: String, required: true }, // verification, project_added, task_submitted, deadline_reminder, overdue, ...
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    submission: { type: mongoose.Schema.Types.ObjectId, ref: "Submission" },
    channel: { type: String, enum: ["whatsapp"], default: "whatsapp" },
    to: { type: String }, // masked number only, e.g. +923****567
    message: { type: String, default: "" }, // preview; never contains verification codes
    template: { type: String },
    // What to resend on retry (template + text). Never stored for verification codes.
    payload: { type: Object, select: false },
    status: { type: String, enum: DELIVERY_STATUSES, default: "Queued", index: true },
    errorCategory: { type: String },
    error: { type: String },
    retryable: { type: Boolean, default: false },
    providerMessageId: { type: String, index: true, sparse: true },
    dedupeKey: { type: String, required: true, unique: true }, // idempotency key
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date },
    lockedUntil: { type: Date },
    statusUpdatedAt: { type: Date },
    isDemo: { type: Boolean, default: false },
}, { timestamps: true });

notificationDeliverySchema.index({ status: 1, retryable: 1, nextAttemptAt: 1 });

export const NotificationDelivery = mongoose.model("NotificationDelivery", notificationDeliverySchema);
