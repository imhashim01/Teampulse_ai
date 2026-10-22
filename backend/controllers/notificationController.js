import mongoose from "mongoose";
import { Notification } from "../models/NotificationModel.js";
import { NotificationDelivery } from "../models/NotificationDeliveryModel.js";
import { leadProjectIds, runReminders } from "../services/reminderService.js";
import { assessForLead } from "../services/riskService.js";
import { isWhatsAppConfigured } from "../services/whatsappService.js";
import { isAIConfigured } from "../services/aiService.js";

export const listNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.userId })
            .populate("task", "title").populate("project", "name").sort({ createdAt: -1 }).limit(100);
        const unread = await Notification.countDocuments({ user: req.userId, read: false });
        res.status(200).json({ success: true, data: { notifications, unread } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const unreadCount = async (req, res) => {
    try {
        const unread = await Notification.countDocuments({ user: req.userId, read: false });
        res.status(200).json({ success: true, data: { unread } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markRead = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
        const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { read: true }, { new: true });
        if (!n) return res.status(404).json({ success: false, message: "Not found" });
        res.status(200).json({ success: true, data: n });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.userId, read: false }, { read: true });
        res.status(200).json({ success: true, message: "All marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Notification log for every project the user leads
export const listMyDeliveries = async (req, res) => {
    try {
        const projectIds = await leadProjectIds(req.userId);
        const deliveries = await NotificationDelivery.find({ project: { $in: projectIds } })
            .populate("recipient", "name email").populate("task", "title").populate("project", "name")
            .sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ success: true, data: { deliveries, whatsappMode: isWhatsAppConfigured() ? (process.env.WHATSAPP_TEMPLATE_NAME ? "template" : "text") : "mock" } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Demo button: same logic as the cron endpoint, limited to the caller's projects
export const runMyReminders = async (req, res) => {
    try {
        const projectIds = await leadProjectIds(req.userId);
        if (!projectIds.length) return res.status(403).json({ success: false, message: "Only project leads can run reminders" });
        const summary = await runReminders({ projectIds });
        res.status(200).json({ success: true, message: `Reminders: ${summary.created} sent, ${summary.duplicatesSkipped} already sent earlier`, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cron endpoint: header x-cron-secret: <CRON_SECRET> (or Authorization: Bearer <CRON_SECRET> as sent by Vercel Cron)
export const cronReminders = async (req, res) => {
    const secret = process.env.CRON_SECRET;
    const given = req.get("x-cron-secret") || req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!secret || given !== secret) return res.status(401).json({ success: false, message: "Invalid cron secret" });
    try {
        const summary = await runReminders();
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listRisks = async (req, res) => {
    try {
        const projectIds = await leadProjectIds(req.userId);
        if (!projectIds.length) return res.status(403).json({ success: false, message: "Risk Radar is for project leads" });
        const risks = await assessForLead(req.userId, { force: req.body?.force === true });
        res.status(200).json({ success: true, data: { risks, aiConfigured: isAIConfigured() } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
