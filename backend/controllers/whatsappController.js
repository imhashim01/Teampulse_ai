import { User } from "../models/UserModel.js";
import { whatsappConfig, whatsappMode, missingSendConfig } from "../config/whatsapp.js";
import { toE164, generateOtp, hashOtp, checkOtp, checkSendAllowed } from "../services/whatsappVerification.js";
import { sendVerificationCode } from "../services/notificationService.js";
import { verifySignature, processWebhookPayload, webhookDeps } from "../services/whatsappWebhook.js";

const OTP_FIELDS = "+whatsappPendingPhone +whatsappOtpHash +whatsappOtpExpiresAt +whatsappOtpAttempts +whatsappOtpLastSentAt +whatsappOtpSendWindowStart +whatsappOtpSendCount";

const SEND_ERRORS = {
    config_missing: "WhatsApp is not configured on the server yet.",
    template_not_configured: "The WhatsApp verification template is not configured on the server yet.",
    invalid_recipient: "WhatsApp could not deliver to this number. Check that it is a WhatsApp number in international format.",
    recipient_not_allowed: "This server uses a Meta test number, which can only message numbers on its allowed list. An administrator must add this number in Meta (WhatsApp > API Setup > To).",
    auth_invalid: "The server's WhatsApp access token is invalid or expired.",
    rate_limited: "WhatsApp is rate limiting messages right now. Please try again in a few minutes.",
    timeout: "WhatsApp did not respond in time. Please try again.",
    network_error: "Could not reach WhatsApp. Please try again.",
    permission_denied: "The server's WhatsApp account is not allowed to message this number yet.",
    outside_24h_window: "WhatsApp only delivers plain messages if you messaged our WhatsApp number in the last 24 hours. Send it a message first, or ask an administrator to set up the verification template.",
    template_error: "The WhatsApp verification template is not set up correctly on the server.",
};

const VERIFY_ERRORS = {
    no_pending: "There is no pending verification. Request a new code.",
    expired: "This code has expired. Request a new code.",
    too_many_attempts: "Too many incorrect attempts. Request a new code.",
    invalid_code: "That code is not correct.",
};

// Public, non-secret WhatsApp state for the logged-in user
const statusFor = (user) => {
    const cfg = whatsappConfig();
    const now = Date.now();
    const pendingActive = user.whatsappPendingPhone && user.whatsappOtpHash && user.whatsappOtpExpiresAt && new Date(user.whatsappOtpExpiresAt) > now;
    const resendAt = user.whatsappOtpLastSentAt ? new Date(new Date(user.whatsappOtpLastSentAt).getTime() + cfg.otp.resendCooldownSeconds * 1000) : null;
    return {
        phone: user.phone || null,
        verified: Boolean(user.whatsappVerified && user.phone),
        verifiedAt: user.whatsappVerifiedAt || null,
        optIn: Boolean(user.whatsappOptIn),
        prefs: user.whatsappPrefs,
        pending: user.whatsappPendingPhone ? {
            phone: user.whatsappPendingPhone,
            expiresAt: user.whatsappOtpExpiresAt,
            expired: !pendingActive,
            attemptsLeft: Math.max(0, cfg.otp.maxAttempts - (user.whatsappOtpAttempts || 0)),
            resendAvailableAt: resendAt,
        } : null,
        server: {
            mode: whatsappMode(cfg),
            devCodeInServerLog: cfg.devLogOtp,
            // Without an approved template, codes go out as plain text, which WhatsApp only delivers
            // to people who messaged the business number in the last 24 hours
            codesAsPlainText: whatsappMode(cfg) === "live" && !cfg.templates.verification.name && cfg.freeformFallback,
            businessNumber: process.env.WHATSAPP_BUSINESS_DISPLAY_NUMBER || null,
        },
    };
};

export const getWhatsAppStatus = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select(OTP_FIELDS);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.status(200).json({ success: true, data: statusFor(user) });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not load WhatsApp settings" });
    }
};

// Can this server send a verification code right now? Returns an error payload or null.
const sendReadinessError = () => {
    const cfg = whatsappConfig();
    if (whatsappMode(cfg) === "disabled") {
        if (cfg.devLogOtp) return null;
        return { code: "whatsapp_disabled", message: "WhatsApp is not enabled on this server. An administrator needs to set WHATSAPP_ENABLED=true and add the Meta credentials (see WHATSAPP_SETUP.md)." };
    }
    const missing = missingSendConfig(cfg);
    if (missing.length) return { code: "config_missing", message: `WhatsApp is enabled but not configured (missing ${missing.join(", ")}).` };
    if (!cfg.templates.verification.name && !cfg.freeformFallback) {
        return { code: "template_not_configured", message: "WHATSAPP_VERIFICATION_TEMPLATE_NAME is not set. An approved authentication template is required to send verification codes." };
    }
    return null;
};

