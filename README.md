# TeamPulse AI

Project and task tracking for small teams, with **Risk Radar** that compares what people report with what the records show, so a lead can offer help before a deadline slips. Support, not surveillance.

- `backend/`: Express + Mongoose (ES modules), JWT cookie auth
- `frontend/`: React 19 + Vite + Tailwind + Zustand

## Setup

```bash
cd backend && npm install && cp .env.example .env   # fill MONGO_URI, JWT_SECRET, CRON_SECRET
cd ../frontend && npm install && cp .env.example .env
```

| Variable | Where | Notes |
|---|---|---|
| `MONGO_URI`, `JWT_SECRET` | backend | required |
| `CLIENT_URL` | backend | comma-separated allowed origins. `http://localhost:5173` is always allowed when `NODE_ENV` is not `production` |
| `GEMINI_API_KEY`, `AI_MODEL` | backend | optional. Without a key the detector runs in **Rule-based** mode |
| `WHATSAPP_*`, `APP_BASE_URL` | backend | optional. See WHATSAPP_SETUP.md. With `WHATSAPP_ENABLED=false` WhatsApp runs in dry-run mode |
| `CRON_SECRET` | backend | protects `POST /api/jobs/reminders` |
| `VITE_BACKEND_URL` | frontend | e.g. `http://localhost:5000` |

Run:

```bash
cd backend && npm run seed     # demo users + project (only touches isDemo records)
cd backend && npm run dev      # API on :5000
cd frontend && npm run dev     # app on :5173
```

Demo logins (password `Demo@1234`): `lead@teampulse.demo` (Usman, lead), `ali@`, `sara@`, `bilal@teampulse.demo`.
Optional: set `DEMO_WHATSAPP_NUMBER=+92...` (a number you control) before seeding; demo users get it as an already-verified WhatsApp number.

## Gemini key

1. Go to https://aistudio.google.com/apikey and create an API key.
2. Put it in `backend/.env` as `GEMINI_API_KEY=...` (model defaults to `gemini-2.5-flash`).
3. Restart the backend, open **Risk Radar** and click **Re-analyze team**. Cards show **AI-assisted**.

The AI only receives computed signals and check-in text, and must pick its evidence from a fixed list of fact IDs, so it cannot invent facts. Any timeout (15 s), error or invalid JSON falls back to the rule engine. Results are cached per task by an input hash, so the AI is only called again when the task's inputs change or the lead clicks Re-analyze. To use Groq/OpenAI instead, set `AI_PROVIDER=groq|openai`, `AI_API_KEY`, `AI_MODEL`.

## WhatsApp notifications

Number verification (OTP), project-added, task-submitted, deadline and overdue messages use the official Meta WhatsApp Cloud API. **See [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md)** for Meta configuration, templates, webhook, scheduling and troubleshooting. Without credentials the app runs in dry-run mode (deliveries logged as `Simulated`).

## Deadline reminders

`POST /api/jobs/reminders` with header `x-cron-secret: <CRON_SECRET>` (a `GET` with `Authorization: Bearer <CRON_SECRET>` also works). It sends 24 h reminders and overdue alerts (member + lead) and dedupes them with `reminder24h:{taskId}:{userId}` / `overdue:{taskId}:{userId}`, so running it repeatedly is safe. Leads also have a **Run reminders now** button.

- **Vercel Cron:** `backend/vercel.json` includes a daily cron (Hobby plans allow daily only). Set `CRON_SECRET` in the Vercel project; Vercel sends it as a Bearer token.
- **cron-job.org (hourly):** create a job hitting `https://<your-backend>/api/jobs/reminders`, method POST, header `x-cron-secret: <CRON_SECRET>`, every hour.

## API overview

All responses are `{ success, message?, data }`. Project and task routes go through `requireProjectMember` / `requireProjectLead`. Unknown IDs return 404 and other teams' IDs return 403.

- `GET/POST /api/projects`, `GET/PATCH /api/projects/:projectId`
- `POST /api/projects/:projectId/members` (lead, by email), `DELETE /api/projects/:projectId/members/:userId`
- `GET/POST /api/projects/:projectId/tasks`, `GET /api/projects/:projectId/activity`, `GET /api/projects/:projectId/deliveries`, `POST /api/projects/:projectId/reminders/run`
- `GET /api/tasks/mine`, `GET/PATCH /api/tasks/:taskId`, `PATCH /api/tasks/:taskId/status`
- `POST /api/tasks/:taskId/submissions` (assignee), `POST /api/tasks/:taskId/review` (lead: approve | revision)
- `POST /api/tasks/:taskId/checkins` (assignee), `POST /api/tasks/:taskId/risk` (lead re-analyze), `POST /api/tasks/:taskId/nudge` (lead sends approved WhatsApp message)
- `GET /api/dashboard`, `POST /api/risks` (lead), `GET /api/deliveries` (lead)
- `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- `POST /api/jobs/reminders` (cron), `POST /api/jobs/reminders/run` (lead button)
- `PATCH /api/user/settings` (phone + WhatsApp opt-in), `GET /api/users/search?email=`

## Risk Radar rules (deterministic)

| Category | Rule | Level |
|---|---|---|
| Confirmed blocker | member said they are blocked | High if deadline ≤ 72 h, else Medium |
| Potential hidden blocker | progress ≥ 70 % and no meaningful update for ≥ 2 days and deadline ≤ 3 days | High |
| Deadline at risk | overdue, or low progress for the time left | High / Medium |
| Workload strain | only when the member explicitly ticks "too much on my plate" | Medium |
| Stalled task | In Progress, progress unchanged across ≥ 2 check-ins | Medium (High if ≤ 48 h) |
| Insufficient evidence | no check-ins yet | never High |

A check-in counts as a *meaningful update* only when something moved: the first check-in, progress going up, or a blocker being raised or cleared. Repeating "90%, almost done" does not reset the clock. The detector never infers emotions or uses activity times.
