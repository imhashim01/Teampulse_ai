import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/SideBar';

// App layout shell: slim sidebar (drawer on mobile) + top bar + page content
const LandingPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="lg:pl-60">
        <Navbar onMenu={() => setDrawerOpen(true)} />
        <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
