import mongoose from "mongoose";

const checkInSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    didToday: { type: String, default: "" },
    nextStep: { type: String, default: "" },
    blocked: { type: Boolean, default: false },
    helpNeeded: { type: String, default: "" },
    // Only set when the member explicitly says they are overloaded / need help
    overloaded: { type: Boolean, default: false },
    progress: { type: Number, min: 0, max: 100, required: true },
    note: { type: String, default: "" },
    isDemo: { type: Boolean, default: false },
}, { timestamps: true });

export const CheckIn = mongoose.model("CheckIn", checkInSchema);
