import { Task } from "../models/TaskModel.js";
import { Project } from "../models/ProjectModel.js";
import { notify } from "./notificationService.js";

const HOUR = 60 * 60 * 1000;

// Sends 24h deadline reminders and overdue alerts. Safe to run repeatedly:
// every message has a dedupeKey, so a second run creates nothing new.
// projectIds limits the run (used by the lead's "Run reminders now" button).
export const runReminders = async ({ projectIds } = {}) => {
    const now = new Date();
    const filter = { status: { $nin: ["Completed", "Submitted for Review"] }, deadline: { $lte: new Date(now.getTime() + 24 * HOUR) } };
    if (projectIds) filter.project = { $in: projectIds };

    const tasks = await Task.find(filter).populate("project", "name lead");
    const summary = { tasksChecked: tasks.length, created: 0, duplicatesSkipped: 0 };

    const send = async (args) => {
        const res = await notify(args);
        if (res.duplicate) summary.duplicatesSkipped++;
        else summary.created++;
    };

    for (const task of tasks) {
        if (!task.project) continue;
        const overdue = task.deadline < now;
        const hoursLeft = Math.max(1, Math.round((task.deadline - now) / HOUR));

        for (const userId of task.assignees) {
            if (overdue) {
                await send({
                    userId, project: task.project._id, task: task._id, type: "overdue",
                    message: `"${task.title}" is overdue. Need help finishing it? Let your lead know.`,
                    whatsapp: { dedupeKey: `overdue:${task._id}:${userId}` },
                });
            } else {
                await send({
                    userId, project: task.project._id, task: task._id, type: "reminder24h",
                    message: `Reminder: "${task.title}" is due in ${hoursLeft}h (${task.project.name}).`,
                    whatsapp: { dedupeKey: `reminder24h:${task._id}:${userId}` },
                });
            }
        }
        if (overdue) {
            const leadId = task.project.lead;
            await send({
                userId: leadId, project: task.project._id, task: task._id, type: "overdue",
                message: `"${task.title}" in ${task.project.name} is overdue (status: ${task.status}).`,
                whatsapp: { dedupeKey: `overdue:${task._id}:${leadId}` },
            });
        }
    }
    return summary;
};

export const leadProjectIds = async (userId) =>
    (await Project.find({ lead: userId }).select("_id")).map((p) => p._id);
