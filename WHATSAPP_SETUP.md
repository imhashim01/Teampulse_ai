# WhatsApp setup (Meta WhatsApp Cloud API)

TeamPulse AI sends WhatsApp messages through the **official Meta WhatsApp Cloud API**. This guide covers everything you must configure in Meta and in your environment. The code is already in place. Nothing in Meta is configured for you.

**Until you finish this, WhatsApp runs in dry-run mode** (`WHATSAPP_ENABLED=false`): nothing is sent, and the notification log shows deliveries as `Simulated`.

## What the app does

| Workflow | Trigger | Recipient | Template env var |
|---|---|---|---|
| A. Number verification | User enters a number in **Settings** | that number | `WHATSAPP_VERIFICATION_TEMPLATE_NAME` |
| B. Added to a project | Lead adds a member (after it is saved) | the new member | `WHATSAPP_PROJECT_ADDED_TEMPLATE_NAME` |
| C. Task submitted | Member submits (after it is saved) | the project lead | `WHATSAPP_TASK_SUBMITTED_TEMPLATE_NAME` |
| D. Deadline reminder | Scheduler, 24 h and 1 h before (configurable) | assignees | `WHATSAPP_DEADLINE_TEMPLATE_NAME` |
| D. Overdue | Scheduler, once after the deadline (configurable) | assignees + lead | `WHATSAPP_OVERDUE_TEMPLATE_NAME` |
| Optional | Task assigned / revision requested / lead message | member | `WHATSAPP_TASK_ASSIGNED_…`, `WHATSAPP_REVISION_…`, `WHATSAPP_NUDGE_…` |

Routine messages (B, C, D) only go to users who **verified their number, gave consent, and kept that notification type on** in Settings. Everyone else is recorded as `Skipped` with the reason. Replying **STOP** on WhatsApp turns notifications off.

Delivery states in the log:
- `Queued`: saved, about to be sent.
- `Accepted`: Meta accepted the request. This does not mean the message arrived.
- `Sent`, `Delivered`, `Read`: reported later by the webhook.
- `Failed`: an error, shown with a category. Temporary failures are retried with backoff.
- `Skipped`: the recipient is not eligible.
- `Simulated`: dry run, nothing was sent.

---

## 1. Create the Meta app

1. Open **https://developers.facebook.com** and log in with the Facebook account that should own the integration.
2. **My Apps → Create app**. Choose the use case **"Connect with customers through WhatsApp"** (or type **Business**), then pick or create a **Meta Business portfolio**.
3. In the app dashboard, add the **WhatsApp** product if it isn't already added (**Add product → WhatsApp → Set up**).

## 2. Find your IDs

Go to **WhatsApp → API Setup**:
- **Phone number ID** (under the "From" number) → `WHATSAPP_PHONE_NUMBER_ID`
- **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`

Meta gives you a free **test number** to start with.

## 3. Access token

- **For quick testing:** API Setup shows a **temporary access token**. It **expires after about 24 hours**, so never use it in production.
- **For production, create a permanent System User token:**
  1. Go to **business.facebook.com → Settings → Users → System users → Add**. Choose the Admin role.
  2. **Assign assets**: add your app (full control) and your WhatsApp Business Account (full control).
  3. Click **Generate new token**. Select your app and the permissions `whatsapp_business_messaging` and `whatsapp_business_management`. Set the expiry to **Never**.
  4. Put the token in `WHATSAPP_ACCESS_TOKEN` in your **backend** environment only.

The app secret is at **App settings → Basic → App secret → Show** → `WHATSAPP_APP_SECRET`.

Never put these values in the frontend (`VITE_*`), in git, or in screenshots.

## 4. Message templates

WhatsApp only allows a business to start a conversation with an **approved template**. Create each template at **WhatsApp Manager → Account tools → Message templates → Create template** and wait for approval (usually minutes).

The code sends the body parameters **in exactly this order**. Copy the bodies as written. Meta rejects bodies that start or end with a variable, which is why some end with a short sign-off.

### A. `teampulse_verification`: category **Authentication**
- **Code delivery:** "Copy code" (the code also goes into the button).
- **Options:** tick *Add security recommendation* and *Add expiration time*, then set it to **5 minutes**.
- **Body:** fixed by Meta, `{{1}} is your verification code.` `{{1}}` is the 6-digit code.

Set `WHATSAPP_VERIFICATION_TEMPLATE_NAME=teampulse_verification`.

### B. `teampulse_project_added`: category **Utility**
```
Hi {{1}}, you've been added to the project {{2}} on TeamPulse AI.

