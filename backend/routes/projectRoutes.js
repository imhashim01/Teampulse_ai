import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireProjectMember, requireProjectLead } from "../middleware/projectAuth.js";
import {
    listProjects, createProject, getProject, updateProject, addMember, removeMember,
    listProjectTasks, createTask, listActivity, listDeliveries, runProjectReminders,
} from "../controllers/projectController.js";

const router = express.Router();
const member = [verifyToken, requireProjectMember];
const lead = [verifyToken, requireProjectMember, requireProjectLead];

router.get("/", verifyToken, listProjects);
router.post("/", verifyToken, createProject);

router.get("/:projectId", ...member, getProject);
router.patch("/:projectId", ...lead, updateProject);
router.post("/:projectId/members", ...lead, addMember);
router.delete("/:projectId/members/:userId", ...lead, removeMember);
router.get("/:projectId/tasks", ...member, listProjectTasks);
router.post("/:projectId/tasks", ...lead, createTask);
router.get("/:projectId/activity", ...member, listActivity);
router.get("/:projectId/deliveries", ...lead, listDeliveries);
router.post("/:projectId/reminders/run", ...lead, runProjectReminders);

export default router;
