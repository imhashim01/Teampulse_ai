// End-to-end tests of the four WhatsApp workflows through the real Express app and MongoDB.
// Meta's API is stubbed: no real WhatsApp messages are sent.
// Opt-in: set TEST_MONGO_URI to a MongoDB connection string. The tests use (and finally drop)
// a separate database named "teampulse_whatsapp_test"; your app database is not touched.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const TEST_DB = "teampulse_whatsapp_test";
const skip = !process.env.TEST_MONGO_URI && "TEST_MONGO_URI not set";

Object.assign(process.env, {
    NODE_ENV: "test",
    JWT_SECRET: "test-jwt-secret",
    WHATSAPP_ENABLED: "true",
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "999",
    WHATSAPP_GRAPH_BASE_URL: "https://graph.test",
    WHATSAPP_API_VERSION: "v23.0",
    WHATSAPP_APP_SECRET: "test-app-secret",
    WHATSAPP_OTP_SECRET: "test-otp-secret",
    WHATSAPP_MAX_SEND_RETRIES: "1",
    WHATSAPP_VERIFICATION_TEMPLATE_NAME: "teampulse_verification",
    WHATSAPP_PROJECT_ADDED_TEMPLATE_NAME: "teampulse_project_added",
    WHATSAPP_TASK_SUBMITTED_TEMPLATE_NAME: "teampulse_task_submitted",
    WHATSAPP_DEADLINE_TEMPLATE_NAME: "teampulse_deadline_reminder",
    WHATSAPP_OVERDUE_TEMPLATE_NAME: "teampulse_overdue",
    WHATSAPP_TASK_ASSIGNED_TEMPLATE_NAME: "teampulse_task_assigned",
    WHATSAPP_REMINDERS_ENABLED: "true",
    WHATSAPP_REMINDER_OFFSETS_HOURS: "24,1",
    APP_BASE_URL: "https://app.teampulse.test",
});

// ---- Meta API stub ----
const realFetch = globalThis.fetch;
let metaCalls = [];
let metaResponder = () => ({ status: 200, body: { messages: [{ id: `wamid.${crypto.randomUUID()}` }] } });
globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("https://graph.test/")) {
        const body = JSON.parse(init.body);
        metaCalls.push({ url: String(url), body });
        const { status, body: resBody } = metaResponder(body);
        return { ok: status < 300, status, json: async () => resBody };
    }
    return realFetch(url, init);
};

let server, base, models, runReminders, retryFailedDeliveries;
const users = {};

