import { Notification } from "../models/NotificationModel.js";
import { NotificationDelivery } from "../models/NotificationDeliveryModel.js";
import { ActivityEvent } from "../models/ActivityEventModel.js";
import { User } from "../models/UserModel.js";
import { whatsappConfig, whatsappMode } from "../config/whatsapp.js";
import { sendWhatsAppMessage, maskPhone, WhatsAppConfigError } from "./whatsappService.js";
import { buildMessage } from "./whatsappMessages.js";

export const logActivity = ({ project, task, actor, type, message }) =>
    ActivityEvent.create({ project, task, actor, type, message });

// Which user preference controls each message type
const PREF_FOR_TYPE = {
    project_added: "projectAdded",
    task_submitted: "taskSubmitted",
    deadline_reminder: "deadlineReminders",
    overdue: "overdue",
    task_assigned: "taskUpdates",
    revision: "taskUpdates",
    nudge: "taskUpdates",
};

// Only verified, opted-in numbers receive routine notifications
export const checkEligibility = (user, type) => {
    if (!user) return { ok: false, reason: "recipient_not_found" };
    if (!user.phone || !user.whatsappVerified) return { ok: false, reason: "not_verified" };
    if (!user.whatsappOptIn) return { ok: false, reason: "opted_out" };
    const pref = PREF_FOR_TYPE[type];
    if (pref && user.whatsappPrefs && user.whatsappPrefs[pref] === false) return { ok: false, reason: "preference_off" };
    return { ok: true };
};

const RETRY_DELAYS_MIN = [1, 5, 15, 60];
const nextAttemptAt = (attempts) => new Date(Date.now() + (RETRY_DELAYS_MIN[Math.min(attempts - 1, RETRY_DELAYS_MIN.length - 1)] || 60) * 60000);

// Sends one stored delivery and records the outcome. `message` = { template, text }.
const attemptSend = async (delivery, to, message, { sendImpl = sendWhatsAppMessage } = {}) => {
    const cfg = whatsappConfig();
    let result;
    const noTemplate = !message.template && !cfg.freeformFallback;
    if (whatsappMode(cfg) === "disabled") {
        // Dry run: nothing is sent to Meta
        result = { status: "Simulated", attempts: 0, error: noTemplate ? `Dry run. Note: no template configured for "${delivery.event}"` : undefined };
    } else if (noTemplate) {
        result = { status: "Failed", attempts: 0, errorCategory: "template_not_configured", error: `No approved template configured for "${delivery.event}"`, retryable: false };
    } else {
        try {
            result = await sendImpl({ to, template: message.template, text: message.text });
        } catch (error) {
            if (!(error instanceof WhatsAppConfigError)) throw error;
            result = { status: "Failed", attempts: 0, errorCategory: "config_missing", error: error.message, retryable: false };
        }
    }

    delivery.status = result.status;
    delivery.attempts = (delivery.attempts || 0) + (result.attempts || 0);
    delivery.errorCategory = result.errorCategory;
    delivery.error = result.error;
    delivery.providerMessageId = result.providerMessageId || delivery.providerMessageId;
    delivery.statusUpdatedAt = new Date();
    delivery.lockedUntil = undefined;
    delivery.retryable = Boolean(result.retryable) && delivery.attempts < cfg.maxDeliveryAttempts;
    delivery.nextAttemptAt = delivery.retryable ? nextAttemptAt(delivery.attempts) : undefined;
    await delivery.save();
    return delivery;
};

