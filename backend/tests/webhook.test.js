import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { verifySignature, processWebhookPayload, nextStatus } from "../services/whatsappWebhook.js";

const secret = "app-secret";
const sign = (body) => "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

test("valid signature passes, tampered or missing fails", () => {
    const body = Buffer.from(JSON.stringify({ object: "whatsapp_business_account" }));
    assert.equal(verifySignature(body, sign(body), secret), true);
    assert.equal(verifySignature(Buffer.from(body.toString() + " "), sign(body), secret), false);
    assert.equal(verifySignature(body, "sha256=abc", secret), false);
    assert.equal(verifySignature(body, undefined, secret), false);
    assert.equal(verifySignature(body, sign(body), "other-secret"), false);
});

test("statuses only move forward", () => {
    assert.equal(nextStatus("Accepted", "Sent"), "Sent");
    assert.equal(nextStatus("Delivered", "Sent"), "Delivered");
    assert.equal(nextStatus("Read", "Failed"), "Read");
    assert.equal(nextStatus("Sent", "Failed"), "Failed");
    assert.equal(nextStatus("Accepted", "Read"), "Read");
});

const fakeDeps = () => {
    const processed = new Set();
    const applied = [];
    const optedOut = [];
    return {
        applied, optedOut,
        isProcessed: async (k) => processed.has(k),
        markProcessed: async (k) => { processed.add(k); },
        applyStatus: async (s) => { applied.push(s); },
        optOut: async (p) => { optedOut.push(p); },
    };
};

const payload = (value) => ({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value }] }] });

test("delivery statuses are applied once; duplicates are ignored", async () => {
    const deps = fakeDeps();
    const p = payload({ statuses: [{ id: "wamid.1", status: "delivered", timestamp: "1792650000" }] });
    const first = await processWebhookPayload(p, deps);
    const again = await processWebhookPayload(p, deps);
    assert.equal(first.statuses, 1);
    assert.equal(again.duplicates, 1);
    assert.equal(deps.applied.length, 1);
    assert.equal(deps.applied[0].status, "Delivered");
});

test("failed status carries the provider error", async () => {
    const deps = fakeDeps();
    await processWebhookPayload(payload({ statuses: [{ id: "wamid.2", status: "failed", errors: [{ code: 131049, title: "Message not delivered" }] }] }), deps);
    assert.equal(deps.applied[0].status, "Failed");
    assert.equal(deps.applied[0].errorCategory, "provider_131049");
});

test("a failed update is not marked processed, so Meta's retry is handled", async () => {
    const deps = fakeDeps();
    deps.applyStatus = async () => { throw new Error("db down"); };
    const p = payload({ statuses: [{ id: "wamid.3", status: "read" }] });
    await assert.rejects(() => processWebhookPayload(p, deps));
    assert.equal(await deps.isProcessed("status:wamid.3:read"), false);
});

test("STOP reply opts the sender out", async () => {
    const deps = fakeDeps();
    await processWebhookPayload(payload({ messages: [{ id: "m1", from: "923001234567", type: "text", text: { body: "STOP" } }] }), deps);
    assert.deepEqual(deps.optedOut, ["+923001234567"]);
});

test("unrelated payloads are ignored", async () => {
    assert.deepEqual(await processWebhookPayload({ object: "page" }, fakeDeps()), { statuses: 0, optOuts: 0, duplicates: 0 });
});
