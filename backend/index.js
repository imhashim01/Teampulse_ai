import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./db/connectDB.js";
import connectCloudinary from "./db/connectCloudinary.js";
import authRoutes from "./routes/authRoutes.js";
import profilePictureRoutes from "./routes/profilePictureRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "https://acms-4b13.vercel.app",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Connect to databases
connectDB();
connectCloudinary();

// Routes
app.use("/api/auth", authRoutes);
// app.use("/api", imageRoutes); // Use image routes
app.use("/api/user", profilePictureRoutes);

// Basic route
app.get("/", (req, res) => {
    res.send("API is running...");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
