import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, FolderKanban, ListChecks, Radar, Bell, Settings, LogOut, User } from 'lucide-react';
import classNames from 'classnames';
import { useAuthStore } from '../store/authStore';
import { Logo } from './ui';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/my-tasks', label: 'My Tasks', icon: ListChecks },
  { to: '/risk-radar', label: 'Risk Radar', icon: Radar },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const SidebarContent = ({ onNavigate }) => {
  const { logout } = useAuthStore();
  const linkClass = ({ isActive }) => classNames(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
    isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-canvas hover:text-ink'
  );

  return (
    <div className="flex h-full flex-col bg-white border-r border-line px-3 py-5">
      <Logo className="px-2 mb-8" />
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={onNavigate}>
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
        <NavLink to="/profile" className={linkClass} onClick={onNavigate}>
          <User size={17} /><span>Profile</span>
        </NavLink>
        <button onClick={logout} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-canvas hover:text-ink">
          <LogOut size={17} /><span>Log out</span>
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ open, onClose }) => (
  <>
    <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 z-40">
      <SidebarContent />
    </aside>
    <AnimatePresence>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
          <motion.aside className="absolute inset-y-0 left-0 w-64" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ duration: 0.2 }}>
            <SidebarContent onNavigate={onClose} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  </>
);

export default Sidebar;
