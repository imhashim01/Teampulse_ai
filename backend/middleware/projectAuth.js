import mongoose from "mongoose";
import { Project } from "../models/ProjectModel.js";
import { Task } from "../models/TaskModel.js";

const isMember = (project, userId) =>
    project.lead.toString() === userId || project.members.some((m) => m.toString() === userId);

// Loads req.project from :projectId (or from :taskId's task) and checks membership.
// Unknown/invalid IDs -> 404, not a member -> 403.
export const requireProjectMember = async (req, res, next) => {
    try {
        if (req.params.taskId) {
            if (!mongoose.isValidObjectId(req.params.taskId)) {
                return res.status(404).json({ success: false, message: "Task not found" });
            }
            const task = await Task.findById(req.params.taskId);
            if (!task) return res.status(404).json({ success: false, message: "Task not found" });
            req.task = task;
            req.project = await Project.findById(task.project);
        } else {
            if (!mongoose.isValidObjectId(req.params.projectId)) {
                return res.status(404).json({ success: false, message: "Project not found" });
            }
            req.project = await Project.findById(req.params.projectId);
        }

        if (!req.project) return res.status(404).json({ success: false, message: "Project not found" });
        if (!isMember(req.project, req.userId)) {
            return res.status(403).json({ success: false, message: "You are not a member of this project" });
        }
        req.isLead = req.project.lead.toString() === req.userId;
        next();
    } catch (error) {
        console.log("error in requireProjectMember", error);
        res.status(500).json({ success: false, message: "server error" });
    }
};

// Must run after requireProjectMember
export const requireProjectLead = (req, res, next) => {
    if (!req.isLead) {
        return res.status(403).json({ success: false, message: "Only the project lead can do this" });
    }
    next();
};
