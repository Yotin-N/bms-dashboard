import {
  LayoutDashboard,
  Box,
  Settings,
  Database,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../auth/AuthProvider";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, to: "/" },
  { label: "Equipment", icon: <Box className="w-5 h-5" />, to: "/equipment" },
  {
    label: "BMS Import",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    to: "/bms-import",
    adminOnly: true,
  },
  {
    label: "Mapping Dashboard",
    icon: <Database className="w-5 h-5" />,
    to: "/mapping-dashboard",
    adminOnly: true,
  },
  {
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
    to: "/settings",
    adminOnly: true,
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");
  const shellWidthClass = collapsed ? "w-60 lg:w-16" : "w-60";
  const titleClass = collapsed
    ? "max-w-[140px] opacity-100 lg:max-w-0 lg:opacity-0"
    : "max-w-[140px] opacity-100";
  const navItemClass = collapsed
    ? "w-full gap-3 rounded-lg px-3 py-2.5 lg:h-10 lg:w-10 lg:justify-center lg:self-center lg:gap-0 lg:rounded-xl lg:px-0 lg:py-0"
    : "w-full gap-3 rounded-lg px-3 py-2.5";
  const navLabelClass = collapsed
    ? "max-w-[120px] opacity-100 lg:hidden"
    : "max-w-[120px] opacity-100";

  return (
    <aside
        className={`fixed top-0 left-0 z-40 flex h-screen flex-col overflow-hidden border-r transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
        ${shellWidthClass} ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      {/* Logo */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex shrink-0 border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
          collapsed
            ? "h-14 items-center gap-3 px-4 text-left lg:justify-center lg:gap-0 lg:px-0"
            : "h-14 items-center gap-3 px-4 text-left"
        }`}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 dark:bg-slate-700 lg:self-center">
          <Building2 className="w-4.5 h-4.5 text-white dark:text-slate-300" />
        </div>
        <span
          className={`overflow-hidden whitespace-nowrap text-sm font-bold text-slate-900 transition-all duration-200 dark:text-slate-100 ${titleClass}`}
        >
          BMS Console
        </span>
      </button>

      {/* Navigation */}
      <nav
        className={`flex-1 space-y-2 overflow-x-hidden overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          collapsed ? "px-2 lg:flex lg:flex-col lg:items-center lg:px-0" : "px-2"
        }`}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center text-sm font-medium transition-colors
              ${navItemClass}
              ${
                isActive
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
            onClick={onMobileClose}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${navLabelClass}`}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Theme toggle + Collapse toggle */}
      <div
        className={`shrink-0 space-y-1 border-t border-slate-200 dark:border-slate-800 ${
          collapsed ? "p-2 lg:flex lg:flex-col lg:items-center lg:px-0" : "p-2"
        }`}
      >
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center text-sm font-medium transition-colors
            ${navItemClass}
            text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200`}
          title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </span>
          <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${navLabelClass}`}>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className={`flex items-center text-sm font-medium transition-colors
            hidden lg:flex ${collapsed ? "mx-auto h-10 w-10 justify-center rounded-xl px-0 py-0" : "w-full gap-3 rounded-lg px-3 py-2.5"}
            text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
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
