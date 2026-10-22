import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireProjectMember, requireProjectLead } from "../middleware/projectAuth.js";
import {
    myTasks, getTask, updateTask, updateStatus, submitTask, reviewTask, addCheckIn, reanalyzeTask, sendNudge,
} from "../controllers/taskController.js";

const router = express.Router();
const member = [verifyToken, requireProjectMember];
const lead = [verifyToken, requireProjectMember, requireProjectLead];

router.get("/mine", verifyToken, myTasks);
router.get("/:taskId", ...member, getTask);
router.patch("/:taskId", ...lead, updateTask);
router.patch("/:taskId/status", ...member, updateStatus);
router.post("/:taskId/submissions", ...member, submitTask);
router.post("/:taskId/review", ...lead, reviewTask);
router.post("/:taskId/checkins", ...member, addCheckIn);
router.post("/:taskId/risk", ...lead, reanalyzeTask);
router.post("/:taskId/nudge", ...lead, sendNudge);

export default router;
