import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, CheckCheck, MessageCircle, AlarmClock } from "lucide-react";
import toast from "react-hot-toast";
import classNames from "classnames";
import { api, errMsg } from "../lib/api";
import { PageHeader, EmptyState, SkeletonCards, Pill, timeAgo, fmtDate, fadeIn } from "../components/ui";

const DELIVERY_STYLES = {
  Sent: "bg-emerald-50 text-emerald-700",
  Simulated: "bg-sky-50 text-sky-700",
  Failed: "bg-red-50 text-red-700",
  Pending: "bg-slate-100 text-slate-600",
};

const NotificationPage = () => {
  const [data, setData] = useState(null);
  const [log, setLog] = useState(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/notifications");
      setData(r.data.data);
      const d = await api.get("/deliveries");
      setLog(d.data.data);
    } catch (e) { toast.error(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changed = () => { load(); window.dispatchEvent(new Event("notifications:changed")); };
  const markRead = async (id) => { try { await api.patch(`/notifications/${id}/read`); changed(); } catch (e) { toast.error(errMsg(e)); } };
  const markAll = async () => { try { await api.patch("/notifications/read-all"); toast.success("All caught up"); changed(); } catch (e) { toast.error(errMsg(e)); } };
  const runReminders = async () => {
    setRunning(true);
    try { const r = await api.post("/jobs/reminders/run"); toast.success(r.data.message); changed(); } catch (e) { toast.error(errMsg(e)); } finally { setRunning(false); }
  };

  // Only leads have projects in the delivery log; show the section if they lead anything
  const [isLead, setIsLead] = useState(false);
  useEffect(() => { api.get("/projects").then((r) => setIsLead(r.data.data.some((p) => p.isLead))).catch(() => {}); }, []);

  return (
    <motion.div {...fadeIn}>
      <PageHeader title="Notifications" subtitle={data ? `${data.unread} unread` : " "}
        action={data?.unread > 0 && <button className="btn-secondary" onClick={markAll}><CheckCheck size={15} />Mark all as read</button>} />

      {!data ? <SkeletonCards count={4} className="h-14" /> : data.notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" hint="Assignments, reviews and reminders will show up here." />
      ) : (
        <div className="card divide-y divide-line">
          {data.notifications.map((n) => (
            <div key={n._id} className={classNames("flex items-start gap-3 px-4 py-3", !n.read && "bg-accent-soft/40")}>
              <span className={classNames("mt-1.5 w-2 h-2 rounded-full shrink-0", n.read ? "bg-transparent" : "bg-accent")} />
              <div className="flex-1 min-w-0">
                {n.task ? <Link to={`/tasks/${n.task._id}`} onClick={() => !n.read && markRead(n._id)} className="text-sm text-ink hover:text-accent">{n.message}</Link> : <p className="text-sm text-ink">{n.message}</p>}
                <p className="text-xs text-muted mt-0.5">{n.project?.name ? `${n.project.name} · ` : ""}{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => markRead(n._id)}>Mark read</button>}
            </div>
          ))}
        </div>
      )}

      {isLead && (
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2"><MessageCircle size={18} className="text-[#128C7E]" />Notification log</h2>
              <p className="text-sm text-muted">Every WhatsApp delivery for projects you lead.
                {log && <> Mode: <span className="font-medium text-ink">{log.whatsappMode === "mock" ? "Mock (no credentials, nothing is really sent)" : log.whatsappMode === "template" ? "Live, template messages" : "Live, text messages"}</span></>}
              </p>
            </div>
            <button className="btn-primary" onClick={runReminders} disabled={running}><AlarmClock size={15} />{running ? "Running…" : "Run reminders now"}</button>
          </div>
          {!log ? <SkeletonCards count={3} className="h-12" /> : log.deliveries.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No deliveries yet" hint="Assign a task, request a revision or run reminders to see deliveries here." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted border-b border-line">
                  <th className="px-4 py-2.5 font-medium">When</th><th className="px-4 py-2.5 font-medium">Event</th><th className="px-4 py-2.5 font-medium">Recipient</th>
                  <th className="px-4 py-2.5 font-medium">Task</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Attempts</th>
                </tr></thead>
                <tbody>
                  {log.deliveries.map((d) => (
                    <tr key={d._id} className="border-b border-line last:border-0 align-top">
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted" title={fmtDate(d.createdAt, true)}>{timeAgo(d.createdAt)}</td>
                      <td className="px-4 py-2.5"><Pill className="bg-slate-100 text-slate-700">{d.event}</Pill></td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{d.recipient?.name}<span className="block text-xs text-muted">{d.to || "no phone"}</span></td>
                      <td className="px-4 py-2.5 max-w-[240px]"><span className="line-clamp-1">{d.task?.title}</span><span className="block text-xs text-muted line-clamp-2" title={d.message}>{d.message}</span></td>
                      <td className="px-4 py-2.5"><Pill className={DELIVERY_STYLES[d.status]}>{d.status}</Pill>{d.error && <span className="block text-xs text-red-600 mt-1 max-w-[200px]">{d.error}</span>}</td>
                      <td className="px-4 py-2.5 text-muted">{d.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default NotificationPage;
