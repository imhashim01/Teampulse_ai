import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Ban, Send, CheckCircle2, RotateCcw, ClipboardList, MessageSquareText, Link2, Radar, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import classNames from "classnames";
import { api, errMsg } from "../lib/api";
import { Modal, ConfirmDialog, EmptyState, SkeletonCards, StatusPill, PriorityPill, DeadlineChip, Avatar, AvatarStack, ProgressBar, LevelBadge, Pill, fmtDate, timeAgo, fadeIn } from "../components/ui";

const ALL_STATUSES = ["To Do", "In Progress", "Submitted for Review", "Revision Required", "Completed", "Blocked"];

const CheckInForm = ({ initialProgress, onSubmit }) => {
  const [f, setF] = useState({ didToday: "", nextStep: "", blocked: false, helpNeeded: "", overloaded: false, progress: initialProgress || 0, note: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { await onSubmit(f); } finally { setSaving(false); } };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">What I did</label><textarea className="field" value={f.didToday} onChange={set("didToday")} required /></div>
      <div><label className="label">What's next</label><input className="field" value={f.nextStep} onChange={set("nextStep")} /></div>
      <div>
        <label className="label">Progress: {f.progress}%</label>
        <input type="range" min="0" max="100" step="5" value={f.progress} onChange={set("progress")} className="w-full accent-[#4F46E5]" />
      </div>
      <div className="rounded-lg border border-line p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={f.blocked} onChange={set("blocked")} className="accent-[#4F46E5]" />I'm blocked</label>
        {f.blocked && <input className="field" value={f.helpNeeded} onChange={set("helpNeeded")} placeholder="What help do you need?" />}
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={f.overloaded} onChange={set("overloaded")} className="accent-[#4F46E5]" />I have too much on my plate / need help</label>
      </div>
      <div><label className="label">Note (optional)</label><input className="field" value={f.note} onChange={set("note")} /></div>
      <p className="text-xs text-muted">Being honest early helps your lead help you. Nobody gets blamed for asking.</p>
      <div className="flex justify-end"><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save check-in"}</button></div>
    </form>
  );
};

const SubmitForm = ({ instructions, onSubmit }) => {
  const [f, setF] = useState({ summary: "", link: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { await onSubmit(f); } finally { setSaving(false); } };
  return (
    <form onSubmit={submit} className="space-y-4">
      {instructions && <div className="rounded-lg bg-canvas border border-line p-3 text-sm text-muted"><span className="font-medium text-ink">Instructions: </span>{instructions}</div>}
      <div><label className="label">Summary of what you delivered</label><textarea className="field min-h-[100px]" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} required /></div>
      <div><label className="label">Link (PR, preview, document)</label><input className="field" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></div>
      <p className="text-xs text-muted">Your lead will review it. It moves to Completed only after approval.</p>
      <div className="flex justify-end"><button className="btn-primary" disabled={saving}><Send size={15} />{saving ? "Submitting…" : "Submit for review"}</button></div>
    </form>
  );
};

const TaskDetailPage = () => {
  const { taskId } = useParams();
  const { hash } = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get(`/tasks/${taskId}`).then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e))), [taskId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (data && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [data, hash]);

  if (error) return <EmptyState title="Can't open this task" hint={error} action={<Link to="/my-tasks" className="btn-secondary">Back</Link>} />;
  if (!data) return <SkeletonCards count={3} className="h-32" />;

  const { task, submissions, checkIns, risk, isLead, isAssignee } = data;
  const closed = ["Completed", "Submitted for Review"].includes(task.status);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      toast.success(okMsg || r.data.message);
      setModal(null); setComment("");
      await load();
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const setStatus = (status) => run(() => api.patch(`/tasks/${taskId}/status`, { status }));
  const review = (action) => run(() => api.post(`/tasks/${taskId}/review`, { action, comment }));

  return (
    <motion.div {...fadeIn}>
      <Link to={`/projects/${task.project._id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-4"><ArrowLeft size={15} />{task.project.name}</Link>

      <div className="card p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={task.status} /><PriorityPill priority={task.priority} /><DeadlineChip deadline={task.deadline} done={task.status === "Completed"} />
              {task.revisionCount > 0 && <Pill className="bg-amber-50 text-amber-800">{task.revisionCount} revision{task.revisionCount > 1 ? "s" : ""}</Pill>}
            </div>
            <h1 className="text-xl font-semibold text-ink mt-3">{task.title}</h1>
            <p className="text-xs text-muted mt-1">Due {fmtDate(task.deadline, true)} · Last meaningful update {timeAgo(task.lastMeaningfulUpdateAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {isAssignee && !closed && task.status !== "In Progress" && <button className="btn-secondary" disabled={busy} onClick={() => setStatus("In Progress")}><Play size={15} />Start</button>}
            {isAssignee && !closed && task.status !== "Blocked" && <button className="btn-secondary" disabled={busy} onClick={() => setStatus("Blocked")}><Ban size={15} />Blocked</button>}
            {isAssignee && !closed && <button className="btn-secondary" onClick={() => setModal("checkin")}><ClipboardList size={15} />Check in</button>}
            {isAssignee && !closed && <button className="btn-primary" onClick={() => setModal("submit")}><Send size={15} />Submit</button>}
            {isLead && task.status === "Submitted for Review" && (
              <>
                <button className="btn-secondary" onClick={() => setModal("revision")}><RotateCcw size={15} />Request revision</button>
                <button className="btn-primary" onClick={() => setModal("approve")}><CheckCircle2 size={15} />Approve</button>
              </>
            )}
            {isLead && (
              <select className="field w-auto py-1.5" value={task.status} onChange={(e) => setStatus(e.target.value)} disabled={busy} aria-label="Set status">
                {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="mt-5 grid sm:grid-cols-3 gap-4">
          <div><p className="label">Assignees</p><div className="flex items-center gap-2"><AvatarStack users={task.assignees} /><span className="text-sm text-ink truncate">{task.assignees.map((a) => a.name.split(" ")[0]).join(", ") || "Unassigned"}</span></div></div>
          <div><p className="label">Reported progress</p><div className="flex items-center gap-2"><ProgressBar value={task.progress} /><span className="text-sm text-ink">{task.progress}%</span></div></div>
          <div><p className="label">Created by</p><p className="text-sm text-ink">{task.createdBy?.name || "–"}</p></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <p className="label">Description / expected outcome</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{task.description || "No description."}</p>
            {task.submissionInstructions && <><p className="label mt-4">Submission instructions</p><p className="text-sm text-ink whitespace-pre-wrap">{task.submissionInstructions}</p></>}
            {task.link && <a href={task.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline"><Link2 size={14} />Reference link</a>}
          </div>

          <div className="card">
            <p className="px-5 py-3.5 border-b border-line text-sm font-medium text-ink flex items-center gap-2"><Send size={15} className="text-muted" />Submissions</p>
            {submissions.length === 0 ? <p className="text-sm text-muted px-5 py-6">No submissions yet.</p> : submissions.map((s) => (
              <div key={s._id} id={`submission-${s._id}`} className="px-5 py-4 border-b border-line last:border-0">
                <div className="flex items-center gap-2"><Avatar user={s.submittedBy} size="w-6 h-6 text-[10px]" /><span className="text-sm font-medium text-ink">{s.submittedBy?.name}</span><span className="text-xs text-muted">{timeAgo(s.createdAt)}</span>
                  <Pill className={classNames("ml-auto", { "bg-violet-50 text-violet-700": s.status === "Pending", "bg-emerald-50 text-emerald-700": s.status === "Approved", "bg-amber-50 text-amber-800": s.status === "Revision Requested" })}>{s.status}</Pill>
                </div>
                <p className="text-sm text-ink mt-2 whitespace-pre-wrap">{s.summary}</p>
                {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline inline-flex items-center gap-1 mt-1"><Link2 size={13} />{s.link}</a>}
                {s.reviewComment && <p className="text-sm mt-2 rounded-lg bg-canvas border border-line p-2.5"><span className="font-medium">{s.reviewedBy?.name}: </span>{s.reviewComment}</p>}
              </div>
            ))}
          </div>

          <div className="card">
            <p className="px-5 py-3.5 border-b border-line text-sm font-medium text-ink flex items-center gap-2"><MessageSquareText size={15} className="text-muted" />Check-ins</p>
            {checkIns.length === 0 ? <p className="text-sm text-muted px-5 py-6">No check-ins yet.</p> : checkIns.map((c) => (
              <div key={c._id} id={`checkin-${c._id}`} className={classNames("px-5 py-4 border-b border-line last:border-0", hash === `#checkin-${c._id}` && "bg-amber-50/60")}>
                <div className="flex items-center gap-2 flex-wrap"><Avatar user={c.user} size="w-6 h-6 text-[10px]" /><span className="text-sm font-medium text-ink">{c.user?.name}</span><span className="text-xs text-muted">{fmtDate(c.createdAt, true)}</span>
                  <span className="ml-auto flex gap-1.5">{c.blocked && <Pill className="bg-red-50 text-red-700">Blocked</Pill>}{c.overloaded && <Pill className="bg-amber-50 text-amber-800">Needs help</Pill>}<Pill className="bg-indigo-50 text-indigo-700">{c.progress}%</Pill></span>
                </div>
                <div className="text-sm text-ink mt-2 space-y-0.5">
                  {c.didToday && <p><span className="text-muted">Did: </span>{c.didToday}</p>}
                  {c.nextStep && <p><span className="text-muted">Next: </span>{c.nextStep}</p>}
                  {c.helpNeeded && <p><span className="text-muted">Help needed: </span>{c.helpNeeded}</p>}
                  {c.note && <p className="italic text-muted">“{c.note}”</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {isLead && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3"><p className="text-sm font-medium text-ink flex items-center gap-2"><Radar size={15} className="text-muted" />Ji Sir check</p>
                <button className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => run(() => api.post(`/tasks/${taskId}/risk`))}><RefreshCw size={13} />Analyze</button>
              </div>
              {risk ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap"><LevelBadge level={risk.level} /><span className="text-sm font-medium text-ink">{risk.category}</span></div>
                  <p className="text-sm text-muted mt-2">{risk.explanation}</p>
                  <p className="text-xs text-muted mt-3">{risk.source} · {timeAgo(risk.analyzedAt)}</p>
                  <Link to="/ji-sir" className="text-xs text-accent hover:underline mt-1 inline-block">Open in Ji Sir Detector</Link>
                </>
              ) : <p className="text-sm text-muted">Not analyzed yet.</p>}
            </div>
          )}
          {isAssignee && task.status === "Revision Required" && (
            <div className="card p-5 border-amber-200 bg-amber-50/40"><p className="text-sm font-medium text-amber-900">Revision requested</p><p className="text-sm text-amber-900/80 mt-1">Check the latest review comment, update your work and submit again.</p></div>
          )}
        </div>
      </div>

      <Modal open={modal === "checkin"} onClose={() => setModal(null)} title="Quick check-in"><CheckInForm initialProgress={task.progress} onSubmit={(f) => run(() => api.post(`/tasks/${taskId}/checkins`, f))} /></Modal>
      <Modal open={modal === "submit"} onClose={() => setModal(null)} title="Submit for review"><SubmitForm instructions={task.submissionInstructions} onSubmit={(f) => run(() => api.post(`/tasks/${taskId}/submissions`, f))} /></Modal>
      <ConfirmDialog open={modal === "approve"} onClose={() => setModal(null)} onConfirm={() => review("approve")} loading={busy}
        title="Approve this submission?" message="The task will be marked Completed and the assignee will be notified." confirmLabel="Approve">
        <textarea className="field mt-3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional note, e.g. Great work!" />
      </ConfirmDialog>
      <ConfirmDialog open={modal === "revision"} onClose={() => setModal(null)} onConfirm={() => review("revision")} loading={busy}
        title="Request revisions" message="Explain what needs to change. The assignee is notified in-app and on WhatsApp." confirmLabel="Request revision">
        <textarea className="field mt-3 min-h-[90px]" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. CTA button is not visible on mobile, please fix." />
      </ConfirmDialog>
    </motion.div>
  );
};

export default TaskDetailPage;
