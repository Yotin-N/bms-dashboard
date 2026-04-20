import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
  Customized,
} from "recharts";
import {
  ArrowLeft,
  X,
  Eye,
  RefreshCw,
  Search,
  ChevronDown,
  Check,
  Calendar,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { api, type TrendRecord } from "../services/api";
import { useAuth } from "../auth/AuthProvider";
import { useBmsStore } from "../store/bmsStore";
import { useBmsSocket } from "../hooks/useBmsSocket";
import { useTheme } from "../hooks/useTheme";

type LineKind = "bms" | "iviva";

interface PointSeries {
  displayName: string;
  color: string;
  visible: boolean;
  loading: boolean;
  data: TrendRecord[];
}

interface ChartDatum {
  time: number;
  [key: string]: number | null | { template?: string };
}

interface ZoomRange {
  start: number;
  end: number;
}

interface LineLegendItem {
  key: string;
  displayName: string;
  pointName: string;
  shortLabel: string;
  kind: LineKind;
  color: string;
}

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | string | null;
}

interface BrushRange {
  startIndex?: number;
  endIndex?: number;
}

const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

function getIvivaColor(baseColor: string): string {
  const colorMap: Record<string, string> = {
    "#3b82f6": "#06b6d4",
    "#10b981": "#84cc16",
    "#f59e0b": "#f97316",
    "#ef4444": "#ec4899",
    "#8b5cf6": "#6366f1",
    "#ec4899": "#ef4444",
    "#06b6d4": "#3b82f6",
    "#84cc16": "#10b981",
    "#f97316": "#f59e0b",
    "#6366f1": "#8b5cf6",
  };
  return colorMap[baseColor] || "#94a3b8";
}

function getThemeLineColor(color: string, isDark: boolean) {
  const lightMap: Record<string, string> = {
    "#3b82f6": "#2563eb",
    "#10b981": "#059669",
    "#f59e0b": "#d97706",
    "#ef4444": "#dc2626",
    "#8b5cf6": "#7c3aed",
    "#ec4899": "#db2777",
    "#06b6d4": "#0891b2",
    "#84cc16": "#65a30d",
    "#f97316": "#ea580c",
    "#6366f1": "#4f46e5",
  };

  const darkMap: Record<string, string> = {
    "#3b82f6": "#60a5fa",
    "#10b981": "#34d399",
    "#f59e0b": "#fbbf24",
    "#ef4444": "#f87171",
    "#8b5cf6": "#a78bfa",
    "#ec4899": "#f472b6",
    "#06b6d4": "#22d3ee",
    "#84cc16": "#a3e635",
    "#f97316": "#fb923c",
    "#6366f1": "#818cf8",
  };

  return isDark ? darkMap[color] || color : lightMap[color] || color;
}

function getBangkokDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function toBangkokDateTimeString(date: Date, includeSeconds = true) {
  const parts = getBangkokDateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}${includeSeconds ? `:${parts.second}` : ""}`;
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - DAY_IN_MS);
  return {
    startDate: toBangkokDateTimeString(start),
    endDate: toBangkokDateTimeString(end),
  };
}

function makeLineKey(displayName: string, kind: LineKind) {
  return `${displayName}::${kind}`;
}

function parseLineKey(lineKey: string): { displayName: string; kind: LineKind } {
  const separatorIndex = lineKey.lastIndexOf("::");
  const displayName = separatorIndex >= 0 ? lineKey.slice(0, separatorIndex) : lineKey;
  const kind = separatorIndex >= 0 ? lineKey.slice(separatorIndex + 2) : "bms";

  return {
    displayName,
    kind: kind === "iviva" ? "iviva" : "bms",
  };
}

function formatXAxisLabel(timestamp: number, rangeMs: number) {
  if (rangeMs <= 36 * 60 * 60 * 1000) {
    return new Date(timestamp).toLocaleTimeString([], {
      timeZone: BANGKOK_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return new Date(timestamp).toLocaleString([], {
    timeZone: BANGKOK_TIME_ZONE,
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullTime(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 3,
  }).format(value);
}

function parseTrendNumber(value: string | null) {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getPointNameFromSnapshot(point: { template: string | null; displayName: string }) {
  return point.template?.trim() || point.displayName;
}

function getShortPointName(pointName: string) {
  if (pointName.length <= 32) return pointName;
  return `${pointName.slice(0, 16)}...${pointName.slice(-10)}`;
}

function getSmartYDomain(values: number[]): [number | "auto", number | "auto"] {
  if (values.length === 0) return ["auto", "auto"];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const pad = Math.abs(min || 1) * 0.1;
    return [min - pad, max + pad];
  }

  const range = max - min;
  const pad = range * 0.1;
  const minNearZero = Math.abs(min) <= range * 0.1;
  const maxNearZero = Math.abs(max) <= range * 0.1;
  const crossesZero = min <= 0 && max >= 0;
  const shouldIncludeZero = crossesZero || minNearZero || maxNearZero;

  return [shouldIncludeZero ? 0 : min - pad, max + pad];
}

function normalizeZoomRange(start: number | null, end: number | null): ZoomRange | null {
  if (start == null || end == null || start === end) return null;
  return start < end ? { start, end } : { start: end, end: start };
}

function getXAxisTicks(data: ChartDatum[], chartWidth: number) {
  if (data.length <= 1) return data.map((entry) => entry.time);

  const min = data[0]?.time;
  const max = data[data.length - 1]?.time;
  if (min == null || max == null || min === max) return [min ?? max].filter(Boolean) as number[];

  const targetTickCount = Math.max(4, Math.min(8, Math.round(chartWidth / 160)));
  const step = (max - min) / (targetTickCount - 1);

  return Array.from({ length: targetTickCount }, (_, index) => {
    if (index === targetTickCount - 1) return max;
    return min + step * index;
  });
}

function TooltipContent({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
  isDark: boolean;
}) {
  if (!active || !payload?.length || typeof label !== "number") return null;

  const rows = payload
    .filter(
      (entry): entry is TooltipEntry & { name: string; value: number } =>
        typeof entry.name === "string" && typeof entry.value === "number",
    )
    .map((entry) => {
      const { displayName, kind } = parseLineKey(entry.name);
      // Access point metadata from the chart data payload
      const pointMetadata = (entry as TooltipEntry & { payload?: ChartDatum }).payload?.[`${entry.name}_point`];
      const pointName =
        pointMetadata && typeof pointMetadata === "object" && "template" in pointMetadata
          ? pointMetadata.template || displayName
          : displayName;
      return {
        color: entry.color,
        displayName,
        pointName,
        shortLabel: pointName,
        kind,
        value: entry.value,
      };
    })
    .sort((a, b) => {
      const nameCompare = a.pointName.localeCompare(b.pointName);
      if (nameCompare !== 0) return nameCompare;
      return a.kind.localeCompare(b.kind);
    });

  if (rows.length === 0) return null;

  return (
    <div
      className="max-w-[280px] rounded-xl p-2.5 shadow-xl backdrop-blur-sm"
      style={{
        border: `1px solid ${isDark ? "rgba(71, 85, 105, 0.9)" : "rgba(203, 213, 225, 0.9)"}`,
        background: isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.96)",
        boxShadow: isDark
          ? "0 18px 40px rgba(2, 6, 23, 0.35)"
          : "0 18px 40px rgba(15, 23, 42, 0.12)",
      }}
    >
      <div className="mb-2 border-b border-slate-200 pb-1.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {formatFullTime(label)}
      </div>
      <div className="max-h-48 space-y-0.5 overflow-auto">
        {rows.map((row) => (
          <div
            key={`${row.displayName}-${row.kind}`}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
          >
            <span
              className="w-5 shrink-0 border-t-2"
              style={{
                borderColor: row.color,
                borderTopStyle: row.kind === "iviva" ? "dashed" : "solid",
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-medium text-slate-700 dark:text-slate-200">
                {row.shortLabel}
              </div>
              <div className="text-[9px] uppercase text-slate-400 dark:text-slate-500">
                {row.kind === "bms" ? "BMS" : "IVIVA"}
              </div>
            </div>
            <div className="text-[10px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {formatNumber(row.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegendItem({
  item,
  active,
  onToggle,
}: {
  item: LineLegendItem;
  active: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item.key)}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
        active
          ? "bg-white text-slate-700 shadow-sm hover:-translate-y-px dark:bg-slate-900 dark:text-slate-200"
          : "border-slate-200 bg-slate-100/80 text-slate-400 opacity-75 hover:opacity-100 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-500"
      }`}
      style={
        active
          ? {
              borderColor: `${item.color}55`,
              boxShadow: `inset 0 0 0 1px ${item.color}22`,
            }
          : undefined
      }
      title={`${active ? "Hide" : "Show"} ${item.pointName} ${item.kind.toUpperCase()}`}
    >
      <span
        className="w-5 shrink-0 border-t-2"
        style={{
          borderColor: item.color,
          borderTopStyle: item.kind === "iviva" ? "dashed" : "solid",
        }}
      />
      <span className="truncate max-w-[120px]">{item.shortLabel}</span>
      <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {item.kind === "bms" ? "BMS" : "IVIVA"}
      </span>
    </button>
  );
}


