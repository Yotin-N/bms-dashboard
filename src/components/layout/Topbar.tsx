import { Menu, UserCircle } from "lucide-react";
import { useBmsStore } from "../../store/bmsStore";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const status = useBmsStore((s) => s.status);
  const lastUpdate = useBmsStore((s) => s.lastUpdate);

  const statusConfig = {
    connected: { dot: "bg-emerald-500", label: "Connected" },
    connecting: { dot: "bg-amber-500 animate-pulse", label: "Connecting..." },
    reconnecting: { dot: "bg-amber-500 animate-pulse", label: "Reconnecting..." },
    disconnected: { dot: "bg-red-500", label: "Disconnected" },
  }[status];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      {/* Left: Menu toggle (mobile) + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Dashboard
          </h1>
        </div>
      </div>

      {/* Right: Status + Last update + User */}
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
          <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {statusConfig.label}
          </span>
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-500">
            Last: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        )}

        {/* User Icon */}
        <button className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <UserCircle className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
