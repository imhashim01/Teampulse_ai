import React, { useState } from 'react';
import Navbar from '../components/Navbar'; // Ensure this path matches your project structure
import Sidebar from '../components/SideBar'; // Update to match your file name (SideBar vs Sidebar)
import { Outlet } from 'react-router-dom';
import classNames from 'classnames';

const LandingPage = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Dynamic padding for the content area based on sidebar state
  const contentPadding = classNames('p-4 sm:p-6', {
    'pl-[88px] sm:pl-24': isCollapsed,    // Collapsed sidebar (80px + buffer)
    'pl-[264px] sm:pl-72': !isCollapsed,  // Expanded sidebar (256px + buffer)
  });

  return (
    <>
      <Navbar />
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <main className={contentPadding}>
        <Outlet />  {/* This will render DashboardPage, Inventory, etc. */}
      </main>
    </>
  );
};

export default LandingPage;