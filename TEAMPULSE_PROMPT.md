# TeamPulse AI: Build the Hackathon MVP on This Codebase

You are a senior MERN developer and product designer. Work directly in this repo: inspect it, edit files, run it and test it. Do not just explain.

**HARD DEADLINE: the demo must be working by 1:15 PM today (about 2.5 hours).** A small app where every button works beats a big app that is half built. Follow the build order in section 7 and do not move on until the current step works.

---

## 1. What already exists (verified, do not rediscover)

**Backend** (`backend/`, Express + Mongoose, ES modules, `npm run dev` uses nodemon)
- `index.js` mounts `/api/auth` (authRoutes) and `/api/user` (profilePictureRoutes). CORS is **hardcoded** to `https://acms-4b13.vercel.app`.
- Auth: JWT in an httpOnly cookie named `token`. `middleware/verifyToken.js` sets `req.userId`.
- `models/UserModel.js`: email, password, name, lastLogin, isVerified, reset and verification tokens, profilePicture. **There is no phone field and no role.**
- `controllers/authController.js`: signup, verifyEmail, login, logout, forgotPassword, resetPassword, checkAuth. Email goes through Mailtrap (`mailtrap/`).
- Cloudinary + multer upload exist (`db/connectCloudinary.js`, `utils/fileUploader.js`). Reuse them for attachments if needed.
- `vercel.json` deploys the backend serverless on Vercel.
- Installed: express, mongoose, jsonwebtoken, bcryptjs, cookie-parser, cors, dotenv, multer, cloudinary, mailtrap, nodemailer.

**Frontend** (`frontend/`, React 19 + Vite + Tailwind + Zustand + axios + react-router-dom 7)
- `store/authStore.js` uses `VITE_BACKEND_URL` and `axios.defaults.withCredentials = true`.
- `App.jsx` has `ProtectedRoute` (requires `isAuthenticated` and `user.isVerified`) and `RedirectAuthenticatedUser`. Protected pages are nested under `LandingPage` as the layout.
- Installed: lucide-react, @heroicons/react, framer-motion, recharts, react-hot-toast, react-toastify, classnames, react-dropzone.
- **The current UI is a dark navy gradient with floating blurred shapes. It must be replaced with a light theme (section 5).**

**Do not change:** auth logic, the cookie/JWT flow, auth API routes, or the authStore functions. Restyling auth pages is fine; changing how they work is not.

---

## 2. Cleanup first (about 10 minutes)

1. Run `git add -A && git commit -m "backup before TeamPulse"` so everything can be restored.
2. **Delete** the pages left over from the old project that have nothing to do with TeamPulse:
   - `frontend/src/pages/a.jsx`
   - `frontend/src/pages/Inventory.jsx`
   - `frontend/src/pages/SalesReport.jsx`
   - `frontend/src/pages/FinancePage.jsx`
   - `frontend/src/pages/MessagePage.jsx`
   - `frontend/src/components/FloatingShapes.jsx` (after removing its usage in `App.jsx`)
   - `backend/routes/companyRoutes.js` (not mounted, and it uses a `company` field that does not exist)
3. Remove their imports, routes and sidebar or navbar links. Grep for any remaining references.
4. **Rewrite for TeamPulse** (keep the file if useful, replace the content): `DashboardPage.jsx`, `NotificationPage.jsx`, `Settings.jsx` (phone number + WhatsApp opt-in), `HomePage.jsx` (a simple light landing page for TeamPulse AI), `LandingPage.jsx` (the app layout shell), `SideBar.jsx` and `Navbar.jsx`.
5. **Keep and restyle only:** LoginPage, SignUpPage, EmailVerificationPage, ForgotPasswordPage, ResetPasswordPage, ProfilePage, plus `Input.jsx`, `LoadingSpinner.jsx` and `PasswordStrengthMeter.jsx`.
6. Before deleting anything not on this list, ask me first.

---

## 3. Small required fixes to existing code

