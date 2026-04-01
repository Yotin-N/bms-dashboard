import {
  LayoutDashboard,
  Box,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, to: "/" },
  { label: "Equipment", icon: <Box className="w-5 h-5" />, to: "/equipment" },
  { label: "Settings", icon: <Settings className="w-5 h-5" />, to: "/settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen flex flex-col border-r transition-all duration-300 ease-in-out
        bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
        ${collapsed ? "w-16" : "w-60"}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 h-14 px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <Building2 className="w-4.5 h-4.5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap overflow-hidden">
            BMS Console
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-colors
              ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}
              ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Theme toggle + Collapse toggle */}
      <div className="shrink-0 p-2 space-y-1 border-t border-slate-200 dark:border-slate-800">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-colors
            ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}
            text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200`}
          title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
        >
          <span className="shrink-0">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </span>
          {!collapsed && <span className="truncate">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className={`flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-colors
            ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}
            text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="shrink-0">
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </span>
          {!collapsed && <span className="truncate">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
