import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ChevronRight, Home, Box, BarChart, Wallet, User, Settings, LogOut } from 'lucide-react';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed left-0 top-[60px] sm:top-[76px] h-[calc(100vh-60px)] sm:h-[calc(100vh-76px)] flex items-center z-40">
      <motion.div
        initial={{ width: 80 }}
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-[#0e0b21] border-r border-[#282354] h-full p-4 flex flex-col relative"
      >
        <button
          onClick={toggleSidebar}
          className="absolute left-full top-1/2 transform -translate-y-1/2 bg-[#0e0b21] p-2 rounded-r-lg text-[#7d98d1]"
        >
          <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }}>
            <ChevronRight size={24} />
          </motion.div>
        </button>

        <nav className="flex flex-col space-y-4 mt-10">
          <Link to="/dashboard" className="flex items-center text-gray-300 hover:text-[#7d98d1] p-2 rounded-lg hover:bg-[#282354]">
            <Home className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">Dashboard</span>}
          </Link>
          <Link to="/inventory" className="flex items-center text-gray-300 hover:text-[#7d98d1] p-2 rounded-lg hover:bg-[#282354]">
            <Box className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">Inventory</span>}
          </Link>
          <Link to="/sales" className="flex items-center text-gray-300 hover:text-[#7d98d1] p-2 rounded-lg hover:bg-[#282354]">
            <BarChart className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">Sales Report</span>}
          </Link>
          <Link to="/finance" className="flex items-center text-gray-300 hover:text-[#7d98d1] p-2 rounded-lg hover:bg-[#282354]">
            <Wallet className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">Finance Manager</span>}
          </Link>
        </nav>

        <div className="border-t border-[#282354] my-6" />

        <nav className="flex flex-col space-y-4">
          <Link to="/profile" className="flex items-center text-gray-300 hover:text-[#7d98d1] p-2 rounded-lg hover:bg-[#282354]">
            <User className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">Profile</span>}
          </Link>
          <Link to="/settings" className="flex items-center text-gray-300 hover:text-[#7d98d1] p-2 rounded-lg hover:bg-[#282354]">
            <Settings className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">Settings</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-300 hover:text-[#7d98d1] p-2 rounded-lg hover:bg-[#282354]"
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">Logout</span>}
          </button>
        </nav>
      </motion.div>
    </div>
  );
};

export default Sidebar;