import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Download,
  Filter,
  FilterX,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

type FilterColumn =
  | "CompanyCode"
  | "Contract"
  | "ContractName"
  | "BusinessPartner"
  | "SalesType"
  | "RepRuleNo"
  | "NameOfTerm"
  | "MeterName";

type ColumnFilters = Record<FilterColumn, Set<string>>;
type SortField = keyof MeterBillingReportRow;
type SortDirection = "asc" | "desc";
type SortState = {
  column: SortField | null;
  direction: SortDirection;
};
import { ApiError, api, type MeterBillingReportResponse, type MeterBillingReportRow } from "../services/api";
import {
  getCachedMeterBillingReport,
  getSelectedMeterBillingReportMonth,
  setCachedMeterBillingReport,
  setSelectedMeterBillingReportMonth,
} from "../services/meterBillingReportCache";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";
function getBangkokMonthYear() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value ?? new Date().getFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value ?? new Date().getMonth() + 1);
  return { month, year };
}

function parseReportMonth(reportMonth: string | null) {
  if (!reportMonth || !/^\d{2}-\d{2}$/.test(reportMonth)) {
    return getBangkokMonthYear();
  }

  const month = Number(reportMonth.slice(0, 2));
  const year = 2000 + Number(reportMonth.slice(3, 5));
  if (month < 1 || month > 12) {
    return getBangkokMonthYear();
  }
  return { month, year };
}

function formatReportMonth(month: number, year: number) {
  return `${String(month).padStart(2, "0")}-${String(year).slice(-2)}`;
}

function compareReportMonthsDescending(a: string, b: string) {
  const [aMonth, aYear] = a.split("-").map(Number);
  const [bMonth, bYear] = b.split("-").map(Number);
  const aValue = (2000 + aYear) * 100 + aMonth;
  const bValue = (2000 + bYear) * 100 + bMonth;
  return bValue - aValue;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to load meter billing report.";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function compareTextValues(a: string, b: string) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getFilterValue(row: MeterBillingReportRow, field: FilterColumn): string {
  const value = row[field];
  return value != null ? String(value) : "—";
}

function createEmptyColumnFilters(): ColumnFilters {
  return {
    CompanyCode: new Set<string>(),
    Contract: new Set<string>(),
    ContractName: new Set<string>(),
    BusinessPartner: new Set<string>(),
    SalesType: new Set<string>(),
    RepRuleNo: new Set<string>(),
    NameOfTerm: new Set<string>(),
    MeterName: new Set<string>(),
  };
}

function formatLoadedAt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const TABLE_COLUMNS: Array<{
  key: keyof MeterBillingReportRow;
  label: string;
  align?: "left" | "right";
}> = [
  { key: "CompanyCode", label: "Company Code" },
  { key: "Contract", label: "Contract" },
  { key: "ContractName", label: "Contract Name" },
  { key: "BusinessPartner", label: "Business Partner" },
  { key: "ReportFrom", label: "Report From" },
  { key: "ReportTo", label: "Report To" },
  { key: "SalesType", label: "Sales Type" },
  { key: "RepRuleNo", label: "Rep Rule No." },
  { key: "NameOfTerm", label: "Name Of Term" },
  { key: "SalesInUnits", label: "Sales In Units", align: "right" },
  { key: "SalesInUnits_M1", label: "Sales In Units M-1", align: "right" },
  { key: "SalesInUnits_M2", label: "Sales In Units M-2", align: "right" },
  { key: "ZeroSales", label: "Zero Sales", align: "right" },
  { key: "StatistQuantSales", label: "Statist Quant Sales", align: "right" },
  { key: "ReportedOn", label: "Reported On" },
  { key: "PreviousReadingUnit", label: "Previous Reading Unit", align: "right" },
  { key: "MeterName", label: "Meter Name"},
];

const TABLE_GRID_COLS =
  "grid-cols-[minmax(120px,auto)_minmax(100px,auto)_minmax(260px,auto)_minmax(120px,auto)_minmax(90px,auto)_minmax(90px,auto)_minmax(80px,auto)_minmax(90px,auto)_minmax(120px,auto)_minmax(120px,auto)_minmax(120px,auto)_minmax(120px,auto)_minmax(80px,auto)_minmax(140px,auto)_minmax(90px,auto)_minmax(140px,auto)_minmax(220px,auto)]";

