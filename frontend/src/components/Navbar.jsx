import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { Avatar } from './ui';

const Navbar = ({ onMenu }) => {
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Refresh the unread count on navigation and every 30s
  useEffect(() => {
    let alive = true;
    const load = () => api.get('/notifications/unread-count')
      .then((r) => alive && setUnread(r.data.data.unread))
      .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    window.addEventListener('notifications:changed', load);
    return () => { alive = false; clearInterval(id); window.removeEventListener('notifications:changed', load); };
  }, [location.pathname]);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/my-tasks?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur border-b border-line">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-14">
        <button className="lg:hidden btn-ghost px-2" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
        <form onSubmit={onSearch} className="flex-1 max-w-md relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my tasks…" className="field pl-9 py-1.5 bg-white" />
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/notifications" className="relative btn-ghost px-2" aria-label="Notifications">
            <Bell size={19} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white">
            <Avatar user={user} />
            <span className="hidden sm:block text-sm font-medium text-ink">{user?.name?.split(' ')[0]}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
