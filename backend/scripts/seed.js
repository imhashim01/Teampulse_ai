// Demo data for TeamPulse AI. Run: npm run seed
// - Only touches records marked isDemo: true. Real users are never modified or deleted.
// - Re-running refreshes the demo project so dates stay relative to "now".
// - Optional DEMO_WHATSAPP_NUMBER (E.164, a number you control) is set on all demo users and marked
//   verified, so demo notifications can reach it without the OTP step. Use only your own number.
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";
import { ensureMongoDns } from "../utils/mongoDns.js";
import { User } from "../models/UserModel.js";
import { Project } from "../models/ProjectModel.js";
import { Task } from "../models/TaskModel.js";
import { Submission } from "../models/SubmissionModel.js";
import { CheckIn } from "../models/CheckInModel.js";
import { Notification } from "../models/NotificationModel.js";
import { ActivityEvent } from "../models/ActivityEventModel.js";
import { RiskAssessment } from "../models/RiskAssessmentModel.js";
import { NotificationDelivery } from "../models/NotificationDeliveryModel.js";

dotenv.config();

const PASSWORD = "Demo@1234";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const at = (offsetMs) => new Date(now + offsetMs);

const DEMO_USERS = [
    { key: "usman", email: "lead@teampulse.demo", name: "Usman Tariq" },
    { key: "ali", email: "ali@teampulse.demo", name: "Ali Raza" },
    { key: "sara", email: "sara@teampulse.demo", name: "Sara Khan" },
    { key: "bilal", email: "bilal@teampulse.demo", name: "Bilal Ahmed" },
];

