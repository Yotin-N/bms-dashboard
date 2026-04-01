import { WifiOff, Loader2 } from "lucide-react";
import { useBmsStore } from "../store/bmsStore";

export function ConnectionStatus() {
  const status = useBmsStore((s) => s.status);
  const lastUpdate = useBmsStore((s) => s.lastUpdate);

  const config = {
    connected: {
      // icon: <Wifi className="w-4 h-4" />,
      label: "Connected",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    connecting: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: "Connecting...",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      dot: "bg-amber-400",
    },
    reconnecting: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: "Reconnecting...",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      dot: "bg-amber-400",
    },
    disconnected: {
      icon: <WifiOff className="w-4 h-4" />,
      label: "Disconnected",
      bg: "bg-red-500/10",
      text: "text-red-400",
      dot: "bg-red-400",
    },
  }[status];

  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.text}`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
        {config.icon}
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      {/* {clientId && (
        <span className="text-xs text-slate-500 font-mono hidden sm:inline">
          {clientId}
        </span>
      )} */}
      {lastUpdate && (
        <span className="text-xs text-slate-500 hidden md:inline">
          Last: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
