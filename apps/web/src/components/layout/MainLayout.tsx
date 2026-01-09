// ================================================================
// Main Layout Component
// ================================================================

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <Header onMenuClick={() => setSidebarOpen(true)} />

      <main className="md:pl-64 md:pt-16 p-[0px]">
        <div className="container mx-auto px-4 py-4 md:px-6 md:py-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}