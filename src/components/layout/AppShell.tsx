import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const toggleSidebar = () => setSidebarCollapsed((value) => !value);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Main area */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-[margin-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sidebarCollapsed ? "ml-14" : "ml-60"
        }`}
      >
        <Topbar onMenuClick={toggleSidebar} />

        {/* Page content — scrollable */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
