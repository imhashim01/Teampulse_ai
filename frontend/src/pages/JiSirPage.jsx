import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Radar, RefreshCw, Copy, MessageCircle, Sparkles, Cpu, CalendarClock, Lightbulb, ShieldCheck, ArrowUpRight } from "lucide-react";
import toast from "react-hot-toast";
import classNames from "classnames";
import { api, errMsg } from "../lib/api";
import { Avatar, LevelBadge, DeadlineChip, EmptyState, Skeleton, Pill, ConfirmDialog, fmtDate, timeAgo } from "../components/ui";

const ACCENT = { High: "border-l-red-400", Medium: "border-l-amber-400", Low: "border-l-emerald-400" };

const RiskCard = ({ risk, onChanged }) => {
  const [message, setMessage] = useState(risk.supportiveMessage);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const task = risk.task;
  const ai = risk.source === "AI-assisted";

  useEffect(() => { setMessage(risk.supportiveMessage); }, [risk.supportiveMessage]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(message); toast.success("Message copied"); } catch { toast.error("Could not copy"); }
  };
  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/tasks/${task._id}/nudge`, { message, userId: risk.member?._id });
      const status = r.data.data.status;
      if (status === "Sent") toast.success("Sent on WhatsApp");
      else if (status === "Simulated") toast.success("WhatsApp simulated (mock mode). See the notification log.");
      else toast.error(`WhatsApp failed: ${r.data.data.error || "unknown error"}`);
      setConfirm(false);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const reanalyze = async () => {
    setBusy(true);
    try { const r = await api.post(`/tasks/${task._id}/risk`); toast.success(r.data.message); onChanged(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const evidenceHref = (e) => (e.kind === "checkin" ? `/tasks/${task._id}#checkin-${e.refId}` : `/tasks/${task._id}`);

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
      className={classNames("card border-l-4 overflow-hidden", ACCENT[risk.level])}>
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <Avatar user={risk.member} size="w-10 h-10 text-sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink">{risk.member?.name}</span>
              <span className="text-muted">·</span>
              <Link to={`/tasks/${task._id}`} className="text-ink hover:text-accent inline-flex items-center gap-0.5">{task.title}<ArrowUpRight size={14} /></Link>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <LevelBadge level={risk.level} />
              <Pill className="bg-slate-100 text-slate-700">{risk.category}</Pill>
              <DeadlineChip deadline={task.deadline} done={task.status === "Completed"} />
              <span className="text-xs text-muted">{task.project?.name} · due {fmtDate(task.deadline, true)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Pill className={ai ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}>{ai ? <Sparkles size={12} /> : <Cpu size={12} />}{risk.source}</Pill>
          </div>
        </div>

        <p className="text-sm text-ink mt-4 leading-relaxed">{risk.explanation}</p>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="label">Evidence (from records)</p>
            <ul className="space-y-1.5">
              {risk.evidence.map((e, i) => (
                <li key={i}>
                  <Link to={evidenceHref(e)} className="group flex items-start gap-2 text-sm text-ink hover:text-accent">
                    <span className="mt-2 w-1 h-1 rounded-full bg-muted group-hover:bg-accent shrink-0" />
                    <span>{e.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <div>
              <p className="label flex items-center gap-1"><CalendarClock size={12} />Deadline risk</p>
              <p className="text-sm text-ink">{risk.deadlineRisk}</p>
            </div>
            <div>
              <p className="label flex items-center gap-1"><Lightbulb size={12} />Suggested action</p>
              <p className="text-sm text-ink">{risk.suggestedAction}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-canvas border-t border-line p-5">
        <p className="label">Supportive message (edit before sending)</p>
        <textarea className="field min-h-[72px] bg-white" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button className="btn-secondary" onClick={copy}><Copy size={15} />Copy</button>
          <button className="btn-primary bg-[#128C7E] hover:bg-[#0E7A6D]" onClick={() => setConfirm(true)} disabled={busy || !message.trim()}><MessageCircle size={15} />Send on WhatsApp</button>
          <button className="btn-ghost" onClick={reanalyze} disabled={busy}><RefreshCw size={15} className={busy ? "animate-spin" : ""} />Re-analyze</button>
          <span className="sm:ml-auto text-xs text-muted">Last analyzed {timeAgo(risk.analyzedAt)}</span>
        </div>
      </div>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={send} loading={busy} title={`Send to ${risk.member?.name?.split(" ")[0]} on WhatsApp?`} confirmLabel="Send">
        <p className="text-sm text-ink rounded-lg bg-canvas border border-line p-3 mt-1">{message}</p>
        <p className="text-xs text-muted mt-2">{risk.member?.phone ? `To ${risk.member.phone}` : "This member has no WhatsApp number yet (it will be logged; in mock mode it is simulated)."}</p>
      </ConfirmDialog>
    </motion.div>
  );
};

const JiSirPage = () => {
  const [state, setState] = useState({ loading: true, risks: [], aiConfigured: false, error: null });
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) setAnalyzing(true);
    try {
      const r = await api.post("/risks", { force });
      setState({ loading: false, risks: r.data.data.risks, aiConfigured: r.data.data.aiConfigured, error: null });
      if (force) toast.success("Team re-analyzed");
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: errMsg(e) }));
    } finally { setAnalyzing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = state.risks.reduce((acc, r) => ({ ...acc, [r.level]: (acc[r.level] || 0) + 1 }), {});

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mb-8">
        <div className="flex items-center gap-2 text-accent text-sm font-medium mb-3"><Radar size={16} />Ji Sir Detector</div>
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-ink leading-snug max-w-3xl">
          In Pakistan, nobody tells their boss they're stuck.<br className="hidden sm:block" />
          <span className="text-muted"> TeamPulse hears what they don't say.</span>
        </h1>
        <p className="text-sm text-muted mt-3 max-w-2xl flex items-start gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          Compares what people report with what the records show. Facts only, no guessing about feelings. You approve every message before it goes out.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button className="btn-primary" onClick={() => load(true)} disabled={analyzing}><RefreshCw size={15} className={analyzing ? "animate-spin" : ""} />{analyzing ? "Analyzing…" : "Re-analyze team"}</button>
          {!state.loading && !state.error && (
            <>
              <Pill className="bg-red-50 text-red-700">{counts.High || 0} high</Pill>
              <Pill className="bg-amber-50 text-amber-800">{counts.Medium || 0} medium</Pill>
              <Pill className="bg-emerald-50 text-emerald-700">{counts.Low || 0} low</Pill>
              <Pill className={state.aiConfigured ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}>
                {state.aiConfigured ? <><Sparkles size={12} />AI enabled</> : <><Cpu size={12} />Rule-based mode (no AI key)</>}
              </Pill>
            </>
          )}
        </div>
      </motion.div>

      {state.loading ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : state.error ? (
        <EmptyState icon={Radar} title="The detector is for project leads" hint={state.error} action={<Link to="/projects" className="btn-secondary">Go to projects</Link>} />
      ) : state.risks.length === 0 ? (
        <EmptyState icon={Radar} title="No open tasks to analyze" hint="Assign tasks to your team. Once they start checking in, the detector compares reports with reality." action={<Link to="/projects" className="btn-primary">Open projects</Link>} />
      ) : (
        <div className="space-y-4">{state.risks.map((r) => <RiskCard key={r._id} risk={r} onChanged={() => load()} />)}</div>
      )}
    </div>
  );
};

export default JiSirPage;
