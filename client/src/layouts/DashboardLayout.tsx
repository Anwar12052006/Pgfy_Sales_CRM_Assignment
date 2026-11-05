import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Header } from '@/components/common';

/**
 * DashboardLayout
 * Fixed/collapsible navy sidebar (#111827), sticky top header, and
 * light-gray (#F8FAFC) main scrollable canvas for CRM views.
 */
export const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main App Canvas */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
