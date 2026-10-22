import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Crown } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg } from "../lib/api";
import { PageHeader, Modal, EmptyState, SkeletonCards, StatusPill, AvatarStack, ProgressBar, fmtDate, fadeIn } from "../components/ui";

const STATUSES = ["Planning", "Active", "On Hold", "Completed"];

export const ProjectForm = ({ initial = {}, onSubmit, submitLabel = "Create project" }) => {
  const [form, setForm] = useState({
    name: initial.name || "",
    description: initial.description || "",
    startDate: initial.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    targetDate: initial.targetDate?.slice(0, 10) || "",
    status: initial.status || "Planning",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Project name</label><input className="field" value={form.name} onChange={set("name")} required placeholder="e.g. Client Website Redesign" /></div>
      <div><label className="label">Description</label><textarea className="field min-h-[80px]" value={form.description} onChange={set("description")} placeholder="What does done look like?" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Start date</label><input type="date" className="field" value={form.startDate} onChange={set("startDate")} /></div>
        <div><label className="label">Target date</label><input type="date" className="field" value={form.targetDate} onChange={set("targetDate")} /></div>
      </div>
      <div><label className="label">Status</label>
        <select className="field" value={form.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="flex justify-end"><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : submitLabel}</button></div>
    </form>
  );
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = () => api.get("/projects").then((r) => setProjects(r.data.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const create = async (form) => {
    try {
      const r = await api.post("/projects", form);
      toast.success("Project created. You're the lead.");
      setOpen(false);
      navigate(`/projects/${r.data.data._id}`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <motion.div {...fadeIn}>
      <PageHeader title="Projects" subtitle="Roles are per project: you lead the ones you create."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />New project</button>} />

      {!projects ? <SkeletonCards count={3} className="h-28" /> : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" hint="Create your first project and add teammates by email." action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />New project</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map((p) => {
            const pct = p.taskCount ? Math.round((p.completedCount / p.taskCount) * 100) : 0;
            return (
              <Link key={p._id} to={`/projects/${p._id}`} className="card p-5 hover:border-[#DCD9D1] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{p.name}</p>
                    <p className="text-sm text-muted line-clamp-2 mt-0.5">{p.description || "No description"}</p>
                  </div>
                  <StatusPill status={p.status} />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <span>{p.completedCount}/{p.taskCount} tasks done</span>
                  <span>{p.targetDate ? `Target ${fmtDate(p.targetDate)}` : ""}</span>
                </div>
                <ProgressBar value={pct} className="mt-2" />
                <div className="mt-4 flex items-center justify-between">
                  <AvatarStack users={p.members} />
                  {p.isLead ? <span className="text-xs text-accent flex items-center gap-1"><Crown size={13} />You lead</span> : <span className="text-xs text-muted">Lead: {p.lead?.name}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <ProjectForm onSubmit={create} />
      </Modal>
    </motion.div>
  );
};

export default ProjectsPage;
