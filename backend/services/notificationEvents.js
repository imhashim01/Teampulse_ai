// Notifications fired after a project/task operation has been saved successfully.
// Callers must only invoke these after the database write succeeded.
import { User } from "../models/UserModel.js";
import { notify } from "./notificationService.js";
import { taskLink } from "./whatsappMessages.js";

// Workflow B: member added to a project
export const notifyMemberAdded = async ({ project, member, addedById }) => {
    const addedBy = (await User.findById(addedById).select("name"))?.name || "your team lead";
    const role = project.lead.toString() === member._id.toString() ? "Lead" : "Member";
    return notify({
        userId: member._id, project: project._id, type: "member_added",
        message: `${addedBy} added you to the project "${project.name}"`,
        whatsapp: {
            type: "project_added",
            key: `project_added:${project._id}:${member._id}:${Date.now()}`, // re-adding after removal notifies again
            vars: { memberName: member.name, projectName: project.name, role, addedBy },
        },
    });
};

// Workflow C: task submitted -> project lead
export const notifyTaskSubmitted = async ({ task, project, submission, submitterId }) => {
    const submitter = (await User.findById(submitterId).select("name"))?.name || "A team member";
    const leadId = project.lead;
    const inApp = `${submitter} submitted "${task.title}" for review`;
    if (leadId.toString() === submitterId.toString()) return { duplicate: false }; // lead submitted their own task
    return notify({
        userId: leadId, project: project._id, task: task._id, type: "submission", message: inApp,
        whatsapp: {
            type: "task_submitted",
            key: `task_submitted:${submission._id}:${leadId}`, // one message per submission
            submission: submission._id,
            vars: { projectName: project.name, taskTitle: task.title, submitterName: submitter, link: taskLink(task._id) },
        },
    });
};
