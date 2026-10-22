import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, UserPlus, ListChecks, Activity, Users, Pencil, X, Crown, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import classNames from "classnames";
import { api, errMsg } from "../lib/api";
import { Modal, EmptyState, SkeletonCards, StatusPill, PriorityPill, DeadlineChip, AvatarStack, Avatar, ProgressBar, fmtDate, timeAgo, fadeIn } from "../components/ui";
import { ProjectForm } from "./ProjectsPage";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const defaultDeadline = () => {
  const d = new Date(Date.now() + 3 * 864e5);
  d.setHours(18, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`;
};

const TaskForm = ({ members, onSubmit }) => {
  const [form, setForm] = useState({ title: "", description: "", assignees: [], priority: "Medium", deadline: defaultDeadline(), submissionInstructions: "", link: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (id) => setForm({ ...form, assignees: form.assignees.includes(id) ? form.assignees.filter((a) => a !== id) : [...form.assignees, id] });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit({ ...form, deadline: new Date(form.deadline).toISOString() }); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Title</label><input className="field" value={form.title} onChange={set("title")} required placeholder="e.g. Payment API integration" /></div>
      <div><label className="label">Description / expected outcome</label><textarea className="field min-h-[80px]" value={form.description} onChange={set("description")} /></div>
      <div>
        <label className="label">Assignees (project members)</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button type="button" key={m._id} onClick={() => toggle(m._id)}
              className={classNames("flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 text-sm", form.assignees.includes(m._id) ? "border-accent bg-accent-soft text-accent" : "border-line text-ink hover:bg-canvas")}>
              <Avatar user={m} size="w-6 h-6 text-[10px]" />{m.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Priority</label><select className="field" value={form.priority} onChange={set("priority")}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></div>
        <div><label className="label">Deadline</label><input type="datetime-local" className="field" value={form.deadline} onChange={set("deadline")} required /></div>
      </div>
      <div><label className="label">Submission instructions</label><textarea className="field" value={form.submissionInstructions} onChange={set("submissionInstructions")} placeholder="e.g. Share the PR link and a screen recording" /></div>
      <div><label className="label">Reference link (optional)</label><input className="field" value={form.link} onChange={set("link")} placeholder="https://" /></div>
      <div className="flex justify-end"><button className="btn-primary" disabled={saving}>{saving ? "Creating…" : "Create task"}</button></div>
    </form>
  );
};

const AddMember = ({ projectId, onAdded }) => {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (email.trim().length < 3) { setResults([]); return; }
    const t = setTimeout(() => api.get(`/users/search?email=${encodeURIComponent(email.trim())}`).then((r) => setResults(r.data.data)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [email]);

  const add = async (value) => {
    setAdding(true);
    try {
      const r = await api.post(`/projects/${projectId}/members`, { email: value });
      toast.success(r.data.message);
      setEmail(""); setResults([]);
      onAdded();
    } catch (e) { toast.error(errMsg(e)); } finally { setAdding(false); }
  };

  return (
    <div>
      <p className="text-sm text-muted mb-3">Search registered users by email. They will see this project right away.</p>
      <div className="flex gap-2">
        <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
        <button className="btn-primary" disabled={adding || !email.includes("@")} onClick={() => add(email)}>Add</button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 card p-1">
          {results.map((u) => (
            <button key={u._id} onClick={() => add(u.email)} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-canvas text-left">
              <Avatar user={u} size="w-7 h-7 text-[10px]" />
              <div><p className="text-sm text-ink">{u.name}</p><p className="text-xs text-muted">{u.email}</p></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [activity, setActivity] = useState(null);
  const [tab, setTab] = useState("tasks");
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, t, a] = await Promise.all([
        api.get(`/projects/${projectId}`), api.get(`/projects/${projectId}/tasks`), api.get(`/projects/${projectId}/activity`),
      ]);
      setProject(p.data.data); setTasks(t.data.data); setActivity(a.data.data);
    } catch (e) { setError(errMsg(e)); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <EmptyState title="Can't open this project" hint={error} action={<Link to="/projects" className="btn-secondary">Back to projects</Link>} />;
  if (!project) return <SkeletonCards count={3} className="h-28" />;

  const isLead = project.isLead;
  const createTask = async (form) => {
    try {
      await api.post(`/projects/${projectId}/tasks`, form);
      toast.success("Task created and assignees notified");
      setModal(null); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const updateProject = async (form) => {
    try { await api.patch(`/projects/${projectId}`, form); toast.success("Project updated"); setModal(null); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const removeMember = async (id) => {
    try { await api.delete(`/projects/${projectId}/members/${id}`); toast.success("Member removed"); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  const done = tasks.filter((t) => t.status === "Completed").length;
  const tabs = [["tasks", "Tasks", ListChecks], ["team", "Team", Users], ["activity", "Activity", Activity]];

  return (
    <motion.div {...fadeIn}>
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-4"><ArrowLeft size={15} />Projects</Link>
      <div className="card p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap"><h1 className="text-xl font-semibold text-ink">{project.name}</h1><StatusPill status={project.status} /></div>
            <p className="text-sm text-muted mt-1 max-w-2xl">{project.description}</p>
            <p className="text-xs text-muted mt-2">{fmtDate(project.startDate)} → {fmtDate(project.targetDate) || "no target date"} · Lead: {project.lead?.name}</p>
          </div>
          {isLead && (
            <div className="flex gap-2 shrink-0">
              <button className="btn-secondary" onClick={() => setModal("edit")}><Pencil size={15} />Edit</button>
              <button className="btn-primary" onClick={() => setModal("task")}><Plus size={16} />New task</button>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={tasks.length ? (done / tasks.length) * 100 : 0} className="max-w-xs" />
          <span className="text-xs text-muted">{done}/{tasks.length} done</span>
          <div className="ml-auto"><AvatarStack users={project.members} /></div>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-line">
        {tabs.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={classNames("flex items-center gap-2 px-3 py-2 text-sm -mb-px border-b-2", tab === key ? "border-accent text-accent font-medium" : "border-transparent text-muted hover:text-ink")}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === "tasks" && (tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks yet" hint={isLead ? "Break the project into tasks and assign them to members." : "Your lead hasn't created tasks yet."}
          action={isLead && <button className="btn-primary" onClick={() => setModal("task")}><Plus size={16} />New task</button>} />
      ) : (
        <div className="card divide-y divide-line">
          {tasks.map((t) => (
            <Link key={t._id} to={`/tasks/${t._id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-canvas first:rounded-t-xl2 last:rounded-b-xl2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{t.title}</p>
                <div className="flex items-center gap-2 mt-1"><ProgressBar value={t.progress} className="w-24" /><span className="text-xs text-muted">{t.progress}%</span></div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <AvatarStack users={t.assignees} max={3} />
                <PriorityPill priority={t.priority} />
                <StatusPill status={t.status} />
                <DeadlineChip deadline={t.deadline} done={t.status === "Completed"} />
              </div>
            </Link>
          ))}
        </div>
      ))}

      {tab === "team" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card divide-y divide-line">
            {project.members.map((m) => (
              <div key={m._id} className="flex items-center gap-3 px-4 py-3">
                <Avatar user={m} />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-ink">{m.name}</p><p className="text-xs text-muted truncate">{m.email}</p></div>
                {m._id === project.lead._id ? <span className="text-xs text-accent flex items-center gap-1"><Crown size={13} />Lead</span> : <span className="text-xs text-muted">Member</span>}
                {isLead && m._id !== project.lead._id && <button className="btn-ghost px-2" onClick={() => removeMember(m._id)} aria-label="Remove"><X size={15} /></button>}
              </div>
            ))}
          </div>
          {isLead && <div className="card p-5"><p className="font-medium text-ink mb-1 flex items-center gap-2"><UserPlus size={16} />Add member</p><AddMember projectId={projectId} onAdded={load} /></div>}
        </div>
      )}

      {tab === "activity" && (activity.length === 0 ? <EmptyState icon={Activity} title="No activity yet" hint="Every real action on this project shows up here." /> : (
        <div className="card p-2">
          {activity.map((a) => (
            <div key={a._id} className="flex items-start gap-3 px-3 py-2.5">
              <Avatar user={a.actor} size="w-7 h-7 text-[10px]" />
              <p className="text-sm text-ink flex-1"><span className="font-medium">{a.actor?.name}</span> {a.message}<span className="block text-xs text-muted">{timeAgo(a.createdAt)}</span></p>
            </div>
          ))}
        </div>
      ))}

      <Modal open={modal === "task"} onClose={() => setModal(null)} title="New task" wide><TaskForm members={project.members} onSubmit={createTask} /></Modal>
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Edit project"><ProjectForm initial={project} onSubmit={updateProject} submitLabel="Save changes" /></Modal>
    </motion.div>
  );
};

export default ProjectDetailPage;
