// All WhatsApp configuration is read from backend-only environment variables.
// Values are read on every call (not cached at import) so tests and restarts pick up changes.

const bool = (v, def = false) => (v === undefined || v === "" ? def : ["1", "true", "yes", "on"].includes(String(v).toLowerCase()));
const int = (v, def) => (v === undefined || v === "" || isNaN(Number(v)) ? def : Number(v));

// Message types and the template env vars each one uses.
// Template body parameters ({{1}}, {{2}}, ...) are documented in WHATSAPP_SETUP.md.
export const MESSAGE_TYPES = {
    verification: "VERIFICATION",
    project_added: "PROJECT_ADDED",
    task_submitted: "TASK_SUBMITTED",
    deadline_reminder: "DEADLINE",
    overdue: "OVERDUE",
    task_assigned: "TASK_ASSIGNED",
    revision: "REVISION",
    nudge: "NUDGE",
};

export const whatsappConfig = () => {
    const e = process.env;
    const templates = {};
    for (const [type, key] of Object.entries(MESSAGE_TYPES)) {
        templates[type] = {
            name: e[`WHATSAPP_${key}_TEMPLATE_NAME`] || "",
            language: e[`WHATSAPP_${key}_TEMPLATE_LANGUAGE`] || "en",
        };
    }
    return {
        enabled: bool(e.WHATSAPP_ENABLED),
        accessToken: e.WHATSAPP_ACCESS_TOKEN || e.WHATSAPP_TOKEN || "",
        phoneNumberId: e.WHATSAPP_PHONE_NUMBER_ID || "",
        businessAccountId: e.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
        apiVersion: e.WHATSAPP_API_VERSION || "v23.0",
        graphBaseUrl: e.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com",
        webhookVerifyToken: e.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
        appSecret: e.WHATSAPP_APP_SECRET || "",
        templates,
        // Free-form text only reaches a user inside Meta's 24-hour customer-service window.
        // Off by default: without a template, business-initiated messages fail with a clear error.
        freeformFallback: bool(e.WHATSAPP_FREEFORM_FALLBACK, false),
        // Local development only (ignored when NODE_ENV=production): also print the OTP in the server console,
        // e.g. while a sandbox account cannot deliver it.
        devLogOtp: bool(e.WHATSAPP_DEV_LOG_OTP, false) && e.NODE_ENV !== "production",
        requestTimeoutMs: int(e.WHATSAPP_REQUEST_TIMEOUT_MS, 5000),
        maxSendRetries: int(e.WHATSAPP_MAX_SEND_RETRIES, 1), // inline retries; later retries run from the cron job
        maxDeliveryAttempts: int(e.WHATSAPP_MAX_DELIVERY_ATTEMPTS, 4),
        otp: {
            ttlSeconds: int(e.WHATSAPP_OTP_TTL_SECONDS, 300),
            maxAttempts: int(e.WHATSAPP_OTP_MAX_ATTEMPTS, 5),
            resendCooldownSeconds: int(e.WHATSAPP_OTP_RESEND_COOLDOWN_SECONDS, 60),
            maxSendsPerHour: int(e.WHATSAPP_OTP_MAX_SENDS_PER_HOUR, 5),
            secret: e.WHATSAPP_OTP_SECRET || e.JWT_SECRET || "",
        },
        reminders: {
            enabled: bool(e.WHATSAPP_REMINDERS_ENABLED, false),
            offsetsHours: (e.WHATSAPP_REMINDER_OFFSETS_HOURS ?? "24,1")
                .split(",").map((s) => Number(s.trim())).filter((n) => n > 0).sort((a, b) => b - a),
            overdueEnabled: bool(e.WHATSAPP_OVERDUE_REMINDER_ENABLED, true),
            overdueRepeatHours: int(e.WHATSAPP_OVERDUE_REPEAT_HOURS, 0),
            overdueMaxReminders: int(e.WHATSAPP_OVERDUE_MAX_REMINDERS, 1),
            notifyLeadOnOverdue: bool(e.WHATSAPP_OVERDUE_NOTIFY_LEAD, true),
            timezone: e.WHATSAPP_REMINDER_TIMEZONE || "Asia/Karachi",
        },
        appBaseUrl: (e.APP_BASE_URL || "").replace(/\/$/, ""),
    };
};

// What is missing for live sending (never includes secret values)
export const missingSendConfig = (cfg = whatsappConfig()) => {
    const missing = [];
    if (!cfg.accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
    if (!cfg.phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
    return missing;
};

// "live" sends to Meta; "disabled" records deliveries as Simulated without calling Meta
export const whatsappMode = (cfg = whatsappConfig()) => (cfg.enabled ? "live" : "disabled");