const run = async () => {
    await ensureMongoDns();
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // ---- Users (upsert demo users only) ----
    const hashed = await bcryptjs.hash(PASSWORD, 10);
    const phone = process.env.DEMO_WHATSAPP_NUMBER || undefined;
    const u = {};
    for (const d of DEMO_USERS) {
        let user = await User.findOne({ email: d.email });
        if (user && !user.isDemo) {
            console.log(`Skipping ${d.email}: a real (non-demo) user already uses this email`);
            continue;
        }
        if (!user) user = new User({ email: d.email });
        Object.assign(user, { name: d.name, password: hashed, isVerified: true, isDemo: true, phone, whatsappOptIn: Boolean(phone), whatsappVerified: Boolean(phone) });
        await user.save();
        u[d.key] = user;
    }
    if (Object.keys(u).length < 4) throw new Error("Could not create all demo users");

    // ---- Remove previous demo project data ----
    const oldProjects = await Project.find({ isDemo: true }).select("_id");
    const oldIds = oldProjects.map((p) => p._id);
    const oldTasks = (await Task.find({ project: { $in: oldIds } }).select("_id")).map((t) => t._id);
    await Promise.all([
        Task.deleteMany({ project: { $in: oldIds } }),
        Submission.deleteMany({ $or: [{ isDemo: true }, { project: { $in: oldIds } }] }),
        CheckIn.deleteMany({ $or: [{ isDemo: true }, { project: { $in: oldIds } }] }),
        ActivityEvent.deleteMany({ $or: [{ isDemo: true }, { project: { $in: oldIds } }] }),
        Notification.deleteMany({ $or: [{ isDemo: true }, { project: { $in: oldIds } }] }),
        RiskAssessment.deleteMany({ task: { $in: oldTasks } }),
        NotificationDelivery.deleteMany({ $or: [{ isDemo: true }, { project: { $in: oldIds } }] }),
    ]);
    await Project.deleteMany({ _id: { $in: oldIds } });

    // ---- Project ----
    const project = await Project.create({
        name: "Client Website Redesign",
        description: "Full redesign of the client's e-commerce website: new homepage, checkout with local payments, and analytics.",
        startDate: at(-14 * DAY),
        targetDate: at(21 * DAY),
        status: "Active",
        lead: u.usman._id,
        members: [u.usman._id, u.ali._id, u.sara._id, u.bilal._id],
        isDemo: true,
    });
    const P = project._id;

    // Mongoose sets timestamps on create; we override createdAt explicitly with timestamps: false.
    const mkTask = (data) => Task.create([{ project: P, createdBy: u.usman._id, isDemo: true, ...data }], { timestamps: false }).then((r) => r[0]);
    const mkCheckIn = (data) => CheckIn.create([{ project: P, isDemo: true, ...data, updatedAt: data.createdAt }], { timestamps: false }).then((r) => r[0]);
    const mkActivity = (data) => ActivityEvent.create([{ project: P, isDemo: true, ...data, updatedAt: data.createdAt }], { timestamps: false });

    // 1) The hidden-blocker case: Ali says "almost done" but nothing has moved for 3 days
    const payment = await mkTask({
        title: "Payment API integration",
        description: "Integrate JazzCash + card payments in checkout. Expected outcome: successful sandbox payment end to end with order confirmation.",
        assignees: [u.ali._id], priority: "Critical", status: "In Progress", progress: 90,
        deadline: at(2 * DAY), submissionInstructions: "Share the PR link and a screen recording of a sandbox payment.",
        createdAt: at(-8 * DAY), updatedAt: at(-1 * DAY), lastMeaningfulUpdateAt: at(-3 * DAY),
    });
    await mkCheckIn({ task: payment._id, user: u.ali._id, progress: 40, didToday: "Set up JazzCash sandbox account and keys", nextStep: "Build the payment endpoint", note: "Started", createdAt: at(-6 * DAY) });
    await mkCheckIn({ task: payment._id, user: u.ali._id, progress: 90, didToday: "Payment endpoint mostly working", nextStep: "Finish callback handling", note: "almost done, 90%", createdAt: at(-3 * DAY) });
    await mkCheckIn({ task: payment._id, user: u.ali._id, progress: 90, didToday: "Working on it", nextStep: "Finish it", note: "ji bas thora sa reh gaya", createdAt: at(-1 * DAY) });

    // 2) Insufficient evidence: Bilal, created today, no check-ins
    const analytics = await mkTask({
        title: "Set up analytics events",
        description: "Add GA4 events for add-to-cart, checkout start and purchase.",
        assignees: [u.bilal._id], priority: "Medium", status: "To Do",
        deadline: at(5 * DAY), createdAt: at(-1 * HOUR), updatedAt: at(-1 * HOUR), lastMeaningfulUpdateAt: at(-1 * HOUR),
    });

    // 3) Sara: submitted for review
    const hero = await mkTask({
        title: "Homepage hero redesign",
        description: "New hero section with seasonal banner and clear CTA, matching the approved Figma.",
        assignees: [u.sara._id], priority: "High", status: "Submitted for Review", progress: 100,
        deadline: at(1 * DAY), submissionInstructions: "Share the preview URL and Figma comparison screenshots.",
        createdAt: at(-6 * DAY), updatedAt: at(-3 * HOUR), lastMeaningfulUpdateAt: at(-3 * HOUR),
    });
    await mkCheckIn({ task: hero._id, user: u.sara._id, progress: 60, didToday: "Built layout and responsive breakpoints", nextStep: "Animations and CTA states", createdAt: at(-3 * DAY) });
    const heroSub = await Submission.create({
        task: hero._id, project: P, submittedBy: u.sara._id, isDemo: true,
        summary: "Hero section done: responsive down to 360px, CTA hover/focus states, banner image lazy-loaded. Lighthouse performance 94.",
        link: "https://example.com/preview/hero",
    });

    // 4) Sara: completed
    const guide = await mkTask({
        title: "Brand style guide",
        description: "Colors, typography and component rules for the redesign.",
        assignees: [u.sara._id], priority: "Medium", status: "Completed", progress: 100,
        deadline: at(-3 * DAY), completedAt: at(-4 * DAY),
        createdAt: at(-12 * DAY), updatedAt: at(-4 * DAY), lastMeaningfulUpdateAt: at(-4 * DAY),
    });
    await Submission.create({
        task: guide._id, project: P, submittedBy: u.sara._id, isDemo: true, status: "Approved",
        summary: "Style guide published in Figma with tokens exported.", link: "https://example.com/figma/style-guide",
        reviewedBy: u.usman._id, reviewedAt: at(-4 * DAY), reviewComment: "Looks great",
    });

    // 5) Sara: overdue
    const contact = await mkTask({
        title: "Contact form validation",
        description: "Client-side + server-side validation for the contact form, including Pakistani phone numbers.",
        assignees: [u.sara._id], priority: "Medium", status: "In Progress", progress: 50,
        deadline: at(-1 * DAY), createdAt: at(-7 * DAY), updatedAt: at(-3 * DAY), lastMeaningfulUpdateAt: at(-3 * DAY),
    });
    await mkCheckIn({ task: contact._id, user: u.sara._id, progress: 50, didToday: "Client-side validation done", nextStep: "Server-side checks", createdAt: at(-3 * DAY) });

    // 6) Ali: completed earlier
    await mkTask({
        title: "Product listing page API",
        description: "Paginated products endpoint with filters.",
        assignees: [u.ali._id], priority: "High", status: "Completed", progress: 100,
        deadline: at(-5 * DAY), completedAt: at(-6 * DAY),
        createdAt: at(-13 * DAY), updatedAt: at(-6 * DAY), lastMeaningfulUpdateAt: at(-6 * DAY),
    });

    // 7) Bilal: due within 24h, on track (triggers a 24h reminder)
    const navbar = await mkTask({
        title: "Mobile responsive navbar",
        description: "Hamburger menu and sticky header for mobile.",
        assignees: [u.bilal._id], priority: "High", status: "In Progress", progress: 80,
        deadline: at(18 * HOUR), createdAt: at(-4 * DAY), updatedAt: at(-5 * HOUR), lastMeaningfulUpdateAt: at(-5 * HOUR),
    });
    await mkCheckIn({ task: navbar._id, user: u.bilal._id, progress: 55, didToday: "Hamburger menu working", nextStep: "Sticky header", createdAt: at(-2 * DAY) });
    await mkCheckIn({ task: navbar._id, user: u.bilal._id, progress: 80, didToday: "Sticky header done, testing on iPhone SE", nextStep: "Fix Safari overflow bug", createdAt: at(-5 * HOUR) });

    // 8) Ali: new task, no check-ins yet
    await mkTask({
        title: "SEO meta tags",
        description: "Open Graph and meta descriptions for all main pages.",
        assignees: [u.ali._id], priority: "Low", status: "To Do",
        deadline: at(6 * DAY), createdAt: at(-1 * DAY), updatedAt: at(-1 * DAY), lastMeaningfulUpdateAt: at(-1 * DAY),
    });

    // ---- Activity feed + notifications from the actions above ----
    await mkActivity({ actor: u.usman._id, type: "project_created", message: `created the project "${project.name}"`, createdAt: at(-14 * DAY) });
    await mkActivity({ actor: u.usman._id, type: "task_created", task: payment._id, message: `created task "${payment.title}"`, createdAt: at(-8 * DAY) });
    await mkActivity({ actor: u.sara._id, type: "approved", task: guide._id, message: `submitted "${guide.title}" and it was approved`, createdAt: at(-4 * DAY) });
    await mkActivity({ actor: u.ali._id, type: "checkin", task: payment._id, message: `checked in on "${payment.title}" (90%)`, createdAt: at(-3 * DAY) });
    await mkActivity({ actor: u.ali._id, type: "checkin", task: payment._id, message: `checked in on "${payment.title}" (90%)`, createdAt: at(-1 * DAY) });
    await mkActivity({ actor: u.bilal._id, type: "checkin", task: navbar._id, message: `checked in on "${navbar.title}" (80%)`, createdAt: at(-5 * HOUR) });
    await mkActivity({ actor: u.usman._id, type: "task_created", task: analytics._id, message: `created task "${analytics.title}"`, createdAt: at(-1 * HOUR) });
    await mkActivity({ actor: u.sara._id, type: "submitted", task: hero._id, message: `submitted "${hero.title}" for review`, createdAt: at(-3 * HOUR) });

    await Notification.create([
        { user: u.usman._id, project: P, task: hero._id, type: "submission", message: `Sara Khan submitted "${hero.title}" for review`, isDemo: true },
        { user: u.bilal._id, project: P, task: analytics._id, type: "assigned", message: `New task assigned: "${analytics.title}"`, isDemo: true },
        { user: u.ali._id, project: P, task: payment._id, type: "assigned", message: `New task assigned: "${payment.title}"`, isDemo: true, read: true },
    ]);

    console.log(`Seeded project "${project.name}" with 8 tasks (submission ${heroSub._id}).`);
    console.log(`Log in as lead@teampulse.demo / ${PASSWORD} (members: ali@, sara@, bilal@teampulse.demo)`);
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error("Seed failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
});
