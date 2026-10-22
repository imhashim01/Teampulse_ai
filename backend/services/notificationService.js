import { Notification } from "../models/NotificationModel.js";
import { NotificationDelivery } from "../models/NotificationDeliveryModel.js";
import { ActivityEvent } from "../models/ActivityEventModel.js";
import { User } from "../models/UserModel.js";
import { sendWhatsApp, isWhatsAppConfigured } from "./whatsappService.js";

export const logActivity = ({ project, task, actor, type, message }) =>
    ActivityEvent.create({ project, task, actor, type, message });

// Sends a WhatsApp message and records it as a NotificationDelivery.
// Returns { duplicate: true } if a delivery with this dedupeKey already exists.
export const deliverWhatsApp = async ({ event, recipientId, project, task, message, dedupeKey }) => {
    let delivery;
    try {
        delivery = await NotificationDelivery.create({
            event, recipient: recipientId, project, task, message, dedupeKey, status: "Pending",
        });
    } catch (error) {
        if (error.code === 11000) return { duplicate: true };
        throw error;
    }

    const user = await User.findById(recipientId).select("phone whatsappOptIn");
    let result;
    if (!isWhatsAppConfigured()) {
        // Mock mode: never "Sent"
        result = await sendWhatsApp({ to: user?.phone || "(no phone)", text: message });
    } else if (!user?.phone || !user.whatsappOptIn) {
        result = { status: "Failed", attempts: 0, error: "Recipient has not added a phone number / opted in to WhatsApp" };
    } else {
        result = await sendWhatsApp({ to: user.phone, text: message });
    }

    delivery.to = user?.phone;
    delivery.status = result.status;
    delivery.attempts = result.attempts;
    delivery.error = result.error;
    delivery.providerMessageId = result.providerMessageId;
    await delivery.save();
    return { duplicate: false, delivery };
};

// In-app notification + optional WhatsApp. When dedupeKey is given and was already used,
// nothing is created (so reminders can run repeatedly without duplicates).
export const notify = async ({ userId, project, task, type, message, whatsapp }) => {
    if (whatsapp?.dedupeKey) {
        const res = await deliverWhatsApp({
            event: type, recipientId: userId, project, task,
            message: whatsapp.message || message, dedupeKey: whatsapp.dedupeKey,
        });
        if (res.duplicate) return { duplicate: true };
    }
    await Notification.create({ user: userId, project, task, type, message });
    return { duplicate: false };
};
