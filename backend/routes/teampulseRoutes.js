import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { getDashboard } from "../controllers/dashboardController.js";
import {
    listNotifications, unreadCount, markRead, markAllRead, listMyDeliveries, runMyReminders, cronReminders, listRisks,
} from "../controllers/notificationController.js";
import { updateSettings, searchUsers } from "../controllers/userController.js";

const router = express.Router();

router.get("/dashboard", verifyToken, getDashboard);

router.get("/notifications", verifyToken, listNotifications);
router.get("/notifications/unread-count", verifyToken, unreadCount);
router.patch("/notifications/read-all", verifyToken, markAllRead);
router.patch("/notifications/:id/read", verifyToken, markRead);

router.get("/deliveries", verifyToken, listMyDeliveries);
router.post("/risks", verifyToken, listRisks);

router.post("/jobs/reminders/run", verifyToken, runMyReminders);
router.post("/jobs/reminders", cronReminders);
router.get("/jobs/reminders", cronReminders); // Vercel Cron sends GET with Authorization: Bearer CRON_SECRET

router.patch("/user/settings", verifyToken, updateSettings);
router.get("/users/search", verifyToken, searchUsers);

export default router;
