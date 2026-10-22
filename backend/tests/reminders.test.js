import { test } from "node:test";
import assert from "node:assert/strict";
import { planReminders } from "../services/reminderService.js";
import { formatDeadline } from "../services/whatsappMessages.js";
import { checkEligibility } from "../services/notificationService.js";

const H = 3600_000;
const now = new Date("2026-10-22T12:00:00Z");
const cfg = { offsetsHours: [24, 1], overdueEnabled: true, overdueRepeatHours: 0, overdueMaxReminders: 1 };
const task = (deadlineOffsetMs, status = "In Progress") => ({ status, deadline: new Date(now.getTime() + deadlineOffsetMs) });

test("no reminder for completed, submitted or cancelled tasks", () => {
    for (const s of ["Completed", "Submitted for Review", "Cancelled"]) {
        assert.deepEqual(planReminders(task(2 * H, s), now, cfg), []);
        assert.deepEqual(planReminders(task(-2 * H, s), now, cfg), []);
    }
});

test("no reminder without a deadline or far from it", () => {
    assert.deepEqual(planReminders({ status: "To Do" }, now, cfg), []);
    assert.deepEqual(planReminders(task(30 * H), now, cfg), []);
});

test("24h reminder inside the 24h window", () => {
    const [r] = planReminders(task(20 * H), now, cfg);
    assert.equal(r.type, "deadline_reminder");
    assert.equal(r.label, "24h");
});

test("only the closest window is sent (1h, not also 24h)", () => {
    const plans = planReminders(task(30 * 60_000), now, cfg);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].label, "1h");
});

test("same inputs give the same idempotency key (duplicates are ignored)", () => {
    const t = task(20 * H);
    assert.equal(planReminders(t, now, cfg)[0].keySuffix, planReminders(t, new Date(now.getTime() + 60_000), cfg)[0].keySuffix);
});

test("changing the deadline produces a fresh reminder key", () => {
    const a = planReminders(task(20 * H), now, cfg)[0].keySuffix;
    const b = planReminders(task(22 * H), now, cfg)[0].keySuffix;
    assert.notEqual(a, b);
});

test("overdue is sent once by default", () => {
    const t = task(-2 * H);
    const [r] = planReminders(t, now, cfg);
    assert.equal(r.type, "overdue");
    // Hours later the key is identical, so the unique index blocks a second message
    assert.equal(planReminders(t, new Date(now.getTime() + 5 * H), cfg)[0].keySuffix, r.keySuffix);
});

test("optional repeated overdue reminders are bucketed and capped", () => {
    const rep = { ...cfg, overdueRepeatHours: 24, overdueMaxReminders: 3 };
    const k1 = planReminders(task(-2 * H), now, rep)[0].keySuffix;
    const k2 = planReminders(task(-26 * H), now, rep)[0].keySuffix;
    assert.notEqual(k1.split(":")[1], k2.split(":")[1]);
    assert.deepEqual(planReminders(task(-80 * H), now, rep), []); // 4th bucket exceeds the cap
});

test("overdue reminders can be disabled", () => {
    assert.deepEqual(planReminders(task(-2 * H), now, { ...cfg, overdueEnabled: false }), []);
});

test("deadline is shown in the configured timezone", () => {
    // 13:00 UTC = 6:00 PM in Karachi (UTC+5)
    assert.equal(formatDeadline("2026-10-23T13:00:00Z", "Asia/Karachi"), "23 October, 6:00 PM (Asia/Karachi)");
    assert.match(formatDeadline("2026-10-23T13:00:00Z", "UTC"), /1:00 PM \(UTC\)/);
});

test("eligibility: only verified, opted-in recipients with the preference on", () => {
    const base = { phone: "+923001234567", whatsappVerified: true, whatsappOptIn: true, whatsappPrefs: { deadlineReminders: true } };
    assert.deepEqual(checkEligibility(base, "deadline_reminder"), { ok: true });
    assert.equal(checkEligibility({ ...base, whatsappVerified: false }, "deadline_reminder").reason, "not_verified");
    assert.equal(checkEligibility({ ...base, phone: undefined }, "deadline_reminder").reason, "not_verified");
    assert.equal(checkEligibility({ ...base, whatsappOptIn: false }, "deadline_reminder").reason, "opted_out");
    assert.equal(checkEligibility({ ...base, whatsappPrefs: { deadlineReminders: false } }, "deadline_reminder").reason, "preference_off");
    assert.equal(checkEligibility(null, "overdue").reason, "recipient_not_found");
});