export function TrendPage() {
  const { accessToken } = useAuth();
  const { displayName: paramDisplayName } = useParams<{ displayName: string }>();
  const initialDisplayName = paramDisplayName ? decodeURIComponent(paramDisplayName) : "";
  const navigate = useNavigate();

  useBmsSocket("ALL");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pointMap = useBmsStore((s) => s.pointMap);
  const getPointName = useCallback(
    (displayName: string) => {
      const point = pointMap.get(displayName);
      return point ? getPointNameFromSnapshot(point) : displayName;
    },
    [pointMap],
  );

  const [series, setSeries] = useState<PointSeries[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [hiddenLineKeys, setHiddenLineKeys] = useState<string[]>([]);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);
  const [dragEndTime, setDragEndTime] = useState<number | null>(null);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const addDropdownRef = useRef<HTMLDivElement | null>(null);
  const chartAreaRef = useRef<HTMLDivElement | null>(null);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);
  const [chartWidth, setChartWidth] = useState(960);
  const seriesNamesKey = useMemo(
    () => series.map((entry) => entry.displayName).join("\u0000"),
    [series],
  );

  const resetZoom = useCallback(() => {
    setZoomRange(null);
    setDragStartTime(null);
    setDragEndTime(null);
  }, []);

  const updateDateRange = useCallback(
    (next: { startDate: string; endDate: string }) => {
      setDateRange(next);
      resetZoom();
    },
    [resetZoom],
  );

  const openNativeDateTimePicker = useCallback((input: HTMLInputElement | null) => {
    if (!input) return;

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }

    input.focus();
    input.click();
  }, []);

  const loadPoint = useCallback(
    async (displayName: string, colorIdx: number) => {
      setSeries((prev) => {
        if (prev.some((entry) => entry.displayName === displayName)) return prev;
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
        if (!accessToken) return;
        const data = await api.getTrendByDisplayName(
          accessToken,
          displayName,
          dateRange.startDate,
          dateRange.endDate,
        );
        setSeries((prev) =>
          prev.map((entry) =>
            entry.displayName === displayName
              ? { ...entry, data, loading: false }
              : entry,
          ),
        );
      } catch {
        setSeries((prev) =>
          prev.map((entry) =>
            entry.displayName === displayName
              ? { ...entry, loading: false }
              : entry,
          ),
        );
      }
    },
    [accessToken, dateRange],
  );

  useEffect(() => {
    if (!initialDisplayName) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeries([]);
    setHiddenLineKeys([]);
    setAddSearch("");
    setShowAddPanel(false);
    resetZoom();
    void loadPoint(initialDisplayName, 0);
  }, [initialDisplayName, loadPoint, resetZoom]);

  useEffect(() => {
    if (!showAddPanel) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!addDropdownRef.current?.contains(event.target as Node)) {
        setShowAddPanel(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showAddPanel]);

  useEffect(() => {
    if (!chartAreaRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth) {
        setChartWidth(nextWidth);
      }
    });

    observer.observe(chartAreaRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!seriesNamesKey) return;

    const names = seriesNamesKey.split("\u0000");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeries((prev) =>
      prev.map((entry) => ({ ...entry, loading: true, data: [] })),
    );

    names.forEach(async (name) => {
      try {
        if (!accessToken) return;
        const data = await api.getTrendByDisplayName(
          accessToken,
          name,
          dateRange.startDate,
          dateRange.endDate,
        );
        setSeries((prev) =>
          prev.map((entry) =>
            entry.displayName === name
              ? { ...entry, data, loading: false }
              : entry,
          ),
        );
      } catch {
        setSeries((prev) =>
          prev.map((entry) =>
            entry.displayName === name
              ? { ...entry, loading: false }
              : entry,
          ),
        );
      }
    });
  }, [accessToken, dateRange, seriesNamesKey]);

  const removeSeries = (displayName: string) => {
    setSeries((prev) => prev.filter((entry) => entry.displayName !== displayName));
    setHiddenLineKeys((prev) =>
      prev.filter(
        (key) =>
          key !== makeLineKey(displayName, "bms") &&
          key !== makeLineKey(displayName, "iviva"),
      ),
    );
  };

  const toggleLineVisibility = (lineKey: string) => {
    setHiddenLineKeys((prev) =>
      prev.includes(lineKey)
        ? prev.filter((key) => key !== lineKey)
        : [...prev, lineKey],
    );
  };

  const chartData = useMemo<ChartDatum[]>(() => {
    const timeMap = new Map<number, ChartDatum>();
    const activeSeries = series.filter((entry) => entry.visible && !entry.loading);

    for (const entry of activeSeries) {
      const point = pointMap.get(entry.displayName);
      for (const record of entry.data) {
        const timestamp = new Date(record.timestamp).getTime();
        const existing = timeMap.get(timestamp) || { time: timestamp };
        existing[makeLineKey(entry.displayName, "bms")] = parseTrendNumber(record.n4Val);
        existing[makeLineKey(entry.displayName, "iviva")] = parseTrendNumber(record.ivivaVal);
        // Store point metadata for tooltip
        existing[`${makeLineKey(entry.displayName, "bms")}_point`] = point?.template ? { template: point.template } : {};
        existing[`${makeLineKey(entry.displayName, "iviva")}_point`] = point?.template ? { template: point.template } : {};
        timeMap.set(timestamp, existing);
      }
    }

    return Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
  }, [series, pointMap]);

  const displayedChartData = useMemo(() => {
    if (!zoomRange) return chartData;
    return chartData.filter(
      (entry) => entry.time >= zoomRange.start && entry.time <= zoomRange.end,
    );
  }, [chartData, zoomRange]);
  const brushRange = useMemo(() => {
    if (chartData.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    if (!zoomRange) {
      return { startIndex: 0, endIndex: chartData.length - 1 };
    }

    let startIndex = chartData.findIndex((entry) => entry.time >= zoomRange.start);
    if (startIndex < 0) startIndex = 0;

    let endIndex = -1;
    for (let index = chartData.length - 1; index >= 0; index -= 1) {
      if (chartData[index].time <= zoomRange.end) {
        endIndex = index;
        break;
      }
    }
    if (endIndex < 0) endIndex = chartData.length - 1;

    return { startIndex, endIndex };
  }, [chartData, zoomRange]);

  const currentAssetIndexCode = useMemo(() => {
    if (!initialDisplayName) return null;
    return pointMap.get(initialDisplayName)?.indexCode ?? null;
  }, [initialDisplayName, pointMap]);

  const currentAssetPoints = useMemo(() => {
    if (!currentAssetIndexCode) return [];

    return Array.from(pointMap.values())
      .filter((point) => point.indexCode === currentAssetIndexCode)
      .sort((a, b) =>
        getPointNameFromSnapshot(a).localeCompare(getPointNameFromSnapshot(b)),
      );
  }, [currentAssetIndexCode, pointMap]);

  const legendItems = useMemo<LineLegendItem[]>(() => {
    return series
      .filter((entry) => entry.visible && !entry.loading)
      .flatMap((entry) => [
        {
          key: makeLineKey(entry.displayName, "bms"),
          displayName: entry.displayName,
          pointName: getPointName(entry.displayName),
          shortLabel: getShortPointName(getPointName(entry.displayName)),
          kind: "bms" as const,
          color: getThemeLineColor(entry.color, isDark),
        },
        {
          key: makeLineKey(entry.displayName, "iviva"),
          displayName: entry.displayName,
          pointName: getPointName(entry.displayName),
          shortLabel: getShortPointName(getPointName(entry.displayName)),
          kind: "iviva" as const,
          color: getThemeLineColor(getIvivaColor(entry.color), isDark),
        },
      ]);
  }, [getPointName, isDark, series]);

  const renderedLegendItems = useMemo(
    () => legendItems.filter((item) => !hiddenLineKeys.includes(item.key)),
    [hiddenLineKeys, legendItems],
  );

  const filteredAssetPoints = useMemo(() => {
    const query = addSearch.trim().toLowerCase();
    if (!query) return currentAssetPoints;

    return currentAssetPoints.filter((point) =>
      getPointNameFromSnapshot(point).toLowerCase().includes(query),
    );
  }, [addSearch, currentAssetPoints]);

  const isLoading = series.some((entry) => entry.loading);
  const hasActiveZoom = zoomRange !== null;
  const zoomSelection = normalizeZoomRange(dragStartTime, dragEndTime);
  const visibleNumericValues = useMemo(() => {
    const visibleKeys = new Set(renderedLegendItems.map((item) => item.key));
    const values: number[] = [];

    for (const row of displayedChartData) {
      for (const key of visibleKeys) {
        const value = row[key];
        if (typeof value === "number" && Number.isFinite(value)) {
          values.push(value);
        }
      }
    }

    return values;
  }, [displayedChartData, renderedLegendItems]);
  const yAxisDomain = useMemo(
    () => getSmartYDomain(visibleNumericValues),
    [visibleNumericValues],
  );
  const useIntegerTicks = useMemo(
    () => visibleNumericValues.every((value) => Number.isInteger(value)),
    [visibleNumericValues],
  );
  const xAxisRangeMs = useMemo(() => {
    if (displayedChartData.length < 2) return 0;
    return displayedChartData[displayedChartData.length - 1].time - displayedChartData[0].time;
  }, [displayedChartData]);
  const xAxisTicks = useMemo(
    () => getXAxisTicks(displayedChartData, chartWidth),
    [chartWidth, displayedChartData],
  );
  const formatYAxisTick = useCallback(
    (value: number) =>
      useIntegerTicks ? String(Math.round(value)) : value.toFixed(2),
    [useIntegerTicks],
  );

  const handleChartMouseDown = (state: { activeLabel?: string | number }) => {
    if (typeof state.activeLabel !== "number") return;
    setDragStartTime(state.activeLabel);
    setDragEndTime(state.activeLabel);
  };

  const handleChartMouseMove = (state: { activeLabel?: string | number }) => {
    if (dragStartTime == null || typeof state.activeLabel !== "number") return;
    setDragEndTime(state.activeLabel);
  };

  const handleChartMouseUp = () => {
    const selection = normalizeZoomRange(dragStartTime, dragEndTime);
    if (selection) {
      setZoomRange(selection);
    }
    setDragStartTime(null);
    setDragEndTime(null);
  };

  const handleBrushChange = (range: BrushRange) => {
    if (range.startIndex === undefined || range.endIndex === undefined) return;

    const startTime = chartData[range.startIndex]?.time;
    const endTime = chartData[range.endIndex]?.time;
    if (startTime === undefined || endTime === undefined) return;

    if (range.startIndex === 0 && range.endIndex === chartData.length - 1) {
      setZoomRange(null);
      return;
    }

    setZoomRange({ start: startTime, end: endTime });
  };

  const togglePointSelection = (displayName: string) => {
    const existingIndex = series.findIndex((entry) => entry.displayName === displayName);

    if (existingIndex >= 0) {
      removeSeries(displayName);
      return;
    }

    void loadPoint(displayName, series.length);
  };

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 overflow-hidden">
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
            {currentAssetIndexCode ?? "Asset Trend"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {series.length} point{series.length !== 1 ? "s" : ""} selected · {currentAssetPoints.length} available
            {isLoading && <span className="text-slate-500 dark:text-slate-400"> · Loading...</span>}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-700/50 dark:bg-slate-800/50 sm:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileControlsOpen(true)}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Controls
          </button>
          <button
            type="button"
            onClick={() => setShowAddPanel((open) => !open)}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Points
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              From
            </div>
            <div className="mt-1 text-slate-700 dark:text-slate-200">
              {new Date(dateRange.startDate).toLocaleString([], {
                timeZone: BANGKOK_TIME_ZONE,
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              To
            </div>
            <div className="mt-1 text-slate-700 dark:text-slate-200">
              {new Date(dateRange.endDate).toLocaleString([], {
                timeZone: BANGKOK_TIME_ZONE,
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {showAddPanel ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder={`Search point name in ${currentAssetIndexCode ?? "asset"}...`}
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-slate-700 focus:border-slate-300 dark:focus:border-slate-600"
              />
            </div>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              {filteredAssetPoints.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                  No matching points for this asset.
                </div>
              ) : (
                filteredAssetPoints.map((point) => {
                  const selected = series.some((entry) => entry.displayName === point.displayName);
                  return (
                    <button
                      key={point.displayName}
                      type="button"
                      onClick={() => togglePointSelection(point.displayName)}
                      className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/60 last:border-0"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border text-white transition-colors ${
                          selected
                            ? "border-slate-700 bg-slate-700 dark:border-slate-200 dark:bg-slate-200"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 text-white dark:text-slate-900" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-700 dark:text-slate-200">
                        {getPointNameFromSnapshot(point)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Toolbar: Date Range + Actions */}
      <div className="hidden rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/50 sm:block">
        <div className="flex flex-wrap items-center gap-2 xl:gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">From</label>
            <div className="relative">
              <input
                ref={startDateInputRef}
                type="datetime-local"
                value={dateRange.startDate.slice(0, 16)}
                onChange={(e) =>
                  updateDateRange({
                    ...dateRange,
                    startDate: `${e.target.value}:00`,
                  })
                }
                className="themed-datetime-input pl-2 pr-9 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-slate-700 focus:border-slate-300 dark:focus:border-slate-600"
              />
              <button
                type="button"
                onClick={() => openNativeDateTimePicker(startDateInputRef.current)}
                className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                aria-label="Open start date picker"
              >
                <Calendar className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">To</label>
            <div className="relative">
              <input
                ref={endDateInputRef}
                type="datetime-local"
                value={dateRange.endDate.slice(0, 16)}
                onChange={(e) =>
                  updateDateRange({
                    ...dateRange,
                    endDate: `${e.target.value}:00`,
                  })
                }
                className="themed-datetime-input pl-2 pr-9 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-slate-700 focus:border-slate-300 dark:focus:border-slate-600"
              />
              <button
                type="button"
                onClick={() => openNativeDateTimePicker(endDateInputRef.current)}
                className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                aria-label="Open end date picker"
              >
                <Calendar className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateDateRange(getDefaultDateRange())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/70 hover:border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/80 dark:hover:border-slate-600 transition-colors"
          >
            Last 24h
          </button>

          <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700/60 xl:block" />

          <div className="relative" ref={addDropdownRef}>
            <button
              type="button"
              onClick={() => setShowAddPanel((open) => !open)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Add Points
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAddPanel ? "rotate-180" : ""}`} />
            </button>

            {showAddPanel && (
              <div className="absolute left-0 top-full z-30 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder={`Search point name in ${currentAssetIndexCode ?? "asset"}...`}
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    autoFocus
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-slate-700 focus:border-slate-300 dark:focus:border-slate-600"
                  />
                </div>
                <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  {filteredAssetPoints.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                      No matching points for this asset.
                    </div>
                  ) : (
                    filteredAssetPoints.map((point) => {
                      const selected = series.some((entry) => entry.displayName === point.displayName);
                      return (
                        <button
                          key={point.displayName}
                          type="button"
                          onClick={() => togglePointSelection(point.displayName)}
                          className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/60 last:border-0"
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border text-white transition-colors ${
                              selected
                                ? "border-slate-700 bg-slate-700 dark:border-slate-200 dark:bg-slate-200"
                                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                            }`}
                          >
                            {selected && <Check className="h-3 w-3 text-white dark:text-slate-900" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-700 dark:text-slate-200">
                            {getPointNameFromSnapshot(point)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700/60 xl:block" />

          <button
            type="button"
            onClick={resetZoom}
            disabled={!hasActiveZoom}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Zoom
          </button>
          <button
            type="button"
            onClick={() => setHiddenLineKeys([])}
            disabled={hiddenLineKeys.length === 0}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eye className="w-3.5 h-3.5" />
            Show All
          </button>

          {series.length > 0 && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 xl:ml-2">
              {series.map((entry) => (
                <div
                  key={entry.displayName}
                  className="inline-flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="max-w-[180px] truncate font-mono text-[11px] text-slate-700 dark:text-slate-200">
                    {getPointName(entry.displayName)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSeries(entry.displayName)}
                    className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Remove point"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}


        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">

          {/* Legend */}
          <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50 sm:flex-wrap sm:px-4">
            {legendItems.length === 0 ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Add a point to show legend
              </div>
            ) : (
              legendItems.map((item) => (
                <ChartLegendItem
                  key={item.key}
                  item={item}
                  active={!hiddenLineKeys.includes(item.key)}
                  onToggle={toggleLineVisibility}
                />
              ))
            )}
          </div>

          {/* Chart */}
          <div
            ref={chartAreaRef}
            className="flex-1 p-3 [&_.recharts-layer:focus]:outline-none [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:focus]:outline-none sm:p-4"
            style={{ minHeight: 320 }}
          >
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {isLoading ? "Loading trend data..." : "No data available for this time range"}
              </div>
            ) : renderedLegendItems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                All lines hidden. Use "Show All" to display.
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Main Chart */}
                <div className="flex-1 px-1 py-1 sm:px-2 sm:py-2 md:px-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={displayedChartData}
                      margin={{ top: 14, right: 10, bottom: 8, left: 0 }}
                      onMouseDown={handleChartMouseDown}
                      onMouseMove={handleChartMouseMove}
                      onMouseUp={handleChartMouseUp}
                    >
                      <defs>
                        <linearGradient id="chartAreaBgLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(226,232,240,0.92)" />
                          <stop offset="100%" stopColor="rgba(214,224,236,0.88)" />
                        </linearGradient>
                        <linearGradient id="chartAreaBgDark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(30,41,59,0.92)" />
                          <stop offset="100%" stopColor="rgba(15,23,42,0.82)" />
                        </linearGradient>
                      </defs>
                      <Customized
                      component={({ offset }: { offset?: { left: number; top: number; width: number; height: number } }) => {
                        if (!offset) return null;

                        return (
                          <rect
                            x={offset.left}
                            y={offset.top}
                            width={offset.width}
                            height={offset.height}
                            fill={isDark ? "url(#chartAreaBgDark)" : "url(#chartAreaBgLight)"}
                            rx={8}
                            ry={8}
                          />
                        );
                      }}
                    />
                      <CartesianGrid
                        vertical
                        stroke="rgb(var(--color-border))"
                        strokeDasharray="3 7"
                        strokeOpacity={isDark ? 0.78 : 0.94}
                      />
                      <XAxis
                        dataKey="time"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        ticks={xAxisTicks}
                        tickFormatter={(value) => formatXAxisLabel(value as number, xAxisRangeMs)}
                        tick={{ fontSize: chartWidth < 640 ? 10 : 11, fill: "rgb(var(--color-text-secondary))" }}
                        tickLine={{
                          stroke: isDark ? "rgba(100, 116, 139, 0.7)" : "rgba(100, 116, 139, 0.75)",
                          strokeWidth: 1,
                          transform: "translate(0, -2px)",
                        }}
                        axisLine={{
                          stroke: isDark ? "rgba(100, 116, 139, 0.72)" : "rgba(100, 116, 139, 0.78)",
                          strokeWidth: 1,
                        }}
                        tickMargin={12}
                        tickSize={7}
                        minTickGap={36}
                        padding={{ left: 12, right: 12 }}
                      />
                      <YAxis
                        width={chartWidth < 640 ? 48 : 62}
                        domain={yAxisDomain}
                        tickFormatter={(value) =>
                          typeof value === "number" ? formatYAxisTick(value) : String(value)
                        }
                        tick={{ fontSize: chartWidth < 640 ? 10 : 11, fill: "rgb(var(--color-text-secondary))" }}
                        tickLine={false}
                        axisLine={{
                          stroke: isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(148, 163, 184, 0.8)",
                          strokeWidth: 1,
                        }}
                        tickMargin={10}
                      />
                      <Tooltip
                        cursor={{ stroke: isDark ? "#475569" : "#94a3b8", strokeWidth: 1 }}
                        content={<TooltipContent isDark={isDark} />}
                      />

                      {legendItems.map((item) => {
                        const hidden = hiddenLineKeys.includes(item.key);
                        if (hidden) return null;

                        return (
                          <Line
                            key={item.key}
                            type="monotone"
                            dataKey={item.key}
                            stroke={item.color}
                            strokeOpacity={0.94}
                            strokeWidth={item.kind === "iviva" ? 1.9 : 2.2}
                            strokeDasharray={item.kind === "iviva" ? "5 3" : undefined}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0, fill: item.color }}
                            connectNulls={false}
                            isAnimationActive={false}
                          />
                        );
                      })}

                      {zoomSelection && (
                        <ReferenceArea
                          x1={zoomSelection.start}
                          x2={zoomSelection.end}
                          stroke={isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(51, 65, 85, 0.6)"}
                          fill={isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.18)"}
                          fillOpacity={1}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Brush Container - Separate from chart */}
                <div className="mt-3 h-10 px-1 sm:mt-4 sm:px-2 md:px-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Brush
                        dataKey="time"
                        height={32}
                        startIndex={brushRange.startIndex}
                        endIndex={brushRange.endIndex}
                        stroke={isDark ? "rgba(100, 116, 139, 0.3)" : "rgba(148, 163, 184, 0.4)"}
                        fill={isDark ? "rgba(51, 65, 85, 0.2)" : "rgba(203, 213, 225, 0.25)"}
                        travellerWidth={8}
                        className="[&_.recharts-brush-slide]:fill-slate-200/40 dark:[&_.recharts-brush-slide]:fill-slate-700/30 [&_.recharts-brush-traveller]:fill-slate-400/60 dark:[&_.recharts-brush-traveller]:fill-slate-500/60 [&_.recharts-brush-texts_text]:fill-slate-300/70 dark:[&_.recharts-brush-texts_text]:fill-slate-400/70 [&_text]:text-[9px]"
                        tickFormatter={(value) => formatXAxisLabel(value as number, xAxisRangeMs)}
                        onChange={handleBrushChange}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileControlsOpen ? (
        <div className="fixed inset-0 z-[70] sm:hidden">
          <button
            type="button"
            aria-label="Close controls"
            onClick={() => setMobileControlsOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white px-4 pb-6 pt-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Trend controls</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Adjust time range and visibility.</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileControlsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">From</label>
                  <div className="relative">
                    <input
                      ref={startDateInputRef}
                      type="datetime-local"
                      value={dateRange.startDate.slice(0, 16)}
                      onChange={(e) =>
                        updateDateRange({
                          ...dateRange,
                          startDate: `${e.target.value}:00`,
                        })
                      }
                      className="themed-datetime-input h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-10 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => openNativeDateTimePicker(startDateInputRef.current)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">To</label>
                  <div className="relative">
                    <input
                      ref={endDateInputRef}
                      type="datetime-local"
                      value={dateRange.endDate.slice(0, 16)}
                      onChange={(e) =>
                        updateDateRange({
                          ...dateRange,
                          endDate: `${e.target.value}:00`,
                        })
                      }
                      className="themed-datetime-input h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-10 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => openNativeDateTimePicker(endDateInputRef.current)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => updateDateRange(getDefaultDateRange())}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200/70 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/80"
                >
                  Last 24h
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  disabled={!hasActiveZoom}
                  className="flex h-9 items-center gap-1 rounded-lg px-3 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Zoom
                </button>
                <button
                  type="button"
                  onClick={() => setHiddenLineKeys([])}
                  disabled={hiddenLineKeys.length === 0}
                  className="flex h-9 items-center gap-1 rounded-lg px-3 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Show All
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
