// companyRoutes.js
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { User } from "../models/UserModel.js";

const router = express.Router();

// Get company data
router.get("/company-data", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user.company);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Update company data
router.put("/update-company", verifyToken, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: { company: req.body } },
            { new: true }
        );
        res.status(200).json(user.company);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;