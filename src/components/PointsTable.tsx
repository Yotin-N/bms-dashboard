import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowUpDown, ArrowUp, ArrowDown, Download, FilterX,
  Filter, Search, SlidersHorizontal, ChevronDown, X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { api, ApiError, type AttachmentRecord, type RemarkLogRecord } from "../services/api";
import { useBmsStore } from "../store/bmsStore";
import { SEGMENT_LABELS, parseSegments } from "../types/bms";
import type { PointData } from "../types/bms";
import type { SegmentKey } from "../types/bms";
import type { SortableColumn, SortDirection } from "../store/bmsStore";
import { prepareAttachmentImageFile } from "../utils/attachment-files";
import {
  PointResourceActionsCell,
  PointResourceModal,
} from "./point-resources/PointResourceUI";

const ROW_HEIGHT = 52;
const MOBILE_CARD_HEIGHT_ADMIN = 228;
const MOBILE_CARD_HEIGHT_LIMITED = 204;
const ADMIN_GRID_TEMPLATE_COLUMNS =
  "minmax(210px, 1.18fr) minmax(260px, 1.32fr) minmax(150px, 0.78fr) minmax(120px, 0.68fr) 46px 72px 72px 64px 82px 104px";
const LIMITED_GRID_TEMPLATE_COLUMNS =
  "minmax(210px, 1.25fr) minmax(260px, 1.35fr) minmax(150px, 0.95fr) minmax(120px, 0.72fr) 56px 84px 88px 104px";

function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.requestId
      ? `${error.message} (req: ${error.requestId})`
      : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while talking to the server.";
}

/* ── Cell Helpers ────────────────────────────────────── */