- **CORS:** read allowed origins from `CLIENT_URL` in `.env` (comma-separated) and always allow `http://localhost:5173` in development. Keep `credentials: true`.
- **User model:** add optional `phone` (stored in E.164 format, e.g. `+923001234567`) and `whatsappOptIn` (Boolean, default false). Do not touch the other fields.
- **Email verification blocks the demo:** do not remove it. Add a seed script (section 6) that creates already-verified demo users so we never wait for emails on stage.
- Never print or commit the contents of `.env` files.

---

## 4. Features to build (in this exact priority)

### P1: Core (must work end to end)

**Projects**
- Any logged-in user can create a project and becomes its **lead**. Roles are **per project** (lead or member), not global, so do not add a global role to User.
- Fields: name, description, start date, target date, status (Planning, Active, On Hold, Completed), lead, members.
- The lead adds members by searching for **existing registered users by email**. No invitation system.

**Tasks**
- The lead creates tasks: title, description/expected outcome, assignees (project members only, validated on the backend), priority (Low, Medium, High, Critical), deadline (date + time), submission instructions, optional link.
- Status flow: To Do → In Progress → Submitted for Review → (Revision Required ↺) → Completed, plus Blocked at any point.
- Members may set only In Progress or Blocked, and submit. Only the lead may approve, request revisions or mark Completed.

**Submission and review**
- A member submits a summary + a link (optional Cloudinary file only if fast to add). The task moves to Submitted for Review, never straight to Completed.
- The lead approves (→ Completed) or requests revisions with a comment (→ Revision Required). Each action creates an in-app notification and an activity event.

**Dashboard (real database numbers only, nothing hardcoded)**
- Lead view: active projects, total, completed, in-progress and overdue tasks, submissions waiting for review, blocked tasks, at-risk tasks, upcoming deadlines, recent activity.
- Member view: my tasks, due soon, overdue, revision requests, recent notifications.

**In-app notifications and activity feed:** a bell with an unread count, a notifications page, mark as read, and a per-project activity feed generated only from real actions.

**Authorization (enforce on the backend):** create one `requireProjectMember` middleware and one `requireProjectLead` middleware and use them on every project/task route. Changing an ID in the URL must return 403 or 404.

### P2: Differentiators

**Check-ins:** a quick form per task with fields for what I did, what's next, blocked? (yes/no + what help I need), progress %, and a note. Store each check-in with its task and user. Each check-in updates the task's `lastMeaningfulUpdateAt`.

**"Ji Sir" Detector (the signature feature). This is the judges' wow moment, so make it look great.**

*The idea:* people tell the lead "Ji sir, ho jayega" or "almost done" while the task has not moved. TeamPulse compares **what people report** with **what the records show** and warns the lead early, so the lead can help. Framing: **support, not surveillance.**

1. **Rule engine first (deterministic, always works):** compute these signals per task: reported progress %, days since `lastMeaningfulUpdateAt`, hours to deadline, number of check-ins with progress unchanged, explicit blocked flag, number of revision rounds.
   - **Confirmed blocker:** the member said they are blocked.
   - **Potential hidden blocker:** reported progress ≥ 70% AND no meaningful update for ≥ 2 days AND deadline ≤ 3 days away.
   - **Stalled task:** In Progress, with progress unchanged across ≥ 2 check-ins.
   - **Deadline at risk:** progress is low relative to the time left.
   - **Workload strain:** only when the member *explicitly* says they are overloaded or need help. Never infer emotions, burnout or mental state, and never use late-night activity as evidence.
   - **Insufficient evidence:** too little data. This must not get a High label.
2. **AI layer:** send only the computed signals + check-in text to the LLM through one server-side service, `services/aiService.js`. It must return validated JSON:
   `{ category, level: "Low"|"Medium"|"High", explanation, evidence: [..only real facts from the input..], deadlineRisk, suggestedAction, supportiveMessage }`.
   The prompt must forbid inventing facts and require Roman Urdu/English mixed supportive messages that are friendly and non-blaming, e.g. *"Ali, payment API wala kaam tricky lag raha hai, 15 minute call kar lein? Saath mein dekh lete hain."*
