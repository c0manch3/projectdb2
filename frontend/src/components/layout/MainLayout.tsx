import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to main content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg outline-none ring-2 ring-blue-400 opacity-0 focus:opacity-100 pointer-events-none focus:pointer-events-auto transition-opacity"
      >
        Skip to main content
      </a>

      {/* Sidebar for desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Main content */}
        <main id="main-content" className="pb-20 lg:pb-6" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation for mobile */}
      <BottomNav />
    </div>
  );
}
