import "dotenv/config"; // must be first: loads .env before the modules below read it
import app from "./app.js";
import connectDB from "./db/connectDB.js";
import connectCloudinary from "./db/connectCloudinary.js";
import { runReminders } from "./services/reminderService.js";

const PORT = process.env.PORT || 5000;

// Connect to databases
connectDB();
connectCloudinary();

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Optional in-process reminder loop for a persistent server (local dev / VPS).
// Never used on Vercel serverless: there, use the cron endpoint (see WHATSAPP_SETUP.md).
// Safe alongside the cron job because every reminder is deduplicated in MongoDB.
const everyMin = Number(process.env.REMINDER_INPROCESS_INTERVAL_MINUTES || 0);
if (everyMin > 0 && !process.env.VERCEL) {
    setInterval(() => {
        runReminders().catch((error) => console.log("In-process reminder run failed:", error.message));
    }, everyMin * 60 * 1000).unref();
    console.log(`In-process reminders every ${everyMin} min`);
}

export default app;
