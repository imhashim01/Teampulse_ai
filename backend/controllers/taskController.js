import { Task, TASK_PRIORITIES, TASK_STATUSES } from "../models/TaskModel.js";
import { Submission } from "../models/SubmissionModel.js";
import { CheckIn } from "../models/CheckInModel.js";
import { User } from "../models/UserModel.js";
import { RiskAssessment } from "../models/RiskAssessmentModel.js";
import { logActivity, notify, deliverWhatsApp } from "../services/notificationService.js";
import { assessTask } from "../services/riskService.js";

const USER_FIELDS = "name email profilePicture";
const isAssignee = (task, userId) => task.assignees.some((a) => a.toString() === userId);
const actorName = async (userId) => (await User.findById(userId).select("name"))?.name || "Someone";

export const myTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ assignees: req.userId })
            .populate("project", "name lead").populate("assignees", USER_FIELDS).sort({ deadline: 1 });
        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTask = async (req, res) => {
    try {
        const task = await Task.findById(req.task._id)
            .populate("assignees", USER_FIELDS).populate("createdBy", "name")
            .populate({ path: "project", select: "name lead members", populate: { path: "members", select: USER_FIELDS } });
        const [submissions, checkIns, risk] = await Promise.all([
            Submission.find({ task: task._id }).populate("submittedBy reviewedBy", "name profilePicture").sort({ createdAt: -1 }),
            CheckIn.find({ task: task._id }).populate("user", "name profilePicture").sort({ createdAt: -1 }),
            req.isLead ? RiskAssessment.findOne({ task: task._id }) : null,
        ]);
        res.status(200).json({
            success: true,
            data: { task, submissions, checkIns, risk, isLead: req.isLead, isAssignee: isAssignee(req.task, req.userId) },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { title, description, priority, deadline, submissionInstructions, link, assignees } = req.body;
        if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });
        const task = req.task;
        const before = task.assignees.map(String);

        if (assignees) {
            const memberIds = req.project.members.map(String);
            const unique = [...new Set(assignees.map(String))];
            if (unique.some((id) => !memberIds.includes(id))) {
                return res.status(400).json({ success: false, message: "Assignees must be members of this project" });
            }
            task.assignees = unique;
        }
        Object.entries({ title, description, priority, deadline, submissionInstructions, link })
            .forEach(([k, v]) => { if (v !== undefined) task[k] = v; });
        await task.save();

        const added = task.assignees.map(String).filter((id) => !before.includes(id));
        for (const userId of added) {
            await notify({
                userId, project: task.project, task: task._id, type: "assigned",
                message: `New task assigned: "${task.title}"`,
                whatsapp: { dedupeKey: `assigned:${task._id}:${userId}` },
            });
        }
        await logActivity({ project: task.project, task: task._id, actor: req.userId, type: "task_updated", message: `updated task "${task.title}"` });
        res.status(200).json({ success: true, message: "Task updated", data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Members (assignees) may only set "In Progress" or "Blocked". The lead may set anything.
export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = req.task;
        if (!TASK_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });

        if (!req.isLead) {
            if (!isAssignee(task, req.userId)) return res.status(403).json({ success: false, message: "Only assignees can update this task" });
            if (!["In Progress", "Blocked"].includes(status)) {
                return res.status(403).json({ success: false, message: "Members can only set In Progress or Blocked. Use Submit for review when done." });
            }
            if (["Completed", "Submitted for Review"].includes(task.status)) {
                return res.status(400).json({ success: false, message: `Task is already ${task.status}` });
            }
        }
        if (task.status === status) return res.status(200).json({ success: true, message: "No change", data: task });

        const prev = task.status;
        task.status = status;
        task.lastMeaningfulUpdateAt = new Date();
        if (status === "Completed") { task.completedAt = new Date(); task.progress = 100; }
        await task.save();

        const name = await actorName(req.userId);
        await logActivity({ project: task.project, task: task._id, actor: req.userId, type: "status_changed", message: `moved "${task.title}" from ${prev} to ${status}` });
        if (status === "Blocked" && !req.isLead) {
            await notify({ userId: req.project.lead, project: task.project, task: task._id, type: "blocked", message: `${name} marked "${task.title}" as Blocked` });
        }
        res.status(200).json({ success: true, message: `Status set to ${status}`, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const submitTask = async (req, res) => {
    try {
        const task = req.task;
        const { summary, link } = req.body;
        if (!isAssignee(task, req.userId)) return res.status(403).json({ success: false, message: "Only assignees can submit this task" });
        if (!summary?.trim()) return res.status(400).json({ success: false, message: "A summary is required" });
        if (["Completed", "Submitted for Review"].includes(task.status)) {
            return res.status(400).json({ success: false, message: `Task is already ${task.status}` });
        }

        const submission = await Submission.create({ task: task._id, project: task.project, submittedBy: req.userId, summary, link });
        task.status = "Submitted for Review";
        task.lastMeaningfulUpdateAt = new Date();
        await task.save();

        const name = await actorName(req.userId);
        await logActivity({ project: task.project, task: task._id, actor: req.userId, type: "submitted", message: `submitted "${task.title}" for review` });
        await notify({
            userId: req.project.lead, project: task.project, task: task._id, type: "submission",
            message: `${name} submitted "${task.title}" for review`,
            whatsapp: { dedupeKey: `submission:${submission._id}:${req.project.lead}` },
        });
        res.status(201).json({ success: true, message: "Submitted for review", data: submission });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lead only: action = "approve" | "revision"
export const reviewTask = async (req, res) => {
    try {
        const task = req.task;
        const { action, comment = "" } = req.body;
        if (!["approve", "revision"].includes(action)) return res.status(400).json({ success: false, message: "Invalid action" });
        if (task.status !== "Submitted for Review") return res.status(400).json({ success: false, message: "Task is not waiting for review" });
        if (action === "revision" && !comment.trim()) return res.status(400).json({ success: false, message: "Please add a comment explaining the revision" });

        const submission = await Submission.findOne({ task: task._id, status: "Pending" }).sort({ createdAt: -1 });
        if (submission) {
            submission.status = action === "approve" ? "Approved" : "Revision Requested";
            submission.reviewComment = comment;
            submission.reviewedBy = req.userId;
            submission.reviewedAt = new Date();
            await submission.save();
        }

        task.lastMeaningfulUpdateAt = new Date();
        if (action === "approve") {
            task.status = "Completed";
            task.completedAt = new Date();
            task.progress = 100;
        } else {
            task.status = "Revision Required";
            task.revisionCount += 1;
        }
        await task.save();

        await logActivity({
            project: task.project, task: task._id, actor: req.userId,
            type: action === "approve" ? "approved" : "revision_requested",
            message: action === "approve" ? `approved "${task.title}"` : `requested revisions on "${task.title}"`,
        });
        for (const userId of task.assignees) {
            if (action === "approve") {
                await notify({ userId, project: task.project, task: task._id, type: "approved", message: `"${task.title}" was approved. Great work!` });
            } else {
                await notify({
                    userId, project: task.project, task: task._id, type: "revision",
                    message: `Revision requested on "${task.title}": ${comment}`,
                    whatsapp: { dedupeKey: `revision:${submission?._id || task._id + "-" + task.revisionCount}:${userId}` },
                });
            }
        }
        res.status(200).json({ success: true, message: action === "approve" ? "Task approved" : "Revision requested", data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addCheckIn = async (req, res) => {
    try {
        const task = req.task;
        if (!isAssignee(task, req.userId)) return res.status(403).json({ success: false, message: "Only assignees can check in on this task" });
        const { didToday = "", nextStep = "", blocked = false, helpNeeded = "", overloaded = false, note = "" } = req.body;
        const progress = Number(req.body.progress);
        if (isNaN(progress) || progress < 0 || progress > 100) return res.status(400).json({ success: false, message: "Progress must be 0-100" });

        const prevCheckIn = await CheckIn.findOne({ task: task._id }).sort({ createdAt: -1 });
        const checkIn = await CheckIn.create({
            task: task._id, project: task.project, user: req.userId,
            didToday, nextStep, blocked: Boolean(blocked), helpNeeded, overloaded: Boolean(overloaded), progress, note,
        });

        // A check-in is a meaningful update when something actually moved:
        // the first check-in, progress went up, or a blocker was raised/cleared.
        // Repeating "90%, almost done" does not reset the clock - that is what the Ji Sir detector watches.
        const meaningful = !prevCheckIn || progress > prevCheckIn.progress || Boolean(blocked) !== prevCheckIn.blocked;
        if (meaningful) task.lastMeaningfulUpdateAt = new Date();
        task.progress = progress;
        if (blocked && task.status !== "Blocked") task.status = "Blocked";
        else if (!blocked && ["To Do", "Blocked"].includes(task.status)) task.status = "In Progress";
        await task.save();

        const name = await actorName(req.userId);
        await logActivity({ project: task.project, task: task._id, actor: req.userId, type: "checkin", message: `checked in on "${task.title}" (${progress}%${blocked ? ", blocked" : ""})` });
        if (blocked || overloaded) {
            await notify({
                userId: req.project.lead, project: task.project, task: task._id, type: blocked ? "blocked" : "help_needed",
                message: `${name} ${blocked ? "is blocked" : "asked for help"} on "${task.title}"${helpNeeded ? `: ${helpNeeded}` : ""}`,
            });
        }
        res.status(201).json({ success: true, message: "Check-in saved", data: checkIn });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const reanalyzeTask = async (req, res) => {
    try {
        const risk = await assessTask(req.task._id, { force: true });
        res.status(200).json({ success: true, message: `Analyzed (${risk.source})`, data: risk });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lead approves and sends the (possibly edited) supportive message on WhatsApp
export const sendNudge = async (req, res) => {
    try {
        const { message, userId } = req.body;
        if (!message?.trim()) return res.status(400).json({ success: false, message: "Message is required" });
        const recipient = userId || req.task.assignees[0]?.toString();
        if (!recipient || !isAssignee(req.task, recipient)) return res.status(400).json({ success: false, message: "Recipient must be an assignee" });

        const { delivery } = await deliverWhatsApp({
            event: "nudge", recipientId: recipient, project: req.task.project, task: req.task._id,
            message, dedupeKey: `nudge:${req.task._id}:${recipient}:${Date.now()}`,
        });
        await notify({ userId: recipient, project: req.task.project, task: req.task._id, type: "nudge", message });
        res.status(200).json({ success: true, message: `WhatsApp: ${delivery.status}`, data: delivery });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
