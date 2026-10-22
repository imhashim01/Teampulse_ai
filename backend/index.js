import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./db/connectDB.js";
import connectCloudinary from "./db/connectCloudinary.js";
import authRoutes from "./routes/authRoutes.js";
import profilePictureRoutes from "./routes/profilePictureRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import teampulseRoutes from "./routes/teampulseRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Allowed origins come from CLIENT_URL (comma-separated). localhost:5173 is always allowed outside production.
const allowedOrigins = (process.env.CLIENT_URL || "")
    .split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
if (process.env.NODE_ENV !== "production") allowedOrigins.push("http://localhost:5173");

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
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
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api", teampulseRoutes);

// Basic route
app.get("/", (req, res) => {
    res.send("API is running...");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
