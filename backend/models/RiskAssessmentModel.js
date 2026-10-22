import mongoose from "mongoose";

const riskAssessmentSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, unique: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inputHash: { type: String, required: true },
    signals: { type: Object, default: {} },
    category: { type: String, required: true },
    level: { type: String, enum: ["Low", "Medium", "High"], required: true },
    explanation: { type: String, default: "" },
    evidence: [{
        text: String,
        kind: { type: String, enum: ["task", "checkin", "submission"] },
        refId: String,
    }],
    deadlineRisk: { type: String, default: "" },
    suggestedAction: { type: String, default: "" },
    supportiveMessage: { type: String, default: "" },
    source: { type: String, enum: ["AI-assisted", "Rule-based"], required: true },
    aiError: { type: String },
    analyzedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const RiskAssessment = mongoose.model("RiskAssessment", riskAssessmentSchema);
