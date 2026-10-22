import mongoose from "mongoose";

// Records processed webhook events so retried/duplicate deliveries from Meta are ignored.
// Expires after 7 days (Meta retries for up to 7 days).
const whatsAppWebhookEventSchema = new mongoose.Schema({
    eventKey: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: 7 * 24 * 60 * 60 },
});

export const WhatsAppWebhookEvent = mongoose.model("WhatsAppWebhookEvent", whatsAppWebhookEventSchema);
