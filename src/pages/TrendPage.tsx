import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, Plus, X, Loader2, Eye, EyeOff } from "lucide-react";
import { api, type TrendRecord } from "../services/api";
import { useBmsStore } from "../store/bmsStore";

interface PointSeries {
  displayName: string;
  color: string;
  visible: boolean;
  loading: boolean;
  data: TrendRecord[];
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setHours(start.getHours() - 24);
  return {
    startDate: start.toISOString().split("T")[0] + "T00:00:00",
    endDate: end.toISOString(),
  };
}

export function TrendPage() {
  const { displayName: paramDisplayName } = useParams<{ displayName: string }>();
  const initialDisplayName = paramDisplayName ? decodeURIComponent(paramDisplayName) : "";
  const navigate = useNavigate();

  const pointMap = useBmsStore((s) => s.pointMap);

  const [series, setSeries] = useState<PointSeries[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // Load initial point
  useEffect(() => {
    if (!initialDisplayName) return;
    loadPoint(initialDisplayName, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDisplayName]);

  const loadPoint = useCallback(
    async (displayName: string, colorIdx: number) => {
      // Check if already added
      setSeries((prev) => {
        if (prev.some((s) => s.displayName === displayName)) return prev;
        return [
          ...prev,
          {
            displayName,
            color: COLORS[colorIdx % COLORS.length],
            visible: true,
            loading: true,
            data: [],
          },
        ];
      });

      try {
        const data = await api.getTrendByDisplayName(
          displayName,
          dateRange.startDate,
          dateRange.endDate
        );
        setSeries((prev) =>
          prev.map((s) =>
            s.displayName === displayName ? { ...s, data, loading: false } : s
          )
        );
      } catch {
        setSeries((prev) =>
          prev.map((s) =>
            s.displayName === displayName ? { ...s, loading: false } : s
          )
        );
      }
    },
    [dateRange]
  );

  const removeSeries = (displayName: string) => {
    setSeries((prev) => prev.filter((s) => s.displayName !== displayName));
  };

  const toggleVisibility = (displayName: string) => {
    setSeries((prev) =>
      prev.map((s) =>
        s.displayName === displayName ? { ...s, visible: !s.visible } : s
      )
    );
  };

  // Reload all series when date range changes
  useEffect(() => {
    if (series.length === 0) return;
    const names = series.map((s) => s.displayName);
    setSeries((prev) => prev.map((s) => ({ ...s, loading: true, data: [] })));

    names.forEach(async (name) => {
      try {
        const data = await api.getTrendByDisplayName(
          name,
          dateRange.startDate,
          dateRange.endDate
        );
        setSeries((prev) =>
          prev.map((s) =>
            s.displayName === name ? { ...s, data, loading: false } : s
          )
        );
      } catch {
        setSeries((prev) =>
          prev.map((s) =>
            s.displayName === name ? { ...s, loading: false } : s
          )
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Merge all series into unified chart data keyed by timestamp
  const chartData = useMemo(() => {
    const timeMap = new Map<number, Record<string, number | null>>();
    const visibleSeries = series.filter((s) => s.visible && !s.loading);

    for (const s of visibleSeries) {
      for (const rec of s.data) {
        const ts = new Date(rec.timestamp).getTime();
        const existing = timeMap.get(ts) || { time: ts };
        existing[`${s.displayName}_bms`] = rec.n4Val != null ? parseFloat(rec.n4Val) : null;
        existing[`${s.displayName}_iviva`] = rec.ivivaVal != null ? parseFloat(rec.ivivaVal) : null;
        timeMap.set(ts, existing);
      }
    }

    return Array.from(timeMap.values()).sort(
      (a, b) => (a.time as number) - (b.time as number)
    );
  }, [series]);

  // Search candidates for adding points
  const searchResults = useMemo(() => {
    if (!addSearch.trim() || addSearch.length < 2) return [];
    const q = addSearch.toLowerCase();
    const existing = new Set(series.map((s) => s.displayName));
    return Array.from(pointMap.values())
      .filter(
        (p) =>
          !existing.has(p.displayName) &&
          (p.displayName.toLowerCase().includes(q) ||
            (p.indexCode && p.indexCode.toLowerCase().includes(q)) ||
            (p.template && p.template.toLowerCase().includes(q)))
      )
      .slice(0, 10);
  }, [addSearch, pointMap, series]);

  const isLoading = series.some((s) => s.loading);

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Trend Analysis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {series.length} point{series.length !== 1 ? "s" : ""} ·{" "}
            {chartData.length} data points
          </p>
        </div>
        <div className="flex-1" />
        {isLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-slate-500 dark:text-slate-400">From</label>
        <input
          type="datetime-local"
          value={dateRange.startDate.slice(0, 16)}
          onChange={(e) =>
            setDateRange((prev) => ({ ...prev, startDate: e.target.value + ":00" }))
          }
          className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
        <label className="text-xs text-slate-500 dark:text-slate-400">To</label>
        <input
          type="datetime-local"
          value={dateRange.endDate.slice(0, 16)}
          onChange={(e) =>
            setDateRange((prev) => ({ ...prev, endDate: e.target.value + ":00" }))
          }
          className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
        <button
          onClick={() => setDateRange(getDefaultDateRange())}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
        >
          Last 24h
        </button>
      </div>

      {/* Chart */}
      <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl bg-white dark:bg-slate-900/50 p-4" style={{ minHeight: 400 }}>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-80 text-slate-500 text-sm">
            {isLoading ? "Loading trend data..." : "No data available for this time range"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
              <XAxis
                dataKey="time"
                type="number"
                domain={["auto", "auto"]}
                tickFormatter={(ts) => {
                  const d = new Date(ts);
                  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                }}
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-slate-500 dark:text-slate-400"
                stroke="currentColor"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-slate-500 dark:text-slate-400"
                stroke="currentColor"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, #1e293b)",
                  border: "1px solid var(--tooltip-border, #334155)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "var(--tooltip-text, #e2e8f0)",
                }}
                labelFormatter={(ts) => new Date(ts as number).toLocaleString()}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => {
                  const parts = value.split("_");
                  const type = parts.pop();
                  const name = parts.join("_");
                  // shorten display name
                  const short = name.length > 30 ? name.slice(-25) : name;
                  return `${short} (${type === "bms" ? "BMS" : "IVIVA"})`;
                }}
              />
              {series
                .filter((s) => s.visible && !s.loading)
                .flatMap((s) => [
                  <Line
                    key={`${s.displayName}_bms`}
                    dataKey={`${s.displayName}_bms`}
                    name={`${s.displayName}_bms`}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />,
                  <Line
                    key={`${s.displayName}_iviva`}
                    dataKey={`${s.displayName}_iviva`}
                    name={`${s.displayName}_iviva`}
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />,
                ])}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Series Legend / Management */}
      <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl bg-white dark:bg-slate-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Points ({series.length})
          </h3>
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Point
          </button>
        </div>

        {/* Add Point Search */}
        {showAddPanel && (
          <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
            <input
              type="text"
              placeholder="Search by displayName, indexCode, template..."
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto space-y-0.5">
                {searchResults.map((p) => (
                  <button
                    key={p.displayName}
                    onClick={() => {
                      loadPoint(p.displayName, series.length);
                      setAddSearch("");
                    }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {p.displayName}
                    </span>
                    {p.template && (
                      <span className="ml-2 text-slate-400 dark:text-slate-500">
                        {p.template}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {addSearch.length >= 2 && searchResults.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">No results</p>
            )}
          </div>
        )}

        {/* Series List */}
        <div className="space-y-1">
          {series.map((s) => (
            <div
              key={s.displayName}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate block">
                  {s.displayName}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {s.loading
                    ? "Loading..."
                    : `${s.data.length} records`}
                  {" · "}
                  <span className="inline-block w-4 border-b-2" style={{ borderColor: s.color }} /> BMS
                  {" "}
                  <span className="inline-block w-4 border-b-2 border-dashed" style={{ borderColor: s.color }} /> IVIVA
                </span>
              </div>
              <button
                onClick={() => toggleVisibility(s.displayName)}
                className={`p-1 rounded transition-colors ${
                  s.visible
                    ? "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    : "text-slate-300 dark:text-slate-600"
                }`}
                title={s.visible ? "Hide" : "Show"}
              >
                {s.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              {series.length > 1 && (
                <button
                  onClick={() => removeSeries(s.displayName)}
                  className="p-1 rounded text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
