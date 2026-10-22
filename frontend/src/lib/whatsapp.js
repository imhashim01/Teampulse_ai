// User-facing text for WhatsApp delivery outcomes returned by the API
export const WA_REASONS = {
  not_verified: "has not verified a WhatsApp number",
  opted_out: "has turned off WhatsApp notifications",
  preference_off: "has turned off this type of WhatsApp notification",
  template_not_configured: "the WhatsApp template is not configured on the server",
  config_missing: "WhatsApp is not configured on the server",
  invalid_recipient: "WhatsApp could not deliver to their number",
  auth_invalid: "the server's WhatsApp token is invalid or expired",
  rate_limited: "WhatsApp is rate limiting, it will be retried",
  timeout: "WhatsApp timed out, it will be retried",
  network_error: "WhatsApp could not be reached, it will be retried",
  provider_error: "WhatsApp returned an error",
  outside_24h_window: "free-form messages need a recent reply from the user",
};

// Returns { tone: "success"|"info"|"error", text } or null when there is nothing to report
export const describeWhatsApp = (wa, who = "They") => {
  if (!wa) return null;
  if (wa.status === "Accepted" || wa.status === "Sent" || wa.status === "Delivered" || wa.status === "Read") return { tone: "success", text: `WhatsApp notification sent to ${who}.` };
  if (wa.status === "Simulated") return { tone: "info", text: "WhatsApp is in dry-run mode, nothing was sent." };
  if (wa.status === "Skipped") return { tone: "info", text: `No WhatsApp sent: ${who} ${WA_REASONS[wa.reason] || "is not eligible"}.` };
  if (wa.status === "Failed") return { tone: "error", text: `WhatsApp notification failed: ${WA_REASONS[wa.reason] || "unknown error"}.` };
  return null;
};
