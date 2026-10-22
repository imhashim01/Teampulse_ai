// Deterministic Risk Radar rule engine. Works without any AI key.
// It only looks at recorded facts: check-ins, task status, deadline and revision rounds.
// It never infers emotions, burnout or mental state, and never uses activity times as evidence.

export const RISK_CATEGORIES = [
    "Confirmed blocker",
    "Potential hidden blocker",
    "Stalled task",
    "Deadline at risk",
    "Workload strain",
    "Insufficient evidence",
    "On track",
];

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const round1 = (n) => Math.round(n * 10) / 10;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// checkIns must be sorted oldest -> newest
export const computeSignals = (task, checkIns, now = new Date()) => {
    const last = checkIns[checkIns.length - 1];
    let unchanged = 0;
    if (last) {
        unchanged = 1;
        for (let i = checkIns.length - 2; i >= 0 && checkIns[i].progress === last.progress; i--) unchanged++;
    }
    const created = new Date(task.createdAt || now);
    const deadline = new Date(task.deadline);
    const span = Math.max(deadline - created, HOUR);

    return {
        status: task.status,
        checkInCount: checkIns.length,
        reportedProgress: last ? last.progress : task.progress || 0,
        daysSinceMeaningfulUpdate: round1((now - new Date(task.lastMeaningfulUpdateAt || created)) / DAY),
        hoursToDeadline: Math.round((deadline - now) / HOUR),
        unchangedCheckIns: unchanged,
        blocked: task.status === "Blocked" || Boolean(last?.blocked),
        helpNeeded: last?.helpNeeded || "",
        overloaded: Boolean(last?.overloaded),
        revisionRounds: task.revisionCount || 0,
        taskAgeDays: round1((now - created) / DAY),
        timeElapsedPct: Math.round(Math.min(Math.max((now - created) / span, 0), 1.5) * 100),
    };
};

// Facts are the only things the AI may cite as evidence. Each links to a task or check-in.
export const buildFacts = (task, checkIns, signals) => {
    const taskRef = { kind: "task", refId: task._id.toString() };
    const last = checkIns[checkIns.length - 1];
    const lastRef = last ? { kind: "checkin", refId: last._id.toString() } : taskRef;
    const facts = [];
    const add = (id, text, ref) => facts.push({ id, text, ...ref });

    if (last) add("progress", `Latest check-in reports ${signals.reportedProgress}% progress`, lastRef);
    else add("no_checkins", "No check-ins have been submitted for this task yet", taskRef);

    add("last_update", `No meaningful update for ${signals.daysSinceMeaningfulUpdate} days (last on ${fmtDate(task.lastMeaningfulUpdateAt || task.createdAt)})`, taskRef);

    if (signals.hoursToDeadline >= 0) add("deadline", `Deadline is in ${signals.hoursToDeadline} hours (${fmtDate(task.deadline)})`, taskRef);
    else add("deadline", `Deadline passed ${Math.abs(signals.hoursToDeadline)} hours ago (${fmtDate(task.deadline)})`, taskRef);

    if (signals.unchangedCheckIns >= 2) add("unchanged", `Progress unchanged at ${signals.reportedProgress}% across ${signals.unchangedCheckIns} check-ins`, lastRef);
    if (signals.blocked) add("blocked", `Member reported being blocked${signals.helpNeeded ? `: "${signals.helpNeeded}"` : ""}`, lastRef);
    if (signals.overloaded) add("overloaded", "Member explicitly said they are overloaded / need help", lastRef);
    if (signals.revisionRounds > 0) add("revisions", `${signals.revisionRounds} revision round(s) requested so far`, taskRef);
    add("status", `Task status is "${signals.status}"`, taskRef);

    checkIns.slice(-3).forEach((c, i) => {
        const said = [c.note, c.didToday].filter(Boolean).join(" / ");
        if (said) add(`checkin_${i + 1}`, `Check-in on ${fmtDate(c.createdAt)} (${c.progress}%): "${said}"`, { kind: "checkin", refId: c._id.toString() });
    });
    return facts;
};

const firstName = (name = "") => name.split(" ")[0] || "Team";

const messages = {
    "Confirmed blocker": (n, t) => `${n}, aap ne bataya ke "${t}" mein blocker hai, shukriya batane ka! Aaj 15 minute nikal ke saath solve kar lete hain?`,
    "Potential hidden blocker": (n, t) => `${n}, "${t}" wala kaam thora tricky lag raha hai. 15 minute call kar lein? Saath mein dekh lete hain.`,
    "Stalled task": (n, t) => `${n}, "${t}" pe koi madad chahiye? Agar kuch atka hua hai to bata dein, mil ke plan bana lete hain.`,
    "Overdue": (n, t) => `${n}, "${t}" ki deadline guzar gayi hai, koi baat nahi. 10 minute baat kar ke naya realistic plan bana lete hain?`,
    "Deadline at risk": (n, t) => `${n}, "${t}" ki deadline qareeb hai. Scope ya timeline pe baat kar lein taake aap pe pressure na ho?`,
    "Workload strain": (n) => `${n}, aap ne bataya ke kaam zyada ho gaya hai, bilkul theek hai. Priorities dobara set kar lete hain, kuch kaam shift kar dete hain.`,
    "Insufficient evidence": (n, t) => `${n}, "${t}" kaisa chal raha hai? Jab time mile ek chhota sa check-in daal dein.`,
    "On track": (n, t) => `${n}, "${t}" pe acha kaam ho raha hai, keep it up! Koi zaroorat ho to batayein.`,
};

