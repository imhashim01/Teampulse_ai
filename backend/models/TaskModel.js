import mongoose from "mongoose";

export const TASK_STATUSES = ["To Do", "In Progress", "Submitted for Review", "Revision Required", "Completed", "Blocked"];
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"];
export const OPEN_STATUSES = ["To Do", "In Progress", "Revision Required", "Blocked"];

const taskSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    priority: { type: String, enum: TASK_PRIORITIES, default: "Medium" },
    deadline: { type: Date, required: true },
    submissionInstructions: { type: String, default: "" },
    link: { type: String, default: "" },
    status: { type: String, enum: TASK_STATUSES, default: "To Do" },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    revisionCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMeaningfulUpdateAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    isDemo: { type: Boolean, default: false },
}, { timestamps: true });

taskSchema.index({ assignees: 1 });

export const Task = mongoose.model("Task", taskSchema);
