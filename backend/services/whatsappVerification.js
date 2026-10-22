// WhatsApp number verification (OTP). Pure helpers are exported for tests.
import crypto from "crypto";

// Accepts +923001234567, 923001234567, 00923001234567 or 03001234567 (Pakistan local) and returns E.164, or null
export const toE164 = (raw) => {
    if (!raw) return null;
    let p = String(raw).replace(/[\s\-().]/g, "");
    if (/^03\d{9}$/.test(p)) p = "+92" + p.slice(1);
    else if (/^92\d{10}$/.test(p)) p = "+" + p;
    else if (/^00\d+$/.test(p)) p = "+" + p.slice(2);
    return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
};

// 6-digit code from a cryptographically secure source
export const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

// Keyed hash binds the code to the user and the number being verified
export const hashOtp = ({ userId, phone, code, secret }) => {
    if (!secret) throw new Error("WHATSAPP_OTP_SECRET (or JWT_SECRET) must be set to hash verification codes");
    return crypto.createHmac("sha256", secret).update(`${userId}:${phone}:${code}`).digest("hex");
};

const safeEqual = (a, b) => {
    const x = Buffer.from(String(a), "hex");
    const y = Buffer.from(String(b), "hex");
    return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

// state: { pendingPhone, otpHash, otpExpiresAt, otpAttempts }
// Returns { ok: true } or { ok: false, error: "no_pending"|"expired"|"too_many_attempts"|"invalid_code", attemptsLeft? }
export const checkOtp = (state, { userId, code, now = new Date(), maxAttempts, secret }) => {
    if (!state?.pendingPhone) return { ok: false, error: "no_pending" };
    if ((state.otpAttempts || 0) >= maxAttempts) return { ok: false, error: "too_many_attempts", attemptsLeft: 0 };
    if (!state.otpHash) return { ok: false, error: "no_pending" };
    if (!state.otpExpiresAt || new Date(state.otpExpiresAt) <= now) return { ok: false, error: "expired" };
    if (!/^\d{6}$/.test(String(code || "").trim())) {
        return { ok: false, error: "invalid_code", attemptsLeft: Math.max(0, maxAttempts - (state.otpAttempts || 0) - 1) };
    }
    const expected = hashOtp({ userId, phone: state.pendingPhone, code: String(code).trim(), secret });
    if (!safeEqual(expected, state.otpHash)) {
        return { ok: false, error: "invalid_code", attemptsLeft: Math.max(0, maxAttempts - (state.otpAttempts || 0) - 1) };
    }
    return { ok: true };
};

// Resend cooldown + hourly cap. state: { otpLastSentAt, otpSendWindowStart, otpSendCount }
export const checkSendAllowed = (state, { now = new Date(), cooldownSeconds, maxSendsPerHour }) => {
    const last = state?.otpLastSentAt ? new Date(state.otpLastSentAt) : null;
    if (last && now - last < cooldownSeconds * 1000) {
        return { ok: false, error: "cooldown", retryAfterSeconds: Math.ceil((cooldownSeconds * 1000 - (now - last)) / 1000) };
    }
    const windowStart = state?.otpSendWindowStart ? new Date(state.otpSendWindowStart) : null;
    const inWindow = windowStart && now - windowStart < 3600 * 1000;
    if (inWindow && (state.otpSendCount || 0) >= maxSendsPerHour) {
        return { ok: false, error: "hourly_limit", retryAfterSeconds: Math.ceil((3600 * 1000 - (now - windowStart)) / 1000) };
    }
    return { ok: true, resetWindow: !inWindow };
};

// Small in-memory limiter per IP. Best-effort only (serverless instances do not share memory);
// the per-user limits above are stored in MongoDB and are the real protection.
const buckets = new Map();
export const ipRateLimit = ({ windowMs, max, name }) => (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now - b.start > windowMs) {
        buckets.set(key, { start: now, count: 1 });
        return next();
    }
    if (++b.count > max) {
        return res.status(429).json({ success: false, code: "rate_limited", message: "Too many requests. Please wait a moment and try again." });
    }
    next();
};
