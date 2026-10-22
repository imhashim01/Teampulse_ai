import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    summary: { type: String, required: true },
    link: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Approved", "Revision Requested"], default: "Pending" },
    reviewComment: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    isDemo: { type: Boolean, default: false },
}, { timestamps: true });

export const Submission = mongoose.model("Submission", submissionSchema);
