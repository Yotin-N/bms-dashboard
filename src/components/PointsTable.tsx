import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowUpDown, ArrowUp, ArrowDown, Download, FilterX,
  Filter, Search, SlidersHorizontal, ChevronDown, X, Paperclip, MessageSquareMore, Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useBmsStore } from "../store/bmsStore";
import { SEGMENT_LABELS, parseSegments } from "../types/bms";
import type { PointData } from "../types/bms";
import type { SegmentKey } from "../types/bms";
import type { SortableColumn, SortDirection } from "../store/bmsStore";

const ROW_HEIGHT = 52;
const GRID_TEMPLATE_COLUMNS =
  "minmax(210px, 1.18fr) minmax(260px, 1.32fr) minmax(150px, 0.78fr) minmax(120px, 0.68fr) 46px 72px 72px 64px 82px 104px";
const DUMMY_SERIAL_NUMBER = "540250261088";

interface RemarkLogEntry {
  id: string;
  message: string;
  user: string;
  createdAt: string;
}

function createDummyRemarkLogs(point: PointData, index: number): RemarkLogEntry[] {
  return [
    {
      id: `${point.displayName}-log-1`,
      message: `Field check opened for ${point.template || "point"} verification.`,
      user: index % 2 === 0 ? "PM Aor" : "Eng Beam",
      createdAt: "2026-04-03T08:15:00Z",
    },
    {
      id: `${point.displayName}-log-2`,
      message: index % 3 === 0
        ? "Photo evidence requested from site team."
        : "Waiting for confirmation against field meter label.",
      user: index % 2 === 0 ? "Tech Nop" : "Tech Palm",
      createdAt: "2026-04-03T10:40:00Z",
    },
  ];
}

/* ── Cell Helpers ────────────────────────────────────── */

