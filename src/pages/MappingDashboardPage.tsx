import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Filter,
  FilterX,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { ApiError, api, type MappingPointRecord } from "../services/api";

const INITIAL_VISIBLE_ROWS = 60;
const LOAD_MORE_ROWS = 60;
const MASTER_POINTS_PAGE_SIZE = 50000;
const TABLE_GRID_COLS =
  "grid-cols-[minmax(220px,1.8fr)_minmax(260px,2.1fr)_minmax(150px,1fr)_minmax(72px,0.55fr)_minmax(96px,0.7fr)_minmax(96px,0.7fr)_minmax(132px,0.95fr)_minmax(132px,0.95fr)_64px]";

type SegmentKey =
  | "ALL"
  | "MATCHED"
  | "NEEDS_REVIEW"
  | "METADATA_WARNING"
  | "IVIVA_MISMATCH";

type SortField =
  | "indexCode"
  | "displayName"
  | "pointName"
  | "units"
  | "bms"
  | "iviva"
  | "metadataStatus"
  | "ivivaMapping";

type SortDirection = "asc" | "desc";
type FilterColumn =
  | "indexCode"
  | "displayName"
  | "pointName"
  | "units"
  | "metadataStatus"
  | "ivivaMapping";
type ColumnFilters = Record<FilterColumn, Set<string>>;

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function compareTextValues(a: string, b: string) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function escapeCsvValue(value: string | null | undefined) {
  const normalized = value ?? "";
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function createEmptyColumnFilters(): ColumnFilters {
  return {
    indexCode: new Set<string>(),
    displayName: new Set<string>(),
    pointName: new Set<string>(),
    units: new Set<string>(),
    metadataStatus: new Set<string>(),
    ivivaMapping: new Set<string>(),
  };
}

function getWarningStatus(row: MappingPointRecord) {
  if (row.reviewFlags?.includes("duplicate_bacnet_key")) {
    return "duplicate_bacnet_key" as const;
  }
  if (row.reviewFlags?.includes("duplicate_display_name")) {
    return "duplicate_display_name" as const;
  }
  if (row.reviewFlags?.includes("obix_snapshot_ambiguous")) {
    return "obix_snapshot_ambiguous" as const;
  }
  return "none" as const;
}

function getMetadataStatusLabel(status: MappingPointRecord["mappingStatus"]) {
  switch (status) {
    case "matched":
      return "Match";
    case "obix_only":
      return "oBIX Only";
    case "import_only":
    default:
      return "Import Only";
  }
}

function getMetadataStatusValue(row: MappingPointRecord) {
  return getWarningStatus(row) !== "none"
    ? "Warning"
    : getMetadataStatusLabel(row.mappingStatus);
}

function getIvivaMatchLabel(status: MappingPointRecord["matchStatus"]) {
  switch (status) {
    case "matched":
      return "matched";
    case "wrong_index_code":
      return "wrong index code";
    case "point_address_mismatch":
      return "point address mismatch";
    case "not_found":
      return "not found";
    case "pending":
    default:
      return "pending";
  }
}

function getReviewNotes(row: MappingPointRecord) {
  const notes: string[] = [];

  if (row.reviewFlags?.includes("duplicate_bacnet_key_across_batches")) {
    notes.push("Duplicate BACnet key across active batches");
  } else if (row.reviewFlags?.includes("duplicate_bacnet_key_within_batch")) {
    notes.push("Duplicate BACnet key inside the active batch");
  } else if (row.reviewFlags?.includes("duplicate_bacnet_key")) {
    notes.push("Duplicate BACnet key detected");
  }

  if (row.reviewFlags?.includes("duplicate_display_name_across_batches")) {
    notes.push("Duplicate display name across active batches");
  } else if (row.reviewFlags?.includes("duplicate_display_name_within_batch")) {
    notes.push("Duplicate display name inside the active batch");
  } else if (row.reviewFlags?.includes("duplicate_display_name")) {
    notes.push("Duplicate display name detected");
  }

  if (row.reviewFlags?.includes("obix_snapshot_ambiguous")) {
    notes.push("Multiple active oBIX points share this display name");
  }

  if (row.matchRemark) {
    notes.push(row.matchRemark);
  }

  return notes;
}

function getReviewTooltip(row: MappingPointRecord) {
  const notes = getReviewNotes(row);
  return notes.length > 0 ? notes.join("\n") : "No review note";
}

function formatPointName(row: MappingPointRecord) {
  if (row.ivivaPointTemplateName?.trim()) {
    return row.ivivaPointTemplateName.trim();
  }
  if (row.pointSuffix?.trim()) {
    return row.pointSuffix.trim();
  }
  return "—";
}

function formatUnits(row: MappingPointRecord) {
  return row.ivivaUnits || row.bmsUnit || "—";
}

function formatIndexCode(row: MappingPointRecord) {
  return row.indexCodeCandidate || "—";
}

function formatBmsValue(row: MappingPointRecord) {
  return row.bmsValue || "—";
}

function formatIvivaValue(row: MappingPointRecord) {
  return row.ivivaLatestValue || "—";
}

function getRowSearchText(row: MappingPointRecord) {
  return [
    formatIndexCode(row),
    row.displayName || "",
    formatPointName(row),
    formatUnits(row),
    formatBmsValue(row),
    formatIvivaValue(row),
    getMetadataStatusValue(row),
    getIvivaMatchLabel(row.matchStatus),
    getReviewTooltip(row),
  ]
    .join(" ")
    .toLowerCase();
}

function getSortValue(row: MappingPointRecord, field: SortField) {
  switch (field) {
    case "indexCode":
      return formatIndexCode(row);
    case "displayName":
      return row.displayName || "—";
    case "pointName":
      return formatPointName(row);
    case "units":
      return formatUnits(row);
    case "bms":
      return formatBmsValue(row);
    case "iviva":
      return formatIvivaValue(row);
    case "metadataStatus":
      return getMetadataStatusValue(row);
    case "ivivaMapping":
      return getIvivaMatchLabel(row.matchStatus);
    default:
      return "—";
  }
}

function getFilterValue(row: MappingPointRecord, field: FilterColumn) {
  switch (field) {
    case "indexCode":
      return formatIndexCode(row);
    case "displayName":
      return row.displayName || "—";
    case "pointName":
      return formatPointName(row);
    case "units":
      return formatUnits(row);
    case "metadataStatus":
      return getMetadataStatusValue(row);
    case "ivivaMapping":
      return getIvivaMatchLabel(row.matchStatus);
    default:
      return "—";
  }
}

function SortIcon({
  column,
  sortColumn,
  sortDirection,
}: {
  column: SortField;
  sortColumn: SortField | null;
  sortDirection: SortDirection;
}) {
  if (sortColumn !== column) {
    return <ArrowUpDown className="h-2.5 w-2.5 text-slate-400 dark:text-slate-600" />;
  }

  if (sortDirection === "asc") {
    return <ArrowUp className="h-2.5 w-2.5 text-slate-700 dark:text-slate-200" />;
  }

  return <ArrowDown className="h-2.5 w-2.5 text-slate-700 dark:text-slate-200" />;
}

function ColumnFilterDropdown({
  column,
  allPoints,
  selected,
  onToggle,
  onClear,
}: {
  column: FilterColumn;
  allPoints: MappingPointRecord[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const isActive = selected.size > 0;

  useEffect(() => {
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    for (const row of allPoints) {
      const value = getFilterValue(row, column);
      if (value) values.add(value);
    }
    return [...values].sort((a, b) => compareTextValues(a, b));
  }, [allPoints, column]);

  const filteredValues = search
    ? uniqueValues.filter((value) =>
        value.toLowerCase().includes(search.toLowerCase()),
      )
    : uniqueValues;

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`rounded p-0.5 transition-colors ${
          isActive
            ? "bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200"
            : "text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400"
        }`}
        title={isActive ? `${selected.size} selected` : "Filter"}
      >
        <Filter className="h-2.5 w-2.5" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-black/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
          <div className="p-1.5">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              autoFocus
              className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-600"
            />
          </div>
          {isActive ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                setSearch("");
              }}
              className="w-full border-b border-slate-200 px-3 py-1 text-left text-[11px] text-rose-600 hover:bg-rose-50 dark:border-slate-700/60 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              Clear selection ({selected.size})
            </button>
          ) : null}
          <div className="max-h-56 overflow-auto py-1">
            {filteredValues.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                No values
              </div>
            ) : (
              filteredValues.map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(value)}
                    onChange={() => onToggle(value)}
                    className="h-3 w-3 rounded border-slate-300 bg-white text-slate-900 focus:ring-0 focus:ring-offset-0 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <span className="truncate text-slate-700 dark:text-slate-300">
                    {value}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColumnHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  filterColumn,
  filterValues,
  allPoints,
  onToggleFilterValue,
  onClearFilter,
  align = "left",
}: {
  label: string;
  column: SortField;
  sortColumn: SortField | null;
  sortDirection: SortDirection;
  onSort: (column: SortField) => void;
  filterColumn?: FilterColumn;
  filterValues?: Set<string>;
  allPoints: MappingPointRecord[];
  onToggleFilterValue?: (value: string) => void;
  onClearFilter?: () => void;
  align?: "left" | "center";
}) {
  const alignCls = align === "center" ? "justify-center" : "justify-start";

  return (
    <div className={`flex items-center gap-1 ${alignCls}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`flex items-center gap-0.5 text-[10px] font-semibold tracking-wider transition-colors hover:text-slate-700 dark:hover:text-slate-200 ${
          sortColumn === column
            ? "text-slate-700 dark:text-slate-200"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        <span>{label}</span>
        <SortIcon column={column} sortColumn={sortColumn} sortDirection={sortDirection} />
      </button>
      {filterColumn && filterValues && onToggleFilterValue && onClearFilter ? (
        <ColumnFilterDropdown
          column={filterColumn}
          allPoints={allPoints}
          selected={filterValues}
          onToggle={onToggleFilterValue}
          onClear={onClearFilter}
        />
      ) : null}
    </div>
  );
}

export function MappingDashboardPage() {
  const { accessToken } = useAuth();
  const [allPoints, setAllPoints] = useState<MappingPointRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<SegmentKey>("ALL");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(() =>
    createEmptyColumnFilters(),
  );
  const [sortColumn, setSortColumn] = useState<SortField | null>("displayName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  const [noteTooltip, setNoteTooltip] = useState<{
    text: string;
    left: number;
    top: number;
    placement: "top" | "bottom";
  } | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setVisibleCount(INITIAL_VISIBLE_ROWS);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const loadPoints = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const response = await api.listBmsMasterPoints(accessToken, {
          page: 1,
          pageSize: MASTER_POINTS_PAGE_SIZE,
        });
        if (cancelled) return;
        setAllPoints(response.items);
      } catch (error) {
        if (!cancelled) {
          setMessage(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPoints();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!noteTooltip) return;

    const clearTooltip = () => setNoteTooltip(null);
    window.addEventListener("scroll", clearTooltip, true);
    window.addEventListener("resize", clearTooltip);
    return () => {
      window.removeEventListener("scroll", clearTooltip, true);
      window.removeEventListener("resize", clearTooltip);
    };
  }, [noteTooltip]);

  const filteredPoints = useMemo(() => {
    const searchTerm = search.toLowerCase();
    const rows = allPoints.filter((row) => {
      if (segment === "MATCHED" && row.matchStatus !== "matched") {
        return false;
      }
      if (segment === "METADATA_WARNING" && getWarningStatus(row) === "none") {
        return false;
      }
      if (segment === "IVIVA_MISMATCH") {
        const isMismatch =
          row.matchStatus === "wrong_index_code" ||
          row.matchStatus === "point_address_mismatch" ||
          row.matchStatus === "not_found";
        if (!isMismatch) return false;
      }
      if (segment === "NEEDS_REVIEW") {
        const hasReview =
          getWarningStatus(row) !== "none" ||
          row.matchStatus === "wrong_index_code" ||
          row.matchStatus === "point_address_mismatch" ||
          row.matchStatus === "not_found";
        if (!hasReview) return false;
      }

      if (searchTerm && !getRowSearchText(row).includes(searchTerm)) {
        return false;
      }

      for (const [column, values] of Object.entries(columnFilters) as Array<
        [FilterColumn, Set<string>]
      >) {
        if (values.size === 0) continue;
        const value = getFilterValue(row, column);
        if (!values.has(value)) {
          return false;
        }
      }

      return true;
    });

    const sorted = [...rows];
    if (sortColumn) {
      sorted.sort((left, right) => {
        const a = getSortValue(left, sortColumn);
        const b = getSortValue(right, sortColumn);
        const result = compareTextValues(a, b);
        return sortDirection === "asc" ? result : -result;
      });
    }

    return sorted;
  }, [allPoints, columnFilters, search, segment, sortColumn, sortDirection]);

  const visiblePoints = useMemo(
    () => filteredPoints.slice(0, visibleCount),
    [filteredPoints, visibleCount],
  );

  useEffect(() => {
    setVisibleCount((current) =>
      Math.min(
        Math.max(INITIAL_VISIBLE_ROWS, current),
        Math.max(INITIAL_VISIBLE_ROWS, filteredPoints.length || INITIAL_VISIBLE_ROWS),
      ),
    );
  }, [filteredPoints.length]);

  useEffect(() => {
    const node = tableScrollRef.current;
    if (!node) return;

    const handleScroll = () => {
      const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (remaining < 200 && visibleCount < filteredPoints.length) {
        setVisibleCount((current) =>
          Math.min(current + LOAD_MORE_ROWS, filteredPoints.length),
        );
      }
    };

    node.addEventListener("scroll", handleScroll);
    return () => node.removeEventListener("scroll", handleScroll);
  }, [filteredPoints.length, visibleCount]);

  const summary = useMemo(() => {
    const total = allPoints.length;
    const metadataMatched = allPoints.filter((row) => row.mappingStatus === "matched").length;
    const ivivaMatched = allPoints.filter((row) => row.matchStatus === "matched").length;
    const needsReview = allPoints.filter((row) => {
      return (
        getWarningStatus(row) !== "none" ||
        row.matchStatus === "wrong_index_code" ||
        row.matchStatus === "point_address_mismatch" ||
        row.matchStatus === "not_found"
      );
    }).length;

    return { total, metadataMatched, ivivaMatched, needsReview };
  }, [allPoints]);

  const totalActiveFilters = useMemo(
    () =>
      Object.values(columnFilters).reduce((count, values) => count + values.size, 0),
    [columnFilters],
  );

  const hasColumnFilters = totalActiveFilters > 0;

  const handleSort = (column: SortField) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  };

  const toggleColumnFilterValue = (column: FilterColumn, value: string) => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
    setColumnFilters((current) => {
      const next = { ...current };
      const updated = new Set(next[column]);
      if (updated.has(value)) {
        updated.delete(value);
      } else {
        updated.add(value);
      }
      next[column] = updated;
      return next;
    });
  };

  const clearColumnFilter = (column: FilterColumn) => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
    setColumnFilters((current) => ({
      ...current,
      [column]: new Set<string>(),
    }));
  };

  const clearAllColumnFilters = () => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
    setColumnFilters(createEmptyColumnFilters());
  };

  const handleExportCsv = () => {
    if (filteredPoints.length === 0) return;

    const header = [
      "Index Code",
      "Display Name",
      "Point Name",
      "Units",
      "BMS",
      "IVIVA",
      "Metadata Status",
      "IVIVA Mapping",
      "Review",
    ];

    const rows = filteredPoints.map((row) =>
      [
        formatIndexCode(row),
        row.displayName || "—",
        formatPointName(row),
        formatUnits(row),
        formatBmsValue(row),
        formatIvivaValue(row),
        getMetadataStatusValue(row),
        getIvivaMatchLabel(row.matchStatus),
        getReviewTooltip(row),
      ]
        .map((value) => escapeCsvValue(value))
        .join(","),
    );

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mapping-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleShowTooltip = (
    event: ReactMouseEvent<HTMLButtonElement>,
    text: string,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 260;
    const margin = 12;
    const placement = rect.top < 140 ? "bottom" : "top";
    const left = Math.max(
      margin,
      Math.min(window.innerWidth - tooltipWidth - margin, rect.right - tooltipWidth),
    );
    const top = placement === "top" ? rect.top - 10 : rect.bottom + 10;

    setNoteTooltip({
      text,
      left,
      top,
      placement,
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-5 dark:bg-slate-950">
      <div className="mx-auto flex min-h-0 w-full max-w-[1560px] flex-1 flex-col gap-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Master Points",
            value: summary.total,
            helper: "Rows in current master projection",
          },
          {
            label: "Metadata Matched",
            value: summary.metadataMatched,
            helper: "Import rows linked with oBIX",
          },
          {
            label: "IVIVA Matched",
            value: summary.ivivaMatched,
            helper: "Rows matched against IVIVA",
          },
          {
            label: "Needs Review",
            value: summary.needsReview,
            helper: "Warnings or mapping mismatches",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/60"
          >
            <div className="text-[10px] font-medium tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {card.label}
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {card.value.toLocaleString()}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {card.helper}
            </div>
          </div>
        ))}
        </section>

        <section className="flex min-h-[calc(100vh-220px)] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/50">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700/50 dark:bg-slate-800/60">
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            <button
              type="button"
              className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search index code, display name, point"
                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-700 placeholder-slate-400 outline-none transition-colors focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700"
              />
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredPoints.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/80"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>

            <div className="hidden items-center gap-2 lg:flex lg:flex-nowrap">
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search index code, display name, point"
                  className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-700 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                />
              </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700/60" />

            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            {[
              { key: "ALL" as const, label: "All" },
              { key: "MATCHED" as const, label: "Matched" },
              { key: "NEEDS_REVIEW" as const, label: "Needs Review" },
              { key: "METADATA_WARNING" as const, label: "Metadata Warning" },
              { key: "IVIVA_MISMATCH" as const, label: "IVIVA Mismatch" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setSegment(item.key);
                  setVisibleCount(INITIAL_VISIBLE_ROWS);
                }}
                className={`flex h-8 items-center rounded-md border px-2.5 text-[11px] font-medium transition-colors ${
                  segment === item.key
                    ? "border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-200/70 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700/80 dark:hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {hasColumnFilters ? (
                  <button
                    type="button"
                    onClick={clearAllColumnFilters}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <FilterX className="h-3 w-3" />
                    Clear filters
                  </button>
                ) : null}

                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {filteredPoints.length.toLocaleString()}
                  </span>
                  <span className="mx-0.5">/</span>
                  {allPoints.length.toLocaleString()}
                </span>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={filteredPoints.length === 0}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/80"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div
            className={`grid ${TABLE_GRID_COLS} gap-3 border-b border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700/50 dark:bg-slate-800/50`}
          >
          <ColumnHeader
            label="Index Code"
            column="indexCode"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            filterColumn="indexCode"
            filterValues={columnFilters.indexCode}
            allPoints={allPoints}
            onToggleFilterValue={(value) => toggleColumnFilterValue("indexCode", value)}
            onClearFilter={() => clearColumnFilter("indexCode")}
          />
          <ColumnHeader
            label="Display Name"
            column="displayName"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            filterColumn="displayName"
            filterValues={columnFilters.displayName}
            allPoints={allPoints}
            onToggleFilterValue={(value) => toggleColumnFilterValue("displayName", value)}
            onClearFilter={() => clearColumnFilter("displayName")}
          />
          <ColumnHeader
            label="Point Name"
            column="pointName"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            filterColumn="pointName"
            filterValues={columnFilters.pointName}
            allPoints={allPoints}
            onToggleFilterValue={(value) => toggleColumnFilterValue("pointName", value)}
            onClearFilter={() => clearColumnFilter("pointName")}
          />
          <ColumnHeader
            label="Units"
            column="units"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            filterColumn="units"
            filterValues={columnFilters.units}
            allPoints={allPoints}
            onToggleFilterValue={(value) => toggleColumnFilterValue("units", value)}
            onClearFilter={() => clearColumnFilter("units")}
            align="center"
          />
          <ColumnHeader
            label="BMS"
            column="bms"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            allPoints={allPoints}
            align="center"
          />
          <ColumnHeader
            label="IVIVA"
            column="iviva"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            allPoints={allPoints}
            align="center"
          />
          <ColumnHeader
            label="Metadata Status"
            column="metadataStatus"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            filterColumn="metadataStatus"
            filterValues={columnFilters.metadataStatus}
            allPoints={allPoints}
            onToggleFilterValue={(value) => toggleColumnFilterValue("metadataStatus", value)}
            onClearFilter={() => clearColumnFilter("metadataStatus")}
          />
          <ColumnHeader
            label="IVIVA Mapping"
            column="ivivaMapping"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            filterColumn="ivivaMapping"
            filterValues={columnFilters.ivivaMapping}
            allPoints={allPoints}
            onToggleFilterValue={(value) => toggleColumnFilterValue("ivivaMapping", value)}
            onClearFilter={() => clearColumnFilter("ivivaMapping")}
            align="left"
          />
            <div className="flex items-center justify-center text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">
              Review
            </div>
          </div>

          <div ref={tableScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                Loading mapping dashboard...
              </div>
            ) : message ? (
              <div className="px-4 py-12 text-center text-sm text-rose-500 dark:text-rose-400">
                {message}
              </div>
            ) : visiblePoints.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                No mapping rows found for the current filters
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/30">
                {visiblePoints.map((row, index) => {
                  const warningStatus = getWarningStatus(row);
                  const reviewText = getReviewTooltip(row);
                  const isEven = index % 2 === 0;
                  const reviewTone =
                    warningStatus !== "none" ||
                    row.matchStatus === "wrong_index_code" ||
                    row.matchStatus === "point_address_mismatch"
                      ? "border-l-4 border-l-amber-500 dark:border-l-amber-400"
                      : row.matchStatus === "not_found"
                        ? "border-l-4 border-l-rose-500 dark:border-l-rose-400"
                        : "border-l-4 border-l-transparent";

                  return (
                    <div
                      key={row._id}
                      className={`grid ${TABLE_GRID_COLS} gap-3 border-b border-slate-100 px-3 py-3 text-sm transition-colors hover:bg-slate-100 dark:border-slate-800/30 dark:hover:bg-slate-800/50 ${
                        isEven ? "bg-slate-50/50 dark:bg-slate-900/30" : "bg-transparent"
                      } ${reviewTone}`}
                    >
                    <div
                      className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300"
                      title={formatIndexCode(row)}
                    >
                      {formatIndexCode(row)}
                    </div>
                    <div
                      className="truncate font-mono text-[11px] text-slate-900 dark:text-slate-100"
                      title={row.displayName || "—"}
                    >
                      {row.displayName || "—"}
                    </div>
                    <div
                      className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                      title={formatPointName(row)}
                    >
                      {formatPointName(row)}
                    </div>
                    <div
                      className="text-center text-[11px] text-slate-500 dark:text-slate-400"
                      title={formatUnits(row)}
                    >
                      {formatUnits(row)}
                    </div>
                    <div className="text-center font-mono text-[11px] tabular-nums text-slate-700 dark:text-slate-300">
                      {formatBmsValue(row)}
                    </div>
                    <div className="text-center font-mono text-[11px] tabular-nums text-slate-700 dark:text-slate-300">
                      {formatIvivaValue(row)}
                    </div>
                    <div
                      className={`truncate text-[11px] ${
                        warningStatus !== "none"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {getMetadataStatusValue(row)}
                    </div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {getIvivaMatchLabel(row.matchStatus)}
                    </div>
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onMouseEnter={(event) => handleShowTooltip(event, reviewText)}
                        onMouseLeave={() => setNoteTooltip(null)}
                        onBlur={() => setNoteTooltip(null)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${
                          reviewText === "No review note"
                            ? "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                            : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                        }`}
                        aria-label={reviewText}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {noteTooltip ? (
          <div
            className={`pointer-events-none fixed z-[120] w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-4 text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${
              noteTooltip.placement === "top" ? "-translate-y-full" : ""
            }`}
            style={{
              left: `${noteTooltip.left}px`,
              top: `${noteTooltip.top}px`,
            }}
            role="tooltip"
          >
            <div className="whitespace-pre-line">{noteTooltip.text}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
