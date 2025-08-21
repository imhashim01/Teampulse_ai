import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Settings = () => {
  // State for settings
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Function to save changes
  const handleSaveChanges = () => {
    alert('Settings saved!');
    // Add your API call or save logic here
  };

  return (
<div className=' pt-24'>
<motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4 sm:p-6"
    >
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
          Settings
        </h1>
      </div>

      {/* Account Settings */}
      <motion.div
        className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354] mb-6 sm:mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Account Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm sm:text-base mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 bg-[#282354] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7d98d1]"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm sm:text-base mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-[#282354] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7d98d1]"
            />
          </div>
        </div>
      </motion.div>

      {/* Notification Preferences */}
      <motion.div
        className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354] mb-6 sm:mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm sm:text-base">Email Notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={() => setEmailNotifications(!emailNotifications)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#7d98d1] rounded-full peer dark:bg-gray-700 peer-checked:bg-[#7d98d1]"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm sm:text-base">Push Notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={() => setPushNotifications(!pushNotifications)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#7d98d1] rounded-full peer dark:bg-gray-700 peer-checked:bg-[#7d98d1]"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Theme Customization */}
      <motion.div
        className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354] mb-6 sm:mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Theme Customization</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="form-radio text-[#7d98d1]"
              />
              <span className="text-gray-300 text-sm sm:text-base">Dark Theme</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="form-radio text-[#7d98d1]"
              />
              <span className="text-gray-300 text-sm sm:text-base">Light Theme</span>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Save Changes Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveChanges}
          className="px-4 py-2 bg-gradient-to-r from-[#7d98d1] to-[#282354] text-white font-bold rounded-lg hover:from-[#282354] hover:to-[#7d98d1]"
        >
          Save Changes
        </button>
      </div>
    </motion.div>
</div>
  );
};

export default Settings;