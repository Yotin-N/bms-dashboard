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
      className={`fixed top-0 left-0 z-40 flex h-screen flex-col overflow-hidden border-r transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
        ${collapsed ? "w-14" : "w-60"}`}
    >
      {/* Logo */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex shrink-0 border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
          collapsed
            ? "h-14 items-center justify-center px-0"
            : "h-14 items-center gap-3 px-4 text-left"
        }`}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 dark:bg-slate-700 shrink-0">
          <Building2 className="w-4.5 h-4.5 text-white dark:text-slate-300" />
        </div>
        <span
          className={`overflow-hidden whitespace-nowrap text-sm font-bold text-slate-900 transition-all duration-200 dark:text-slate-100 ${
            collapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100"
          }`}
        >
          BMS Console
        </span>
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center text-sm font-medium transition-colors
              ${collapsed ? "mx-auto h-10 w-10 justify-center rounded-xl px-0 py-0" : "w-full gap-3 rounded-lg px-3 py-2.5"}
              ${
                isActive
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
                collapsed ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100"
              }`}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Theme toggle + Collapse toggle */}
      <div className="shrink-0 p-2 space-y-1 border-t border-slate-200 dark:border-slate-800">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center text-sm font-medium transition-colors
            ${collapsed ? "mx-auto h-10 w-10 justify-center rounded-xl px-0 py-0" : "w-full gap-3 rounded-lg px-3 py-2.5"}
            text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200`}
          title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
        >
          <span className="shrink-0">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </span>
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
              collapsed ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100"
            }`}
          >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className={`flex items-center text-sm font-medium transition-colors
            ${collapsed ? "mx-auto h-10 w-10 justify-center rounded-xl px-0 py-0" : "w-full gap-3 rounded-lg px-3 py-2.5"}
            text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="shrink-0">
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </span>
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
              collapsed ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100"
            }`}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  );
}
