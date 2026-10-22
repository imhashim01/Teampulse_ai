import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { ipRateLimit } from "../services/whatsappVerification.js";
import {
    getWhatsAppStatus, startVerification, resendVerification, confirmVerification, removeWhatsApp,
    verifyWebhook, receiveWebhook,
} from "../controllers/whatsappController.js";

const router = express.Router();
const sendLimit = ipRateLimit({ name: "wa-send", windowMs: 15 * 60 * 1000, max: 10 });
const verifyLimit = ipRateLimit({ name: "wa-verify", windowMs: 15 * 60 * 1000, max: 30 });

// Number verification (logged-in user)
router.get("/user/whatsapp", verifyToken, getWhatsAppStatus);
router.post("/user/whatsapp/start", sendLimit, verifyToken, startVerification);
router.post("/user/whatsapp/resend", sendLimit, verifyToken, resendVerification);
router.post("/user/whatsapp/verify", verifyLimit, verifyToken, confirmVerification);
router.delete("/user/whatsapp", verifyToken, removeWhatsApp);

// Meta webhook (public; POST bodies are signature-checked)
router.get("/webhooks/whatsapp", verifyWebhook);
router.post("/webhooks/whatsapp", receiveWebhook);

export default router;