const issueCode = async (user, phone, res) => {
    const cfg = whatsappConfig();
    const now = new Date();
    const allowed = checkSendAllowed({
        otpLastSentAt: user.whatsappOtpLastSentAt, otpSendWindowStart: user.whatsappOtpSendWindowStart, otpSendCount: user.whatsappOtpSendCount,
    }, { now, cooldownSeconds: cfg.otp.resendCooldownSeconds, maxSendsPerHour: cfg.otp.maxSendsPerHour });
    if (!allowed.ok) {
        const msg = allowed.error === "cooldown" ? `Please wait ${allowed.retryAfterSeconds}s before requesting another code.` : "You have requested too many codes. Please try again later.";
        return res.status(429).json({ success: false, code: allowed.error, retryAfterSeconds: allowed.retryAfterSeconds, message: msg });
    }

    const code = generateOtp();
    user.whatsappPendingPhone = phone;
    user.whatsappOtpHash = hashOtp({ userId: user._id.toString(), phone, code, secret: cfg.otp.secret });
    user.whatsappOtpExpiresAt = new Date(now.getTime() + cfg.otp.ttlSeconds * 1000);
    user.whatsappOtpAttempts = 0;
    user.whatsappOtpLastSentAt = now;
    if (allowed.resetWindow) { user.whatsappOtpSendWindowStart = now; user.whatsappOtpSendCount = 0; }
    user.whatsappOtpSendCount = (user.whatsappOtpSendCount || 0) + 1;
    await user.save(); // counts toward the limits even if sending fails

    const ttlMinutes = Math.round(cfg.otp.ttlSeconds / 60);
    if (cfg.devLogOtp) {
        // Local development only (config ignores this flag in production)
        console.log(`[whatsapp:dev] Verification code for user ${user._id}: ${code} (WHATSAPP_DEV_LOG_OTP=true)`);
    }
    if (whatsappMode(cfg) === "live") {
        const delivery = await sendVerificationCode({ userId: user._id, phone, code, ttlMinutes });
        if (delivery.status === "Failed" && cfg.devLogOtp) {
            // Development only: the code was printed in the server console, so keep it usable
            const reason = SEND_ERRORS[delivery.errorCategory] || "WhatsApp could not deliver the code.";
            return res.status(200).json({ success: true, message: `${reason} Development mode: use the code printed in the backend console.`, data: statusFor(user) });
        }
        if (delivery.status === "Failed") {
            user.whatsappOtpHash = undefined; // the code never arrived, so it must not be usable
            await user.save();
            return res.status(502).json({ success: false, code: delivery.errorCategory, message: SEND_ERRORS[delivery.errorCategory] || "Could not send the verification code. Please try again." });
        }
    }
    return res.status(200).json({ success: true, message: `Verification code sent to ${phone} on WhatsApp.`, data: statusFor(user) });
};

export const startVerification = async (req, res) => {
    try {
        const phone = toE164(req.body.phone);
        if (!phone) return res.status(400).json({ success: false, code: "invalid_phone", message: "Enter a valid WhatsApp number in international format, e.g. +923001234567." });
        if (req.body.consent !== true) return res.status(400).json({ success: false, code: "consent_required", message: "Please agree to receive WhatsApp notifications." });

        const notReady = sendReadinessError();
        if (notReady) return res.status(503).json({ success: false, ...notReady });

        const user = await User.findById(req.userId).select(OTP_FIELDS);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.whatsappVerified && user.phone === phone) return res.status(400).json({ success: false, code: "already_verified", message: "This number is already verified." });
        const taken = await User.exists({ _id: { $ne: user._id }, phone, whatsappVerified: true });
        if (taken) return res.status(409).json({ success: false, code: "phone_in_use", message: "This number is already verified on another account." });

        // A new number restarts the cooldown only for the same number
        if (user.whatsappPendingPhone && user.whatsappPendingPhone !== phone) user.whatsappOtpAttempts = 0;
        return await issueCode(user, phone, res);
    } catch (error) {
        console.log("startVerification error:", error.message);
        res.status(500).json({ success: false, message: "Could not start verification" });
    }
};

