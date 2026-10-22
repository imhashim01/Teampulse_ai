import mongoose from "mongoose";

const activityEventSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, required: true },
    message: { type: String, required: true },
    isDemo: { type: Boolean, default: false },
}, { timestamps: true });

export const ActivityEvent = mongoose.model("ActivityEvent", activityEventSchema);
