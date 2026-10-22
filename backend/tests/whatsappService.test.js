import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { sendWhatsAppMessage, WhatsAppConfigError, buildPayload, classifyError, maskPhone } from "../services/whatsappService.js";
import { buildMessage } from "../services/whatsappMessages.js";

const ENV = {
    WHATSAPP_ENABLED: "true",
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "123456",
    WHATSAPP_API_VERSION: "v23.0",
    WHATSAPP_MAX_SEND_RETRIES: "2",
};
beforeEach(() => {
    for (const k of Object.keys(process.env)) if (k.startsWith("WHATSAPP_")) delete process.env[k];
    Object.assign(process.env, ENV);
});

const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const ok = reply(200, { messages: [{ id: "wamid.OK" }] });
const fast = { backoffMs: [0] };

test("missing credentials raise a configuration error", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    await assert.rejects(() => sendWhatsAppMessage({ to: "+923001234567", text: "hi" }, { fetchImpl: ok, ...fast }), (e) => {
        assert.ok(e instanceof WhatsAppConfigError);
        assert.deepEqual(e.missing, ["WHATSAPP_ACCESS_TOKEN"]);
        return true;
    });
});

test("success returns Accepted (not Delivered) with the provider id, to the right endpoint", async () => {
    let call;
    const r = await sendWhatsAppMessage({ to: "+923001234567", text: "hi" }, {
        fetchImpl: async (url, init) => { call = { url, init }; return ok(); }, ...fast,
    });
    assert.deepEqual(r, { status: "Accepted", attempts: 1, providerMessageId: "wamid.OK" });
    assert.equal(call.url, "https://graph.facebook.com/v23.0/123456/messages");
    assert.equal(call.init.headers.Authorization, "Bearer test-token");
    assert.equal(JSON.parse(call.init.body).to, "923001234567");
});

test("template payload carries body params in order and the OTP button", () => {
    process.env.WHATSAPP_VERIFICATION_TEMPLATE_NAME = "teampulse_otp";
    const msg = buildMessage("verification", { code: "482193", ttlMinutes: 5 });
    const p = buildPayload({ to: "+923001234567", template: msg.template });
    assert.equal(p.type, "template");
    assert.equal(p.template.name, "teampulse_otp");
    assert.deepEqual(p.template.components[0], { type: "body", parameters: [{ type: "text", text: "482193" }] });
    assert.equal(p.template.components[1].sub_type, "url");
    assert.ok(!msg.preview.includes("482193"), "log preview must not contain the code");
});

test("5xx is retried with backoff, then succeeds", async () => {
    const responses = [reply(500, { error: { code: 131000, message: "Something went wrong" } }), ok];
    let n = 0;
    const r = await sendWhatsAppMessage({ to: "+923001234567", text: "hi" }, { fetchImpl: async () => responses[n++](), ...fast });
    assert.equal(r.status, "Accepted");
    assert.equal(r.attempts, 2);
});

test("retries are bounded", async () => {
    let n = 0;
    const r = await sendWhatsAppMessage({ to: "+923001234567", text: "hi" }, { fetchImpl: async () => { n++; return reply(503, {})(); }, ...fast });
    assert.equal(n, 3); // 1 + WHATSAPP_MAX_SEND_RETRIES
    assert.equal(r.status, "Failed");
    assert.equal(r.retryable, true);
});

test("template errors and invalid tokens are not retried", async () => {
    let n = 0;
    const tpl = await sendWhatsAppMessage({ to: "+923001234567", text: "x" }, { fetchImpl: async () => { n++; return reply(400, { error: { code: 132001, message: "Template name does not exist in the translation" } })(); }, ...fast });
    assert.equal(n, 1);
    assert.equal(tpl.errorCategory, "template_error");
    const auth = await sendWhatsAppMessage({ to: "+923001234567", text: "x" }, { fetchImpl: reply(401, { error: { code: 190, message: "Error validating access token" } }), ...fast });
    assert.equal(auth.errorCategory, "auth_invalid");
    assert.equal(auth.retryable, false);
});

test("timeouts are categorized and retried", async () => {
    let n = 0;
    const r = await sendWhatsAppMessage({ to: "+923001234567", text: "hi" }, {
        fetchImpl: async () => { n++; const e = new Error("timeout"); e.name = "TimeoutError"; throw e; }, ...fast,
    });
    assert.equal(n, 3);
    assert.equal(r.errorCategory, "timeout");
});

test("error classification", () => {
    assert.equal(classifyError(400, { code: 131026 }).category, "invalid_recipient");
    assert.equal(classifyError(400, { code: 131030 }).category, "recipient_not_allowed");
    assert.equal(classifyError(429, { code: 130429 }).category, "rate_limited");
    assert.equal(classifyError(400, { code: 131047 }).category, "outside_24h_window");
    assert.equal(classifyError(500, {}).retryable, true);
});

test("phone numbers are masked for logs", () => {
    assert.equal(maskPhone("+923001234567"), "+923****567");
    assert.equal(maskPhone(""), "");
});
