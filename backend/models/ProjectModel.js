import mongoose from "mongoose";

export const PROJECT_STATUSES = ["Planning", "Active", "On Hold", "Completed"];

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date },
    targetDate: { type: Date },
    status: { type: String, enum: PROJECT_STATUSES, default: "Planning" },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Always includes the lead
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDemo: { type: Boolean, default: false },
}, { timestamps: true });

projectSchema.index({ members: 1 });

export const Project = mongoose.model("Project", projectSchema);
