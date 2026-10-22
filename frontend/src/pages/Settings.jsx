import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Phone, ShieldCheck, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import classNames from "classnames";
import { api, errMsg } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { PageHeader, Pill, Skeleton, ConfirmDialog, fadeIn } from "../components/ui";

const PREFS = [
  ["projectAdded", "Added to a project"],
  ["taskSubmitted", "A member submits a task (for leads)"],
  ["deadlineReminders", "Deadline reminders"],
  ["overdue", "Overdue alerts"],
  ["taskUpdates", "Task assignments, revisions and messages from my lead"],
];

const useCountdown = (target) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return target ? Math.max(0, Math.ceil((new Date(target) - now) / 1000)) : 0;
};

const fmtSecs = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`);

const Settings = () => {
  const [wa, setWa] = useState(null);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [changing, setChanging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/user/whatsapp");
      setWa(r.data.data);
      // A number saved before verification existed: offer it for verification
      if (!r.data.data.verified && r.data.data.phone) setPhone((p) => p || r.data.data.phone);
    } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const expiresIn = useCountdown(wa?.pending && !wa.pending.expired ? wa.pending.expiresAt : null);
  const resendIn = useCountdown(wa?.pending?.resendAvailableAt);
  const awaitingCode = wa?.pending && !wa.pending.expired && expiresIn > 0 && wa.pending.attemptsLeft > 0;

  const syncUser = (user) => { if (user) useAuthStore.setState({ user }); };

  const run = async (key, fn) => {
    setBusy(key); setError(null);
    try { return await fn(); } catch (e) {
      const msg = errMsg(e);
      setError(msg); toast.error(msg);
      await load();
    } finally { setBusy(null); }
  };

  const start = (e) => {
    e.preventDefault();
    run("start", async () => {
      const r = await api.post("/user/whatsapp/start", { phone: phone.trim(), consent });
      setWa(r.data.data); setCode("");
      toast.success(r.data.message);
    });
  };
  const resend = () => run("resend", async () => {
    const r = await api.post("/user/whatsapp/resend");
    setWa(r.data.data); setCode("");
    toast.success("A new code was sent");
  });
  const verify = (e) => {
    e.preventDefault();
    run("verify", async () => {
      const r = await api.post("/user/whatsapp/verify", { code: code.trim() });
      setWa(r.data.data); syncUser(r.data.user); setChanging(false); setPhone(""); setCode("");
      toast.success("WhatsApp number verified");
    });
  };
  const remove = () => run("remove", async () => {
    const r = await api.delete("/user/whatsapp");
    setWa(r.data.data); setConfirmRemove(false);
    useAuthStore.setState((s) => ({ user: { ...s.user, phone: undefined, whatsappVerified: false, whatsappOptIn: false } }));
    toast.success("Number removed");
  });
  const savePrefs = (patch) => run("prefs", async () => {
    const r = await api.patch("/user/settings", patch);
    syncUser(r.data.user);
    setWa((w) => ({ ...w, optIn: r.data.user.whatsappOptIn, prefs: r.data.user.whatsappPrefs }));
  });

  if (!wa && !error) return <div className="max-w-xl"><Skeleton className="h-8 w-40 mb-6" /><Skeleton className="h-64" /></div>;

  const showNumberForm = !wa?.verified || changing;
  const serverDisabled = wa?.server?.mode === "disabled";

  return (
    <motion.div {...fadeIn} className="max-w-xl space-y-5">
      <PageHeader title="Settings" subtitle="Choose how TeamPulse reaches you." />

      <div className="card p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="font-medium text-ink flex items-center gap-2"><MessageCircle size={17} className="text-[#128C7E]" />WhatsApp</p>
            <p className="text-sm text-muted mt-1">Get task updates, submissions and deadline reminders on WhatsApp.</p>
          </div>
          {wa?.verified
            ? <Pill className="bg-emerald-50 text-emerald-700"><ShieldCheck size={12} />Verified</Pill>
            : <Pill className="bg-slate-100 text-slate-600">Not verified</Pill>}
        </div>

        {serverDisabled && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-900 flex gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>WhatsApp sending is turned off on this server, so no messages are delivered right now.
              {wa.server.devCodeInServerLog ? " Development mode: verification codes are printed in the server console." : " An administrator needs to finish the WhatsApp setup."}</span>
          </div>
        )}

        {wa?.verified && !changing && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
            <span className="text-sm text-ink flex items-center gap-2"><Phone size={15} className="text-muted" />{wa.phone}</span>
            <div className="flex gap-2">
              <button className="btn-secondary px-3 py-1.5" onClick={() => { setChanging(true); setPhone(""); }}>Change number</button>
              <button className="btn-ghost px-2 py-1.5" onClick={() => setConfirmRemove(true)} aria-label="Remove number"><Trash2 size={15} /></button>
            </div>
          </div>
        )}

        {showNumberForm && !awaitingCode && (
          <form onSubmit={start} className="space-y-4">
            {!wa?.verified && wa?.phone && !changing && (
              <p className="text-sm text-ink rounded-lg border border-line bg-canvas p-3">Your saved number <span className="font-medium">{wa.phone}</span> has not been verified yet. Verify it to start receiving WhatsApp notifications.</p>
            )}
            <div>
              <label className="label">WhatsApp number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="field pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+923001234567" inputMode="tel" autoComplete="tel" required />
              </div>
              <p className="text-xs text-muted mt-1.5">International format with country code, e.g. +923001234567. Pakistani numbers like 03001234567 also work.</p>
            </div>
            <label className="flex items-start gap-2.5 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#4F46E5]" />
              <span>I agree to receive TeamPulse AI notifications on WhatsApp. I can turn them off at any time here or by replying STOP.</span>
            </label>
            <div className="flex gap-2 justify-end">
              {changing && <button type="button" className="btn-ghost" onClick={() => setChanging(false)}>Cancel</button>}
              <button className="btn-primary" disabled={busy === "start" || !consent || !phone.trim()}>{busy === "start" ? "Sending…" : "Send verification code"}</button>
            </div>
          </form>
        )}

        {awaitingCode && (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-sm text-ink">Enter the 6-digit code we sent to <span className="font-medium">{wa.pending.phone}</span> on WhatsApp.</p>
            <input className="field text-center tracking-[0.5em] text-lg font-semibold" value={code} maxLength={6} inputMode="numeric" autoComplete="one-time-code"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" autoFocus />
            {wa.server?.devCodeInServerLog && (
              <p className="text-xs text-muted">Development mode: the code is also printed in the backend console.</p>
            )}
            {wa.server?.codesAsPlainText && (
              <div className="rounded-lg border border-line bg-canvas p-3 text-xs text-muted">
                Didn't get it? This server sends codes as a plain WhatsApp message, which only arrives if you have messaged
                {wa.server.businessNumber ? <> our number <span className="font-medium text-ink">{wa.server.businessNumber}</span></> : " our WhatsApp number"} in the last 24 hours.
                Send it any message (e.g. "hi"), then tap Resend code.
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>Expires in {fmtSecs(expiresIn)} · {wa.pending.attemptsLeft} attempt{wa.pending.attemptsLeft === 1 ? "" : "s"} left</span>
              <button type="button" className="inline-flex items-center gap-1 text-accent disabled:text-muted" onClick={resend} disabled={resendIn > 0 || busy === "resend"}>
                <RefreshCw size={12} />{resendIn > 0 ? `Resend in ${fmtSecs(resendIn)}` : busy === "resend" ? "Sending…" : "Resend code"}
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-ghost" onClick={() => setWa((w) => ({ ...w, pending: null }))}>Use a different number</button>
              <button className="btn-primary" disabled={code.length !== 6 || busy === "verify"}>{busy === "verify" ? "Verifying…" : "Verify"}</button>
            </div>
          </form>
        )}

        {wa?.pending && !awaitingCode && showNumberForm && (
          <p className="text-xs text-muted mt-3">
            {wa.pending.attemptsLeft === 0 ? "Too many incorrect attempts for the last code. " : "Your last code has expired. "}
            Send a new code to continue.
          </p>
        )}
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>

      <div className={classNames("card p-6", !wa?.verified && "opacity-70")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-ink">WhatsApp notifications</p>
            <p className="text-sm text-muted mt-1">
              {wa?.verified ? "Choose which updates you receive. In-app notifications always stay on." : "Verify your WhatsApp number to receive notifications there."}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer shrink-0">
            <input type="checkbox" className="accent-[#4F46E5]" checked={Boolean(wa?.optIn)} disabled={!wa?.verified || busy === "prefs"} onChange={(e) => savePrefs({ whatsappOptIn: e.target.checked })} />
            {wa?.optIn ? "On" : "Off"}
          </label>
        </div>
        <div className="mt-4 divide-y divide-line border-t border-line">
          {PREFS.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 py-2.5 text-sm text-ink cursor-pointer">
              <span>{label}</span>
              <input type="checkbox" className="accent-[#4F46E5]" checked={wa?.prefs?.[key] !== false}
                disabled={!wa?.verified || !wa?.optIn || busy === "prefs"} onChange={(e) => savePrefs({ whatsappPrefs: { [key]: e.target.checked } })} />
            </label>
          ))}
        </div>
      </div>

      <ConfirmDialog open={confirmRemove} onClose={() => setConfirmRemove(false)} onConfirm={remove} loading={busy === "remove"} danger
        title="Remove WhatsApp number?" message="You will stop receiving WhatsApp notifications. You can verify a number again later." confirmLabel="Remove" />
    </motion.div>
  );
};

export default Settings;