export const supportiveMessageFor = (category, memberName, taskTitle) =>
    (messages[category] || messages["On track"])(firstName(memberName), taskTitle);

export const ruleAssess = (signals, facts, { memberName, taskTitle }) => {
    const s = signals;
    const has = (id) => facts.some((f) => f.id === id);
    const ids = (...wanted) => wanted.filter(has);
    let r;

    if (s.blocked) {
        r = {
            category: "Confirmed blocker",
            level: s.hoursToDeadline <= 72 ? "High" : "Medium",
            explanation: "The member has said they are blocked. Unblocking them early protects the deadline.",
            evidence: ids("blocked", "deadline", "progress", "status"),
            suggestedAction: "Schedule a short call today to remove the blocker, or pair them with someone who knows this area.",
        };
    } else if (s.reportedProgress >= 70 && s.daysSinceMeaningfulUpdate >= 2 && s.hoursToDeadline <= 72 && s.hoursToDeadline >= 0) {
        r = {
            category: "Potential hidden blocker",
            level: "High",
            explanation: `Reported progress is high (${s.reportedProgress}%) but nothing meaningful has changed for ${s.daysSinceMeaningfulUpdate} days, and the deadline is ${s.hoursToDeadline} hours away. "Almost done" that does not move often hides a blocker the person is not comfortable raising.`,
            evidence: ids("progress", "last_update", "deadline", "unchanged", "checkin_1", "checkin_2", "checkin_3"),
            suggestedAction: "Offer a 15-minute pairing call to look at the remaining work together. Ask what is left, not why it is late.",
        };
    } else if (s.hoursToDeadline < 0) {
        r = {
            category: "Deadline at risk",
            level: "High",
            explanation: `The deadline passed ${Math.abs(s.hoursToDeadline)} hours ago and the task is still "${s.status}".`,
            evidence: ids("deadline", "status", "progress", "no_checkins"),
            suggestedAction: "Agree on a new realistic date and check whether scope can be reduced.",
        };
    } else if (s.overloaded) {
        r = {
            category: "Workload strain",
            level: "Medium",
            explanation: "The member explicitly said they are overloaded or need help.",
            evidence: ids("overloaded", "deadline", "progress"),
            suggestedAction: "Review their current assignments together and move or defer something.",
        };
    } else if (s.status === "In Progress" && s.unchangedCheckIns >= 2) {
        r = {
            category: "Stalled task",
            level: s.hoursToDeadline <= 48 ? "High" : "Medium",
            explanation: `Progress has stayed at ${s.reportedProgress}% across ${s.unchangedCheckIns} check-ins.`,
            evidence: ids("unchanged", "last_update", "deadline", "checkin_1", "checkin_2"),
            suggestedAction: "Ask what is in the way and whether the task needs to be split into smaller steps.",
        };
    } else if (s.checkInCount > 0 && ((s.hoursToDeadline <= 24 && s.reportedProgress < 70) || (s.hoursToDeadline <= 72 && s.reportedProgress < 40))) {
        r = {
            category: "Deadline at risk",
            level: s.hoursToDeadline <= 24 ? "High" : "Medium",
            explanation: `Only ${s.reportedProgress}% is reported with ${s.hoursToDeadline} hours left.`,
            evidence: ids("progress", "deadline", "last_update"),
            suggestedAction: "Check if scope can be reduced or extra help added before the deadline.",
        };
    } else if (s.checkInCount === 0) {
        r = {
            category: "Insufficient evidence",
            level: s.hoursToDeadline <= 48 ? "Medium" : "Low",
            explanation: "There is not enough data yet to judge this task. This is not a warning, just a gap in information.",
            evidence: ids("no_checkins", "deadline", "status"),
            suggestedAction: "Ask for a quick check-in so the team has visibility.",
        };
    } else {
        r = {
            category: "On track",
            level: "Low",
            explanation: "Recent check-ins and the deadline look consistent.",
            evidence: ids("progress", "deadline", "last_update"),
            suggestedAction: "No action needed. A quick word of appreciation helps.",
        };
    }

    const left = s.hoursToDeadline < 0 ? `overdue by ${Math.abs(s.hoursToDeadline)}h` : `${s.hoursToDeadline}h left`;
    r.deadlineRisk = `${s.reportedProgress}% reported, ${left}, ${s.timeElapsedPct}% of the planned time used`;
    r.supportiveMessage = supportiveMessageFor(s.hoursToDeadline < 0 && r.category === "Deadline at risk" ? "Overdue" : r.category, memberName, taskTitle);
    return r;
};
