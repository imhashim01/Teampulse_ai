import crypto from "crypto";
import { Task, OPEN_STATUSES } from "../models/TaskModel.js";
import { CheckIn } from "../models/CheckInModel.js";
import { Project } from "../models/ProjectModel.js";
import { RiskAssessment } from "../models/RiskAssessmentModel.js";
import { computeSignals, buildFacts, ruleAssess, RISK_CATEGORIES } from "./riskEngine.js";
import { analyzeRiskWithAI } from "./aiService.js";

const LEVEL_ORDER = { High: 0, Medium: 1, Low: 2 };
const CATEGORY_ORDER = Object.fromEntries(RISK_CATEGORIES.map((c, i) => [c, i]));

// Hash only the inputs that matter, with time bucketed so the AI is not re-called on every page load.
const hashInputs = (signals, checkIns) => crypto.createHash("sha256").update(JSON.stringify({
    status: signals.status,
    progress: signals.reportedProgress,
    blocked: signals.blocked,
    overloaded: signals.overloaded,
    revisions: signals.revisionRounds,
    checkIns: checkIns.map((c) => c._id.toString()),
    staleDays: Math.floor(signals.daysSinceMeaningfulUpdate),
    deadlineBucket: Math.floor(signals.hoursToDeadline / 12),
})).digest("hex");

export const assessTask = async (taskOrId, { force = false } = {}) => {
    const task = await Task.findById(taskOrId._id || taskOrId).populate("assignees", "name email");
    if (!task) return null;
    const checkIns = await CheckIn.find({ task: task._id }).sort({ createdAt: 1 });
    const member = task.assignees[0];
    const ctx = { memberName: member?.name || "Team", taskTitle: task.title };

    const signals = computeSignals(task, checkIns);
    const inputHash = hashInputs(signals, checkIns);
    const existing = await RiskAssessment.findOne({ task: task._id });
    if (existing && existing.inputHash === inputHash && !force) return existing;

    const facts = buildFacts(task, checkIns, signals);
    const ruleResult = ruleAssess(signals, facts, ctx);
    const ai = await analyzeRiskWithAI({ ...ctx, signals, facts, ruleResult });
    const result = ai.ok ? ai.result : ruleResult;
    const factById = Object.fromEntries(facts.map((f) => [f.id, f]));

    return RiskAssessment.findOneAndUpdate(
        { task: task._id },
        {
            task: task._id,
            project: task.project,
            member: member?._id,
            inputHash,
            signals,
            category: result.category,
            level: result.level,
            explanation: result.explanation,
            evidence: result.evidence.map((id) => factById[id]).filter(Boolean)
                .map(({ text, kind, refId }) => ({ text, kind, refId })),
            deadlineRisk: result.deadlineRisk,
            suggestedAction: result.suggestedAction,
            supportiveMessage: result.supportiveMessage,
            source: ai.ok ? "AI-assisted" : "Rule-based",
            aiError: ai.ok ? undefined : ai.error,
            analyzedAt: new Date(),
        },
        { upsert: true, new: true }
    );
};

// Runs fn over items with limited concurrency (keeps us under free-tier AI rate limits)
const mapLimit = async (items, limit, fn) => {
    const out = [];
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (i < items.length) {
            const idx = i++;
            out[idx] = await fn(items[idx]);
        }
    }));
    return out;
};

// Assess every open, assigned task in the projects this user leads.
export const assessForLead = async (userId, { force = false } = {}) => {
    const projects = await Project.find({ lead: userId }).select("_id");
    const projectIds = projects.map((p) => p._id);
    const tasks = await Task.find({
        project: { $in: projectIds },
        status: { $in: OPEN_STATUSES },
        "assignees.0": { $exists: true },
    }).select("_id");

    await mapLimit(tasks, 3, (t) => assessTask(t, { force }));

    const assessments = await RiskAssessment.find({ task: { $in: tasks.map((t) => t._id) } })
        .populate("member", "name email phone whatsappOptIn profilePicture")
        .populate({ path: "task", select: "title deadline status priority project progress", populate: { path: "project", select: "name" } });

    return assessments.sort((a, b) =>
        LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || new Date(a.task?.deadline) - new Date(b.task?.deadline));
};
