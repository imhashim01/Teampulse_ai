import { Project } from "../models/ProjectModel.js";
import { Task, OPEN_STATUSES } from "../models/TaskModel.js";
import { ActivityEvent } from "../models/ActivityEventModel.js";
import { Notification } from "../models/NotificationModel.js";
import { assessForLead } from "../services/riskService.js";

const HOUR = 60 * 60 * 1000;

export const getDashboard = async (req, res) => {
    try {
        const now = new Date();
        const ledProjects = await Project.find({ lead: req.userId }).select("_id name status");
        const ledIds = ledProjects.map((p) => p._id);
        let lead = null;

        if (ledIds.length) {
            const tasks = await Task.find({ project: { $in: ledIds } }).populate("assignees", "name profilePicture").populate("project", "name");
            const open = tasks.filter((t) => t.status !== "Completed");
            // Uses cached assessments; only re-analyzes tasks whose inputs changed
            const atRisk = (await assessForLead(req.userId)).filter((r) => r.level !== "Low");

            lead = {
                activeProjects: ledProjects.filter((p) => p.status === "Active").length,
                totalProjects: ledProjects.length,
                totalTasks: tasks.length,
                completed: tasks.filter((t) => t.status === "Completed").length,
                inProgress: tasks.filter((t) => t.status === "In Progress").length,
                overdue: open.filter((t) => t.deadline < now).length,
                awaitingReview: tasks.filter((t) => t.status === "Submitted for Review").length,
                blocked: tasks.filter((t) => t.status === "Blocked").length,
                atRisk: atRisk.length,
                atRiskHigh: atRisk.filter((r) => r.level === "High").length,
                riskItems: atRisk.slice(0, 5),
                reviewQueue: tasks.filter((t) => t.status === "Submitted for Review").slice(0, 5),
                upcomingDeadlines: open
                    .filter((t) => t.deadline >= now && t.deadline <= new Date(now.getTime() + 7 * 24 * HOUR))
                    .sort((a, b) => a.deadline - b.deadline).slice(0, 6),
                recentActivity: await ActivityEvent.find({ project: { $in: ledIds } })
                    .populate("actor", "name profilePicture").populate("project", "name").sort({ createdAt: -1 }).limit(8),
            };
        }

        const mine = await Task.find({ assignees: req.userId, status: { $ne: "Completed" } }).populate("project", "name");
        const member = {
            myTasks: mine.length,
            dueSoon: mine.filter((t) => t.deadline >= now && t.deadline <= new Date(now.getTime() + 48 * HOUR) && t.status !== "Submitted for Review").length,
            overdue: mine.filter((t) => t.deadline < now && OPEN_STATUSES.includes(t.status)).length,
            revisionRequests: mine.filter((t) => t.status === "Revision Required").length,
            tasks: mine.sort((a, b) => a.deadline - b.deadline).slice(0, 8),
            recentNotifications: await Notification.find({ user: req.userId }).sort({ createdAt: -1 }).limit(5),
        };

        res.status(200).json({ success: true, data: { isLead: ledIds.length > 0, lead, member } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