const api = async (method, path, { cookie, body, headers = {} } = {}) => {
    const res = await realFetch(`${base}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...headers },
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, setCookie: res.headers.get("set-cookie") };
};

const mkUser = async (key, extra = {}) => {
    const u = await models.User.create({
        email: `${key}@wa.test`, name: extra.name || key, password: await bcryptjs.hash("Pass@1234", 4), isVerified: true, ...extra,
    });
    const login = await api("POST", "/api/auth/login", { body: { email: `${key}@wa.test`, password: "Pass@1234" } });
    users[key] = { doc: u, cookie: login.setCookie.split(";")[0] };
    return users[key];
};

const deliveries = (filter) => models.NotificationDelivery.find(filter).lean();

before(async () => {
    if (skip) return;
    const { ensureMongoDns } = await import("../../utils/mongoDns.js");
    await ensureMongoDns(process.env.TEST_MONGO_URI);
    await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: TEST_DB });
    assert.equal(mongoose.connection.db.databaseName, TEST_DB);
    await mongoose.connection.db.dropDatabase();
    const { default: app } = await import("../../app.js");
    models = {
        User: (await import("../../models/UserModel.js")).User,
        Task: (await import("../../models/TaskModel.js")).Task,
        Project: (await import("../../models/ProjectModel.js")).Project,
        Submission: (await import("../../models/SubmissionModel.js")).Submission,
        NotificationDelivery: (await import("../../models/NotificationDeliveryModel.js")).NotificationDelivery,
    };
    await Promise.all(Object.values(models).map((m) => m.init())); // build unique indexes
    ({ runReminders } = await import("../../services/reminderService.js"));
    ({ retryFailedDeliveries } = await import("../../services/notificationService.js"));
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;

    const verified = { whatsappVerified: true, whatsappOptIn: true };
    await mkUser("lead", { name: "Usman Lead", phone: "+923000000001", ...verified });
    await mkUser("member", { name: "Ali Member", phone: "+923000000002", ...verified });
    await mkUser("unverified", { name: "Bilal Unverified", phone: "+923000000003", whatsappVerified: false, whatsappOptIn: true });
    await mkUser("optedout", { name: "Sara Optedout", phone: "+923000000004", whatsappVerified: true, whatsappOptIn: false });
    await mkUser("newbie", { name: "Hina New" });
});

after(async () => {
    globalThis.fetch = realFetch;
    if (skip) return;
    server?.close();
    if (mongoose.connection.db?.databaseName === TEST_DB) await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
});

beforeEach(() => {
    metaCalls = [];
    metaResponder = () => ({ status: 200, body: { messages: [{ id: `wamid.${crypto.randomUUID()}` }] } });
});

// ---------- Workflow A: verification ----------

test("A: invalid number is rejected", { skip }, async () => {
    const r = await api("POST", "/api/user/whatsapp/start", { cookie: users.newbie.cookie, body: { phone: "12345", consent: true } });
    assert.equal(r.status, 400);
    assert.equal(r.body.code, "invalid_phone");
    assert.equal(metaCalls.length, 0);
});

test("A: consent is required", { skip }, async () => {
    const r = await api("POST", "/api/user/whatsapp/start", { cookie: users.newbie.cookie, body: { phone: "03001112222" } });
    assert.equal(r.body.code, "consent_required");
});

test("A: valid number -> code via template -> wrong code -> right code -> verified", { skip }, async () => {
    const start = await api("POST", "/api/user/whatsapp/start", { cookie: users.newbie.cookie, body: { phone: "0300 1112222", consent: true } });
    assert.equal(start.status, 200, JSON.stringify(start.body));
    assert.equal(start.body.data.pending.phone, "+923001112222");
    assert.ok(!JSON.stringify(start.body).match(/\b\d{6}\b(?!\d)/) || !JSON.stringify(start.body).includes(metaCalls[0].body.template.components[0].parameters[0].text), "code must not be in the response");
    assert.equal(metaCalls.length, 1);
    assert.equal(metaCalls[0].body.to, "923001112222");
    assert.equal(metaCalls[0].body.template.name, "teampulse_verification");
    const code = metaCalls[0].body.template.components[0].parameters[0].text;
    assert.match(code, /^\d{6}$/);
    assert.ok(!JSON.stringify(start.body).includes(code), "code must not be in the API response");

    const stored = await models.User.findById(users.newbie.doc._id).select("+whatsappOtpHash").lean();
    assert.notEqual(stored.whatsappOtpHash, code, "only a hash is stored");
    assert.equal(stored.whatsappVerified, false);

    const wrong = await api("POST", "/api/user/whatsapp/verify", { cookie: users.newbie.cookie, body: { code: code === "000000" ? "111111" : "000000" } });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.code, "invalid_code");

    const ok = await api("POST", "/api/user/whatsapp/verify", { cookie: users.newbie.cookie, body: { code } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.data.verified, true);
    assert.equal(ok.body.data.phone, "+923001112222");

    const reuse = await api("POST", "/api/user/whatsapp/verify", { cookie: users.newbie.cookie, body: { code } });
    assert.equal(reuse.body.code, "no_pending", "a code can only be used once");

    const log = await deliveries({ event: "verification", recipient: users.newbie.doc._id });
    assert.ok(log.every((d) => !d.message.includes(code)), "code never stored in the delivery log");
});

test("A: resend cooldown and expired code", { skip }, async () => {
    const u = await mkUser("expiry");
    const first = await api("POST", "/api/user/whatsapp/start", { cookie: u.cookie, body: { phone: "+923001113333", consent: true } });
    assert.equal(first.status, 200);
    const again = await api("POST", "/api/user/whatsapp/resend", { cookie: u.cookie });
    assert.equal(again.status, 429);
    assert.equal(again.body.code, "cooldown");

    const code = metaCalls[0].body.template.components[0].parameters[0].text;
    await models.User.updateOne({ _id: u.doc._id }, { whatsappOtpExpiresAt: new Date(Date.now() - 1000) });
    const expired = await api("POST", "/api/user/whatsapp/verify", { cookie: u.cookie, body: { code } });
    assert.equal(expired.body.code, "expired");
});

test("A: excessive attempts are blocked", { skip }, async () => {
    const u = await mkUser("attempts");
    await api("POST", "/api/user/whatsapp/start", { cookie: u.cookie, body: { phone: "+923001114444", consent: true } });
    const code = metaCalls[0].body.template.components[0].parameters[0].text;
    const wrongCode = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await api("POST", "/api/user/whatsapp/verify", { cookie: u.cookie, body: { code: wrongCode } });
    const blocked = await api("POST", "/api/user/whatsapp/verify", { cookie: u.cookie, body: { code } });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, "too_many_attempts");
    const user = await models.User.findById(u.doc._id).lean();
    assert.equal(user.whatsappVerified, false);
});

test("A: a number verified on another account cannot be claimed", { skip }, async () => {
    const u = await mkUser("thief");
    const r = await api("POST", "/api/user/whatsapp/start", { cookie: u.cookie, body: { phone: "+923000000002", consent: true } });
    assert.equal(r.status, 409);
    assert.equal(metaCalls.length, 0);
});

test("A: phone cannot be set directly without verification", { skip }, async () => {
    const r = await api("PATCH", "/api/user/settings", { cookie: users.newbie.cookie, body: { phone: "+923009998888" } });
    assert.equal(r.status, 400);
    assert.equal(r.body.code, "verification_required");
});

test("A: missing credentials return a clear configuration error", { skip }, async () => {
    const saved = process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    try {
        const u = await mkUser("noconfig");
        const r = await api("POST", "/api/user/whatsapp/start", { cookie: u.cookie, body: { phone: "+923001115555", consent: true } });
        assert.equal(r.status, 503);
        assert.equal(r.body.code, "config_missing");
        assert.equal(metaCalls.length, 0);
    } finally { process.env.WHATSAPP_ACCESS_TOKEN = saved; }
});

// ---------- Workflow B: added to a project ----------

let projectId;
test("B: adding a member notifies that member (not anyone else)", { skip }, async () => {
    const p = await api("POST", "/api/projects", { cookie: users.lead.cookie, body: { name: "Website Redesign", status: "Active" } });
    projectId = p.body.data._id;
    const r = await api("POST", `/api/projects/${projectId}/members`, { cookie: users.lead.cookie, body: { email: "member@wa.test" } });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.whatsapp.status, "Accepted");
    assert.equal(metaCalls.length, 1);
    assert.equal(metaCalls[0].body.to, "923000000002");
    assert.equal(metaCalls[0].body.template.name, "teampulse_project_added");
    assert.deepEqual(metaCalls[0].body.template.components[0].parameters.map((x) => x.text), ["Ali", "Website Redesign", "Member", "Usman Lead"]);
    const [d] = await deliveries({ event: "project_added", project: projectId });
    assert.equal(String(d.recipient), String(users.member.doc._id));
    assert.equal(d.to, "+923****002");
});

test("B: unverified and opted-out members are skipped; membership still saved", { skip }, async () => {
    for (const [key, reason] of [["unverified", "not_verified"], ["optedout", "opted_out"]]) {
        const r = await api("POST", `/api/projects/${projectId}/members`, { cookie: users.lead.cookie, body: { email: `${key}@wa.test` } });
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.data.whatsapp, { status: "Skipped", reason });
    }
    assert.equal(metaCalls.length, 0);
    const project = await models.Project.findById(projectId).lean();
    assert.equal(project.members.length, 4);
});

test("B: a WhatsApp outage does not undo the membership", { skip }, async () => {
    metaResponder = () => ({ status: 500, body: { error: { code: 131000, message: "Something went wrong" } } });
    const extra = await mkUser("extra", { phone: "+923000000009", whatsappVerified: true, whatsappOptIn: true });
    const r = await api("POST", `/api/projects/${projectId}/members`, { cookie: users.lead.cookie, body: { email: "extra@wa.test" } });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.whatsapp.status, "Failed");
    const project = await models.Project.findById(projectId).lean();
    assert.ok(project.members.some((m) => String(m) === String(extra.doc._id)));
    const [d] = await deliveries({ event: "project_added", recipient: extra.doc._id });
    assert.equal(d.retryable, true);
    assert.ok(d.nextAttemptAt);

    // The background retry picks it up once Meta recovers
    metaResponder = () => ({ status: 200, body: { messages: [{ id: "wamid.retried" }] } });
    await models.NotificationDelivery.updateOne({ _id: d._id }, { nextAttemptAt: new Date(Date.now() - 1000) });
    const summary = await retryFailedDeliveries();
    assert.equal(summary.retried, 1);
    const after = await models.NotificationDelivery.findById(d._id).lean();
    assert.equal(after.status, "Accepted");
    assert.equal(after.providerMessageId, "wamid.retried");
});

// ---------- Workflow C: task submitted ----------

let taskId;
test("C: submission notifies the project lead with a review link", { skip }, async () => {
    const t = await api("POST", `/api/projects/${projectId}/tasks`, { cookie: users.lead.cookie, body: { title: "Payment Integration", assignees: [String(users.member.doc._id)], deadline: new Date(Date.now() + 5 * 86400e3).toISOString() } });
    taskId = t.body.data._id;
    metaCalls = [];
    const r = await api("POST", `/api/tasks/${taskId}/submissions`, { cookie: users.member.cookie, body: { summary: "Done, see PR", link: "https://github.com/x/pr/1" } });
    assert.equal(r.status, 201);
    assert.equal(metaCalls.length, 1);
    assert.equal(metaCalls[0].body.to, "923000000001");
    assert.equal(metaCalls[0].body.template.name, "teampulse_task_submitted");
    assert.deepEqual(metaCalls[0].body.template.components[0].parameters.map((x) => x.text),
        ["Website Redesign", "Payment Integration", "Ali Member", `https://app.teampulse.test/tasks/${taskId}`]);
    const [d] = await deliveries({ event: "task_submitted", task: taskId });
    assert.equal(String(d.recipient), String(users.lead.doc._id));
    assert.equal(String(d.submission), r.body.data._id);
});

