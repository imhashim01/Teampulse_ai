// Meta WhatsApp webhook: signature check + delivery status / opt-out processing.
import crypto from "crypto";
import { NotificationDelivery } from "../models/NotificationDeliveryModel.js";
import { WhatsAppWebhookEvent } from "../models/WhatsAppWebhookEventModel.js";
import { User } from "../models/UserModel.js";

// X-Hub-Signature-256: "sha256=<hex HMAC of the raw body with the app secret>"
export const verifySignature = (rawBody, header, appSecret) => {
    if (!rawBody || !header || !appSecret || !header.startsWith("sha256=")) return false;
    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const given = header.slice("sha256=".length);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(given, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const STATUS_MAP = { sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed" };
const RANK = { Queued: 0, Pending: 0, Accepted: 1, Sent: 2, Delivered: 3, Read: 4 };

// Statuses only move forward; "failed" never overrides delivered/read
export const nextStatus = (current, incoming) => {
    if (incoming === "Failed") return (RANK[current] ?? 0) >= RANK.Delivered ? current : "Failed";
    if (current === "Failed") return incoming; // a later sent/delivered beats an earlier failure report
    return (RANK[incoming] ?? -1) > (RANK[current] ?? -1) ? incoming : current;
};

const OPT_OUT = /^\s*(stop|unsubscribe|cancel|band karo)\s*$/i;

// deps: { isProcessed(key), markProcessed(key), applyStatus({ providerMessageId, status, errorCategory, error, timestamp }), optOut(phoneE164) }
export const processWebhookPayload = async (payload, deps) => {
    const summary = { statuses: 0, optOuts: 0, duplicates: 0 };
    if (payload?.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return summary;

    for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
            const value = change.value || {};
            for (const s of value.statuses || []) {
                const status = STATUS_MAP[s.status];
                if (!s.id || !status) continue;
                const key = `status:${s.id}:${s.status}`;
                if (await deps.isProcessed(key)) { summary.duplicates++; continue; }
                const err = s.errors?.[0];
                await deps.applyStatus({
                    providerMessageId: s.id, status,
                    errorCategory: err ? `provider_${err.code}` : undefined,
                    error: err ? String(err.title || err.message || "Delivery failed").slice(0, 200) : undefined,
                    timestamp: s.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date(),
                });
                await deps.markProcessed(key); // only after the update succeeded
                summary.statuses++;
            }
            for (const m of value.messages || []) {
                const key = `message:${m.id}`;
                if (!m.id || await deps.isProcessed(key)) { summary.duplicates++; continue; }
                if (m.type === "text" && OPT_OUT.test(m.text?.body || "") && m.from) {
                    await deps.optOut(`+${String(m.from).replace(/^\+/, "")}`);
                    summary.optOuts++;
                }
                await deps.markProcessed(key);
            }
        }
    }
    return summary;
};

export const webhookDeps = {
    isProcessed: async (eventKey) => Boolean(await WhatsAppWebhookEvent.exists({ eventKey })),
    markProcessed: async (eventKey) => {
        try { await WhatsAppWebhookEvent.create({ eventKey }); } catch (e) { if (e.code !== 11000) throw e; }
    },
    applyStatus: async ({ providerMessageId, status, errorCategory, error, timestamp }) => {
        const delivery = await NotificationDelivery.findOne({ providerMessageId });
        if (!delivery) return;
        const updated = nextStatus(delivery.status, status);
        if (updated === delivery.status) return;
        delivery.status = updated;
        delivery.statusUpdatedAt = timestamp;
        if (updated === "Failed") { delivery.errorCategory = errorCategory; delivery.error = error; delivery.retryable = false; }
        await delivery.save();
    },
    // Replying STOP turns off WhatsApp notifications for that number
    optOut: async (phone) => { await User.updateMany({ phone }, { whatsappOptIn: false }); },
};
