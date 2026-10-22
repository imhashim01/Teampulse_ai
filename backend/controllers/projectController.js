import { Project, PROJECT_STATUSES } from "../models/ProjectModel.js";
import { Task, TASK_PRIORITIES } from "../models/TaskModel.js";
import { User } from "../models/UserModel.js";
import { ActivityEvent } from "../models/ActivityEventModel.js";
import { NotificationDelivery } from "../models/NotificationDeliveryModel.js";
import { logActivity, notify, deliverySummary } from "../services/notificationService.js";
import { notifyMemberAdded } from "../services/notificationEvents.js";
import { whatsappConfig } from "../config/whatsapp.js";
import { formatDeadline } from "../services/whatsappMessages.js";
import { runReminders } from "../services/reminderService.js";

const USER_FIELDS = "name email profilePicture";

export const listProjects = async (req, res) => {
    try {
        const projects = await Project.find({ members: req.userId })
            .populate("lead", USER_FIELDS).populate("members", USER_FIELDS).sort({ updatedAt: -1 }).lean();
        const counts = await Task.aggregate([
            { $match: { project: { $in: projects.map((p) => p._id) } } },
            { $group: { _id: "$project", total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } } } },
        ]);
        const byId = Object.fromEntries(counts.map((c) => [c._id.toString(), c]));
        const data = projects.map((p) => ({
            ...p,
            isLead: p.lead._id.toString() === req.userId,
            taskCount: byId[p._id.toString()]?.total || 0,
            completedCount: byId[p._id.toString()]?.completed || 0,
        }));
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createProject = async (req, res) => {
    try {
        const { name, description, startDate, targetDate, status } = req.body;
        if (!name?.trim()) return res.status(400).json({ success: false, message: "Project name is required" });
        if (status && !PROJECT_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });

        const project = await Project.create({
            name, description, startDate, targetDate, status,
            lead: req.userId, members: [req.userId],
        });
        await logActivity({ project: project._id, actor: req.userId, type: "project_created", message: `created the project "${project.name}"` });
        res.status(201).json({ success: true, message: "Project created", data: project });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.project._id).populate("lead", USER_FIELDS).populate("members", USER_FIELDS);
        res.status(200).json({ success: true, data: { ...project.toObject(), isLead: req.isLead } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateProject = async (req, res) => {
    try {
        const allowed = ["name", "description", "startDate", "targetDate", "status"];
        if (req.body.status && !PROJECT_STATUSES.includes(req.body.status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        allowed.forEach((k) => { if (req.body[k] !== undefined) req.project[k] = req.body[k]; });
        await req.project.save();
        await logActivity({ project: req.project._id, actor: req.userId, type: "project_updated", message: `updated the project details` });
        res.status(200).json({ success: true, message: "Project updated", data: req.project });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const addMember = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        if (!email) return res.status(400).json({ success: false, message: "Email is required" });
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "No registered user with that email" });
        if (req.project.members.some((m) => m.toString() === user._id.toString())) {
            return res.status(400).json({ success: false, message: "Already a member" });
        }
        req.project.members.push(user._id);
        await req.project.save();
        await logActivity({ project: req.project._id, actor: req.userId, type: "member_added", message: `added ${user.name} to the team` });
        // Membership is saved; a notification problem must not undo it
        const result = await notifyMemberAdded({ project: req.project, member: user, addedById: req.userId });
        res.status(200).json({ success: true, message: `${user.name} added`, data: { _id: user._id, name: user.name, email: user.email, whatsapp: deliverySummary(result.whatsapp) } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const removeMember = async (req, res) => {
    try {
        if (req.params.userId === req.project.lead.toString()) {
            return res.status(400).json({ success: false, message: "The lead cannot be removed" });
        }
        req.project.members = req.project.members.filter((m) => m.toString() !== req.params.userId);
        await req.project.save();
        await Task.updateMany({ project: req.project._id }, { $pull: { assignees: req.params.userId } });
        res.status(200).json({ success: true, message: "Member removed" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listProjectTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ project: req.project._id }).populate("assignees", USER_FIELDS).sort({ deadline: 1 });
        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createTask = async (req, res) => {
    try {
        const { title, description, assignees = [], priority, deadline, submissionInstructions, link } = req.body;
        if (!title?.trim()) return res.status(400).json({ success: false, message: "Title is required" });
        if (!deadline || isNaN(new Date(deadline))) return res.status(400).json({ success: false, message: "A valid deadline is required" });
        if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });

        const memberIds = req.project.members.map((m) => m.toString());
        const uniqueAssignees = [...new Set(assignees.map(String))];
        if (uniqueAssignees.some((id) => !memberIds.includes(id))) {
            return res.status(400).json({ success: false, message: "Assignees must be members of this project" });
        }

        const task = await Task.create({
            project: req.project._id, title, description, assignees: uniqueAssignees, priority,
            deadline, submissionInstructions, link, createdBy: req.userId, lastMeaningfulUpdateAt: new Date(),
        });
        await logActivity({ project: req.project._id, task: task._id, actor: req.userId, type: "task_created", message: `created task "${task.title}"` });

        const deadlineText = formatDeadline(task.deadline, whatsappConfig().reminders.timezone);
        const assigneeUsers = await User.find({ _id: { $in: uniqueAssignees } }).select("name");
        for (const member of assigneeUsers) {
            await notify({
                userId: member._id, project: req.project._id, task: task._id, type: "assigned",
                message: `New task assigned: "${task.title}" (due ${deadlineText})`,
                whatsapp: { type: "task_assigned", key: `task_assigned:${task._id}:${member._id}`, vars: { memberName: member.name, taskTitle: task.title, projectName: req.project.name, deadlineText } },
            });
        }
        res.status(201).json({ success: true, message: "Task created", data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listActivity = async (req, res) => {
    try {
        const events = await ActivityEvent.find({ project: req.project._id })
            .populate("actor", "name profilePicture").populate("task", "title").sort({ createdAt: -1 }).limit(50);
        res.status(200).json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listDeliveries = async (req, res) => {
    try {
        const deliveries = await NotificationDelivery.find({ project: req.project._id })
            .populate("recipient", "name email").populate("task", "title").sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ success: true, data: deliveries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const runProjectReminders = async (req, res) => {
    try {
        const summary = await runReminders({ projectIds: [req.project._id] });
        res.status(200).json({ success: true, message: `Reminders run: ${summary.created} sent, ${summary.duplicatesSkipped} already sent`, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