test("C: a rejected submission sends nothing", { skip }, async () => {
    const before = (await deliveries({ event: "task_submitted" })).length;
    const empty = await api("POST", `/api/tasks/${taskId}/submissions`, { cookie: users.member.cookie, body: { summary: "" } });
    assert.equal(empty.status, 400);
    const outsider = await api("POST", `/api/tasks/${taskId}/submissions`, { cookie: users.newbie.cookie, body: { summary: "x" } });
    assert.equal(outsider.status, 403);
    assert.equal((await deliveries({ event: "task_submitted" })).length, before);
    assert.equal(metaCalls.length, 0);
});

// ---------- Workflow D: deadline reminders ----------

test("D: 1h reminder sent once, never duplicated, none for completed tasks", { skip }, async () => {
    const due = await models.Task.create({ project: projectId, title: "Final QA", assignees: [users.member.doc._id], deadline: new Date(Date.now() + 30 * 60e3), status: "In Progress" });
    await models.Task.create({ project: projectId, title: "Done already", assignees: [users.member.doc._id], deadline: new Date(Date.now() + 30 * 60e3), status: "Completed" });
    metaCalls = [];

    const [r1, r2] = await Promise.all([runReminders({ projectIds: [projectId] }), runReminders({ projectIds: [projectId] })]);
    const third = await runReminders({ projectIds: [projectId] });
    const reminderCalls = metaCalls.filter((c) => c.body.template?.name === "teampulse_deadline_reminder");
    assert.equal(reminderCalls.length, 1, "concurrent and repeated runs send one reminder");
    assert.equal(r1.created + r2.created, 1);
    assert.equal(third.created, 0);
    const params = reminderCalls[0].body.template.components[0].parameters.map((x) => x.text);
    assert.equal(params[1], "Final QA");
    assert.match(params[3], /\(Asia\/Karachi\)$/);
    const log = await deliveries({ event: "deadline_reminder", task: due._id });
    assert.equal(log.length, 1);
});

