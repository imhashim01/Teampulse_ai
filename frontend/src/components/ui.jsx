import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import classNames from "classnames";

export const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18 },
};

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const STATUS_STYLES = {
  "To Do": "bg-slate-100 text-slate-700",
  "In Progress": "bg-indigo-50 text-indigo-700",
  "Submitted for Review": "bg-violet-50 text-violet-700",
  "Revision Required": "bg-amber-50 text-amber-800",
  Completed: "bg-emerald-50 text-emerald-700",
  Blocked: "bg-red-50 text-red-700",
  Planning: "bg-slate-100 text-slate-700",
  Active: "bg-emerald-50 text-emerald-700",
  "On Hold": "bg-amber-50 text-amber-800",
};

const PRIORITY_STYLES = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-sky-50 text-sky-700",
  High: "bg-amber-50 text-amber-800",
  Critical: "bg-red-50 text-red-700",
};

const LEVEL_STYLES = {
  High: "bg-red-50 text-red-700 ring-red-100",
  Medium: "bg-amber-50 text-amber-800 ring-amber-100",
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

export const Pill = ({ className, children, title }) => (
  <span title={title} className={classNames("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", className)}>
    {children}
  </span>
);

export const StatusPill = ({ status }) => <Pill className={STATUS_STYLES[status] || "bg-slate-100 text-slate-700"}>{status}</Pill>;
export const PriorityPill = ({ priority }) => <Pill className={PRIORITY_STYLES[priority]}>{priority}</Pill>;
export const LevelBadge = ({ level }) => (
  <Pill className={classNames("ring-1", LEVEL_STYLES[level])}>
    <span className={classNames("w-1.5 h-1.5 rounded-full", { "bg-red-500": level === "High", "bg-amber-500": level === "Medium", "bg-emerald-500": level === "Low" })} />
    {level} risk
  </Pill>
);

export const timeLeft = (deadline) => {
  const ms = new Date(deadline) - new Date();
  const abs = Math.abs(ms);
  const h = Math.round(abs / 36e5);
  const label = h < 1 ? `${Math.max(1, Math.round(abs / 6e4))}m` : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
  return { overdue: ms < 0, hours: ms / 36e5, label };
};

export const DeadlineChip = ({ deadline, done }) => {
  if (!deadline) return null;
  const { overdue, hours, label } = timeLeft(deadline);
  const cls = done ? "bg-slate-100 text-slate-600" : overdue || hours < 24 ? "bg-red-50 text-red-700" : hours < 72 ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600";
  const text = done ? fmtDate(deadline) : overdue ? `Overdue ${label}` : `Due in ${label}`;
  return <Pill className={cls}>{text}</Pill>;
};

export const fmtDate = (d, withTime = false) =>
  d ? new Date(d).toLocaleString("en-GB", withTime ? { dateStyle: "medium", timeStyle: "short" } : { day: "numeric", month: "short", year: "numeric" }) : "";

export const timeAgo = (d) => {
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export const ProgressBar = ({ value = 0, className }) => (
  <div className={classNames("h-1.5 w-full rounded-full bg-[#F1EFEA] overflow-hidden", className)}>
    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

const AVATAR_COLORS = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700"];
const initials = (name = "?") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const colorFor = (name = "") => AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export const Avatar = ({ user, size = "w-8 h-8 text-xs" }) => (
  <div title={user?.name} className={classNames("rounded-full flex items-center justify-center font-semibold ring-2 ring-white shrink-0", size, colorFor(user?.name))}>
    {initials(user?.name)}
  </div>
);

export const AvatarStack = ({ users = [], max = 4 }) => (
  <div className="flex -space-x-2">
    {users.slice(0, max).map((u) => <Avatar key={u._id} user={u} size="w-7 h-7 text-[10px]" />)}
    {users.length > max && <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">+{users.length - max}</div>}
  </div>
);

export const EmptyState = ({ icon: Icon, title, hint, action }) => (
  <div className="card flex flex-col items-center justify-center text-center px-6 py-12">
    {Icon && <div className="w-11 h-11 rounded-full bg-accent-soft text-accent flex items-center justify-center mb-3"><Icon size={20} /></div>}
    <p className="font-medium text-ink">{title}</p>
    {hint && <p className="text-sm text-muted mt-1 max-w-sm">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Skeleton = ({ className }) => <div className={classNames("animate-pulse rounded-lg bg-[#F1EFEA]", className)} />;

export const SkeletonCards = ({ count = 3, className = "h-24" }) => (
  <div className="space-y-3">{Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={className} />)}</div>
);

export const Modal = ({ open, onClose, title, children, wide }) => (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/20 p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={onClose}>
        <motion.div
          className={classNames("card w-full max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-xl2", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
          initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h3 className="font-semibold text-ink">{title}</h3>
            <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close"><X size={18} /></button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger, loading, children }) => (
  <Modal open={open} onClose={onClose} title={title}>
    {message && <p className="text-sm text-muted">{message}</p>}
    {children}
    <div className="flex justify-end gap-2 mt-5">
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={loading}>{loading ? "Working…" : confirmLabel}</button>
    </div>
  </Modal>
);

export const StatCard = ({ label, value, icon: Icon, tone = "slate", hint }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-accent-soft text-accent",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && <div className={classNames("w-7 h-7 rounded-lg flex items-center justify-center", tones[tone])}><Icon size={15} /></div>}
      </div>
      <p className="text-2xl font-semibold mt-2 text-ink">{value ?? "–"}</p>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  );
};

export const Logo = ({ className }) => (
  <div className={classNames("flex items-center gap-2 font-semibold text-ink", className)}>
    <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
    </div>
    <span>TeamPulse <span className="text-accent">AI</span></span>
  </div>
);