function N4StatusDot({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>;
  const isOk = status === "OK" || status === "ok";
  return (
    <span
      className={`text-[11px] ${
        isOk
          ? "text-slate-600 dark:text-slate-300"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {status}
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
  direction = "down",
}: {
  label: SegmentKey;
  options: string[];
  value: string | null;
  onChange: (val: string | null) => void;
  direction?: "down" | "up";
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
  const dropdownPositionClass =
    direction === "up"
      ? "bottom-full mb-1 left-0"
      : "top-full mt-1 left-0";

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
        <div className={`absolute z-[90] ${dropdownPositionClass} min-w-[140px] max-h-[220px] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl shadow-black/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30`}>
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

function PointMobileCard({
  point,
  isChanged,
  remarkCount,
  attachmentCount,
  isUploading,
  currentUserRole,
  showOperationalValues,
  onOpenLogs,
  onUploadFile,
  onOpenTrend,
}: {
  point: PointData;
  isChanged: boolean;
  remarkCount: number;
  attachmentCount: number;
  isUploading: boolean;
  currentUserRole: "admin" | "editor" | "viewer" | null;
  showOperationalValues: boolean;
  onOpenLogs: () => void;
  onUploadFile: (file: File) => void;
  onOpenTrend: () => void;
}) {
  const isFault = !!point.n4Status && point.n4Status !== "ok" && point.n4Status !== "OK";
  const shouldShowStatusBadge = isFault || point.mappingStatus === "N4_ONLY";
  const borderClass = isFault
    ? "border-l-4 border-l-red-500 dark:border-l-red-400"
    : point.mappingStatus === "N4_ONLY"
      ? "border-l-4 border-l-orange-500 dark:border-l-orange-400"
      : "border-l-4 border-l-transparent";

  return (
    <div
      className={`h-full rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-sm transition-colors dark:border-slate-700/60 dark:bg-slate-900/80 ${
        isChanged ? "row-flash" : ""
      } ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {point.template || "Point"}
          </div>
          <div
            className="mt-1.5 truncate font-mono text-[14px] font-semibold leading-tight text-slate-700 dark:text-slate-200"
            title={point.indexCode || "—"}
          >
            {point.indexCode || "—"}
          </div>
        </div>
        {shouldShowStatusBadge ? (
          <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <N4StatusDot status={point.n4Status || point.mappingStatus} />
          </div>
        ) : null}
      </div>

      <div className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5`}>
        {showOperationalValues ? (
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              BMS
            </div>
            <div className="mt-0.5 font-mono text-[13px] text-slate-800 dark:text-slate-100">
              {point.n4Val ?? "—"}
            </div>
          </div>
        ) : null}
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            IVIVA
          </div>
          <div className="mt-0.5 font-mono text-[13px] text-slate-800 dark:text-slate-100">
            {point.ivivaVal ?? "—"}
          </div>
        </div>
        {showOperationalValues ? (
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Diff
            </div>
            <div className="mt-0.5">
              <DiffCell n4Val={point.n4Val} ivivaVal={point.ivivaVal} />
            </div>
          </div>
        ) : null}
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Unit
          </div>
          <div className="mt-0.5 text-[13px] text-slate-700 dark:text-slate-300">
            {point.units || "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-200 pt-2.5 dark:border-slate-800">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Serial No.
          </div>
          <div
            className="mt-0.5 truncate font-mono text-[12px] text-slate-600 dark:text-slate-300"
            title={point.serialNumber || "-"}
          >
            {point.serialNumber || "-"}
          </div>
        </div>
        <PointResourceActionsCell
          point={point}
          currentUserRole={currentUserRole}
          remarkCount={remarkCount}
          attachmentCount={attachmentCount}
          isUploading={isUploading}
          onOpenLogs={onOpenLogs}
          onUploadFile={onUploadFile}
          onOpenTrend={onOpenTrend}
        />
      </div>
    </div>
  );
}

/* ── Main Table Component ────────────────────────────── */

export function PointsTable() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
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
  const [summaryByPoint, setSummaryByPoint] = useState<
    Record<string, { remarkCount: number; attachmentCount: number }>
  >({});
  const [remarkLogsByPoint, setRemarkLogsByPoint] = useState<Record<string, RemarkLogRecord[]>>({});
  const [attachmentsByPoint, setAttachmentsByPoint] = useState<Record<string, AttachmentRecord[]>>({});
  const [activePoint, setActivePoint] = useState<PointData | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [uploadingPointKey, setUploadingPointKey] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const canSeeOperationalValues = user?.role === "admin";

  const parentRef = useRef<HTMLDivElement>(null);
  const mobileParentRef = useRef<HTMLDivElement>(null);

  const activeSegments = SEGMENT_LABELS.filter((k) => segmentFilters[k] !== null);
  const activeSegCount = activeSegments.length;
  const hasColumnFilters = Object.values(columnFilters).some((s) => s.size > 0);
  const totalActiveFilters = Object.values(columnFilters).reduce((n, s) => n + s.size, 0);
  const gridTemplateColumns = canSeeOperationalValues
    ? ADMIN_GRID_TEMPLATE_COLUMNS
    : LIMITED_GRID_TEMPLATE_COLUMNS;

  const visiblePointList = useMemo(() => {
    if (isAdmin) return pointList;
    return pointList.filter((point) => point.template === "Real Energy");
  }, [isAdmin, pointList]);

  // Client-side filter pipeline
  const filteredPoints = useMemo(() => {
    let result = visiblePointList;

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
  }, [visiblePointList, filter, searchQuery, segmentFilters, columnFilters, sortColumn, sortDirection, showFaultPointsOnly]);

  const virtualizer = useVirtualizer({
    count: filteredPoints.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const mobileVirtualizer = useVirtualizer({
    count: filteredPoints.length,
    getScrollElement: () => mobileParentRef.current,
    estimateSize: () =>
      canSeeOperationalValues ? MOBILE_CARD_HEIGHT_ADMIN : MOBILE_CARD_HEIGHT_LIMITED,
    overscan: 10,
  });

  const handleExport = useCallback(() => {
    if (!accessToken || filteredPoints.length === 0) return;

    setIsExporting(true);

    void api
      .exportPointsReport(
        accessToken,
        filteredPoints.map((point) => ({
          displayName: point.displayName,
          indexCode: point.indexCode,
          pointName: point.template,
          serialNumber: point.serialNumber,
          units: point.units,
          bmsValue: canSeeOperationalValues ? point.n4Val : null,
          ivivaValue: point.ivivaVal,
          diff: canSeeOperationalValues ? getDiffDisplay(point) : null,
          status: point.n4Status,
        })),
      )
      .then((blob) => {
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `BMS_Points_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
      })
      .catch((error) => {
        window.alert(getApiErrorMessage(error));
      })
      .finally(() => {
        setIsExporting(false);
      });
  }, [accessToken, canSeeOperationalValues, filteredPoints]);

  useEffect(() => {
    if (!accessToken) return;

    let active = true;

    api
      .getPointResourceSummary(accessToken)
      .then((summary) => {
        if (!active) return;
        setSummaryByPoint(
          Object.fromEntries(
            summary.map((entry) => [
              entry.displayName,
              {
                remarkCount: entry.remarkCount,
                attachmentCount: entry.attachmentCount,
              },
            ]),
          ),
        );
      })
      .catch(() => {
        if (!active) return;
        setSummaryByPoint({});
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const fetchPointResources = useCallback(
    async (point: PointData) => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      const [remarks, attachments] = await Promise.all([
        api.getRemarks(accessToken, point.displayName),
        api.getAttachments(accessToken, point.displayName),
      ]);

      setRemarkLogsByPoint((prev) => ({
        ...prev,
        [point.displayName]: remarks,
      }));
      setAttachmentsByPoint((prev) => ({
        ...prev,
        [point.displayName]: attachments,
      }));
      setSummaryByPoint((prev) => ({
        ...prev,
        [point.displayName]: {
          remarkCount: remarks.length,
          attachmentCount: attachments.length,
        },
      }));

      return { remarks, attachments };
    },
    [accessToken],
  );

  const loadPointDetails = useCallback(
    async (point: PointData) => {
      setIsModalLoading(true);
      setModalErrorMessage(null);

      try {
        await fetchPointResources(point);
      } catch (error) {
        setModalErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsModalLoading(false);
      }
    },
    [fetchPointResources],
  );

  const handleOpenLogs = useCallback(
    (point: PointData) => {
      setActivePoint(point);
      setRemarkDraft("");
      void loadPointDetails(point);
    },
    [loadPointDetails],
  );

  const handleUploadFile = useCallback(
    async (point: PointData, file: File) => {
      if (!accessToken) return;

      let preparedFile: File;
      try {
        preparedFile = await prepareAttachmentImageFile(file);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to prepare the selected image.";
        setModalErrorMessage(message);
        window.alert(message);
        return;
      }

      const existingAttachmentCount =
        summaryByPoint[point.displayName]?.attachmentCount ??
        attachmentsByPoint[point.displayName]?.length ??
        0;

      if (
        existingAttachmentCount > 0 &&
        !window.confirm(
          "This point already has a file. Uploading a new file will replace the current file. Continue?",
        )
      ) {
        return;
      }

      setUploadingPointKey(point.displayName);
      if (activePoint?.displayName === point.displayName) {
        setModalErrorMessage(null);
      }

      try {
        await api.uploadAttachment(accessToken, {
          displayName: point.displayName,
          pointKey: point.pointKey ?? undefined,
          indexCode: point.indexCode ?? undefined,
          file: preparedFile,
        });
        await fetchPointResources(point);
      } catch (error) {
        setModalErrorMessage(getApiErrorMessage(error));
        if (activePoint?.displayName !== point.displayName) {
          setActivePoint(point);
          setRemarkDraft("");
          void loadPointDetails(point);
        }
      } finally {
        setUploadingPointKey(null);
      }
    },
    [
      accessToken,
      activePoint,
      attachmentsByPoint,
      fetchPointResources,
      loadPointDetails,
      summaryByPoint,
    ],
  );

  const handleCreateRemark = useCallback(async () => {
    if (!activePoint || !accessToken || !remarkDraft.trim()) return;

    setIsSubmittingRemark(true);
    setModalErrorMessage(null);

    try {
      await api.createRemark(accessToken, {
        displayName: activePoint.displayName,
        pointKey: activePoint.pointKey ?? undefined,
        indexCode: activePoint.indexCode ?? undefined,
        message: remarkDraft.trim(),
      });
      setRemarkDraft("");
      await fetchPointResources(activePoint);
    } catch (error) {
      setModalErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmittingRemark(false);
    }
  }, [accessToken, activePoint, fetchPointResources, remarkDraft]);

  const handleOpenAttachment = useCallback(
    async (attachment: AttachmentRecord) => {
      if (!accessToken) return;

      setModalErrorMessage(null);

      try {
        const blob = await api.downloadAttachment(accessToken, attachment._id);
        const objectUrl = window.URL.createObjectURL(blob);
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
      } catch (error) {
        setModalErrorMessage(getApiErrorMessage(error));
      }
    },
    [accessToken],
  );

  const handleLoadAttachmentPreview = useCallback(
    async (attachment: AttachmentRecord) => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      const blob = await api.downloadAttachment(accessToken, attachment._id);
      return window.URL.createObjectURL(blob);
    },
    [accessToken],
  );

  const handleDeleteAttachment = useCallback(
    async (attachment: AttachmentRecord) => {
      if (!accessToken || !activePoint) return;
      if (!window.confirm("Delete this file from the point?")) return;

      setModalErrorMessage(null);

      try {
        await api.deleteAttachment(accessToken, attachment._id);
        await fetchPointResources(activePoint);
      } catch (error) {
        setModalErrorMessage(getApiErrorMessage(error));
      }
    },
    [accessToken, activePoint, fetchPointResources],
  );

  const handleDeleteRemark = useCallback(
    async (remark: RemarkLogRecord) => {
      if (!accessToken || !activePoint) return;
      if (!window.confirm("Delete this remark log?")) return;

      setModalErrorMessage(null);

      try {
        await api.deleteRemark(accessToken, remark._id);
        await fetchPointResources(activePoint);
      } catch (error) {
        setModalErrorMessage(getApiErrorMessage(error));
      }
    },
    [accessToken, activePoint, fetchPointResources],
  );

  const handleUpdateRemark = useCallback(
    async (remark: RemarkLogRecord, message: string) => {
      if (!accessToken || !activePoint) return;

      setModalErrorMessage(null);

      try {
        await api.updateRemark(accessToken, remark._id, message);
        await fetchPointResources(activePoint);
      } catch (error) {
        setModalErrorMessage(getApiErrorMessage(error));
        throw error;
      }
    },
    [accessToken, activePoint, fetchPointResources],
  );

  const activeRemarks = activePoint ? remarkLogsByPoint[activePoint.displayName] || [] : [];
  const activeAttachments = activePoint ? attachmentsByPoint[activePoint.displayName] || [] : [];

  return (
    <>
    <div className="flex flex-col flex-1 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">
      {/* Toolbar: Search + Segments + Actions */}
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700/50 dark:bg-slate-800/60 lg:px-4 lg:py-3">
        <div className="flex items-center gap-2 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search indexCode, displayName..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-700 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeSegCount > 0 || hasColumnFilters ? (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {activeSegCount + totalActiveFilters}
              </span>
            ) : null}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 lg:hidden">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredPoints.length.toLocaleString()}</span>
            <span className="mx-0.5">/</span>
            {visiblePointList.length.toLocaleString()}
          </span>
        </div>

        <div className="hidden items-center gap-2 flex-wrap lg:flex">
          <div className="relative w-56">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search indexCode, displayName..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-700 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700"
            />
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700/60" />

          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          {SEGMENT_LABELS.map((label) => (
            <SegmentDropdown
              key={label}
              label={label}
              options={segmentOptions[label]}
              value={segmentFilters[label]}
              onChange={(val) => setSegmentFilter(label, val)}
            />
          ))}
          {activeSegCount > 0 ? (
            <button
              onClick={clearSegmentFilters}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : null}

          <div className="flex-1" />

          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredPoints.length.toLocaleString()}</span>
            <span className="mx-0.5">/</span>
            {visiblePointList.length.toLocaleString()}
          </span>

          {hasColumnFilters ? (
            <button
              onClick={clearAllColumnFilters}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <FilterX className="h-3 w-3" />
              Filters ({totalActiveFilters})
            </button>
          ) : null}

          <button
            onClick={handleExport}
            disabled={filteredPoints.length === 0 || isExporting}
            className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200/70 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isExporting ? (
              <ArrowUpDown className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isExporting ? "Preparing..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Table Header: sort labels + filter icons */}
      <div
        className="hidden lg:grid gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700/50 dark:bg-slate-800/50"
        style={{ gridTemplateColumns }}
      >
        <ColumnHeader label="Index Code" column="indexCode" allPoints={visiblePointList} />
        <ColumnHeader label="Display Name" column="displayName" allPoints={visiblePointList} />
        <ColumnHeader label="Point Name" column="template" allPoints={visiblePointList} />
        <ColumnHeader label="SN" column="serialNumber" allPoints={visiblePointList} />
        <ColumnHeader label="Units" column="units" align="center" allPoints={visiblePointList} />
        {canSeeOperationalValues ? (
          <ColumnHeader label="BMS" column="n4Val" align="center" allPoints={visiblePointList} />
        ) : null}
        <ColumnHeader label="IVIVA" column="ivivaVal" align="center" allPoints={visiblePointList} />
        {canSeeOperationalValues ? (
          <ColumnHeader label="Diff" column="diff" align="center" allPoints={visiblePointList} />
        ) : null}
        <ColumnHeader label="Status" column="n4Status" align="center" allPoints={visiblePointList} />
        <div className="flex items-center justify-center text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">
        </div>
      </div>

      {/* Desktop Virtualized Rows */}
      <div ref={parentRef} className="hidden flex-1 overflow-auto lg:block" style={{ minHeight: 0 }}>
        {filteredPoints.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            {visiblePointList.length === 0 ? "Waiting for data..." : "No points match your filter"}
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
                    gridTemplateColumns,
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
                    <div className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-200" title={point.serialNumber || "-"}>
                    {point.serialNumber || "-"}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 truncate text-[11px] text-center" title={point.units || "—"}>
                    {point.units || "—"}
                  </div>
                  {canSeeOperationalValues ? (
                    <div className={`text-center font-mono text-[11px] tabular-nums ${isChanged ? "text-emerald-600 dark:text-emerald-300 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                      {point.n4Val ?? "—"}
                    </div>
                  ) : null}
                  <div className="text-center font-mono text-[11px] tabular-nums text-slate-700 dark:text-slate-300">
                    {point.ivivaVal ?? "—"}
                  </div>
                  {canSeeOperationalValues ? <DiffCell n4Val={point.n4Val} ivivaVal={point.ivivaVal} /> : null}
                  <div className="flex justify-center">
                    <N4StatusDot status={point.n4Status} />
                  </div>
                  <div className="flex justify-center">
                    <PointResourceActionsCell
                      point={point}
                      currentUserRole={user?.role || null}
                      remarkCount={
                        summaryByPoint[point.displayName]?.remarkCount ||
                        (remarkLogsByPoint[point.displayName] || []).length
                      }
                      attachmentCount={
                        summaryByPoint[point.displayName]?.attachmentCount ||
                        (attachmentsByPoint[point.displayName] || []).length
                      }
                      isUploading={uploadingPointKey === point.displayName}
                      onOpenLogs={() => handleOpenLogs(point)}
                      onUploadFile={(file) => void handleUploadFile(point, file)}
                      onOpenTrend={() =>
                        navigate(`/trend/${encodeURIComponent(point.displayName)}`)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Card Rows */}
      <div ref={mobileParentRef} className="flex-1 overflow-auto px-3 py-4 lg:hidden" style={{ minHeight: 0 }}>
        {filteredPoints.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            {visiblePointList.length === 0 ? "Waiting for data..." : "No points match your filter"}
          </div>
        ) : (
          <div
            style={{
              height: `${mobileVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {mobileVirtualizer.getVirtualItems().map((virtualRow) => {
              const point = filteredPoints[virtualRow.index];

              return (
                <div
                  key={point.displayName}
                  className="absolute left-0 top-0 w-full box-border pb-4"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <PointMobileCard
                    point={point}
                    isChanged={changedKeys.has(point.displayName)}
                    showOperationalValues={canSeeOperationalValues}
                    remarkCount={
                      summaryByPoint[point.displayName]?.remarkCount ||
                      (remarkLogsByPoint[point.displayName] || []).length
                    }
                    attachmentCount={
                      summaryByPoint[point.displayName]?.attachmentCount ||
                      (attachmentsByPoint[point.displayName] || []).length
                    }
                    isUploading={uploadingPointKey === point.displayName}
                    currentUserRole={user?.role || null}
                    onOpenLogs={() => handleOpenLogs(point)}
                    onUploadFile={(file) => void handleUploadFile(point, file)}
                    onOpenTrend={() => navigate(`/trend/${encodeURIComponent(point.displayName)}`)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    {mobileFiltersOpen ? (
      <div className="fixed inset-0 z-[70] lg:hidden">
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setMobileFiltersOpen(false)}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        />
        <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white px-4 pb-6 pt-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filters</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Narrow the meter list for field checking.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SEGMENT_LABELS.map((label) => (
              <label key={`mobile-${label}`} className="space-y-1.5">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {label}
                </span>
                <select
                  value={segmentFilters[label] ?? ""}
                  onChange={(event) =>
                    setSegmentFilter(label, event.target.value || null)
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-slate-600"
                >
                  <option value="">All</option>
                  {segmentOptions[label].map((option) => (
                    <option key={`${label}-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {activeSegCount > 0 || hasColumnFilters ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              {activeSegCount > 0 ? (
                <button
                  onClick={clearSegmentFilters}
                  className="flex h-9 items-center gap-1 rounded-lg px-3 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              ) : null}
              {hasColumnFilters ? (
                <button
                  onClick={clearAllColumnFilters}
                  className="flex h-9 items-center gap-1 rounded-lg px-3 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <FilterX className="w-3 h-3" />
                  Clear columns
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    ) : null}
    {activePoint && (
        <PointResourceModal
          point={activePoint}
          serialNumber={activePoint.serialNumber || "-"}
          remarks={activeRemarks}
          attachments={activeAttachments}
          isLoading={isModalLoading}
          isSubmittingRemark={isSubmittingRemark}
          isUploading={uploadingPointKey === activePoint.displayName}
          errorMessage={modalErrorMessage}
          remarkDraft={remarkDraft}
          onRemarkDraftChange={setRemarkDraft}
          onSubmitRemark={() => void handleCreateRemark()}
          onRefresh={() => void loadPointDetails(activePoint)}
          onUploadFile={(file) => void handleUploadFile(activePoint, file)}
          onOpenAttachment={(attachment) => void handleOpenAttachment(attachment)}
          onLoadAttachmentPreview={handleLoadAttachmentPreview}
          onDeleteAttachment={(attachment) => void handleDeleteAttachment(attachment)}
          onDeleteRemark={(remark) => void handleDeleteRemark(remark)}
          onUpdateRemark={handleUpdateRemark}
          currentUserId={user?.id || null}
          currentUserRole={user?.role || null}
          onClose={() => {
            setActivePoint(null);
            setModalErrorMessage(null);
            setRemarkDraft("");
          }}
        />
      )}
    </>
  );
}
