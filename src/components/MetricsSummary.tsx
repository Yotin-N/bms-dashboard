import { Box, Activity, AlertOctagon, CircleSlash } from "lucide-react";
import { useBmsStore } from "../store/bmsStore";

interface MetricCardProps {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor: string;
  borderClass: string;
  onClick?: () => void;
  isActive?: boolean;
}

function MetricCard({ label, value, subtitle, icon, accentColor, borderClass, onClick, isActive }: MetricCardProps) {
  const Component = onClick ? 'button' : 'div';

  // Extract color name from borderClass for active state
  const getActiveBorderClass = () => {
    if (borderClass.includes('blue')) return 'border-blue-500 dark:border-blue-400';
    if (borderClass.includes('emerald')) return 'border-emerald-500 dark:border-emerald-400';
    if (borderClass.includes('amber')) return 'border-amber-500 dark:border-amber-400';
    if (borderClass.includes('red')) return 'border-red-500 dark:border-red-400';
    return 'border-slate-500 dark:border-slate-400';
  };

  const getActiveBgClass = () => {
    if (borderClass.includes('blue')) return 'bg-blue-50 dark:bg-blue-500/10';
    if (borderClass.includes('emerald')) return 'bg-emerald-50 dark:bg-emerald-500/10';
    if (borderClass.includes('amber')) return 'bg-amber-50 dark:bg-amber-500/10';
    if (borderClass.includes('red')) return 'bg-red-50 dark:bg-red-500/10';
    return 'bg-slate-50 dark:bg-slate-500/10';
  };

  return (
    <Component
      onClick={onClick}
      className={`relative flex items-start gap-4 px-5 py-4 rounded-xl border overflow-hidden group transition-all text-left
        bg-white dark:bg-slate-900/60
        ${isActive ? `${getActiveBorderClass()} ${getActiveBgClass()}` : borderClass}
        ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:scale-[1.02] active:scale-[0.98]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${accentColor} bg-opacity-15 shrink-0 mt-0.5`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums leading-tight">
          {value.toLocaleString()}
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        {subtitle && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
    </Component>
  );
}

export function MetricsSummary() {
  const metrics = useBmsStore((s) => s.metrics);
  const filter = useBmsStore((s) => s.filter);
  const showFaultPointsOnly = useBmsStore((s) => s.showFaultPointsOnly);
  const setFilter = useBmsStore((s) => s.setFilter);
  const setShowFaultPointsOnly = useBmsStore((s) => s.setShowFaultPointsOnly);

  const handleMissingFromIvivaClick = () => {
    if (filter === "N4_ONLY") {
      setFilter("ALL");
    } else {
      setFilter("N4_ONLY");
      setShowFaultPointsOnly(false);
    }
  };

  const handleFaultPointsClick = () => {
    if (showFaultPointsOnly) {
      setShowFaultPointsOnly(false);
    } else {
      setShowFaultPointsOnly(true);
      setFilter("ALL");
    }
  };

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <MetricCard
        label="Total Assets"
        value={metrics.totalAssets}
        subtitle="Unique equipment groups"
        icon={<Box className="w-5 h-5 text-blue-400" />}
        accentColor="text-blue-400"
        borderClass="border-slate-200 dark:border-slate-700"
      />
      <MetricCard
        label="Total Points"
        value={metrics.total}
        subtitle={`${metrics.matched.toLocaleString()} matched`}
        icon={<Activity className="w-5 h-5 text-emerald-400" />}
        accentColor="text-emerald-400"
        borderClass="border-slate-200 dark:border-slate-700"
      />
      <MetricCard
        label="Missing from IVIVA"
        value={metrics.n4Only}
        subtitle="N4 Only — not in IVIVA"
        icon={<CircleSlash className="w-5 h-5 text-amber-400" />}
        accentColor="text-amber-400"
        borderClass="border-slate-200 dark:border-slate-700"
        onClick={handleMissingFromIvivaClick}
        isActive={filter === "N4_ONLY"}
      />
      <MetricCard
        label="Fault Points"
        value={metrics.faultPoints}
        subtitle="Abnormal N4 status"
        icon={<AlertOctagon className="w-5 h-5 text-red-400" />}
        accentColor="text-red-400"
        borderClass="border-slate-200 dark:border-slate-700"
        onClick={handleFaultPointsClick}
        isActive={showFaultPointsOnly}
      />
    </div>
  );
}
