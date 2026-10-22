import { User } from "../models/UserModel.js";

// Accepts +923001234567, 923001234567 or 03001234567 (Pakistan local) and returns E.164, or null
export const toE164 = (raw) => {
    if (!raw) return null;
    let p = String(raw).replace(/[\s\-()]/g, "");
    if (/^03\d{9}$/.test(p)) p = "+92" + p.slice(1);
    else if (/^92\d{10}$/.test(p)) p = "+" + p;
    else if (/^00\d+$/.test(p)) p = "+" + p.slice(2);
    return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
};

export const updateSettings = async (req, res) => {
    try {
        const { phone, whatsappOptIn } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (phone !== undefined) {
            if (phone === "") user.phone = undefined;
            else {
                const e164 = toE164(phone);
                if (!e164) return res.status(400).json({ success: false, message: "Enter a valid phone number, e.g. +923001234567" });
                user.phone = e164;
            }
        }
        if (whatsappOptIn !== undefined) {
            if (whatsappOptIn && !user.phone) return res.status(400).json({ success: false, message: "Add a phone number before enabling WhatsApp" });
            user.whatsappOptIn = Boolean(whatsappOptIn);
        }
        await user.save();
        res.status(200).json({ success: true, message: "Settings saved", user: { ...user._doc, password: undefined } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