function ColumnFilterDropdown({
  column,
  filterRows,
  selected,
  onToggle,
  onClear,
  position = "left",
}: {
  column: FilterColumn;
  filterRows: MeterBillingReportRow[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
  position?: "left" | "right" | "center";
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
    for (const row of filterRows) {
      const value = getFilterValue(row, column);
      if (value) values.add(value);
    }
    return [...values].sort((a, b) => compareTextValues(a, b));
  }, [filterRows, column]);

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
        <div
          className={`absolute top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-black/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30 ${
            position === "right"
              ? "right-0"
              : position === "center"
                ? "left-1/2 -translate-x-1/2"
                : "left-0"
          }`}
        >
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

function ReportMonthDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-500 transition-all whitespace-nowrap hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300"
      >
        <span className="text-slate-400 dark:text-slate-500">ReportMonth</span>
        <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700/70 dark:text-slate-100">
          {value}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-[90] mt-1 max-h-[220px] min-w-[150px] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl shadow-black/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-xs font-mono transition-colors ${
                value === option
                  ? "bg-slate-100 font-semibold text-slate-700 dark:bg-slate-700/70 dark:text-slate-200"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              }`}
            >
              {option}
            </button>
          ))}
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
  filterRows,
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
  filterRows?: MeterBillingReportRow[];
  onToggleFilterValue?: (value: string) => void;
  onClearFilter?: () => void;
  align?: "left" | "center" | "right";
}) {
  const alignCls = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";

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
      {filterColumn && filterValues && filterRows && onToggleFilterValue && onClearFilter ? (
        <ColumnFilterDropdown
          column={filterColumn}
          filterRows={filterRows}
          selected={filterValues}
          onToggle={onToggleFilterValue}
          onClear={onClearFilter}
          position={align === "right" ? "right" : "left"}
        />
      ) : null}
    </div>
  );
}

export function MeterBillingReportPage() {
  const { accessToken } = useAuth();
  const currentBangkokMonthYear = getBangkokMonthYear();
  const initialSelection = parseReportMonth(getSelectedMeterBillingReportMonth());
  const currentReportMonth = formatReportMonth(
    currentBangkokMonthYear.month,
    currentBangkokMonthYear.year,
  );
  const minimumReportMonth = "01-25";
  const selectedInitialReportMonth = formatReportMonth(initialSelection.month, initialSelection.year);
  const initialReportMonth =
    compareReportMonthsDescending(selectedInitialReportMonth, currentReportMonth) >= 0 &&
    compareReportMonthsDescending(minimumReportMonth, selectedInitialReportMonth) >= 0
      ? selectedInitialReportMonth
      : currentReportMonth;
  const [reportMonth, setReportMonth] = useState(initialReportMonth);
  const [searchInput, setSearchInput] = useState("");
  const [report, setReport] = useState<MeterBillingReportResponse | null>(() =>
    getCachedMeterBillingReport(initialReportMonth),
  );
  const [loading, setLoading] = useState(() => !getCachedMeterBillingReport(initialReportMonth));
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMonthOptions, setLoadingMonthOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(() => createEmptyColumnFilters());
  const [sortState, setSortState] = useState<SortState>({
    column: "CompanyCode",
    direction: "asc",
  });
  const previousReportMonthRef = useRef<string | null>(null);
  const [availableReportMonths, setAvailableReportMonths] = useState<string[]>([initialReportMonth]);

  const reportMonthOptions = useMemo(() => {
    const options = availableReportMonths.length > 0 ? availableReportMonths : [initialReportMonth];
    return options.includes(reportMonth) ? options : [reportMonth, ...options];
  }, [availableReportMonths, initialReportMonth, reportMonth]);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    setLoadingMonthOptions(true);

    void api
      .getMeterBillingReportMonthOptions(accessToken)
      .then((response) => {
        if (cancelled) return;
        const boundedItems = response.items
          .filter((item) => /^\d{2}-\d{2}$/.test(item))
          .filter(
            (item) =>
              compareReportMonthsDescending(item, currentReportMonth) >= 0 &&
              compareReportMonthsDescending(minimumReportMonth, item) >= 0,
          )
          .sort(compareReportMonthsDescending);

        if (boundedItems.length > 0) {
          setAvailableReportMonths(boundedItems);
          setReportMonth((current) =>
            boundedItems.includes(current) ? current : boundedItems[0],
          );
        } else {
          setAvailableReportMonths([currentReportMonth]);
          setReportMonth(currentReportMonth);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableReportMonths([currentReportMonth]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMonthOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentReportMonth]);

  const loadReport = async (nextReportMonth: string, mode: "initial" | "change" | "refresh") => {
    if (!accessToken) return;

    const cached = getCachedMeterBillingReport(nextReportMonth);
    if (mode !== "refresh" && cached) {
      setReport(cached);
      setLoading(false);
    }

    if (mode === "initial" && cached) {
      setError(null);
      return;
    }

    if (mode === "change" && cached) {
      setRefreshing(true);
    } else if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await api.getMeterBillingReport(accessToken, nextReportMonth);
      setCachedMeterBillingReport(nextReportMonth, response);
      setReport(response);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setSelectedMeterBillingReportMonth(reportMonth);
    const previous = previousReportMonthRef.current;
    previousReportMonthRef.current = reportMonth;
    const mode = previous === null ? "initial" : "change";
    void loadReport(reportMonth, mode);
  }, [accessToken, reportMonth]);

  const handleRefresh = async () => {
    await loadReport(reportMonth, "refresh");
  };

  const matchesColumnFilters = (row: MeterBillingReportRow, excludedColumn?: FilterColumn) => {
    for (const [column, values] of Object.entries(columnFilters) as Array<[FilterColumn, Set<string>]>) {
      if (column === excludedColumn || values.size === 0) continue;
      const value = getFilterValue(row, column);
      if (!values.has(value)) {
        return false;
      }
    }
    return true;
  };

  const filterRowsByColumn = useMemo(() => {
    const columns: FilterColumn[] = [
      "CompanyCode",
      "Contract",
      "ContractName",
      "BusinessPartner",
      "SalesType",
      "RepRuleNo",
      "NameOfTerm",
      "MeterName",
    ];

    return columns.reduce(
      (accumulator, column) => {
        accumulator[column] = (report?.items ?? []).filter((row) =>
          matchesColumnFilters(row, column),
        );
        return accumulator;
      },
      {} as Record<FilterColumn, MeterBillingReportRow[]>,
    );
  }, [report?.items, columnFilters]);

  const filteredRows = useMemo(() => {
    let rows = report?.items ?? [];

    // Apply column filters
    rows = rows.filter((row) => matchesColumnFilters(row));

    // Apply search term
    const term = searchInput.trim().toLowerCase();
    if (term) {
      rows = rows.filter((row) =>
        [
          row.CompanyCode,
          row.Contract,
          row.ContractName,
          row.BusinessPartner,
          row.ReportFrom,
          row.ReportTo,
          row.SalesType,
          row.RepRuleNo,
          row.NameOfTerm,
          row.MeterName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }

    return rows;
  }, [report?.items, searchInput, columnFilters]);

  const sortedRows = useMemo(() => {
    const activeSortColumn = sortState.column;
    if (!activeSortColumn) {
      return filteredRows;
    }

    const numericColumns = new Set<SortField>([
      "SalesInUnits",
      "SalesInUnits_M1",
      "SalesInUnits_M2",
      "StatistQuantSales",
      "PreviousReadingUnit",
    ]);

    const sorted = [...filteredRows].sort((a, b) => {
      if (numericColumns.has(activeSortColumn)) {
        const aValue = Number(a[activeSortColumn] ?? 0);
        const bValue = Number(b[activeSortColumn] ?? 0);
        return aValue - bValue;
      }

      const aValue = a[activeSortColumn];
      const bValue = b[activeSortColumn];
      return compareTextValues(
        aValue != null && String(aValue).trim() !== "" ? String(aValue) : "—",
        bValue != null && String(bValue).trim() !== "" ? String(bValue) : "—",
      );
    });

    return sortState.direction === "asc" ? sorted : sorted.reverse();
  }, [filteredRows, sortState]);

  const handleSort = (column: SortField) => {
    setSortState((current) => ({
      column,
      direction:
        current.column === column && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleColumnFilterValue = (column: FilterColumn, value: string) => {
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
    setColumnFilters((current) => ({
      ...current,
      [column]: new Set<string>(),
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters(createEmptyColumnFilters());
  };

  const totalActiveFilters = useMemo(
    () => Object.values(columnFilters).reduce((count, values) => count + values.size, 0),
    [columnFilters],
  );

  const handleExportCsv = () => {
    if (sortedRows.length === 0) return;

    const header = TABLE_COLUMNS.map((column) => column.label);
    const escapeCsvValue = (value: string | number | null | undefined) => {
      const normalized = value == null ? "" : String(value);
      if (/[",\n]/.test(normalized)) {
        return `"${normalized.replace(/"/g, '""')}"`;
      }
      return normalized;
    };

    const rows = sortedRows.map((row) =>
      TABLE_COLUMNS.map((column) => {
        const value = row[column.key];
        const isNumeric =
          column.key === "SalesInUnits" ||
          column.key === "SalesInUnits_M1" ||
          column.key === "SalesInUnits_M2" ||
          column.key === "StatistQuantSales" ||
          column.key === "PreviousReadingUnit";

        return escapeCsvValue(
          isNumeric ? formatNumber(Number(value ?? 0)) : (value as string | null) || "",
        );
      }).join(","),
    );

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `meter-billing-${reportMonth}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-5 dark:bg-slate-950">
      <div className="mx-auto flex min-h-0 w-full max-w-[1560px] flex-1 flex-col gap-4">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{error}</div>
            </div>
          </div>
        ) : null}

        <section className="flex min-h-[calc(100vh-160px)] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/50">
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
                  placeholder="Search company, contract, term, meter"
                  className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-700 placeholder-slate-400 outline-none transition-colors focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                />
              </div>

              <ReportMonthDropdown
                value={reportMonth}
                options={reportMonthOptions}
                onChange={setReportMonth}
              />

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={loading || refreshing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/80"
              >
                {refreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredRows.length === 0}
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
                  placeholder="Search company, contract, term, meter"
                  className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-700 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                />
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700/60" />

              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />

              <ReportMonthDropdown
                value={reportMonth}
                options={reportMonthOptions}
                onChange={setReportMonth}
              />

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {totalActiveFilters > 0 ? (
                  <button
                    type="button"
                    onClick={clearAllColumnFilters}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-rose-500 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <FilterX className="h-3 w-3" />
                    Clear filters ({totalActiveFilters})
                  </button>
                ) : null}

                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {sortedRows.length.toLocaleString()}
                  </span>
                  <span className="mx-0.5">/</span>
                  {(report?.rowCount ?? 0).toLocaleString()}
                </span>

                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Last loaded: {formatLoadedAt(report?.loadedAt ?? null)}
                </span>

                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={loading || refreshing || loadingMonthOptions}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/80"
                >
                  {refreshing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={filteredRows.length === 0}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-200/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/80"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading && !report ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                Loading meter billing report...
              </div>
            ) : sortedRows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                {report && report.items.length > 0
                  ? "No rows match the current search."
                  : `No rows returned for ${reportMonth}.`}
              </div>
            ) : (
              <>
                <div
                  className={`grid min-w-fit ${TABLE_GRID_COLS} sticky top-0 gap-3 border-b border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700/50 dark:bg-slate-800/50`}
                >
            <ColumnHeader
              label="Company Code"
              column="CompanyCode"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              filterColumn="CompanyCode"
              filterValues={columnFilters.CompanyCode}
              filterRows={filterRowsByColumn.CompanyCode}
              onToggleFilterValue={(value) => toggleColumnFilterValue("CompanyCode", value)}
              onClearFilter={() => clearColumnFilter("CompanyCode")}
            />
            <ColumnHeader
              label="Contract"
              column="Contract"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              filterColumn="Contract"
              filterValues={columnFilters.Contract}
              filterRows={filterRowsByColumn.Contract}
              onToggleFilterValue={(value) => toggleColumnFilterValue("Contract", value)}
              onClearFilter={() => clearColumnFilter("Contract")}
            />
            <ColumnHeader
              label="Contract Name"
              column="ContractName"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              filterColumn="ContractName"
              filterValues={columnFilters.ContractName}
              filterRows={filterRowsByColumn.ContractName}
              onToggleFilterValue={(value) => toggleColumnFilterValue("ContractName", value)}
              onClearFilter={() => clearColumnFilter("ContractName")}
            />
            <ColumnHeader
              label="Business Partner"
              column="BusinessPartner"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              filterColumn="BusinessPartner"
              filterValues={columnFilters.BusinessPartner}
              filterRows={filterRowsByColumn.BusinessPartner}
              onToggleFilterValue={(value) => toggleColumnFilterValue("BusinessPartner", value)}
              onClearFilter={() => clearColumnFilter("BusinessPartner")}
            />
            <ColumnHeader
              label="Report From"
              column="ReportFrom"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
            />
            <ColumnHeader
              label="Report To"
              column="ReportTo"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
            />
            <ColumnHeader
              label="Sales Type"
              column="SalesType"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              filterColumn="SalesType"
              filterValues={columnFilters.SalesType}
              filterRows={filterRowsByColumn.SalesType}
              onToggleFilterValue={(value) => toggleColumnFilterValue("SalesType", value)}
              onClearFilter={() => clearColumnFilter("SalesType")}
            />
            <ColumnHeader
              label="Rep Rule No."
              column="RepRuleNo"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              filterColumn="RepRuleNo"
              filterValues={columnFilters.RepRuleNo}
              filterRows={filterRowsByColumn.RepRuleNo}
              onToggleFilterValue={(value) => toggleColumnFilterValue("RepRuleNo", value)}
              onClearFilter={() => clearColumnFilter("RepRuleNo")}
            />
            <ColumnHeader
              label="Name Of Term"
              column="NameOfTerm"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              filterColumn="NameOfTerm"
              filterValues={columnFilters.NameOfTerm}
              filterRows={filterRowsByColumn.NameOfTerm}
              onToggleFilterValue={(value) => toggleColumnFilterValue("NameOfTerm", value)}
              onClearFilter={() => clearColumnFilter("NameOfTerm")}
            />
            <ColumnHeader
              label="Sales In Units"
              column="SalesInUnits"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              align="right"
            />
            <ColumnHeader
              label="Sales In Units M-1"
              column="SalesInUnits_M1"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              align="right"
            />
            <ColumnHeader
              label="Sales In Units M-2"
              column="SalesInUnits_M2"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              align="right"
            />
            <ColumnHeader
              label="Zero Sales"
              column="ZeroSales"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              align="right"
            />
            <ColumnHeader
              label="Statist Quant Sales"
              column="StatistQuantSales"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              align="right"
            />
            <ColumnHeader
              label="Reported On"
              column="ReportedOn"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
            />
            <ColumnHeader
              label="Previous Reading Unit"
              column="PreviousReadingUnit"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              align="right"
            />
            <ColumnHeader
              label="Meter Name"
              column="MeterName"
              sortColumn={sortState.column}
              sortDirection={sortState.direction}
              onSort={handleSort}
              filterColumn="MeterName"
              filterValues={columnFilters.MeterName}
              filterRows={filterRowsByColumn.MeterName}
              onToggleFilterValue={(value) => toggleColumnFilterValue("MeterName", value)}
              onClearFilter={() => clearColumnFilter("MeterName")}
              align="left"
            />
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {sortedRows.map((row, index) => {
                    const isEven = index % 2 === 0;
                    return (
                      <div
                        key={`${row.NameOfTerm || "row"}-${row.RepRuleNo || index}-${index}`}
                        className={`grid min-w-fit ${TABLE_GRID_COLS} gap-3 border-b border-slate-100 px-3 py-3 text-sm transition-colors hover:bg-slate-100 dark:border-slate-800/30 dark:hover:bg-slate-800/50 ${
                          isEven ? "bg-slate-50/50 dark:bg-slate-900/30" : "bg-transparent"
                        }`}
                      >
                        {TABLE_COLUMNS.map((column) => {
                          const value = row[column.key];
                          const isNumeric =
                            column.key === "SalesInUnits" ||
                            column.key === "SalesInUnits_M1" ||
                            column.key === "SalesInUnits_M2" ||
                            column.key === "StatistQuantSales" ||
                            column.key === "PreviousReadingUnit";

                          return (
                            <div
                              key={`${row.NameOfTerm || index}-${String(column.key)}`}
                              className={`truncate text-[11px] text-slate-700 dark:text-slate-200 ${
                                column.align === "right" ? "text-right tabular-nums" : ""
                              }`}
                              title={typeof value === "string" ? value : undefined}
                            >
                              {isNumeric
                                ? formatNumber(Number(value ?? 0))
                                : (value as string | null) || "—"}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