// Idempotent WhatsApp delivery shared by every workflow.
// - idempotencyKey: a second call with the same key does nothing and returns { duplicate: true }.
// - Ineligible recipients are recorded as "Skipped" with the reason.
export const deliverWhatsApp = async ({ type, recipientId, vars, idempotencyKey, project, task, submission }, deps = {}) => {
    const message = buildMessage(type, vars);
    let delivery;
    try {
        delivery = await NotificationDelivery.create({
            event: type, recipient: recipientId, project, task, submission,
            message: message.preview, template: message.template?.name, dedupeKey: idempotencyKey,
            payload: { template: message.template, text: message.text }, status: "Queued",
        });
    } catch (error) {
        if (error.code === 11000) return { duplicate: true, delivery: await NotificationDelivery.findOne({ dedupeKey: idempotencyKey }) };
        throw error;
    }

    const user = await User.findById(recipientId).select("phone whatsappVerified whatsappOptIn whatsappPrefs");
    const eligible = checkEligibility(user, type);
    delivery.to = maskPhone(user?.phone);
    if (!eligible.ok) {
        delivery.status = "Skipped";
        delivery.errorCategory = eligible.reason;
        delivery.statusUpdatedAt = new Date();
        await delivery.save();
        return { duplicate: false, delivery };
    }
    return { duplicate: false, delivery: await attemptSend(delivery, user.phone, message, deps) };
};

// Verification codes go to the (not yet verified) pending number. The code is never stored.
export const sendVerificationCode = async ({ userId, phone, code, ttlMinutes }, deps = {}) => {
    const message = buildMessage("verification", { code, ttlMinutes });
    const delivery = await NotificationDelivery.create({
        event: "verification", recipient: userId, to: maskPhone(phone), message: message.preview,
        template: message.template?.name, dedupeKey: `verification:${userId}:${Date.now()}`, status: "Queued",
    });
    await attemptSend(delivery, phone, message, deps);
    // Codes are never retried in the background: the user can request a new one.
    if (delivery.retryable) { delivery.retryable = false; delivery.nextAttemptAt = undefined; await delivery.save(); }
    return delivery;
};

// Retries temporary failures (timeouts, 5xx, rate limits) with backoff. Called by the reminder job.
// Each delivery is claimed with a lock so concurrent runs never send it twice.
export const retryFailedDeliveries = async ({ limit = 20 } = {}, deps = {}) => {
    const now = new Date();
    const summary = { retried: 0 };
    for (let i = 0; i < limit; i++) {
        const delivery = await NotificationDelivery.findOneAndUpdate(
            { status: "Failed", retryable: true, nextAttemptAt: { $lte: now }, $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }] },
            { status: "Queued", lockedUntil: new Date(now.getTime() + 2 * 60000) },
            { new: true }
        ).select("+payload");
        if (!delivery) break;
        const user = await User.findById(delivery.recipient).select("phone whatsappVerified whatsappOptIn whatsappPrefs");
        const eligible = checkEligibility(user, delivery.event);
        if (!eligible.ok || !delivery.payload) {
            Object.assign(delivery, { status: "Skipped", errorCategory: eligible.reason || "no_payload", retryable: false, lockedUntil: undefined });
            await delivery.save();
            continue;
        }
        await attemptSend(delivery, user.phone, delivery.payload, deps);
        summary.retried++;
    }
    return summary;
};

// In-app notification (deduped when dedupeKey is given) plus an optional WhatsApp message.
// whatsapp: { type, key, vars }. Returns { duplicate, whatsapp?: delivery }.
export const notify = async ({ userId, project, task, type, message, dedupeKey, whatsapp }) => {
    try {
        await Notification.create({ user: userId, project, task, type, message, ...(dedupeKey ? { dedupeKey } : {}) });
    } catch (error) {
        if (error.code === 11000 && dedupeKey) return { duplicate: true };
        throw error;
    }
    if (!whatsapp) return { duplicate: false };
    try {
        const res = await deliverWhatsApp({ type: whatsapp.type, recipientId: userId, vars: whatsapp.vars, idempotencyKey: whatsapp.key, project, task, submission: whatsapp.submission });
        return { duplicate: false, whatsapp: res.delivery };
    } catch (error) {
        // A WhatsApp problem must never undo the operation that already succeeded
        console.log(`WhatsApp delivery error (${whatsapp.type}):`, error.message);
        return { duplicate: false, whatsapp: { status: "Failed", errorCategory: "internal_error" } };
    }
};

// Short, user-safe description of a delivery outcome for API responses
export const deliverySummary = (d) => (d ? { status: d.status, reason: d.errorCategory || undefined } : undefined);
