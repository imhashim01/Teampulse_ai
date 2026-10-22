import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ListChecks, X } from "lucide-react";
import toast from "react-hot-toast";
import classNames from "classnames";
import { api, errMsg } from "../lib/api";
import { PageHeader, EmptyState, SkeletonCards, StatusPill, PriorityPill, DeadlineChip, ProgressBar, fadeIn } from "../components/ui";

const FILTERS = ["Open", "Due soon", "Revision Required", "Completed", "All"];

const MyTasksPage = () => {
  const [tasks, setTasks] = useState(null);
  const [filter, setFilter] = useState("Open");
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") || "").toLowerCase();

  useEffect(() => { api.get("/tasks/mine").then((r) => setTasks(r.data.data)).catch((e) => toast.error(errMsg(e))); }, []);

  const now = Date.now();
  const shown = (tasks || []).filter((t) => {
    if (q && !`${t.title} ${t.project?.name}`.toLowerCase().includes(q)) return false;
    if (filter === "Open") return t.status !== "Completed";
    if (filter === "Due soon") return t.status !== "Completed" && new Date(t.deadline) - now < 48 * 36e5;
    if (filter === "Revision Required") return t.status === "Revision Required";
    if (filter === "Completed") return t.status === "Completed";
    return true;
  });

  return (
    <motion.div {...fadeIn}>
      <PageHeader title="My Tasks" subtitle="Everything assigned to you across projects." />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={classNames("rounded-full px-3 py-1 text-sm border", filter === f ? "bg-accent-soft border-accent/30 text-accent" : "bg-white border-line text-muted hover:text-ink")}>{f}</button>
        ))}
        {q && <button onClick={() => setParams({})} className="ml-auto inline-flex items-center gap-1 text-sm text-muted hover:text-ink">Search: “{q}” <X size={14} /></button>}
      </div>

      {!tasks ? <SkeletonCards count={4} className="h-16" /> : shown.length === 0 ? (
        <EmptyState icon={ListChecks} title={tasks.length ? "Nothing matches this filter" : "No tasks assigned to you"} hint={tasks.length ? "Try another filter." : "When a lead assigns you a task it shows up here."}
          action={!tasks.length && <Link to="/projects" className="btn-secondary">View projects</Link>} />
      ) : (
        <div className="card divide-y divide-line">
          {shown.map((t) => (
            <Link key={t._id} to={`/tasks/${t._id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-canvas first:rounded-t-xl2 last:rounded-b-xl2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{t.title}</p>
                <p className="text-xs text-muted truncate">{t.project?.name}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 w-28"><ProgressBar value={t.progress} /><span className="text-xs text-muted">{t.progress}%</span></div>
                <PriorityPill priority={t.priority} />
                <StatusPill status={t.status} />
                <DeadlineChip deadline={t.deadline} done={t.status === "Completed"} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default MyTasksPage;
