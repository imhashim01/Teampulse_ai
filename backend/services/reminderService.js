import { Task } from "../models/TaskModel.js";
import { Project } from "../models/ProjectModel.js";
import { User } from "../models/UserModel.js";
import { whatsappConfig } from "../config/whatsapp.js";
import { notify, retryFailedDeliveries } from "./notificationService.js";
import { formatDeadline, taskLink } from "./whatsappMessages.js";

const HOUR = 60 * 60 * 1000;
// Upcoming reminders stop for these statuses (work is done or waiting on the lead)
export const NO_REMINDER_STATUSES = ["Completed", "Submitted for Review", "Cancelled"];

// Pure: which reminders are due for a task right now.
// Keys include the deadline timestamp, so moving the deadline produces fresh reminders,
// and re-running at the same moment produces the same keys (duplicates are ignored).
export const planReminders = (task, now, rcfg) => {
    if (!task?.deadline || NO_REMINDER_STATUSES.includes(task.status)) return [];
    const deadline = new Date(task.deadline);
    if (isNaN(deadline)) return [];
    const msLeft = deadline - now;
    const dl = deadline.getTime();

    if (msLeft > 0) {
        // Send only the closest window we are in (e.g. at 30 min left, the 1h reminder, not also the 24h one)
        const due = [...rcfg.offsetsHours].sort((a, b) => a - b).find((h) => msLeft <= h * HOUR);
        return due ? [{ type: "deadline_reminder", label: `${due}h`, keySuffix: `reminder:${due}h:${dl}` }] : [];
    }
    if (!rcfg.overdueEnabled) return [];
    const overdueMs = now - deadline;
    const index = rcfg.overdueRepeatHours > 0 ? Math.floor(overdueMs / (rcfg.overdueRepeatHours * HOUR)) : 0;
    if (index >= Math.max(1, rcfg.overdueMaxReminders)) return [];
    return [{ type: "overdue", label: index === 0 ? "overdue" : `overdue #${index + 1}`, keySuffix: `overdue:${index}:${dl}` }];
};

// Finds due/overdue tasks and sends reminders. Safe to run concurrently or repeatedly:
// every reminder has a unique idempotency key in MongoDB.
// projectIds limits the run (used by the lead's "Run reminders now" button).
export const runReminders = async ({ projectIds, now = new Date() } = {}) => {
    const cfg = whatsappConfig();
    const rcfg = cfg.reminders;
    const maxOffset = Math.max(24, ...rcfg.offsetsHours);
    const filter = {
        status: { $nin: NO_REMINDER_STATUSES },
        deadline: { $ne: null, $lte: new Date(now.getTime() + maxOffset * HOUR), $gte: new Date(now.getTime() - 30 * 24 * HOUR) },
    };
    if (projectIds) filter.project = { $in: projectIds };

    const tasks = await Task.find(filter).populate("project", "name lead").populate("assignees", "name");
    const summary = { tasksChecked: tasks.length, created: 0, duplicatesSkipped: 0, whatsapp: {} };
    const count = (res) => {
        if (res.duplicate) return summary.duplicatesSkipped++;
        summary.created++;
        if (res.whatsapp) summary.whatsapp[res.whatsapp.status] = (summary.whatsapp[res.whatsapp.status] || 0) + 1;
    };

    for (const task of tasks) {
        if (!task.project) continue;
        const plans = planReminders(task, now, rcfg);
        if (!plans.length) continue;
        const deadlineText = formatDeadline(task.deadline, rcfg.timezone);
        const base = { project: task.project._id, task: task._id };

        for (const plan of plans) {
            for (const member of task.assignees) {
                const key = `${plan.keySuffix}:${task._id}:${member._id}`;
                const inApp = plan.type === "overdue"
                    ? `"${task.title}" is overdue. Please update the status or share any blockers with your lead.`
                    : `Reminder: "${task.title}" is due ${deadlineText} (${task.project.name}).`;
                count(await notify({
                    ...base, userId: member._id, type: plan.type, message: inApp, dedupeKey: key,
                    whatsapp: rcfg.enabled ? {
                        type: plan.type, key,
                        vars: { memberName: member.name, taskTitle: task.title, projectName: task.project.name, deadlineText, link: taskLink(task._id) },
                    } : undefined,
                }));
            }
            if (plan.type === "overdue") {
                const leadId = task.project.lead;
                if (task.assignees.some((a) => a._id.equals(leadId))) continue; // already notified above
                const lead = await User.findById(leadId).select("name");
                const key = `lead:${plan.keySuffix}:${task._id}:${leadId}`;
                count(await notify({
                    ...base, userId: leadId, type: "overdue", dedupeKey: key,
                    message: `"${task.title}" in ${task.project.name} is overdue (status: ${task.status}).`,
                    whatsapp: rcfg.enabled && rcfg.notifyLeadOnOverdue ? {
                        type: "overdue", key,
                        vars: { memberName: lead?.name, taskTitle: task.title, projectName: task.project.name, forLead: true, assigneeNames: task.assignees.map((a) => a.name).join(", ") || "nobody" },
                    } : undefined,
                }));
            }
        }
    }

    // Retry earlier temporary failures (bounded backoff, claimed with a lock)
    Object.assign(summary, await retryFailedDeliveries());
    return summary;
};

export const leadProjectIds = async (userId) =>
    (await Project.find({ lead: userId }).select("_id")).map((p) => p._id);
