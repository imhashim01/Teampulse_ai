import { AlertTriangle, CalendarClock } from "lucide-react";
import { Avatar, Pill, ProgressBar } from "./ui";

// Static, illustrative dashboard preview for the marketing homepage.
// Not connected to any API or real team data.
const TASKS = [
  { title: "Responsive layout", owner: "Sara Khan", status: "In progress", statusCls: "bg-indigo-50 text-indigo-700", due: "Due in 4d", dueCls: "bg-slate-100 text-slate-600", progress: 60 },
  { title: "Payment integration", owner: "Ali Raza", status: "Needs attention", statusCls: "bg-amber-50 text-amber-800", due: "Due in 2d", dueCls: "bg-amber-50 text-amber-800", progress: 90, flagged: true },
  { title: "Final QA", owner: "Bilal Ahmed", status: "Awaiting review", statusCls: "bg-violet-50 text-violet-700", due: "Due in 6d", dueCls: "bg-slate-100 text-slate-600", progress: 100 },
];

const HeroPreview = () => (
  <div className="card overflow-hidden text-left select-none" aria-label="Illustrative TeamPulse dashboard preview">
    {/* Window bar */}
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-line bg-canvas">
      <span className="w-2.5 h-2.5 rounded-full bg-[#E5E3DD]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#E5E3DD]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#E5E3DD]" />
      <span className="ml-3 text-[11px] text-muted">Preview · sample data</span>
    </div>

    {/* Project header */}
    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Project</p>
        <p className="text-sm font-semibold text-ink truncate">Website Redesign</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex -space-x-2">
          {TASKS.map((t) => <Avatar key={t.owner} user={{ name: t.owner }} size="w-6 h-6 text-[9px]" />)}
        </div>
        <Pill className="bg-emerald-50 text-emerald-700">Active</Pill>
      </div>
    </div>

    {/* Task rows */}
    <div className="border-t border-line">
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2 text-[11px] font-medium text-muted">
        <span>Task</span><span className="w-28">Status</span><span className="w-20 text-right">Deadline</span>
      </div>
      {TASKS.map((t) => (
        <div key={t.title} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1.5 px-5 py-2.5 border-t border-line first:border-t-0 sm:first:border-t">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar user={{ name: t.owner }} size="w-6 h-6 text-[9px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink truncate flex items-center gap-1.5">
                {t.title}
                {t.flagged && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />}
              </p>
              <div className="flex items-center gap-2 mt-1"><ProgressBar value={t.progress} className="w-16 h-1" /><span className="text-[10px] text-muted">{t.progress}%</span></div>
            </div>
          </div>
          <div className="sm:w-28"><Pill className={`${t.statusCls} text-[11px]`}>{t.status}</Pill></div>
          <div className="col-span-2 sm:col-span-1 sm:w-20 sm:text-right"><Pill className={`${t.dueCls} text-[11px]`}>{t.due}</Pill></div>
        </div>
      ))}
    </div>

    {/* Risk insight */}
    <div className="border-t border-line bg-amber-50/40 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><AlertTriangle size={14} /></div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">Potential deadline risk</p>
          <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
            Payment integration has not received a meaningful update in three days, and its deadline is approaching.
          </p>
          <p className="text-[12px] mt-2 flex items-center gap-1.5 text-ink">
            <CalendarClock size={13} className="text-accent shrink-0" />
            <span><span className="font-medium">Suggested action:</span> Check for blockers and offer support.</span>
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default HeroPreview;