test("D: changing the deadline produces a new reminder", { skip }, async () => {
    const t = await models.Task.findOne({ title: "Final QA" });
    t.deadline = new Date(Date.now() + 45 * 60e3);
    await t.save();
    metaCalls = [];
    const r = await runReminders({ projectIds: [projectId] });
    assert.equal(r.created, 1);
    assert.equal(metaCalls.length, 1);
});

test("D: overdue alert goes to the member and the lead, once", { skip }, async () => {
    await models.Task.create({ project: projectId, title: "Late Task", assignees: [users.member.doc._id], deadline: new Date(Date.now() - 2 * 3600e3), status: "In Progress" });
    metaCalls = [];
    await runReminders({ projectIds: [projectId] });
    await runReminders({ projectIds: [projectId] });
    const overdue = metaCalls.filter((c) => c.body.template?.name === "teampulse_overdue");
    assert.deepEqual(overdue.map((c) => c.body.to).sort(), ["923000000001", "923000000002"]);
});

test("D: cron endpoint requires the secret", { skip }, async () => {
    process.env.CRON_SECRET = "cron-test";
    const denied = await api("POST", "/api/jobs/reminders");
    assert.equal(denied.status, 401);
    const allowed = await api("POST", "/api/jobs/reminders", { headers: { "x-cron-secret": "cron-test" } });
    assert.equal(allowed.status, 200);
});