export const resendVerification = async (req, res) => {
    try {
        const notReady = sendReadinessError();
        if (notReady) return res.status(503).json({ success: false, ...notReady });
        const user = await User.findById(req.userId).select(OTP_FIELDS);
        if (!user?.whatsappPendingPhone) return res.status(400).json({ success: false, code: "no_pending", message: "Enter your number first." });
        return await issueCode(user, user.whatsappPendingPhone, res);
    } catch (error) {
        console.log("resendVerification error:", error.message);
        res.status(500).json({ success: false, message: "Could not resend the code" });
    }
};

export const confirmVerification = async (req, res) => {
    try {
        const cfg = whatsappConfig();
        const user = await User.findById(req.userId).select(OTP_FIELDS);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const result = checkOtp({
            pendingPhone: user.whatsappPendingPhone, otpHash: user.whatsappOtpHash,
            otpExpiresAt: user.whatsappOtpExpiresAt, otpAttempts: user.whatsappOtpAttempts,
        }, { userId: user._id.toString(), code: req.body.code, maxAttempts: cfg.otp.maxAttempts, secret: cfg.otp.secret });

        if (!result.ok) {
            if (result.error === "invalid_code") {
                user.whatsappOtpAttempts = (user.whatsappOtpAttempts || 0) + 1;
                if (user.whatsappOtpAttempts >= cfg.otp.maxAttempts) user.whatsappOtpHash = undefined;
                await user.save();
            }
            const status = result.error === "too_many_attempts" ? 429 : 400;
            return res.status(status).json({ success: false, code: result.error, attemptsLeft: result.attemptsLeft, message: VERIFY_ERRORS[result.error] });
        }

        const phone = user.whatsappPendingPhone;
        const taken = await User.exists({ _id: { $ne: user._id }, phone, whatsappVerified: true });
        if (taken) return res.status(409).json({ success: false, code: "phone_in_use", message: "This number is already verified on another account." });

        user.phone = phone;
        user.whatsappVerified = true;
        user.whatsappVerifiedAt = new Date();
        user.whatsappOptIn = true; // consent was given when the code was requested
        user.whatsappPendingPhone = undefined;
        user.whatsappOtpHash = undefined; // a code can only be used once
        user.whatsappOtpExpiresAt = undefined;
        user.whatsappOtpAttempts = 0;
        await user.save();
        const fresh = await User.findById(user._id).select("-password");
        res.status(200).json({ success: true, message: "WhatsApp number verified", data: statusFor(user), user: fresh });
    } catch (error) {
        console.log("confirmVerification error:", error.message);
        res.status(500).json({ success: false, message: "Could not verify the code" });
    }
};

export const removeWhatsApp = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select(OTP_FIELDS);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        Object.assign(user, {
            phone: undefined, whatsappVerified: false, whatsappVerifiedAt: undefined, whatsappOptIn: false,
            whatsappPendingPhone: undefined, whatsappOtpHash: undefined, whatsappOtpExpiresAt: undefined, whatsappOtpAttempts: 0,
        });
        await user.save();
        res.status(200).json({ success: true, message: "WhatsApp number removed", data: statusFor(user) });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not remove the number" });
    }
};

// ---- Meta webhook ----

export const verifyWebhook = (req, res) => {
    const { webhookVerifyToken } = whatsappConfig();
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    if (mode === "subscribe" && webhookVerifyToken && token === webhookVerifyToken) {
        return res.status(200).type("text/plain").send(String(req.query["hub.challenge"] ?? ""));
    }
    return res.sendStatus(403);
};

let warnedNoSecret = false;
export const receiveWebhook = async (req, res) => {
    const { appSecret } = whatsappConfig();
    if (appSecret) {
        if (!verifySignature(req.rawBody, req.get("x-hub-signature-256"), appSecret)) return res.sendStatus(401);
    } else if (process.env.NODE_ENV === "production") {
        console.log("WhatsApp webhook rejected: WHATSAPP_APP_SECRET is not set");
        return res.sendStatus(401);
    } else if (!warnedNoSecret) {
        warnedNoSecret = true;
        console.log("Warning: WHATSAPP_APP_SECRET is not set; webhook signatures are not verified (development only)");
    }

    try {
        const summary = await processWebhookPayload(req.body, webhookDeps);
        res.status(200).json({ received: true, ...summary });
    } catch (error) {
        // Not persisted: return 500 so Meta retries the event later
        console.log("WhatsApp webhook processing failed:", error.message);
        res.sendStatus(500);
    }
};
