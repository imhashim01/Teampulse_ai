import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, CheckCircle2, Loader, AlarmClock, Inbox, Ban, Radar, ListChecks, CalendarClock, RotateCcw, Bell, Activity } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { PageHeader, StatCard, SkeletonCards, Skeleton, StatusPill, DeadlineChip, AvatarStack, Avatar, LevelBadge, EmptyState, timeAgo, fadeIn } from "../components/ui";

const Section = ({ title, icon: Icon, action, children }) => (
  <div className="card">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">{Icon && <Icon size={16} className="text-muted" />}{title}</div>
      {action}
    </div>
    <div className="p-2">{children}</div>
  </div>
);

const Empty = ({ text }) => <p className="text-sm text-muted px-3 py-6 text-center">{text}</p>;

const TaskRow = ({ task, showAssignees }) => (
  <Link to={`/tasks/${task._id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-canvas">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-ink truncate">{task.title}</p>
      <p className="text-xs text-muted truncate">{task.project?.name}</p>
    </div>
    {showAssignees && <AvatarStack users={task.assignees} max={3} />}
    <StatusPill status={task.status} />
    <DeadlineChip deadline={task.deadline} done={task.status === "Completed"} />
  </Link>
);

const DashboardPage = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data.data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!data) {
    return (
      <div>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <SkeletonCards count={2} className="h-48" />
      </div>
    );
  }

  const { lead, member, isLead } = data;

  return (
    <motion.div {...fadeIn}>
      <PageHeader title={`${greeting}, ${user?.name?.split(" ")[0]}`} subtitle={isLead ? "Here is how your team is really doing today." : "Here is what is on your plate."} />

      {!isLead && member.myTasks === 0 && (
        <EmptyState icon={FolderKanban} title="No projects yet" hint="Create a project to lead a team, or ask your lead to add you by email." action={<Link to="/projects" className="btn-primary">Go to projects</Link>} />
      )}

      {isLead && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Active projects" value={lead.activeProjects} icon={FolderKanban} tone="indigo" hint={`${lead.totalProjects} total`} />
            <StatCard label="Total tasks" value={lead.totalTasks} icon={ListChecks} />
            <StatCard label="Completed" value={lead.completed} icon={CheckCircle2} tone="green" />
            <StatCard label="In progress" value={lead.inProgress} icon={Loader} tone="indigo" />
            <StatCard label="Overdue" value={lead.overdue} icon={AlarmClock} tone="red" />
            <StatCard label="Waiting for review" value={lead.awaitingReview} icon={Inbox} tone="violet" />
            <StatCard label="Blocked" value={lead.blocked} icon={Ban} tone="red" />
            <StatCard label="At risk" value={lead.atRisk} icon={Radar} tone="amber" hint={`${lead.atRiskHigh} high`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <Section title="Ji Sir Detector" icon={Radar} action={<Link to="/ji-sir" className="text-xs text-accent hover:underline">Open</Link>}>
              {lead.riskItems.length === 0 ? <Empty text="No at-risk tasks right now. Open the detector to run an analysis." /> : lead.riskItems.map((r) => (
                <Link key={r._id} to="/ji-sir" className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-canvas">
                  <Avatar user={r.member} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{r.task?.title}</p>
                    <p className="text-xs text-muted truncate">{r.member?.name} · {r.category}</p>
                  </div>
                  <LevelBadge level={r.level} />
                </Link>
              ))}
            </Section>
            <Section title="Submissions waiting for review" icon={Inbox}>
              {lead.reviewQueue.length === 0 ? <Empty text="Nothing to review." /> : lead.reviewQueue.map((t) => <TaskRow key={t._id} task={t} showAssignees />)}
            </Section>
            <Section title="Upcoming deadlines (7 days)" icon={CalendarClock}>
              {lead.upcomingDeadlines.length === 0 ? <Empty text="No deadlines in the next 7 days." /> : lead.upcomingDeadlines.map((t) => <TaskRow key={t._id} task={t} showAssignees />)}
            </Section>
            <Section title="Recent activity" icon={Activity}>
              {lead.recentActivity.length === 0 ? <Empty text="No activity yet." /> : lead.recentActivity.map((a) => (
                <div key={a._id} className="flex items-start gap-3 px-3 py-2.5">
                  <Avatar user={a.actor} size="w-7 h-7 text-[10px]" />
                  <p className="text-sm text-ink flex-1"><span className="font-medium">{a.actor?.name}</span> {a.message}
                    <span className="block text-xs text-muted">{a.project?.name} · {timeAgo(a.createdAt)}</span>
                  </p>
                </div>
              ))}
            </Section>
          </div>
        </>
      )}

      {member.myTasks > 0 && (
        <>
          <h2 className="text-sm font-semibold text-ink mb-3">My work</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard label="My open tasks" value={member.myTasks} icon={ListChecks} tone="indigo" />
            <StatCard label="Due in 48h" value={member.dueSoon} icon={CalendarClock} tone="amber" />
            <StatCard label="Overdue" value={member.overdue} icon={AlarmClock} tone="red" />
            <StatCard label="Revision requests" value={member.revisionRequests} icon={RotateCcw} tone="violet" />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Section title="My tasks" icon={ListChecks} action={<Link to="/my-tasks" className="text-xs text-accent hover:underline">View all</Link>}>
              {member.tasks.length === 0 ? <Empty text="No open tasks assigned to you." /> : member.tasks.map((t) => <TaskRow key={t._id} task={t} />)}
            </Section>
            <Section title="Recent notifications" icon={Bell} action={<Link to="/notifications" className="text-xs text-accent hover:underline">View all</Link>}>
              {member.recentNotifications.length === 0 ? <Empty text="You're all caught up." /> : member.recentNotifications.map((n) => (
                <Link key={n._id} to={n.task ? `/tasks/${n.task}` : "/notifications"} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-canvas">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-accent"}`} />
                  <p className="text-sm text-ink flex-1">{n.message}<span className="block text-xs text-muted">{timeAgo(n.createdAt)}</span></p>
                </Link>
              ))}
            </Section>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default DashboardPage;