3. **Provider:** use Google Gemini (`GEMINI_API_KEY`, model from `AI_MODEL`, default `gemini-2.5-flash`) through plain `fetch`, behind a small adapter so Groq/OpenAI could be swapped in. Use a 15 s timeout. If there is no key, an error or invalid JSON, fall back to the rule-engine output labeled **"Rule-based"**. Label AI output **"AI-assisted"**.
4. **Persist** each `RiskAssessment` with an `inputHash` and re-call the AI only when the inputs change or the lead clicks "Re-analyze".
5. **Risk page (lead only):** risk cards sorted by level showing the member, task, deadline, a level badge, an explanation, the evidence list (each item links to the task/check-in), the suggested action, an editable supportive message, **Copy** and **Send on WhatsApp** (sent only after the lead clicks), and the last analyzed time. The lead always approves before anything goes to a member.

**WhatsApp notifications**
- One `services/whatsappService.js` using the WhatsApp Cloud API (`https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`, Bearer `WHATSAPP_TOKEN`).
- **Mock mode when credentials are missing:** log the message and save it as `Simulated`, never as `Sent`.
- `NotificationDelivery` model: event, recipient, channel, status (Pending, Sent, Failed, Simulated), error, `dedupeKey` (unique index, e.g. `assigned:{taskId}:{userId}`), attempts. Up to 2 retries on 5xx errors.
- Triggers: task assigned → member; submission received → lead; revision requested → member; deadline reminder → member; overdue → member + lead.
- Note: Meta's test number can only send approved templates (e.g. `hello_world`) to verified numbers outside the 24-hour window. Support a template mode via `WHATSAPP_TEMPLATE_NAME` and plain text otherwise, and document this.
- Add a **"Notification log"** section (lead view) showing each delivery and its status, so judges can see it working even in mock mode.

**Deadline reminders**
- The backend runs serverless on Vercel, so **in-memory timers are not reliable**. Create `POST /api/jobs/reminders` protected by a `CRON_SECRET` header. It finds tasks due within 24 h and overdue tasks (not Completed), sends via the notification service, and dedupes with `dedupeKey` (`reminder24h:{taskId}:{userId}`, `overdue:{taskId}:{userId}`).
- Add a **"Run reminders now"** button for the lead (demo) that calls the same logic. Running it twice must not create duplicates.
- Document how to schedule it with Vercel Cron or cron-job.org.

### P3: Skip unless everything above works
GitHub commit signals, rich attachments, analytics charts. **Never fabricate GitHub data.**

---

## 5. Design: light, minimal, aesthetic (never a dark theme)

- **Light theme only.** Remove the dark navy gradient and floating shapes from `App.jsx` and every page. No dark mode.
- Background a warm off-white (`#FAFAF7` or similar), white cards, soft 1px borders (`#ECEAE4`), very soft shadows, 12–16px radius.
- **One accent color** (e.g. a calm indigo `#4F46E5` or deep teal `#0F766E`) used sparingly for primary buttons and active states. Status colors are muted pastels: green for done, amber for at-risk, red for overdue/high, slate for to-do.
- Typography: **Inter** or **Plus Jakarta Sans** from Google Fonts, a clear hierarchy, generous whitespace, text near-black `#1C1C1E` and secondary text `#6B6B6B`.
- Layout: a slim left sidebar (Dashboard, Projects, My Tasks, Ji Sir Detector, Notifications, Settings) + a top bar with search, a bell and an avatar. Responsive, with the sidebar collapsing to a drawer on mobile.
- Components: status and priority pills, deadline chips ("Due in 5h" in red when < 24h), progress bars, avatar stacks, nice empty states with a one-line hint and an action button, skeleton loaders, react-hot-toast only (remove react-toastify usage if it is not needed), and confirm dialogs for approve/revision.
- The auth pages get the same light style: centered white card, logo "TeamPulse AI", accent button.
- Subtle motion only (framer-motion fade/slide ≤ 200 ms). No gradients-everywhere, glassmorphism, neon or giant hero sections.
- The **Ji Sir Detector** page should be the most polished screen: a header line *"In Pakistan, nobody tells their boss they're stuck. TeamPulse hears what they don't say."*, then the risk cards.

