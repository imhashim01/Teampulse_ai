import { test } from "node:test";
import assert from "node:assert/strict";
import { toE164, generateOtp, hashOtp, checkOtp, checkSendAllowed } from "../services/whatsappVerification.js";

const secret = "test-secret";
const userId = "u1";
const phone = "+923001234567";
const stateFor = (code, extra = {}) => ({
    pendingPhone: phone,
    otpHash: hashOtp({ userId, phone, code, secret }),
    otpExpiresAt: new Date(Date.now() + 300_000),
    otpAttempts: 0,
    ...extra,
});

test("valid numbers are normalized to E.164", () => {
    assert.equal(toE164("+923001234567"), "+923001234567");
    assert.equal(toE164("0300 1234567"), "+923001234567");
    assert.equal(toE164("923001234567"), "+923001234567");
    assert.equal(toE164("0092 300-1234567"), "+923001234567");
    assert.equal(toE164("+1 (415) 555-0123"), "+14155550123");
});

test("invalid numbers are rejected", () => {
    for (const bad of ["", null, "12345", "abc", "+0123456789", "0300123", "+92300123456789012"]) {
        assert.equal(toE164(bad), null, `expected ${bad} to be rejected`);
    }
});

test("codes are 6 digits and not constant", () => {
    const codes = new Set(Array.from({ length: 50 }, generateOtp));
    for (const c of codes) assert.match(c, /^\d{6}$/);
    assert.ok(codes.size > 40);
});

test("correct code verifies", () => {
    assert.deepEqual(checkOtp(stateFor("482193"), { userId, code: "482193", maxAttempts: 5, secret }), { ok: true });
});

test("wrong code is rejected with attempts left", () => {
    const r = checkOtp(stateFor("482193"), { userId, code: "000000", maxAttempts: 5, secret });
    assert.equal(r.error, "invalid_code");
    assert.equal(r.attemptsLeft, 4);
});

test("code is bound to the user and the number", () => {
    const s = stateFor("482193");
    assert.equal(checkOtp(s, { userId: "someone-else", code: "482193", maxAttempts: 5, secret }).error, "invalid_code");
    assert.equal(checkOtp({ ...s, pendingPhone: "+923009999999" }, { userId, code: "482193", maxAttempts: 5, secret }).error, "invalid_code");
});

test("expired code is rejected", () => {
    const s = stateFor("482193", { otpExpiresAt: new Date(Date.now() - 1000) });
    assert.equal(checkOtp(s, { userId, code: "482193", maxAttempts: 5, secret }).error, "expired");
});

test("too many attempts blocks even the right code", () => {
    const s = stateFor("482193", { otpAttempts: 5 });
    assert.equal(checkOtp(s, { userId, code: "482193", maxAttempts: 5, secret }).error, "too_many_attempts");
});

test("no pending verification", () => {
    assert.equal(checkOtp({}, { userId, code: "482193", maxAttempts: 5, secret }).error, "no_pending");
});

test("resend cooldown and hourly cap", () => {
    const now = new Date();
    const cfg = { now, cooldownSeconds: 60, maxSendsPerHour: 5 };
    assert.equal(checkSendAllowed({}, cfg).ok, true);
    const cool = checkSendAllowed({ otpLastSentAt: new Date(now - 10_000) }, cfg);
    assert.equal(cool.error, "cooldown");
    assert.equal(cool.retryAfterSeconds, 50);
    const capped = checkSendAllowed({ otpLastSentAt: new Date(now - 120_000), otpSendWindowStart: new Date(now - 600_000), otpSendCount: 5 }, cfg);
    assert.equal(capped.error, "hourly_limit");
    const reset = checkSendAllowed({ otpLastSentAt: new Date(now - 120_000), otpSendWindowStart: new Date(now - 3_700_000), otpSendCount: 5 }, cfg);
    assert.deepEqual(reset, { ok: true, resetWindow: true });
});

test("hashing requires a secret", () => {
    assert.throws(() => hashOtp({ userId, phone, code: "1", secret: "" }));
});
