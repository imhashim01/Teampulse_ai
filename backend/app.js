// Express app (no DB connection or listen) so it can be imported by tests.
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import profilePictureRoutes from "./routes/profilePictureRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import teampulseRoutes from "./routes/teampulseRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";

const app = express();

// Allowed origins come from CLIENT_URL (comma-separated). localhost:5173 is always allowed outside production.
const allowedOrigins = (process.env.CLIENT_URL || "")
    .split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
if (process.env.NODE_ENV !== "production") allowedOrigins.push("http://localhost:5173", "http://127.0.0.1:5173");

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
}));
// Keep the raw body for webhook signature verification (Meta signs the exact bytes)
app.use(express.json({
    verify: (req, res, buf) => { if (req.originalUrl.startsWith("/api/webhooks/")) req.rawBody = buf; },
}));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", profilePictureRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api", whatsappRoutes);
app.use("/api", teampulseRoutes);

// Basic route
app.get("/", (req, res) => {
    res.send("API is running...");
});

export default app;