// ---------- Webhook ----------

test("Webhook: verification handshake", { skip }, async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "verify-me";
    const ok = await api("GET", "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345");
    assert.equal(ok.status, 200);
    assert.equal(ok.body, 12345);
    const bad = await api("GET", "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1");
    assert.equal(bad.status, 403);
});

test("Webhook: signed status updates delivery; bad signature rejected; duplicates ignored", { skip }, async () => {
    const [d] = await deliveries({ event: "task_submitted", task: taskId });
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { statuses: [{ id: d.providerMessageId, status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)) }] } }] }] });
    const sig = "sha256=" + crypto.createHmac("sha256", "test-app-secret").update(body).digest("hex");

    const forged = await api("POST", "/api/webhooks/whatsapp", { body, headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) } });
    assert.equal(forged.status, 401);

    const r1 = await api("POST", "/api/webhooks/whatsapp", { body, headers: { "x-hub-signature-256": sig } });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.statuses, 1);
    const r2 = await api("POST", "/api/webhooks/whatsapp", { body, headers: { "x-hub-signature-256": sig } });
    assert.equal(r2.body.duplicates, 1);
    const updated = await models.NotificationDelivery.findById(d._id).lean();
    assert.equal(updated.status, "Delivered");
});

test("Webhook: STOP reply opts the user out of routine notifications", { skip }, async () => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { messages: [{ id: "in.1", from: "923000000002", type: "text", text: { body: "stop" } }] } }] }] });
    const sig = "sha256=" + crypto.createHmac("sha256", "test-app-secret").update(body).digest("hex");
    const r = await api("POST", "/api/webhooks/whatsapp", { body, headers: { "x-hub-signature-256": sig } });
    assert.equal(r.body.optOuts, 1);
    const member = await models.User.findById(users.member.doc._id).lean();
    assert.equal(member.whatsappOptIn, false);
});
