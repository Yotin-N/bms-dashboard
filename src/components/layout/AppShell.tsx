import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed((value) => !value);
  const toggleMobileSidebar = () => setMobileSidebarOpen((value) => !value);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={toggleSidebar}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main area */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-[margin-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
        <Topbar onMenuClick={toggleMobileSidebar} />

        {/* Page content — scrollable */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
