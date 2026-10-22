// WhatsApp Cloud API sender.
// - No WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID -> mock mode: logs and returns "Simulated" (never "Sent").
// - WHATSAPP_TEMPLATE_NAME set -> sends that approved template (e.g. hello_world). Meta's test number can
//   only send templates to verified numbers outside the 24h customer-service window.
// - Otherwise sends a plain text message.
// Retries up to 2 times on 5xx / network errors.

const GRAPH_URL = "https://graph.facebook.com/v21.0";
const MAX_RETRIES = 2;

export const isWhatsAppConfigured = () =>
    Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

const buildPayload = (to, text) => {
    const template = process.env.WHATSAPP_TEMPLATE_NAME;
    if (template) {
        return {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en_US" } },
        };
    }
    return { messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: text } };
};

// Returns { status: "Sent"|"Failed"|"Simulated", attempts, error?, providerMessageId? }
export const sendWhatsApp = async ({ to, text }) => {
    if (!to) return { status: "Failed", attempts: 0, error: "Recipient has no phone number" };

    if (!isWhatsAppConfigured()) {
        console.log(`[whatsapp:mock] to=${to} :: ${text}`);
        return { status: "Simulated", attempts: 1 };
    }

    const url = `${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const body = JSON.stringify(buildPayload(to.replace(/^\+/, ""), text));
    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body,
                signal: AbortSignal.timeout(10000),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                return { status: "Sent", attempts: attempt, providerMessageId: data?.messages?.[0]?.id };
            }
            lastError = data?.error?.message || `HTTP ${res.status}`;
            if (res.status < 500) return { status: "Failed", attempts: attempt, error: lastError };
        } catch (error) {
            lastError = error.message;
        }
    }
    return { status: "Failed", attempts: MAX_RETRIES + 1, error: lastError };
};
