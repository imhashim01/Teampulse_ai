import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User, Bell, Mail } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  // Example states - replace with actual message count logic
  const [unreadNotifications, setUnreadNotifications] = useState(2);
  const [unreadMessages, setUnreadMessages] = useState(3);

  return (
    <motion.nav
      initial={{ y: -20 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 bg-[#0e0b21] border-b border-[#282354] p-4 sm:p-6 z-50"
    >
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="text-2xl font-bold bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
          Placeholder
        </div>
        <ul className="flex flex-row space-x-2 sm:space-x-4">
          <NavItem 
            icon={Bell} 
            to="/notification" 
            unreadCount={unreadNotifications}
          />
          <NavItem 
            icon={Mail} 
            to="/messages" 
            unreadCount={unreadMessages}
          />
          <NavItem icon={User} to="/profile" />
        </ul>
      </div>
    </motion.nav>
  );
};

const NavItem = ({ icon: Icon, to, unreadCount }) => {
  return (
    <Link
      to={to}
      className="flex items-center text-gray-300 hover:text-white p-2 rounded-lg transition duration-200 hover:bg-[#172542] relative"
    >
      <Icon size={20} />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: 'spring',
            stiffness: 260,
            damping: 20
          }}
          className="absolute -top-1 -right-1 bg-gradient-to-r from-[#7d98d1] to-[#282354] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
        >
          {unreadCount}
        </motion.span>
      )}
    </Link>
  );
};

export default Navbar;