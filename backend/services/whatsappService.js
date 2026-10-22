// Meta WhatsApp Cloud API client (official Graph API only).
// - WHATSAPP_ENABLED=false -> dry run: nothing is sent, callers record "Simulated".
// - Templates are used for business-initiated messages. Free-form text is only sent when
//   explicitly allowed (it only reaches users inside the 24-hour customer-service window).
// - Transient failures (timeouts, 5xx, rate limits) are retried with bounded backoff.
// Never logs access tokens, verification codes or full phone numbers.
import { whatsappConfig, missingSendConfig } from "../config/whatsapp.js";

export class WhatsAppConfigError extends Error {
    constructor(message, missing = []) {
        super(message);
        this.name = "WhatsAppConfigError";
        this.category = "config_missing";
        this.missing = missing;
    }
}

export const isWhatsAppConfigured = () => whatsappConfig().enabled && missingSendConfig().length === 0;

export const maskPhone = (phone) => {
    if (!phone) return "";
    const p = String(phone);
    return p.length <= 6 ? "***" : `${p.slice(0, 4)}****${p.slice(-3)}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Maps Graph API errors to stable categories (https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)
export const classifyError = (httpStatus, err = {}) => {
    const code = Number(err.code);
    if (httpStatus === 401 || code === 190) return { category: "auth_invalid", retryable: false };
    if ([4, 80007, 130429, 131048, 131056].includes(code) || httpStatus === 429) return { category: "rate_limited", retryable: true };
    if (code === 131026 || code === 131030) return { category: "invalid_recipient", retryable: false };
    if (code === 131047) return { category: "outside_24h_window", retryable: false };
    if (code >= 132000 && code <= 132069) return { category: "template_error", retryable: false };
    if (code === 131051 || code === 131008 || code === 131009 || code === 100) return { category: "bad_request", retryable: false };
    if (code === 131000 || code === 2 || code === 1 || httpStatus >= 500) return { category: "provider_error", retryable: true };
    if (code === 10 || code === 200 || httpStatus === 403) return { category: "permission_denied", retryable: false };
    return { category: "provider_error", retryable: httpStatus >= 500 };
};

// Builds the Graph API message payload
export const buildPayload = ({ to, template, text }) => {
    const recipient = String(to).replace(/^\+/, "");
    if (template) {
        const components = [];
        if (template.bodyParams?.length) {
            components.push({ type: "body", parameters: template.bodyParams.map((t) => ({ type: "text", text: String(t) })) });
        }
        // Authentication (OTP) templates carry the code again in a URL/copy-code button
        if (template.buttonParam !== undefined) {
            components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: String(template.buttonParam) }] });
        }
        return {
            messaging_product: "whatsapp", recipient_type: "individual", to: recipient, type: "template",
            template: { name: template.name, language: { code: template.language || "en" }, ...(components.length ? { components } : {}) },
        };
    }
    return { messaging_product: "whatsapp", recipient_type: "individual", to: recipient, type: "text", text: { preview_url: true, body: text } };
};

// Returns { status: "Accepted"|"Failed", attempts, providerMessageId?, errorCategory?, error?, retryable? }
// Throws WhatsAppConfigError when live sending is enabled but credentials are missing.
export const sendWhatsAppMessage = async ({ to, template, text }, { fetchImpl = globalThis.fetch, backoffMs = [500, 1500] } = {}) => {
    const cfg = whatsappConfig();
    const missing = missingSendConfig(cfg);
    if (missing.length) throw new WhatsAppConfigError(`WhatsApp is enabled but not configured: missing ${missing.join(", ")}`, missing);
    if (!to) return { status: "Failed", attempts: 0, errorCategory: "invalid_recipient", error: "No recipient number", retryable: false };
    if (!template && !text) return { status: "Failed", attempts: 0, errorCategory: "bad_request", error: "Empty message", retryable: false };

    const url = `${cfg.graphBaseUrl}/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
    const body = JSON.stringify(buildPayload({ to, template, text }));
    let last = { status: "Failed", attempts: 0, errorCategory: "provider_error", error: "Unknown error", retryable: true };

    for (let attempt = 1; attempt <= cfg.maxSendRetries + 1; attempt++) {
        try {
            const res = await fetchImpl(url, {
                method: "POST",
                headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
                body,
                signal: AbortSignal.timeout(cfg.requestTimeoutMs),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.messages?.[0]?.id) {
                // "Accepted" = Meta accepted the request. Sent/Delivered/Read only come from webhooks.
                return { status: "Accepted", attempts: attempt, providerMessageId: data.messages[0].id };
            }
            const { category, retryable } = classifyError(res.status, data?.error);
            last = { status: "Failed", attempts: attempt, errorCategory: category, error: safeError(data?.error, res.status), retryable };
            if (!retryable) return last;
        } catch (error) {
            const timeout = error.name === "TimeoutError" || error.name === "AbortError";
            last = { status: "Failed", attempts: attempt, errorCategory: timeout ? "timeout" : "network_error", error: timeout ? "Request to WhatsApp timed out" : "Network error contacting WhatsApp", retryable: true };
        }
        if (attempt <= cfg.maxSendRetries) await sleep(backoffMs[Math.min(attempt - 1, backoffMs.length - 1)] ?? 0);
    }
    return last;
};

// Short provider message without echoing request data
const safeError = (err, status) => {
    if (!err) return `HTTP ${status}`;
    const code = err.code ? ` (code ${err.code})` : "";
    return `${String(err.message || err.error_user_msg || "WhatsApp API error").slice(0, 200)}${code}`;
};
