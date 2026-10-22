// Builds the template parameters and the free-form text for each WhatsApp message type.
// The parameter ORDER here must match the approved templates (see WHATSAPP_SETUP.md).
import { whatsappConfig } from "../config/whatsapp.js";

const firstName = (name = "") => name.trim().split(/\s+/)[0] || "there";

export const formatDeadline = (date, timezone) => {
    const d = new Date(date);
    const text = d.toLocaleString("en-GB", { timeZone: timezone, day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true })
        .replace(" at ", ", ").replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
    return `${text} (${timezone})`;
};

export const taskLink = (taskId) => {
    const base = whatsappConfig().appBaseUrl;
    return base ? `${base}/tasks/${taskId}` : "";
};

// Each builder returns { params: [...body params in template order], text: "free-form fallback" }
const builders = {
    // Template body: "{{1}} is your verification code." (Meta authentication template, code also in button)
    verification: ({ code, ttlMinutes }) => ({
        params: [code],
        buttonParam: code,
        text: `TeamPulse AI: Your WhatsApp verification code is ${code}. It expires in ${ttlMinutes} minutes. If you did not request this code, you can ignore this message.`,
    }),
    // {{1}} member first name, {{2}} project, {{3}} role, {{4}} added by
    project_added: ({ memberName, projectName, role, addedBy }) => ({
        params: [firstName(memberName), projectName, role, addedBy],
        text: `Hi ${firstName(memberName)}, you've been added to the project '${projectName}' on TeamPulse AI.\n\nProject: ${projectName}\nRole: ${role}\nAdded by: ${addedBy}\n\nOpen TeamPulse AI to view your responsibilities and project deadlines.`,
    }),
    // {{1}} project, {{2}} task, {{3}} submitter, {{4}} review link
    task_submitted: ({ projectName, taskTitle, submitterName, link }) => ({
        params: [projectName, taskTitle, submitterName, link || "Open TeamPulse AI"],
        text: `TeamPulse AI: New task submission\n\nProject: ${projectName}\nTask: ${taskTitle}\nSubmitted by: ${submitterName}\n\nThe task is ready for your review.${link ? `\n\nReview: ${link}` : ""}`,
    }),
    // {{1}} member first name, {{2}} task, {{3}} project, {{4}} deadline with timezone
    deadline_reminder: ({ memberName, taskTitle, projectName, deadlineText }) => ({
        params: [firstName(memberName), taskTitle, projectName, deadlineText],
        text: `TeamPulse AI: Deadline reminder\n\nHi ${firstName(memberName)},\nTask: ${taskTitle}\nProject: ${projectName}\nDeadline: ${deadlineText}\n\nPlease update your progress on TeamPulse AI. If you're blocked, let your team lead know.`,
    }),
    // {{1}} recipient first name, {{2}} task, {{3}} project
    overdue: ({ memberName, taskTitle, projectName, forLead, assigneeNames }) => ({
        params: [firstName(memberName), taskTitle, projectName],
        text: forLead
            ? `TeamPulse AI: A task in your project is overdue.\n\nTask: ${taskTitle}\nProject: ${projectName}\nAssigned to: ${assigneeNames}\n\nYou may want to check in and offer support.`
            : `TeamPulse AI: This task is now overdue.\n\nTask: ${taskTitle}\nProject: ${projectName}\n\nPlease update the task status and share any blockers with your team lead.`,
    }),
    // {{1}} member first name, {{2}} task, {{3}} project, {{4}} deadline
    task_assigned: ({ memberName, taskTitle, projectName, deadlineText }) => ({
        params: [firstName(memberName), taskTitle, projectName, deadlineText],
        text: `TeamPulse AI: New task assigned\n\nHi ${firstName(memberName)},\nTask: ${taskTitle}\nProject: ${projectName}\nDeadline: ${deadlineText}`,
    }),
    // {{1}} member first name, {{2}} task, {{3}} reviewer comment
    revision: ({ memberName, taskTitle, comment }) => ({
        params: [firstName(memberName), taskTitle, comment],
        text: `TeamPulse AI: Revision requested\n\nHi ${firstName(memberName)}, your lead requested changes on "${taskTitle}":\n${comment}`,
    }),
    // {{1}} message written and approved by the lead
    nudge: ({ message }) => ({ params: [message], text: message }),
};

// Returns { template?: {name, language, bodyParams, buttonParam}, text, preview }
export const buildMessage = (type, vars) => {
    const build = builders[type];
    if (!build) throw new Error(`Unknown WhatsApp message type: ${type}`);
    const { params, text, buttonParam } = build(vars);
    const tpl = whatsappConfig().templates[type];
    const template = tpl?.name ? { name: tpl.name, language: tpl.language, bodyParams: params, ...(buttonParam !== undefined ? { buttonParam } : {}) } : null;
    // The preview stored in the delivery log never contains a verification code
    const preview = type === "verification" ? "TeamPulse AI verification code (hidden)" : text;
    return { template, text, preview };
};
