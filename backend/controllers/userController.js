import { User } from "../models/UserModel.js";
export { toE164 } from "../services/whatsappVerification.js";

const PREF_KEYS = ["projectAdded", "taskSubmitted", "deadlineReminders", "overdue", "taskUpdates"];

// Notification preferences. The phone number itself can only change through WhatsApp verification.
export const updateSettings = async (req, res) => {
    try {
        const { phone, whatsappOptIn, whatsappPrefs } = req.body;
        if (phone !== undefined) {
            return res.status(400).json({ success: false, code: "verification_required", message: "Use WhatsApp verification to add or change your number." });
        }
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (whatsappOptIn !== undefined) {
            if (whatsappOptIn && !(user.phone && user.whatsappVerified)) {
                return res.status(400).json({ success: false, code: "not_verified", message: "Verify your WhatsApp number before turning on WhatsApp notifications." });
            }
            user.whatsappOptIn = Boolean(whatsappOptIn);
        }
        if (whatsappPrefs && typeof whatsappPrefs === "object") {
            for (const k of PREF_KEYS) if (typeof whatsappPrefs[k] === "boolean") user.whatsappPrefs[k] = whatsappPrefs[k];
        }
        await user.save();
        res.status(200).json({ success: true, message: "Settings saved", user: { ...user._doc, password: undefined } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not save settings" });
    }
};

// Lead adds members by searching registered users by email
export const searchUsers = async (req, res) => {
    try {
        const q = String(req.query.email || "").trim().toLowerCase();
        if (q.length < 3) return res.status(200).json({ success: true, data: [] });
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const users = await User.find({ email: { $regex: "^" + escaped, $options: "i" } }).select("name email profilePicture").limit(5);
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