---

## 6. Demo data (essential for judging)

Create `backend/scripts/seed.js` (`npm run seed`) that **only adds** demo data (never wipes real users) and creates:
- Verified users: `lead@teampulse.demo` (Usman, Team Lead), plus members Ali, Sara and Bilal, all with password `Demo@1234` (hashed with bcryptjs like the existing signup).
- Project "Client Website Redesign" (Active) with these 4 members.
- About 8 tasks with real dates relative to *now*, including:
  - **The Ji Sir case:** Ali, "Payment API integration", deadline in 2 days, two check-ins saying "almost done, 90%" / "ji bas thora sa reh gaya", no meaningful update for 3 days → should be detected as **Potential hidden blocker, High**.
  - **Insufficient-evidence case:** Bilal, a task created today with no check-ins → must **not** be High.
  - Sara: a task Submitted for Review (for the review demo), one Completed and one overdue.
- Mark seed records with `isDemo: true` so they can be cleaned up later.

---

## 7. Build order (check each step works before the next)

1. Inspect the files listed above (quickly), commit a backup, do the cleanup and fixes. **Check: login/signup still work.**
2. Light theme layout shell + sidebar + restyled auth pages.
3. Models + routes + authorization middleware: Project, Task, Submission, CheckIn, Notification, ActivityEvent, RiskAssessment, NotificationDelivery. Follow the existing route/controller style (`routes/` + `controllers/`, ES modules, `{ success, message, data }` style responses).
4. Seed script and run it.
5. Projects pages → tasks → submission/review → dashboard → notifications.
6. Check-ins → Ji Sir Detector (rules, then AI) → risk page.
7. WhatsApp service (mock first) → reminders endpoint + button → notification log.
8. Polish, empty states, mobile check.

---

## 8. Testing before you say done

Actually run these and report the results honestly:
1. Lead creates a project, adds a member, assigns a task; the member sees it.
2. Member submits; the lead gets a notification; approve works and request-revision works.
3. Seeded Ali task → analysis says Potential hidden blocker (High) with real evidence + a supportive message; Bilal's task is not High.
4. With `GEMINI_API_KEY` removed → the app still works and shows a "Rule-based" result.
5. Reminders run twice → no duplicate deliveries.
6. WhatsApp with no credentials → status `Simulated`, not `Sent`.
7. A member calling a lead-only endpoint, or another team's project ID → 403/404.
8. `npm run build` in frontend and `npm run lint` pass; the backend starts without errors.

Fix what fails. Never claim something was tested if it was not run.

---

## 9. Environment variables (add to `.env.example`, placeholders only)

Backend: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL=http://localhost:5173`, `GEMINI_API_KEY=`, `AI_MODEL=gemini-2.5-flash`, `WHATSAPP_TOKEN=`, `WHATSAPP_PHONE_NUMBER_ID=`, `WHATSAPP_TEMPLATE_NAME=`, `CRON_SECRET=change-me` (plus the existing Mailtrap/Cloudinary ones).
Frontend: `VITE_BACKEND_URL=http://localhost:5000`.

---

## 10. When finished, give me

1. What was built and the files created/changed/deleted.
2. New models and API endpoints.
3. Which tests you actually ran and their results.
4. What is still broken or missing.
5. Setup steps: env vars, `npm run seed`, getting a Gemini key, the WhatsApp Cloud API test number setup, and reminder scheduling.
6. **A 2-minute demo script:** "Usman leads a 4-person team at a small Lahore software house. Ali keeps saying 'ji sir, almost done'…" → show the dashboard → Ji Sir Detector flags Ali → copy/send the supportive message → Sara's submission review → notification log → run reminders.