function N4StatusDot({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>;
  const isOk = status === "OK" || status === "ok";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${isOk ? "bg-emerald-500 dark:bg-emerald-400" : "bg-red-500 dark:bg-red-400"}`} />
      <span className={`text-[11px] ${isOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{status}</span>
    </span>
  );
}

function getDiffValue(point: PointData): number | null {
  if (point.n4Val == null || point.ivivaVal == null) return null;
  const n4Num = parseFloat(point.n4Val);
  const ivNum = parseFloat(point.ivivaVal);
  if (isNaN(n4Num) || isNaN(ivNum)) return null;
  return n4Num - ivNum;
}

function getDiffDisplay(point: PointData): string {
  if (point.n4Val == null || point.ivivaVal == null) return "—";
  const n4Num = parseFloat(point.n4Val);
  const ivNum = parseFloat(point.ivivaVal);
  if (isNaN(n4Num) || isNaN(ivNum)) {
    const same = point.n4Val === point.ivivaVal;
    return same ? "=" : "≠";
  }
  const diff = n4Num - ivNum;
  const absDiff = Math.abs(diff);
  const display = absDiff < 0.001 ? "0" : (diff > 0 ? "+" : "") + diff.toFixed(2);
  return display;
}

function DiffCell({ n4Val, ivivaVal }: { n4Val: string | null; ivivaVal: string | null }) {
  if (n4Val == null || ivivaVal == null) {
    return <div className="text-center font-mono text-xs text-slate-400 dark:text-slate-600">—</div>;
  }
  const n4Num = parseFloat(n4Val);
  const ivNum = parseFloat(ivivaVal);
  if (isNaN(n4Num) || isNaN(ivNum)) {
    const same = n4Val === ivivaVal;
    return (
      <div className={`text-center text-xs font-medium ${same ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
        {same ? "=" : "≠"}
      </div>
    );
  }
  const diff = n4Num - ivNum;
  const absDiff = Math.abs(diff);
  let color = "text-emerald-600 dark:text-emerald-400";
  if (absDiff > 5) color = "text-red-600 dark:text-red-400";
  else if (absDiff > 0.5) color = "text-amber-600 dark:text-amber-400";
  const display = absDiff < 0.001 ? "0" : (diff > 0 ? "+" : "") + diff.toFixed(2);
  return (
    <div className={`text-center font-mono text-xs tabular-nums ${color}`} title={`N4(${n4Val}) - IVIVA(${ivivaVal})`}>
      {display}
    </div>
  );
}

function formatLogTime(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PointDetailModal({
  point,
  remarks,
  attachmentCount,
  onClose,
}: {
  point: PointData;
  remarks: RemarkLogEntry[];
  attachmentCount: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {point.indexCode}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {point.template || "—"} · SN {DUMMY_SERIAL_NUMBER}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>


        <div className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-[11px] font-medium tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Remark Logs
            </div>
            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {remarks.length} log{remarks.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="max-h-[320px] space-y-2 overflow-auto">
            {remarks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-[12px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No remarks yet for this point.
              </div>
            ) : (
              remarks.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{log.user}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatLogTime(log.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-slate-600 dark:text-slate-300">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PointActionsCell({
  point,
  remarkCount,
  attachmentCount,
  onOpenLogs,
  onUploadFile,
}: {
  point: PointData;
  remarkCount: number;
  attachmentCount: number;
  onOpenLogs: () => void;
  onUploadFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
        title={`Upload image for ${point.displayName}`}
      >
        <Paperclip className="h-3.5 w-3.5" />
        {attachmentCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[15px] rounded-full bg-slate-900 px-1 text-center text-[9px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
            {attachmentCount}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUploadFile(file);
          event.currentTarget.value = "";
        }}
      />

      <button
        type="button"
        onClick={onOpenLogs}
        className="relative flex h-6 min-w-[34px] items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
        title={`Open remarks for ${point.displayName}`}
      >
        <MessageSquareMore className="h-3.5 w-3.5" />
        <span className="text-[9px] font-semibold tabular-nums">{remarkCount}</span>
      </button>
    </div>
  );
}

/* ── Column Filter Dropdown (multi-select) ───────────── */

function ColumnFilterDropdown({
  column,
  allPoints,
}: {
  column: SortableColumn;
  allPoints: PointData[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const columnFilters = useBmsStore((s) => s.columnFilters);
  const toggleValue = useBmsStore((s) => s.toggleColumnFilterValue);
  const clearFilter = useBmsStore((s) => s.clearColumnFilter);

  const selected = columnFilters[column];
  const isActive = selected.size > 0;
  const dropdownWidthClass =
    column === "indexCode"
      ? "w-72"
      : column === "displayName"
        ? "w-80"
        : "w-48";
  const dropdownPositionClass =
    column === "indexCode" || column === "displayName"
      ? "left-0"
      : "left-1/2 -translate-x-1/2";

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const uniqueValues = useMemo(() => {
    const vals = new Set<string>();
    for (const p of allPoints) {
      let v: string | null;
      if (column === "diff") {
        v = getDiffDisplay(p);
      } else {
        v = p[column];
      }
      if (v != null && v !== "") vals.add(String(v));
    }
    return [...vals].sort();
  }, [allPoints, column]);

  const filtered = search
    ? uniqueValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    : uniqueValues;

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className={`p-0.5 rounded transition-colors ${
          isActive
            ? "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/70"
            : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"
        }`}
        title={isActive ? `${selected.size} selected` : "Filter"}
      >
        <Filter className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className={`absolute z-50 top-full mt-1 ${dropdownPositionClass} ${dropdownWidthClass} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl shadow-black/10 dark:shadow-black/40`}>
          <div className="p-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-300 dark:focus:border-slate-600"
            />
          </div>
          {isActive && (
            <button
              onClick={() => { clearFilter(column); setSearch(""); }}
              className="w-full text-left px-3 py-1 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border-b border-slate-200 dark:border-slate-700/50"
            >
              Clear selection ({selected.size})
            </button>
          )}
          <div className="max-h-44 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-slate-500">No values</div>
            ) : (
              filtered.map((val) => (
                <label
                  key={val}
                  className="flex items-center gap-2 px-3 py-1 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(val)}
                    onChange={() => toggleValue(column, val)}
                    className="w-3 h-3 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-slate-700 dark:text-slate-300 truncate font-mono">{val}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Column Header (sort + filter icon) ──────────────── */

function SortIcon({ column, sortColumn, sortDirection }: { column: SortableColumn; sortColumn: SortableColumn | null; sortDirection: SortDirection }) {
  if (sortColumn !== column) return <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 dark:text-slate-600" />;
  if (sortDirection === "asc") return <ArrowUp className="w-2.5 h-2.5 text-slate-700 dark:text-slate-200" />;
  return <ArrowDown className="w-2.5 h-2.5 text-slate-700 dark:text-slate-200" />;
}

function ColumnHeader({
  label,
  column,
  align = "left",
  allPoints,
}: {
  label: string;
  column: SortableColumn;
  align?: "left" | "right" | "center";
  allPoints: PointData[];
}) {
  const toggleSort = useBmsStore((s) => s.toggleSort);
  const sortColumn = useBmsStore((s) => s.sortColumn);
  const sortDirection = useBmsStore((s) => s.sortDirection);

  const alignCls = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <div className={`flex items-center gap-1 ${alignCls}`}>
      <button
        onClick={() => toggleSort(column)}
        className={`flex items-center gap-0.5 text-[10px] font-semibold tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${
          sortColumn === column ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {label}
        <SortIcon column={column} sortColumn={sortColumn} sortDirection={sortDirection} />
      </button>
      <ColumnFilterDropdown column={column} allPoints={allPoints} />
    </div>
  );
}

/* ── Segment Dropdown ────────────────────────────────── */

function SegmentDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: SegmentKey;
  options: string[];
  value: string | null;
  onChange: (val: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const active = value !== null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-8 items-center gap-1 px-2 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
          active
            ? "bg-slate-100 dark:bg-slate-700/70 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        <span className="text-slate-400 dark:text-slate-500">{label}</span>
        {active ? (
          <>
            <span className="px-1 rounded bg-slate-200 dark:bg-slate-600/80 text-slate-700 dark:text-slate-100 text-[10px] font-semibold">{value}</span>
            <X
              className="w-3 h-3 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            />
          </>
        ) : (
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && options.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[120px] max-h-[220px] overflow-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl shadow-black/10 dark:shadow-black/30">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
              !active ? "bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            All
          </button>
          <div className="border-t border-slate-200 dark:border-slate-700/50" />
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                value === opt
                  ? "bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 font-semibold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sort Comparator ─────────────────────────────────── */

function comparePoints(a: PointData, b: PointData, column: SortableColumn, direction: SortDirection): number {
  if (!direction) return 0;
  const mul = direction === "asc" ? 1 : -1;

  if (column === "diff") {
    const aDiff = getDiffValue(a);
    const bDiff = getDiffValue(b);
    if (aDiff === null && bDiff === null) return 0;
    if (aDiff === null) return 1 * mul;
    if (bDiff === null) return -1 * mul;
    return (aDiff - bDiff) * mul;
  }

  const aVal = a[column] ?? "";
  const bVal = b[column] ?? "";
  if (column === "n4Val" || column === "ivivaVal") {
    const aNum = parseFloat(String(aVal));
    const bNum = parseFloat(String(bVal));
    if (!isNaN(aNum) && !isNaN(bNum)) return (aNum - bNum) * mul;
    if (!isNaN(aNum)) return -1 * mul;
    if (!isNaN(bNum)) return 1 * mul;
  }
  return String(aVal).localeCompare(String(bVal)) * mul;
}

/* ── Export to Excel ─────────────────────────────────── */

function exportToExcel(points: PointData[]) {
  const data = points.map((p) => ({
    "Index Code": p.indexCode || "",
    "Display Name": p.displayName,
    "Point Name": p.template || "",
    SN: DUMMY_SERIAL_NUMBER,
    "Units": p.units || "",
    "BMS": p.n4Val || "",
    "IVIVA": p.ivivaVal || "",
    "Status": p.n4Status || "",
  }));

  // Bangkok timestamp (UTC+7)
  const bangkokTime = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const wb = XLSX.utils.book_new();
  // Create sheet with timestamp row first, then skip a row, then table data
  const ws = XLSX.utils.aoa_to_sheet([
    [`Exported: ${bangkokTime} (Bangkok Time)`],
    [],
  ]);
  XLSX.utils.sheet_add_json(ws, data, { origin: "A3" });

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String((r as Record<string, string>)[key] || "").length).slice(0, 100)) + 2,
  }));
  ws["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, "BMS Points");
  XLSX.writeFile(wb, `BMS_Points_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ── Main Table Component ────────────────────────────── */

export function PointsTable() {
  const pointList = useBmsStore((s) => s.pointList);
  const filter = useBmsStore((s) => s.filter);
  const searchQuery = useBmsStore((s) => s.searchQuery);
  const setSearchQuery = useBmsStore((s) => s.setSearchQuery);
  const segmentFilters = useBmsStore((s) => s.segmentFilters);
  const segmentOptions = useBmsStore((s) => s.segmentOptions);
  const setSegmentFilter = useBmsStore((s) => s.setSegmentFilter);
  const clearSegmentFilters = useBmsStore((s) => s.clearSegmentFilters);
  const changedKeys = useBmsStore((s) => s.changedKeys);
  const columnFilters = useBmsStore((s) => s.columnFilters);
  const sortColumn = useBmsStore((s) => s.sortColumn);
  const sortDirection = useBmsStore((s) => s.sortDirection);
  const clearAllColumnFilters = useBmsStore((s) => s.clearAllColumnFilters);
  const showFaultPointsOnly = useBmsStore((s) => s.showFaultPointsOnly);
  const remarkLogsByPoint = useMemo<Record<string, RemarkLogEntry[]>>(
    () => Object.fromEntries(pointList.map((point, index) => [point.displayName, createDummyRemarkLogs(point, index)])),
    [pointList]
  );
  const [attachmentCountByPoint, setAttachmentCountByPoint] = useState<Record<string, number>>({});
  const [activePoint, setActivePoint] = useState<PointData | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const activeSegments = SEGMENT_LABELS.filter((k) => segmentFilters[k] !== null);
  const activeSegCount = activeSegments.length;
  const hasColumnFilters = Object.values(columnFilters).some((s) => s.size > 0);
  const totalActiveFilters = Object.values(columnFilters).reduce((n, s) => n + s.size, 0);

  // Client-side filter pipeline
  const filteredPoints = useMemo(() => {
    let result = pointList;

    if (filter !== "ALL") {
      result = result.filter((p) => p.mappingStatus === filter);
    }

    if (activeSegments.length > 0) {
      result = result.filter((p) => {
        const seg = parseSegments(p.displayName);
        if (!seg) return false;
        for (const key of activeSegments) {
          if (segmentFilters[key] !== null && seg[key] !== segmentFilters[key]) return false;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          (p.indexCode && p.indexCode.toLowerCase().includes(q)) ||
          (p.template && p.template.toLowerCase().includes(q)) ||
          (p.units && p.units.toLowerCase().includes(q))
      );
    }

    // Fault points filter (abnormal N4 status)
    if (showFaultPointsOnly) {
      result = result.filter((p) => p.n4Status && p.n4Status !== "ok" && p.n4Status !== "OK");
    }

    // Multi-select column filters
    for (const [col, selectedSet] of Object.entries(columnFilters)) {
      if (selectedSet.size === 0) continue;
      result = result.filter((p) => {
        let cellVal: string;
        if (col === "diff") {
          cellVal = getDiffDisplay(p);
        } else {
          cellVal = String(p[col as keyof PointData] ?? "");
        }
        return selectedSet.has(cellVal);
      });
    }

    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => comparePoints(a, b, sortColumn, sortDirection));
    }

    return result;
  }, [pointList, filter, searchQuery, segmentFilters, columnFilters, sortColumn, sortDirection, showFaultPointsOnly]);

  const virtualizer = useVirtualizer({
    count: filteredPoints.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const handleExport = useCallback(() => {
    exportToExcel(filteredPoints);
  }, [filteredPoints]);
  const activeRemarks = activePoint ? remarkLogsByPoint[activePoint.displayName] || [] : [];
  const activeAttachmentCount = activePoint ? attachmentCountByPoint[activePoint.displayName] || 0 : 0;

  return (
    <>
    <div className="flex flex-col flex-1 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">
      {/* Toolbar: Search + Segments + Actions */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/50 flex-wrap">
        {/* Search */}
        <div className="relative w-56">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search indexCode, displayName..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full pl-7 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-slate-700 focus:border-slate-300 dark:focus:border-slate-600"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700/60" />

        {/* Segment Dropdowns */}
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        {SEGMENT_LABELS.map((label) => (
          <SegmentDropdown
            key={label}
            label={label}
            options={segmentOptions[label]}
            value={segmentFilters[label]}
            onChange={(val) => setSegmentFilter(label, val)}
          />
        ))}
        {activeSegCount > 0 && (
          <button
            onClick={clearSegmentFilters}
            className="flex h-8 items-center gap-1 px-2 rounded-md text-[11px] font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Info + Actions */}
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredPoints.length.toLocaleString()}</span>
          <span className="mx-0.5">/</span>
          {pointList.length.toLocaleString()}
        </span>

        {hasColumnFilters && (
          <button
            onClick={clearAllColumnFilters}
            className="flex h-8 items-center gap-1 px-2 rounded-md text-[11px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <FilterX className="w-3 h-3" />
            Filters ({totalActiveFilters})
          </button>
        )}

        <button
          onClick={handleExport}
          disabled={filteredPoints.length === 0}
          className="flex h-8 items-center gap-1.5 px-3 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/70 hover:border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/80 dark:hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          Export Excel
        </button>
      </div>

      {/* Table Header: sort labels + filter icons */}
      <div
        className="grid gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700/50 dark:bg-slate-800/50"
        style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
      >
        <ColumnHeader label="Index Code" column="indexCode" allPoints={pointList} />
        <ColumnHeader label="Display Name" column="displayName" allPoints={pointList} />
        <ColumnHeader label="Point Name" column="template" allPoints={pointList} />
        <div className="flex items-center text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">
          SN
        </div>
        <ColumnHeader label="Units" column="units" align="center" allPoints={pointList} />
        <ColumnHeader label="BMS" column="n4Val" align="center" allPoints={pointList} />
        <ColumnHeader label="IVIVA" column="ivivaVal" align="center" allPoints={pointList} />
        <ColumnHeader label="Diff" column="diff" align="center" allPoints={pointList} />
        <ColumnHeader label="Status" column="n4Status" align="center" allPoints={pointList} />
        <div className="flex items-center justify-center text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">
          Remarks / Files
        </div>
      </div>

      {/* Virtualized Rows */}
      <div ref={parentRef} className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        {filteredPoints.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            {pointList.length === 0 ? "Waiting for data..." : "No points match your filter"}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const point: PointData = filteredPoints[virtualRow.index];
              const isChanged = changedKeys.has(point.displayName);
              const isEven = virtualRow.index % 2 === 0;
              const isFault = !!point.n4Status && point.n4Status !== "ok" && point.n4Status !== "OK";
              const leftBorderClass = isFault
                ? "border-l-4 border-l-red-500 dark:border-l-red-400"
                : point.mappingStatus === "N4_ONLY"
                  ? "border-l-4 border-l-orange-500 dark:border-l-orange-400"
                  : "border-l-4 border-l-transparent";

              return (
                <div
                  key={point.displayName}
                  className={`grid gap-1.5 px-3 items-center border-b border-slate-100 dark:border-slate-800/30 text-sm ${
                    isChanged ? "row-flash" : ""
                  } ${isEven ? "bg-slate-50/50 dark:bg-slate-900/30" : "bg-transparent"} ${leftBorderClass} hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors`}
                  style={{
                    gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="text-slate-500 dark:text-slate-400 truncate font-mono text-[11px]" title={point.indexCode || "—"}>
                    {point.indexCode || "—"}
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 truncate font-mono text-[11px]" title={point.displayName}>
                    {point.displayName}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 truncate text-[11px]" title={point.template || "—"}>
                    {point.template || "—"}
                  </div>
                  <div className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-200" title={DUMMY_SERIAL_NUMBER}>
                    {DUMMY_SERIAL_NUMBER}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 truncate text-[11px] text-center" title={point.units || "—"}>
                    {point.units || "—"}
                  </div>
                  <div className={`text-center font-mono text-[11px] tabular-nums ${isChanged ? "text-emerald-600 dark:text-emerald-300 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                    {point.n4Val ?? "—"}
                  </div>
                  <div className="text-center font-mono text-[11px] tabular-nums text-slate-700 dark:text-slate-300">
                    {point.ivivaVal ?? "—"}
                  </div>
                  <DiffCell n4Val={point.n4Val} ivivaVal={point.ivivaVal} />
                  <div className="flex justify-center">
                    <N4StatusDot status={point.n4Status} />
                  </div>
                  <div className="flex justify-center">
                    <PointActionsCell
                      point={point}
                      remarkCount={(remarkLogsByPoint[point.displayName] || []).length}
                      attachmentCount={attachmentCountByPoint[point.displayName] || 0}
                      onOpenLogs={() => setActivePoint(point)}
                      onUploadFile={() =>
                        setAttachmentCountByPoint((prev) => ({
                          ...prev,
                          [point.displayName]: (prev[point.displayName] || 0) + 1,
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    {activePoint && (
      <PointDetailModal
        point={activePoint}
        remarks={activeRemarks}
        attachmentCount={activeAttachmentCount}
        onClose={() => setActivePoint(null)}
      />
    )}
    </>
  );
}