Role: {{3}}
Added by: {{4}}

Open TeamPulse AI to view your responsibilities and project deadlines.
```
`{{1}}` member first name · `{{2}}` project · `{{3}}` role · `{{4}}` added by

### C. `teampulse_task_submitted`: category **Utility**
```
TeamPulse AI: New task submission

Project: {{1}}
Task: {{2}}
Submitted by: {{3}}

The task is ready for your review: {{4}}

Thank you.
```
`{{1}}` project · `{{2}}` task · `{{3}}` submitter · `{{4}}` review link, built from `APP_BASE_URL`

### D. `teampulse_deadline_reminder`: category **Utility**
```
Hi {{1}}, this is a deadline reminder from TeamPulse AI.

Task: {{2}}
Project: {{3}}
Deadline: {{4}}

Please update your progress on TeamPulse AI. If you're blocked, let your team lead know.
```
`{{1}}` first name · `{{2}}` task · `{{3}}` project · `{{4}}` deadline, e.g. `23 October, 6:00 PM (Asia/Karachi)`

### D. `teampulse_overdue`: category **Utility** (used for both the member and the lead)
```
Hi {{1}}, a task on TeamPulse AI is now overdue.

Task: {{2}}
Project: {{3}}

Please open TeamPulse AI to update the status or share any blockers.
```
`{{1}}` first name · `{{2}}` task · `{{3}}` project

### Optional templates
- `teampulse_task_assigned` (Utility): `Hi {{1}}, you have a new task on TeamPulse AI.\n\nTask: {{2}}\nProject: {{3}}\nDeadline: {{4}}\n\nOpen TeamPulse AI for details.`
- `teampulse_revision` (Utility): `Hi {{1}}, your lead requested changes on {{2}}:\n\n{{3}}\n\nOpen TeamPulse AI to update your work.`
- `teampulse_nudge` (Utility): `Message from your team lead on TeamPulse AI:\n\n{{1}}\n\nOpen TeamPulse AI to reply.`

If you use a language other than English, set the matching `*_TEMPLATE_LANGUAGE` (for example `en_US`). It must match the language the template was approved in.

`WHATSAPP_FREEFORM_FALLBACK=true` sends plain text when a template is missing. Plain text **only arrives if the user messaged your number in the last 24 hours**, so treat it as a development shortcut only.

## 5. Webhook (delivery status + STOP opt-out)

1. Go to **WhatsApp → Configuration → Webhook → Edit**.
2. **Callback URL:** `https://<your-backend-domain>/api/webhooks/whatsapp`
3. **Verify token:** any random string. Put the same value in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
4. Click **Verify and save**. Meta calls `GET /api/webhooks/whatsapp`, and the backend answers if the token matches.
5. Under **Webhook fields**, **subscribe to `messages`**. That field carries delivery statuses (`sent`, `delivered`, `read`, `failed`) and incoming replies (used for STOP).

Every POST is checked against the `X-Hub-Signature-256` header using `WHATSAPP_APP_SECRET`. In production, requests are rejected when the secret isn't set. Duplicate events are ignored. If saving fails, the backend returns 500 so Meta retries.

**Local development:** Meta needs a public HTTPS URL. Tunnel your local backend with:
```bash
npx cloudflared tunnel --url http://localhost:5000
```
or `ngrok http 5000`. Then use `https://<tunnel-host>/api/webhooks/whatsapp` as the callback. In production, always use your deployed HTTPS backend.

## 6. Environment variables

Every variable is listed with a comment in `backend/.env.example`. The minimum for live sending:

```dotenv
APP_BASE_URL=https://your-frontend.example
WHATSAPP_ENABLED=true
WHATSAPP_ACCESS_TOKEN=...            # system user token
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_API_VERSION=v23.0           # use the current version shown in Meta's docs
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
WHATSAPP_APP_SECRET=...
WHATSAPP_VERIFICATION_TEMPLATE_NAME=teampulse_verification
WHATSAPP_PROJECT_ADDED_TEMPLATE_NAME=teampulse_project_added
WHATSAPP_TASK_SUBMITTED_TEMPLATE_NAME=teampulse_task_submitted
WHATSAPP_DEADLINE_TEMPLATE_NAME=teampulse_deadline_reminder
WHATSAPP_OVERDUE_TEMPLATE_NAME=teampulse_overdue
WHATSAPP_REMINDERS_ENABLED=true
WHATSAPP_REMINDER_TIMEZONE=Asia/Karachi
CRON_SECRET=<long random string>
```

On Vercel, add these under **Project → Settings → Environment Variables** for the backend project, then redeploy. Also set `CLIENT_URL` to your frontend URL for CORS, and `VITE_BACKEND_URL` in the frontend project.

## 7. Scheduling reminders in production

The backend runs **serverless on Vercel**, so in-memory timers don't run reliably. Reminders run through `POST /api/jobs/reminders` (or `GET` with `Authorization: Bearer <CRON_SECRET>`), protected by `CRON_SECRET`.

Each run:
- sends the reminders that are due,
- retries temporary failures,
- never sends a reminder twice. Every reminder has a unique key in MongoDB that includes the deadline, so runs that overlap or repeat are safe, and a moved deadline gets fresh reminders.

For the **1-hour** reminder, the job must run at least every **10–15 minutes**:

- **cron-job.org (free):** create a job with URL `https://<backend>/api/jobs/reminders`, method **POST**, header `x-cron-secret: <CRON_SECRET>`, schedule every 10 minutes.
- **Vercel Cron:** `backend/vercel.json` already contains a cron entry. Hobby plans only allow **daily** runs, which is fine for 24-hour reminders but not for 1-hour ones. On Pro, change the schedule to `*/10 * * * *`. Vercel sends `CRON_SECRET` automatically as a Bearer token.
- **Persistent server (local or VPS):** set `REMINDER_INPROCESS_INTERVAL_MINUTES=10`. This is ignored on Vercel.

Leads also have a **Run reminders now** button on the Notifications page. It uses the same deduplicated logic.

## 8. Test with Meta's test number

1. In **API Setup → "To"**, add up to 5 recipient numbers and confirm each with the code Meta sends.
2. Create and get approval for at least the verification template.
3. Set the variables above (the temporary token is fine for this) and restart the backend.
4. In the app, go to **Settings → WhatsApp**, enter your number, tick consent, then **Send verification code**. Enter the code you receive.
5. As a lead, add that user to a project. They receive the "added to project" message. Then check the Notifications page: the **Notification log** should move from `Accepted` to `Delivered` once the webhook is set up.

A quick local option without WhatsApp: set `WHATSAPP_DEV_LOG_OTP=true` with `WHATSAPP_ENABLED=false`, and verification codes print in the backend console. This is ignored when `NODE_ENV=production`.

## 9. Moving to production

1. **Add a real phone number:** go to **WhatsApp → API Setup → Add phone number**. It must be a number not already registered on WhatsApp. Then verify it and set a display name, which Meta reviews.
2. **Complete Business verification** in Business Settings. This raises your messaging limits.
3. Switch `WHATSAPP_PHONE_NUMBER_ID` to the new number and use a **system user token**, not the temporary one.
4. Templates belong to the WhatsApp Business Account, so approved templates keep working.
5. **Add a payment method** in WhatsApp Manager. Business-initiated template messages are charged per message.

## 10. Troubleshooting

| Symptom / log category | Fix |
|---|---|
| Settings says "WhatsApp is not enabled on this server" | Set `WHATSAPP_ENABLED=true` and restart. |
| `config_missing` | `WHATSAPP_ACCESS_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` is not set. |
| `auth_invalid` (code 190) | The token expired (temporary tokens last about 24 hours). Create a system user token. |
| `template_not_configured` | Set the `*_TEMPLATE_NAME` for that message type. |
| `template_error` (132xxx) | The name, language or number of parameters doesn't match the approved template. Compare with section 4. |
| `recipient_not_allowed` (131030) | You are using Meta's test number: add the recipient in **API Setup → "To"** (up to 5 numbers) and confirm it. |
| `invalid_recipient` (131026) | The number isn't on WhatsApp. |
| `outside_24h_window` (131047) | You sent free-form text. Use a template. |
| `rate_limited` | Retried automatically. Lower the volume or request higher limits. |
| Stuck on `Accepted` | The webhook isn't configured or isn't subscribed to `messages`. |
| Webhook returns 401 | `WHATSAPP_APP_SECRET` is wrong, or a proxy changed the request body. |
| No reminders | Check that `WHATSAPP_REMINDERS_ENABLED=true`, that the cron job is calling the endpoint with the right secret, and that the task isn't Completed or Submitted for Review. |
| "Skipped: not_verified / opted_out" | The user hasn't verified a number, or has turned WhatsApp off in Settings. |

## Running the tests

```bash
cd backend
npm test
```
This runs the unit tests with the Meta API mocked; no real messages are sent.

The end-to-end suite runs the real app against a temporary database named `teampulse_whatsapp_test`, which it drops at the end:
```bash
TEST_MONGO_URI="<mongodb connection string>" npm test
```
