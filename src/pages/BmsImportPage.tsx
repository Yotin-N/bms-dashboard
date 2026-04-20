import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  FocusEvent as ReactFocusEvent,
  FormEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import {
  ApiError,
  api,
  type BmsImportBatch,
  type IvivaSourceConfig,
  type MappingPointRecord,
  type ObixSourceConfig,
} from "../services/api";

const INITIAL_VISIBLE_ROWS = 60;
const LOAD_MORE_ROWS = 60;
const MASTER_POINTS_PAGE_SIZE = 50000;
const MASTER_TABLE_GRID_COLS =
  "grid-cols-[minmax(260px,2.4fr)_minmax(160px,1.2fr)_minmax(130px,0.95fr)_minmax(130px,0.95fr)_minmax(130px,0.95fr)_minmax(140px,1fr)_minmax(140px,1fr)_44px]";

type MasterSortField =
  | "displayName"
  | "bacnetKey"
  | "mappingStatus"
  | "matchStatus"
  | "sourceBatchFileName"
  | "obixSourceName"
  | "ivivaSourceName";

type MasterSortDirection = "asc" | "desc";
type MetadataSegment = "ALL" | "WARNING" | "MATCHED" | "IMPORT_ONLY" | "OBIX_ONLY";
type MasterFilterColumn =
  | "displayName"
  | "bacnetKey"
  | "mappingStatus"
  | "matchStatus"
  | "sourceBatchFileName"
  | "obixSourceName"
  | "ivivaSourceName"
  | "reviewNote";
type MasterColumnFilters = Record<MasterFilterColumn, Set<string>>;

type SourceFormState = {
  name: string;
  basePath: string;
  username: string;
  password: string;
  enabled: boolean;
  includePatterns: string;
  excludePatterns: string;
  refreshMode: "manual" | "scheduled";
  refreshIntervalMinutes: string;
};

type IvivaSourceFormState = {
  name: string;
  server: string;
  database: string;
  username: string;
  password: string;
  enabled: boolean;
  refreshMode: "manual" | "scheduled";
  refreshIntervalMinutes: string;
  queryText: string;
};

const DEFAULT_SOURCE_FORM: SourceFormState = {
  name: "",
  basePath: "",
  username: "",
  password: "",
  enabled: true,
  includePatterns: "O02-*",
  excludePatterns: "CertificateStatus-*\nCOMPARE-*",
  refreshMode: "manual",
  refreshIntervalMinutes: "30",
};

const DEFAULT_IVIVA_SOURCE_FORM: IvivaSourceFormState = {
  name: "",
  server: "",
  database: "",
  username: "",
  password: "",
  enabled: true,
  refreshMode: "manual",
  refreshIntervalMinutes: "30",
  queryText:
    "SELECT a.AssetID, p.PointKey, p.PointAddress, pt.PointTemplateName, pt.Units,\n       lv.PointValue AS LatestValue,\n       lv.PointValueUpdatedTime AS LatestTime\nFROM dbo.AssetMaster a\nLEFT JOIN dbo.IBMSPoints p ON p.AssetKey = a.AssetKey\nLEFT JOIN dbo.IBMSPointTemplates pt ON pt.PointTemplateKey = p.PointTemplateKey\nLEFT JOIN dbo.IBMSPointLastValues lv ON lv.PointKey = p.PointKey",
};

function createEmptyMasterColumnFilters(): MasterColumnFilters {
  return {
    displayName: new Set<string>(),
    bacnetKey: new Set<string>(),
    mappingStatus: new Set<string>(),
    matchStatus: new Set<string>(),
    sourceBatchFileName: new Set<string>(),
    obixSourceName: new Set<string>(),
    ivivaSourceName: new Set<string>(),
    reviewNote: new Set<string>(),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "Unknown";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function splitPatterns(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function patternsToText(value: string[] | undefined) {
  return (value || []).join("\n");
}

function BatchStatusBadge({ status }: { status: BmsImportBatch["status"] }) {
  const className =
    status === "processed"
      ? "bg-slate-200 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
      : status === "failed"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-medium capitalize ${className}`}
    >
      {status}
    </span>
  );
}

function BatchActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
        isActive
          ? "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
          : "bg-slate-200 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function SourceStatusBadge({
  enabled,
  mode,
}: {
  enabled: boolean;
  mode: ObixSourceConfig["refreshMode"];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
          enabled
            ? "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        }`}
      >
        {enabled ? "Enabled" : "Disabled"}
      </span>
      <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {mode === "scheduled" ? "Scheduled" : "Manual"}
      </span>
    </div>
  );
}

function SortIcon({
  column,
  sortColumn,
  sortDirection,
}: {
  column: MasterSortField;
  sortColumn: MasterSortField | null;
  sortDirection: MasterSortDirection;
}) {
  if (sortColumn !== column) {
    return <ArrowUpDown className="h-2.5 w-2.5 text-slate-400 dark:text-slate-600" />;
  }

  if (sortDirection === "asc") {
    return <ArrowUp className="h-2.5 w-2.5 text-slate-700 dark:text-slate-200" />;
  }

  return <ArrowDown className="h-2.5 w-2.5 text-slate-700 dark:text-slate-200" />;
}

function getMetadataStatusLabel(status: MappingPointRecord["mappingStatus"]) {
  switch (status) {
    case "matched":
      return "Matched";
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
  return status?.replace(/_/g, " ") || "pending";
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

  return notes;
}

function getReviewNote(row: MappingPointRecord) {
  return getReviewNotes(row)[0] || "—";
}

function getReviewTooltip(row: MappingPointRecord) {
  const notes = getReviewNotes(row);
  return notes.length > 0 ? notes.join("\n") : "—";
}

function getBatchSourceLabel(row: MappingPointRecord) {
  return row.sourceBatchFileName || "—";
}

function getObixSourceLabel(
  row: MappingPointRecord,
  obixSourceNameById: Map<string, string>,
) {
  if (!row.obixSourceConfigId) {
    return row.existsInObix ? "Linked source" : "—";
  }

  return obixSourceNameById.get(row.obixSourceConfigId) || "Linked source";
}

function getIvivaSourceLabel(
  row: MappingPointRecord,
  ivivaSourceNameById: Map<string, string>,
) {
  if (!row.ivivaSourceConfigId) {
    return "—";
  }

  return ivivaSourceNameById.get(row.ivivaSourceConfigId) || "Linked source";
}

function getColumnFilterValue(
  row: MappingPointRecord,
  column: MasterFilterColumn,
  obixSourceNameById: Map<string, string>,
  ivivaSourceNameById: Map<string, string>,
) {
  switch (column) {
    case "displayName":
      return row.displayName || "—";
    case "bacnetKey":
      return row.bacnetKey || "—";
    case "mappingStatus":
      return getMetadataStatusValue(row);
    case "matchStatus":
      return getIvivaMatchLabel(row.matchStatus);
    case "sourceBatchFileName":
      return getBatchSourceLabel(row);
    case "obixSourceName":
      return getObixSourceLabel(row, obixSourceNameById);
    case "ivivaSourceName":
      return getIvivaSourceLabel(row, ivivaSourceNameById);
    case "reviewNote":
      return getReviewNote(row);
    default:
      return "—";
  }
}

function getRowSearchText(
  row: MappingPointRecord,
  obixSourceNameById: Map<string, string>,
  ivivaSourceNameById: Map<string, string>,
) {
  return [
    row.displayName || "",
    row.bacnetKey || "",
    getBatchSourceLabel(row),
    getObixSourceLabel(row, obixSourceNameById),
    getIvivaSourceLabel(row, ivivaSourceNameById),
    getReviewNote(row),
  ]
    .join(" ")
    .toLowerCase();
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

function getRowTone(row: MappingPointRecord) {
  if (
    row.matchStatus === "wrong_index_code" ||
    row.reviewFlags?.includes("duplicate_bacnet_key_across_batches") ||
    row.reviewFlags?.includes("duplicate_display_name_across_batches")
  ) {
    return "border-l-4 border-l-rose-500 dark:border-l-rose-400";
  }

  if (
    row.matchStatus === "point_address_mismatch" ||
    getWarningStatus(row) !== "none"
  ) {
    return "border-l-4 border-l-amber-500 dark:border-l-amber-400";
  }

  return "border-l-4 border-l-transparent";
}

function HeaderFilterDropdown({
  label,
  selected,
  options,
  onToggle,
  onClear,
  position = "center",
}: {
  label: string;
  selected: Set<string>;
  options: Array<{ label: string; value: string }>;
  onToggle: (value: string) => void;
  onClear: () => void;
  position?: "left" | "center" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const isActive = selected.size > 0;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOptions = search
    ? options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

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
        title={isActive ? `${selected.size} selected` : `Filter ${label}`}
      >
        <Filter className="h-2.5 w-2.5" />
      </button>

      {open ? (
        <div className={`absolute top-full z-[90] mt-1 min-w-[180px] max-w-[300px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-black/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30 ${
          position === "right" ? "right-0" : position === "left" ? "left-0" : "left-1/2 -translate-x-1/2"
        }`}>
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
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                No values
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.has(option.value);
              return (
                <label
                  key={option.value || "all"}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(option.value)}
              className="h-3 w-3 rounded border-slate-300 bg-white text-slate-900 focus:ring-0 focus:ring-offset-0 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <span className="truncate text-slate-700 dark:text-slate-300">
              {option.label}
            </span>
                </label>
              );
            }))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeaderControl({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  filterValues,
  filterOptions,
  onToggleFilterValue,
  onClearFilter,
  dropdownPosition = "center",
}: {
  label: string;
  column?: MasterSortField;
  sortColumn: MasterSortField | null;
  sortDirection: MasterSortDirection;
  onSort: (column: MasterSortField) => void;
  filterValues?: Set<string>;
  filterOptions?: Array<{ label: string; value: string }>;
  onToggleFilterValue?: (value: string) => void;
  onClearFilter?: () => void;
  dropdownPosition?: "left" | "center" | "right";
}) {
  return (
    <div className="flex items-center gap-1">
      {column ? (
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
      ) : (
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}

      {filterOptions && filterValues && onToggleFilterValue && onClearFilter ? (
        <HeaderFilterDropdown
          label={label}
          selected={filterValues}
          options={filterOptions}
          onToggle={onToggleFilterValue}
          onClear={onClearFilter}
          position={dropdownPosition}
        />
      ) : null}
    </div>
  );
}

export function BmsImportPage() {
  const { accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showIvivaSourceModal, setShowIvivaSourceModal] = useState(false);
  const [showBatchSelectorModal, setShowBatchSelectorModal] = useState(false);
  const [showSourceSelectorModal, setShowSourceSelectorModal] = useState(false);
  const [showIvivaSourceSelectorModal, setShowIvivaSourceSelectorModal] = useState(false);
  const [editingSource, setEditingSource] = useState<ObixSourceConfig | null>(null);
  const [editingIvivaSource, setEditingIvivaSource] = useState<IvivaSourceConfig | null>(null);
  const [sourceForm, setSourceForm] = useState<SourceFormState>(DEFAULT_SOURCE_FORM);
  const [ivivaSourceForm, setIvivaSourceForm] =
    useState<IvivaSourceFormState>(DEFAULT_IVIVA_SOURCE_FORM);
  const [sourceFormError, setSourceFormError] = useState<string | null>(null);
  const [ivivaSourceFormError, setIvivaSourceFormError] = useState<string | null>(null);
  const [sourceSubmitting, setSourceSubmitting] = useState(false);
  const [ivivaSourceSubmitting, setIvivaSourceSubmitting] = useState(false);
  const [showSourcePassword, setShowSourcePassword] = useState(false);
  const [showIvivaPassword, setShowIvivaPassword] = useState(false);
  const [batches, setBatches] = useState<BmsImportBatch[]>([]);
  const [sources, setSources] = useState<ObixSourceConfig[]>([]);
  const [ivivaSources, setIvivaSources] = useState<IvivaSourceConfig[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedIvivaSourceId, setSelectedIvivaSourceId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BmsImportBatch | null>(null);
  const [allPoints, setAllPoints] = useState<MappingPointRecord[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingIvivaSources, setLoadingIvivaSources] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [discoveringSourceId, setDiscoveringSourceId] = useState<string | null>(null);
  const [syncingIvivaSourceId, setSyncingIvivaSourceId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [deletingIvivaSourceId, setDeletingIvivaSourceId] = useState<string | null>(null);
  const [deleteSourceTarget, setDeleteSourceTarget] = useState<ObixSourceConfig | null>(null);
  const [deleteSourceConfirmText, setDeleteSourceConfirmText] = useState("");
  const [deleteIvivaSourceTarget, setDeleteIvivaSourceTarget] = useState<IvivaSourceConfig | null>(null);
  const [deleteIvivaSourceConfirmText, setDeleteIvivaSourceConfirmText] = useState("");
  const [togglingBatchId, setTogglingBatchId] = useState<string | null>(null);
  const [togglingSourceId, setTogglingSourceId] = useState<string | null>(null);
  const [togglingIvivaSourceId, setTogglingIvivaSourceId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  const [totalPoints, setTotalPoints] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<MasterColumnFilters>(
    () => createEmptyMasterColumnFilters(),
  );
  const [metadataSegment, setMetadataSegment] = useState<MetadataSegment>("ALL");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "loading";
    text: string;
  } | null>(null);
  const [noteTooltip, setNoteTooltip] = useState<{
    text: string;
    left: number;
    top: number;
    placement: "top" | "bottom";
  } | null>(null);
  const [sortColumn, setSortColumn] = useState<MasterSortField | null>("displayName");
  const [sortDirection, setSortDirection] = useState<MasterSortDirection>("asc");
  const [openSummaryMenu, setOpenSummaryMenu] = useState<
    "batch" | "source" | "iviva" | null
  >(null);
  const initialBatchSelectionDoneRef = useRef(false);
  const initialSourceSelectionDoneRef = useRef(false);
  const initialIvivaSourceSelectionDoneRef = useRef(false);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setVisibleCount(INITIAL_VISIBLE_ROWS);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!message) return;
    if (message.type === "loading") return;
    const timeout = window.setTimeout(() => setMessage(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!openSummaryMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-summary-menu]")) return;
      setOpenSummaryMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openSummaryMenu]);

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

  const obixSourceNameById = useMemo(
    () => new Map(sources.map((source) => [source._id, source.name])),
    [sources],
  );

  const ivivaSourceNameById = useMemo(
    () => new Map(ivivaSources.map((source) => [source._id, source.name])),
    [ivivaSources],
  );

  const loadBatches = async (preferredBatchId?: string | null) => {
    if (!accessToken) return;

    setLoadingBatches(true);
    try {
      const response = await api.listBmsImportBatches(accessToken, {
        page: 1,
        pageSize: 20,
      });
      setBatches(response.items);

      const nextSelectedBatchId =
        preferredBatchId !== undefined
          ? preferredBatchId
          : selectedBatchId ||
            (!initialBatchSelectionDoneRef.current
              ? response.items[0]?._id ?? null
              : null);

      if (nextSelectedBatchId) {
        setSelectedBatchId(nextSelectedBatchId);
        initialBatchSelectionDoneRef.current = true;
      } else if (preferredBatchId !== undefined) {
        setSelectedBatchId(null);
      }
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadSources = async (preferredSourceId?: string | null) => {
    if (!accessToken) return;

    setLoadingSources(true);
    try {
      const response = await api.listObixSourceConfigs(accessToken, {
        page: 1,
        pageSize: 30,
      });
      setSources(response.items);

      const nextSelectedSourceId =
        preferredSourceId !== undefined
          ? preferredSourceId
          : selectedSourceId ||
            (!initialSourceSelectionDoneRef.current
              ? response.items[0]?._id ?? null
              : null);

      if (nextSelectedSourceId) {
        setSelectedSourceId(nextSelectedSourceId);
        initialSourceSelectionDoneRef.current = true;
      } else if (preferredSourceId !== undefined) {
        setSelectedSourceId(null);
      }
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoadingSources(false);
    }
  };

  const loadIvivaSources = async (preferredSourceId?: string | null) => {
    if (!accessToken) return;

    setLoadingIvivaSources(true);
    try {
      const response = await api.listIvivaSourceConfigs(accessToken, {
        page: 1,
        pageSize: 30,
      });
      setIvivaSources(response.items);

      const nextSelectedSourceId =
        preferredSourceId !== undefined
          ? preferredSourceId
          : selectedIvivaSourceId ||
            (!initialIvivaSourceSelectionDoneRef.current
              ? response.items[0]?._id ?? null
              : null);

      if (nextSelectedSourceId) {
        setSelectedIvivaSourceId(nextSelectedSourceId);
        initialIvivaSourceSelectionDoneRef.current = true;
      } else if (preferredSourceId !== undefined) {
        setSelectedIvivaSourceId(null);
      }
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoadingIvivaSources(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadBatches(), loadSources(), loadIvivaSources()]);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedBatchId) {
      setSelectedBatch(null);
      return;
    }

    let cancelled = false;

    const loadBatchData = async () => {
      try {
        const batchResponse = await api.getBmsImportBatch(accessToken, selectedBatchId);

        if (cancelled) return;

        setSelectedBatch(batchResponse.batch);
      } catch (error) {
        if (!cancelled) {
          setMessage({ type: "error", text: getErrorMessage(error) });
        }
      }
    };

    void loadBatchData();

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedBatchId, refreshNonce]);

  useEffect(() => {
    if (!accessToken) {
      setAllPoints([]);
      setTotalPoints(0);
      setVisibleCount(INITIAL_VISIBLE_ROWS);
      return;
    }

    let cancelled = false;

    const loadMasterPoints = async () => {
      setLoadingPoints(true);
      try {
        const response = await api.listBmsMasterPoints(accessToken, {
          page: 1,
          pageSize: MASTER_POINTS_PAGE_SIZE,
        });

        if (cancelled) return;

        setAllPoints(response.items);
      } catch (error) {
        if (!cancelled) {
          setMessage({ type: "error", text: getErrorMessage(error) });
        }
      } finally {
        if (!cancelled) {
          setLoadingPoints(false);
        }
      }
    };

    void loadMasterPoints();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    refreshNonce,
  ]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleSort = (column: MasterSortField) => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  };

  const toggleColumnFilterValue = (column: MasterFilterColumn, value: string) => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
    setColumnFilters((current) => {
      const next = { ...current, [column]: new Set(current[column]) };
      if (next[column].has(value)) {
        next[column].delete(value);
      } else {
        next[column].add(value);
      }
      return next;
    });
  };

  const clearColumnFilter = (column: MasterFilterColumn) => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
    setColumnFilters((current) => ({
      ...current,
      [column]: new Set<string>(),
    }));
  };

  const clearAllColumnFilters = () => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
    setColumnFilters(createEmptyMasterColumnFilters());
  };

  const hasActiveColumnFilters = useMemo(() => {
    return Object.values(columnFilters).some((set) => set.size > 0);
  }, [columnFilters]);

  const columnFilterOptions = useMemo(() => {
    const columns: MasterFilterColumn[] = [
      "displayName",
      "bacnetKey",
      "mappingStatus",
      "matchStatus",
      "sourceBatchFileName",
      "obixSourceName",
      "ivivaSourceName",
      "reviewNote",
    ];

    return columns.reduce(
      (accumulator, column) => {
        const values = new Set<string>();
        for (const row of allPoints) {
          values.add(
            getColumnFilterValue(
              row,
              column,
              obixSourceNameById,
              ivivaSourceNameById,
            ),
          );
        }
        accumulator[column] = [...values]
          .sort((a, b) => compareTextValues(a, b))
          .map((value) => ({ label: value, value }));
        return accumulator;
      },
      {} as Record<MasterFilterColumn, Array<{ label: string; value: string }>>,
    );
  }, [allPoints, obixSourceNameById, ivivaSourceNameById]);

  const filteredPoints = useMemo(() => {
    const searchTerm = search.toLowerCase();
    const rows = allPoints.filter((row) => {
      if (metadataSegment === "WARNING" && getWarningStatus(row) === "none") {
        return false;
      }
      if (metadataSegment === "MATCHED" && row.mappingStatus !== "matched") {
        return false;
      }
      if (metadataSegment === "IMPORT_ONLY" && row.mappingStatus !== "import_only") {
        return false;
      }
      if (metadataSegment === "OBIX_ONLY" && row.mappingStatus !== "obix_only") {
        return false;
      }

      if (
        searchTerm &&
        !getRowSearchText(row, obixSourceNameById, ivivaSourceNameById).includes(searchTerm)
      ) {
        return false;
      }

      for (const [column, selectedValues] of Object.entries(columnFilters) as Array<
        [MasterFilterColumn, Set<string>]
      >) {
        if (selectedValues.size === 0) continue;
        const value = getColumnFilterValue(
          row,
          column,
          obixSourceNameById,
          ivivaSourceNameById,
        );
        if (!selectedValues.has(value)) {
          return false;
        }
      }

      return true;
    });

    const sortedRows = [...rows];
    if (sortColumn) {
      sortedRows.sort((left, right) => {
        const a = getColumnFilterValue(
          left,
          sortColumn as MasterFilterColumn,
          obixSourceNameById,
          ivivaSourceNameById,
        );
        const b = getColumnFilterValue(
          right,
          sortColumn as MasterFilterColumn,
          obixSourceNameById,
          ivivaSourceNameById,
        );
        const result = compareTextValues(a, b);
        return sortDirection === "asc" ? result : -result;
      });
    }

    return sortedRows;
  }, [
    allPoints,
    columnFilters,
    ivivaSourceNameById,
    metadataSegment,
    obixSourceNameById,
    search,
    sortColumn,
    sortDirection,
  ]);

  const points = useMemo(
    () => filteredPoints.slice(0, visibleCount),
    [filteredPoints, visibleCount],
  );

  useEffect(() => {
    setTotalPoints(filteredPoints.length);
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

  const resetUploadForm = () => {
    setSelectedFile(null);
    setNotes("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExportRawCsv = () => {
    if (filteredPoints.length === 0) return;

    const header = [
      "Display Name",
      "BACnet Key",
      "Metadata Status",
      "IVIVA Mapping",
      "Batch Source",
      "oBIX Source",
      "IVIVA Source",
      "Review Note",
    ];

    const rows = filteredPoints.map((row) => {
      return [
        row.displayName || "",
        row.bacnetKey || "",
        getMetadataStatusValue(row),
        getIvivaMatchLabel(row.matchStatus),
        getBatchSourceLabel(row),
        getObixSourceLabel(row, obixSourceNameById),
        getIvivaSourceLabel(row, ivivaSourceNameById),
        getReviewNote(row),
      ]
        .map((value) => escapeCsvValue(value))
        .join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bms-master-review-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleShowNoteTooltip = (
    event: ReactMouseEvent<HTMLButtonElement> | ReactFocusEvent<HTMLButtonElement>,
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

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !selectedFile) {
      setMessage({
        type: "error",
        text: "Please choose an .xlsx or .csv file first.",
      });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const response = await api.uploadBmsImportBatch(accessToken, {
        file: selectedFile,
        notes,
      });

      setSearchInput("");
      setSearch("");
      setMetadataSegment("ALL");
      setColumnFilters(createEmptyMasterColumnFilters());
      setVisibleCount(INITIAL_VISIBLE_ROWS);
      resetUploadForm();
      setShowUploadModal(false);
      await loadBatches(response.batch._id);
      setSelectedBatchId(response.batch._id);
      setMessage({ type: "success", text: response.message });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  const openSourceModal = (source?: ObixSourceConfig | null) => {
    if (source) {
      setEditingSource(source);
      setSourceForm({
        name: source.name,
        basePath: source.basePath,
        username: source.username ?? "",
        password: source.password ?? "",
        enabled: source.enabled,
        includePatterns: patternsToText(source.includePatterns),
        excludePatterns: patternsToText(source.excludePatterns),
        refreshMode: source.refreshMode,
        refreshIntervalMinutes: String(source.refreshIntervalMinutes),
      });
    } else {
      setEditingSource(null);
      setSourceForm(DEFAULT_SOURCE_FORM);
    }
    setSourceFormError(null);
    setShowSourceModal(true);
  };

  const closeSourceModal = () => {
    setShowSourceModal(false);
    setEditingSource(null);
    setSourceForm(DEFAULT_SOURCE_FORM);
    setSourceFormError(null);
  };

  const openIvivaSourceModal = (source?: IvivaSourceConfig | null) => {
    if (source) {
      setEditingIvivaSource(source);
      setIvivaSourceForm({
        name: source.name,
        server: source.server,
        database: source.database,
        username: source.username,
        password: source.password,
        enabled: source.enabled,
        refreshMode: source.refreshMode,
        refreshIntervalMinutes: String(source.refreshIntervalMinutes),
        queryText: source.queryText,
      });
    } else {
      setEditingIvivaSource(null);
      setIvivaSourceForm(DEFAULT_IVIVA_SOURCE_FORM);
    }
    setIvivaSourceFormError(null);
    setShowIvivaSourceModal(true);
  };

  const closeIvivaSourceModal = () => {
    setShowIvivaSourceModal(false);
    setEditingIvivaSource(null);
    setIvivaSourceForm(DEFAULT_IVIVA_SOURCE_FORM);
    setIvivaSourceFormError(null);
  };

  const handleSourceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    setSourceSubmitting(true);
    setSourceFormError(null);
    try {
      const payload = {
        name: sourceForm.name.trim(),
        basePath: sourceForm.basePath.trim(),
        username: sourceForm.username.trim(),
        password: sourceForm.password,
        enabled: sourceForm.enabled,
        includePatterns: splitPatterns(sourceForm.includePatterns),
        excludePatterns: splitPatterns(sourceForm.excludePatterns),
        refreshMode: sourceForm.refreshMode,
        refreshIntervalMinutes: Math.max(
          1,
          Number.parseInt(sourceForm.refreshIntervalMinutes || "30", 10) || 30,
        ),
      };

      const response = editingSource
        ? await api.updateObixSourceConfig(accessToken, editingSource._id, payload)
        : await api.createObixSourceConfig(accessToken, payload);

      await loadSources(response.config._id);
      setSelectedSourceId(response.config._id);
      closeSourceModal();
      setMessage({
        type: "success",
        text: editingSource
          ? "oBIX source updated."
          : "oBIX source created.",
      });
    } catch (error) {
      setSourceFormError(getErrorMessage(error));
    } finally {
      setSourceSubmitting(false);
    }
  };

  const handleIvivaSourceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    setIvivaSourceSubmitting(true);
    setIvivaSourceFormError(null);
    try {
      const payload = {
        name: ivivaSourceForm.name.trim(),
        server: ivivaSourceForm.server.trim(),
        database: ivivaSourceForm.database.trim(),
        username: ivivaSourceForm.username.trim(),
        password: ivivaSourceForm.password,
        enabled: ivivaSourceForm.enabled,
        refreshMode: ivivaSourceForm.refreshMode,
        refreshIntervalMinutes: Math.max(
          1,
          Number.parseInt(ivivaSourceForm.refreshIntervalMinutes || "30", 10) || 30,
        ),
        queryText: ivivaSourceForm.queryText.trim(),
      };

      const response = editingIvivaSource
        ? await api.updateIvivaSourceConfig(accessToken, editingIvivaSource._id, payload)
        : await api.createIvivaSourceConfig(accessToken, payload);

      await loadIvivaSources(response.config._id);
      setSelectedIvivaSourceId(response.config._id);
      closeIvivaSourceModal();
      setMessage({
        type: "success",
        text: editingIvivaSource
          ? "IVIVA source updated."
          : "IVIVA source created.",
      });
    } catch (error) {
      setIvivaSourceFormError(getErrorMessage(error));
    } finally {
      setIvivaSourceSubmitting(false);
    }
  };

  const handleDiscover = async (source: ObixSourceConfig) => {
    if (!accessToken) return;

    setDiscoveringSourceId(source._id);
    setMessage({
      type: "loading",
      text: `Discovering oBIX source "${source.name}"...`,
    });
    try {
      const response = await api.discoverObixSource(accessToken, source._id);
      await Promise.all([
        loadSources(source._id),
        selectedBatchId ? loadBatches(selectedBatchId) : Promise.resolve(),
      ]);
      setRefreshNonce((current) => current + 1);
      setMessage({
        type: "success",
        text: `${response.message} • ${response.summary.created} created, ${response.summary.updated} updated.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setDiscoveringSourceId(null);
    }
  };

  const handleSyncIvivaSource = async (source: IvivaSourceConfig) => {
    if (!accessToken) return;

    setSyncingIvivaSourceId(source._id);
    setMessage({
      type: "loading",
      text: `Syncing IVIVA source "${source.name}"...`,
    });
    try {
      const response = await api.syncIvivaSource(accessToken, source._id);
      await loadIvivaSources(source._id);
      setRefreshNonce((current) => current + 1);
      setMessage({
        type: "success",
        text: `${response.message} • ${response.summary.synced} rows loaded.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setSyncingIvivaSourceId(null);
    }
  };

  const handleToggleBatchActive = async (batch: BmsImportBatch) => {
    if (!accessToken || togglingBatchId) return;

    setTogglingBatchId(batch._id);
    setMessage(null);
    try {
      const response = await api.updateBmsImportBatch(accessToken, batch._id, {
        isActive: !batch.isActive,
      });

      await loadBatches(selectedBatchId);
      if (selectedBatchId === batch._id) {
        setSelectedBatch(response.batch);
      }
      setRefreshNonce((current) => current + 1);

      setMessage({
        type: "success",
        text: `Batch "${response.batch.fileName}" is now ${
          response.batch.isActive ? "active" : "inactive"
        }.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setTogglingBatchId(null);
    }
  };

  const handleToggleSourceEnabled = async (source: ObixSourceConfig) => {
    if (!accessToken || togglingSourceId) return;

    setTogglingSourceId(source._id);
    setMessage(null);
    try {
      const response = await api.updateObixSourceConfig(accessToken, source._id, {
        enabled: !source.enabled,
      });

      await loadSources(selectedSourceId);
      setRefreshNonce((current) => current + 1);
      setMessage({
        type: "success",
        text: `oBIX source "${response.config.name}" is now ${
          response.config.enabled ? "active" : "inactive"
        }.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setTogglingSourceId(null);
    }
  };

  const handleToggleIvivaSourceEnabled = async (source: IvivaSourceConfig) => {
    if (!accessToken || togglingIvivaSourceId) return;

    setTogglingIvivaSourceId(source._id);
    setMessage(null);
    try {
      const response = await api.updateIvivaSourceConfig(accessToken, source._id, {
        enabled: !source.enabled,
      });

      await loadIvivaSources(selectedIvivaSourceId);
      setRefreshNonce((current) => current + 1);
      setMessage({
        type: "success",
        text: `IVIVA source "${response.config.name}" is now ${
          response.config.enabled ? "active" : "inactive"
        }.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setTogglingIvivaSourceId(null);
    }
  };

  const handleDeleteBatch = async (batch: BmsImportBatch) => {
    if (!accessToken || deletingBatchId) return;

    const confirmed = window.confirm(
      `Delete batch "${batch.fileName}"?\n\nThis will remove this batch and its imported rows only. Master mapping points will be kept.`,
    );
    if (!confirmed) return;

    setDeletingBatchId(batch._id);
    setMessage(null);
    try {
      const response = await api.deleteBmsImportBatch(accessToken, batch._id);
      const remaining = batches.filter((item) => item._id !== batch._id);
      const nextBatchId = selectedBatchId === batch._id ? (remaining[0]?._id ?? null) : selectedBatchId;

      setSelectedBatchId(nextBatchId ?? null);
      setVisibleCount(INITIAL_VISIBLE_ROWS);

      await loadBatches(nextBatchId);
      setRefreshNonce((current) => current + 1);
      setMessage({
        type: "success",
        text: `${response.message} • ${response.deletedRows} rows removed.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setDeletingBatchId(null);
    }
  };

  const openDeleteSourceModal = (source: ObixSourceConfig) => {
    setDeleteSourceTarget(source);
    setDeleteSourceConfirmText("");
  };

  const closeDeleteSourceModal = () => {
    setDeleteSourceTarget(null);
    setDeleteSourceConfirmText("");
  };

  const handleDeleteSource = async () => {
    if (!accessToken || deletingSourceId || !deleteSourceTarget) return;
    if (deleteSourceConfirmText.trim().toLowerCase() !== "delete") return;

    setDeletingSourceId(deleteSourceTarget._id);
    setMessage(null);
    try {
      const response = await api.deleteObixSourceConfig(accessToken, deleteSourceTarget._id);
      const remaining = sources.filter((item) => item._id !== deleteSourceTarget._id);
      const nextSourceId =
        selectedSourceId === deleteSourceTarget._id ? (remaining[0]?._id ?? null) : selectedSourceId;

      setSelectedSourceId(nextSourceId ?? null);
      await loadSources(nextSourceId);
      setRefreshNonce((current) => current + 1);
      closeDeleteSourceModal();
      setMessage({
        type: "success",
        text: `${response.message} "${response.name}"`,
      });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setDeletingSourceId(null);
    }
  };

  const openDeleteIvivaSourceModal = (source: IvivaSourceConfig) => {
    setDeleteIvivaSourceTarget(source);
    setDeleteIvivaSourceConfirmText("");
  };

  const closeDeleteIvivaSourceModal = () => {
    setDeleteIvivaSourceTarget(null);
    setDeleteIvivaSourceConfirmText("");
  };

  const handleDeleteIvivaSource = async () => {
    if (!accessToken || deletingIvivaSourceId || !deleteIvivaSourceTarget) return;
    if (deleteIvivaSourceConfirmText.trim().toLowerCase() !== "delete") return;

    setDeletingIvivaSourceId(deleteIvivaSourceTarget._id);
    setMessage(null);
    try {
      const response = await api.deleteIvivaSourceConfig(accessToken, deleteIvivaSourceTarget._id);
      const remaining = ivivaSources.filter((item) => item._id !== deleteIvivaSourceTarget._id);
      const nextSourceId =
        selectedIvivaSourceId === deleteIvivaSourceTarget._id
          ? (remaining[0]?._id ?? null)
          : selectedIvivaSourceId;

      setSelectedIvivaSourceId(nextSourceId ?? null);
      await loadIvivaSources(nextSourceId);
      setRefreshNonce((current) => current + 1);
      closeDeleteIvivaSourceModal();
      setMessage({
        type: "success",
        text: `${response.message} "${response.name}"`,
      });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setDeletingIvivaSourceId(null);
    }
  };

  const selectedSource = useMemo(
    () => sources.find((item) => item._id === selectedSourceId) ?? null,
    [selectedSourceId, sources],
  );

  const selectedIvivaSource = useMemo(
    () => ivivaSources.find((item) => item._id === selectedIvivaSourceId) ?? null,
    [ivivaSources, selectedIvivaSourceId],
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-5 dark:bg-slate-950">
      <div className="mx-auto flex min-h-0 w-full max-w-[1560px] flex-1 flex-col gap-4">


        {message ? (
          <div className="pointer-events-none fixed bottom-4 right-4 z-[90]">
            <div
              className={`pointer-events-auto min-w-[240px] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/10 dark:shadow-black/30 ${
                message.type === "success"
                  ? "border-emerald-200 bg-white text-slate-700 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-slate-200"
                  : message.type === "loading"
                    ? "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  : "border-red-200 bg-white text-slate-700 dark:border-red-900/40 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {message.type === "success" ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                ) : message.type === "loading" ? (
                  <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-slate-500 dark:text-slate-400" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
                )}
                <div className="min-w-0">
                  <div
                    className={`text-[11px] font-medium uppercase tracking-wider ${
                      message.type === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : message.type === "loading"
                          ? "text-slate-500 dark:text-slate-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {message.type === "success"
                      ? "Success"
                      : message.type === "loading"
                        ? "Loading"
                        : "Error"}
                  </div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{message.text}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    ACTIVE IMPORT BATCH
                  </div>
                  <div className="mt-1 truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {selectedBatch?.fileName || "No batch selected"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedBatch
                      ? `${formatTimestamp(selectedBatch.uploadedAt)} • ${selectedBatch.totalRows.toLocaleString()} rows`
                      : "Choose a JACE upload to review."}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5" data-summary-menu>
                                {selectedBatch ? <BatchActiveBadge isActive={selectedBatch.isActive} /> : null}
                {selectedBatch ? <BatchStatusBadge status={selectedBatch.status} /> : null}

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSummaryMenu((current) => (current === "batch" ? null : "batch"))
                    }
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Batch actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>

                  {openSummaryMenu === "batch" ? (
                    <div className="absolute right-0 top-10 z-30 min-w-[170px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-700/50 dark:bg-slate-900 dark:shadow-black/30">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenSummaryMenu(null);
                          setShowBatchSelectorModal(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Choose batch
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenSummaryMenu(null);
                          setShowUploadModal(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload batch
                      </button>
                      {selectedBatch ? (
                        <button
                          type="button"
                          disabled={togglingBatchId === selectedBatch._id}
                          onClick={() => {
                            setOpenSummaryMenu(null);
                            void handleToggleBatchActive(selectedBatch);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {selectedBatch.isActive ? "Deactivate batch" : "Activate batch"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <Database className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    ACTIVE OBIX SOURCE
                  </div>
                  <div className="mt-1 truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {selectedSource?.name || "No source selected"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedSource
                      ? `${selectedSource.lastDiscoveryPointCount?.toLocaleString() || 0} points • ${
                          selectedSource.lastDiscoveredAt
                            ? formatTimestamp(selectedSource.lastDiscoveredAt)
                            : "No discovery yet"
                        }`
                      : "Pick a source when you want to refresh coverage."}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5" data-summary-menu>
                {selectedSource ? (
                  <SourceStatusBadge
                    enabled={selectedSource.enabled}
                    mode={selectedSource.refreshMode}
                  />
                ) : null}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSummaryMenu((current) => (current === "source" ? null : "source"))
                    }
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Source actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>

                  {openSummaryMenu === "source" ? (
                    <div className="absolute right-0 top-10 z-30 min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-700/50 dark:bg-slate-900 dark:shadow-black/30">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenSummaryMenu(null);
                          setShowSourceSelectorModal(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Database className="h-3.5 w-3.5" />
                        Browse sources
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenSummaryMenu(null);
                          openSourceModal();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add source
                      </button>
                      {selectedSource ? (
                        <>
                          <button
                            type="button"
                            disabled={togglingSourceId === selectedSource._id}
                            onClick={() => {
                              setOpenSummaryMenu(null);
                              void handleToggleSourceEnabled(selectedSource);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            {selectedSource.enabled ? "Deactivate source" : "Activate source"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenSummaryMenu(null);
                              openSourceModal(selectedSource);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit source
                          </button>
                          <button
                            type="button"
                            disabled={discoveringSourceId === selectedSource._id}
                            onClick={() => {
                              setOpenSummaryMenu(null);
                              void handleDiscover(selectedSource);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Discover now
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <Database className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    ACTIVE IVIVA SOURCE
                  </div>
                  <div className="mt-1 truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {selectedIvivaSource?.name || "No source selected"}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedIvivaSource
                      ? `${selectedIvivaSource.database} @ ${selectedIvivaSource.server}${
                          selectedIvivaSource.lastSyncedAt
                            ? ` • ${formatTimestamp(selectedIvivaSource.lastSyncedAt)}`
                            : " • No sync yet"
                        }`
                      : "Store IVIVA query settings before batch matching."}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5" data-summary-menu>
                {selectedIvivaSource ? (
                  <SourceStatusBadge
                    enabled={selectedIvivaSource.enabled}
                    mode={selectedIvivaSource.refreshMode}
                  />
                ) : null}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSummaryMenu((current) => (current === "iviva" ? null : "iviva"))
                    }
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="IVIVA source actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>

                  {openSummaryMenu === "iviva" ? (
                    <div className="absolute right-0 top-10 z-30 min-w-[188px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-700/50 dark:bg-slate-900 dark:shadow-black/30">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenSummaryMenu(null);
                          setShowIvivaSourceSelectorModal(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Database className="h-3.5 w-3.5" />
                        Browse sources
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenSummaryMenu(null);
                          openIvivaSourceModal();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add source
                      </button>
                      {selectedIvivaSource ? (
                        <>
                          <button
                            type="button"
                            disabled={togglingIvivaSourceId === selectedIvivaSource._id}
                            onClick={() => {
                              setOpenSummaryMenu(null);
                              void handleToggleIvivaSourceEnabled(selectedIvivaSource);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            {selectedIvivaSource.enabled ? "Deactivate source" : "Activate source"}
                          </button>
                          <button
                            type="button"
                            disabled={syncingIvivaSourceId === selectedIvivaSource._id}
                            onClick={() => {
                              setOpenSummaryMenu(null);
                              void handleSyncIvivaSource(selectedIvivaSource);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            {syncingIvivaSourceId === selectedIvivaSource._id
                              ? "Syncing..."
                              : "Sync now"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenSummaryMenu(null);
                              openIvivaSourceModal(selectedIvivaSource);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit source
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="flex min-h-[calc(100vh-220px)] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/50">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700/50 dark:bg-slate-800/60">
            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
              <div className="relative w-full lg:w-64 lg:flex-none">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search display name, BACnet key, batch, oBIX, IVIVA"
                      className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-700 placeholder-slate-400 outline-none transition-colors focus:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-600"
                    />
              </div>

              {[
                { key: "ALL" as const, label: "All" },
                { key: "WARNING" as const, label: "Warning" },
                { key: "MATCHED" as const, label: "Matched" },
                { key: "IMPORT_ONLY" as const, label: "Import Only" },
                { key: "OBIX_ONLY" as const, label: "oBIX Only" },
              ].map((segment) => (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => {
                    setMetadataSegment(segment.key);
                    setVisibleCount(INITIAL_VISIBLE_ROWS);
                  }}
                  className={`flex h-8 items-center rounded-md border px-2.5 text-[11px] font-medium transition-colors ${
                    metadataSegment === segment.key
                      ? "border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-200/70 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700/80 dark:hover:text-slate-200"
                  }`}
                >
                  {segment.label}
                </button>
              ))}

              {metadataSegment !== "ALL" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMetadataSegment("ALL");
                    setVisibleCount(INITIAL_VISIBLE_ROWS);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              ) : null}

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {hasActiveColumnFilters ? (
                  <button
                    type="button"
                    onClick={clearAllColumnFilters}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Filter className="h-3 w-3" />
                    Clear filters
                  </button>
                ) : null}
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {totalPoints.toLocaleString()}
                  </span>
                  <span className="mx-0.5">/</span>
                  {allPoints.length.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={handleExportRawCsv}
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
            className={`grid ${MASTER_TABLE_GRID_COLS} gap-3 border-b border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700/50 dark:bg-slate-800/50`}
          >
            <HeaderControl
              label="Display Name"
              column="displayName"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValues={columnFilters.displayName}
              filterOptions={columnFilterOptions.displayName}
              onToggleFilterValue={(value) => toggleColumnFilterValue("displayName", value)}
              onClearFilter={() => clearColumnFilter("displayName")}
              dropdownPosition="left"
            />
            <HeaderControl
              label="BACnet Key"
              column="bacnetKey"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValues={columnFilters.bacnetKey}
              filterOptions={columnFilterOptions.bacnetKey}
              onToggleFilterValue={(value) => toggleColumnFilterValue("bacnetKey", value)}
              onClearFilter={() => clearColumnFilter("bacnetKey")}
            />
            <HeaderControl
              label="Metadata Status"
              column="mappingStatus"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValues={columnFilters.mappingStatus}
              filterOptions={columnFilterOptions.mappingStatus}
              onToggleFilterValue={(value) => toggleColumnFilterValue("mappingStatus", value)}
              onClearFilter={() => clearColumnFilter("mappingStatus")}
            />
            <HeaderControl
              label="IVIVA Mapping"
              column="matchStatus"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValues={columnFilters.matchStatus}
              filterOptions={columnFilterOptions.matchStatus}
              onToggleFilterValue={(value) => toggleColumnFilterValue("matchStatus", value)}
              onClearFilter={() => clearColumnFilter("matchStatus")}
            />
            <HeaderControl
              label="Batch Source"
              column="sourceBatchFileName"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValues={columnFilters.sourceBatchFileName}
              filterOptions={columnFilterOptions.sourceBatchFileName}
              onToggleFilterValue={(value) => toggleColumnFilterValue("sourceBatchFileName", value)}
              onClearFilter={() => clearColumnFilter("sourceBatchFileName")}
            />
            <HeaderControl
              label="oBIX Source"
              column="obixSourceName"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValues={columnFilters.obixSourceName}
              filterOptions={columnFilterOptions.obixSourceName}
              onToggleFilterValue={(value) => toggleColumnFilterValue("obixSourceName", value)}
              onClearFilter={() => clearColumnFilter("obixSourceName")}
            />
            <HeaderControl
              label="IVIVA Source"
              column="ivivaSourceName"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValues={columnFilters.ivivaSourceName}
              filterOptions={columnFilterOptions.ivivaSourceName}
              onToggleFilterValue={(value) => toggleColumnFilterValue("ivivaSourceName", value)}
              onClearFilter={() => clearColumnFilter("ivivaSourceName")}
            />
            <HeaderControl
              label="Note"
              filterValues={columnFilters.reviewNote}
              filterOptions={columnFilterOptions.reviewNote}
              onToggleFilterValue={(value) => toggleColumnFilterValue("reviewNote", value)}
              onClearFilter={() => clearColumnFilter("reviewNote")}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              dropdownPosition="right"
            />
          </div>

          <div ref={tableScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            {loadingPoints ? (
                <div className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : points.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  No master rows found for the current filters
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {points.map((row, index) => {
                    const reviewText = getReviewNote(row);
                    const reviewTooltip = getReviewTooltip(row);
                    const warningStatus = getWarningStatus(row);
                    const isEven = index % 2 === 0;

                    return (
                      <div
                        key={row._id}
                        className={`grid ${MASTER_TABLE_GRID_COLS} gap-3 border-b border-slate-100 px-3 py-3 text-sm transition-colors hover:bg-slate-100 dark:border-slate-800/30 dark:hover:bg-slate-800/50 ${
                          isEven ? "bg-slate-50/50 dark:bg-slate-900/30" : "bg-transparent"
                        } ${getRowTone(row)}`}
                      >
                        <div className="truncate font-mono text-[11px] text-slate-800 dark:text-slate-200" title={row.displayName || "—"}>
                          {row.displayName || "—"}
                        </div>

                        <div className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400" title={row.bacnetKey || "—"}>
                          {row.bacnetKey || "—"}
                        </div>

                        <div className={`truncate text-[11px] ${
                          getWarningStatus(row) !== "none"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-slate-500 dark:text-slate-400"
                        }`}>
                          {getMetadataStatusValue(row)}
                        </div>

                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {getIvivaMatchLabel(row.matchStatus)}
                        </div>

                        <div
                          className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                          title={getBatchSourceLabel(row)}
                        >
                          {getBatchSourceLabel(row)}
                        </div>

                        <div
                          className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                          title={getObixSourceLabel(row, obixSourceNameById)}
                        >
                          {getObixSourceLabel(row, obixSourceNameById)}
                        </div>

                        <div
                          className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                          title={getIvivaSourceLabel(row, ivivaSourceNameById)}
                        >
                          {getIvivaSourceLabel(row, ivivaSourceNameById)}
                        </div>

                        <div className="flex items-center justify-center">
                          {reviewText !== "—" ? (
                            <button
                              type="button"
                              onMouseEnter={(event) => handleShowNoteTooltip(event, reviewTooltip)}
                              onMouseLeave={() => setNoteTooltip(null)}
                              onFocus={(event) => handleShowNoteTooltip(event, reviewTooltip)}
                              onBlur={() => setNoteTooltip(null)}
                              className="flex items-center justify-center"
                              aria-label={reviewTooltip}
                            >
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${
                                  warningStatus === "none"
                                    ? "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"
                                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                                }`}
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                              </span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </section>
      </div>

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

      {showBatchSelectorModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Choose import batch
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Switch the active JACE upload without leaving the table.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchSelectorModal(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close batch selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingBatches && batches.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading batches...
                </div>
              ) : batches.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                  Upload a JACE file to start reviewing rows.
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => {
                    const isActive = batch._id === selectedBatchId;
                    const isDeleting = deletingBatchId === batch._id;
                    const isToggling = togglingBatchId === batch._id;

                    return (
                      <div
                        key={batch._id}
                        className={`block w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatchId(batch._id);
                              setVisibleCount(INITIAL_VISIBLE_ROWS);
                              setShowBatchSelectorModal(false);
                            }}
                            className="min-w-0 text-left"
                          >
                            <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {batch.fileName}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatTimestamp(batch.uploadedAt)}
                            </div>
                          </button>
                          <div className="flex shrink-0 items-center gap-2">
                            <BatchActiveBadge isActive={batch.isActive} />
                            <BatchStatusBadge status={batch.status} />
                            <button
                              type="button"
                              onClick={() => void handleToggleBatchActive(batch)}
                              disabled={Boolean(togglingBatchId) || Boolean(deletingBatchId)}
                              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
                            >
                              {isToggling
                                ? "Updating..."
                                : batch.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteBatch(batch)}
                              disabled={Boolean(deletingBatchId) || Boolean(togglingBatchId)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-2.5 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <div>
                            <div>Total</div>
                            <div className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                              {batch.totalRows}
                            </div>
                          </div>
                          <div>
                            <div>Valid</div>
                            <div className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                              {batch.validRows}
                            </div>
                          </div>
                          <div>
                            <div>Invalid</div>
                            <div className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                              {batch.invalidRows}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showSourceSelectorModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  oBIX sources
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage discovery paths and run refresh only when you need it.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSourceSelectorModal(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close source selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setShowSourceSelectorModal(false);
                  openSourceModal();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Add source
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingSources && sources.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading sources...
                </div>
              ) : sources.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                  Add the first oBIX source to start discovery.
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => {
                    const isActive = source._id === selectedSourceId;
                    const isDeleting = deletingSourceId === source._id;
                    const isToggling = togglingSourceId === source._id;

                    return (
                      <div
                        key={source._id}
                        className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
                          isActive
                            ? "border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSourceId(source._id);
                              setShowSourceSelectorModal(false);
                            }}
                            className="min-w-0 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {source.name}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleToggleSourceEnabled(source);
                                }}
                                disabled={Boolean(togglingSourceId) || Boolean(deletingSourceId)}
                                className="inline-flex h-6 items-center rounded-md border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
                              >
                                {isToggling
                                  ? "..."
                                  : source.enabled
                                    ? "Manual"
                                    : "Auto"}
                              </button>
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {source.basePath}
                            </div>
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              {source.lastDiscoveredAt
                                ? `${source.lastDiscoveryPointCount ?? 0} points • ${formatTimestamp(source.lastDiscoveredAt)}`
                                : "No discovery run yet"}
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowSourceSelectorModal(false);
                                openSourceModal(source);
                              }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <SourceStatusBadge
                              enabled={source.enabled}
                              mode={source.refreshMode}
                            />
                            <button
                              type="button"
                              onClick={() => void handleDiscover(source)}
                              disabled={
                                discoveringSourceId === source._id ||
                                Boolean(deletingSourceId) ||
                                Boolean(togglingSourceId)
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-[11px] font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                            >
                              {discoveringSourceId === source._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              Discover
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteSourceModal(source)}
                              disabled={Boolean(deletingSourceId) || Boolean(togglingSourceId)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showIvivaSourceSelectorModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  IVIVA sources
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Keep SQL connection and query config here before running match flows.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIvivaSourceSelectorModal(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close IVIVA source selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setShowIvivaSourceSelectorModal(false);
                  openIvivaSourceModal();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Add source
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingIvivaSources && ivivaSources.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading IVIVA sources...
                </div>
              ) : ivivaSources.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                  Add the first IVIVA source to store query settings.
                </div>
              ) : (
                <div className="space-y-3">
                  {ivivaSources.map((source) => {
                    const isActive = source._id === selectedIvivaSourceId;
                    const isDeleting = deletingIvivaSourceId === source._id;
                    const isToggling = togglingIvivaSourceId === source._id;
                    const isSyncing = syncingIvivaSourceId === source._id;

                    return (
                      <div
                        key={source._id}
                        className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
                          isActive
                            ? "border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIvivaSourceId(source._id);
                              setShowIvivaSourceSelectorModal(false);
                            }}
                            className="min-w-0 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {source.name}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleToggleIvivaSourceEnabled(source);
                                }}
                                disabled={Boolean(togglingIvivaSourceId) || Boolean(deletingIvivaSourceId)}
                                className="inline-flex h-6 items-center rounded-md border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
                              >
                                {isToggling
                                  ? "..."
                                  : source.enabled
                                    ? "Manual"
                                    : "Auto"}
                              </button>
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {source.database} @ {source.server}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {source.username} •{" "}
                              {source.lastSyncedAt
                                ? `${source.lastSyncRowCount ?? 0} rows • ${formatTimestamp(source.lastSyncedAt)}`
                                : "Query configured, no sync yet"}
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowIvivaSourceSelectorModal(false);
                                openIvivaSourceModal(source);
                              }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <SourceStatusBadge
                              enabled={source.enabled}
                              mode={source.refreshMode}
                            />
                            <button
                              type="button"
                              onClick={() => void handleSyncIvivaSource(source)}
                              disabled={
                                Boolean(syncingIvivaSourceId) ||
                                Boolean(togglingIvivaSourceId) ||
                                Boolean(deletingIvivaSourceId)
                              }
                              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600"
                            >
                              {isSyncing ? "Syncing..." : "Sync"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteIvivaSourceModal(source)}
                              disabled={
                                Boolean(deletingIvivaSourceId) ||
                                Boolean(syncingIvivaSourceId) ||
                                Boolean(togglingIvivaSourceId)
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showUploadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Upload import batch
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Add a JACE export file to normalize import metadata.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (uploading) return;
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close upload modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  File
                </label>
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600 dark:hover:bg-slate-950">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div>
                    <Upload className="mx-auto h-5 w-5 text-slate-400 dark:text-slate-500" />
                    <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {selectedFile ? selectedFile.name : "Choose .xlsx or .csv"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Supports `Slot Path` + `Object Id`, or the legacy JACE export columns.
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional context for this batch"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (uploading) return;
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload batch
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showSourceModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {editingSource ? "Edit oBIX source" : "Add oBIX source"}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Store discovery paths in the application instead of hardcoding them.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (sourceSubmitting) return;
                  closeSourceModal();
                }}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close source modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSourceSubmit} className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Name
                  </label>
                  <input
                    value={sourceForm.name}
                    onChange={(event) =>
                      setSourceForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="O2_02 Main Points"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex h-10 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={sourceForm.enabled}
                      onChange={(event) =>
                        setSourceForm((current) => ({
                          ...current,
                          enabled: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-0 dark:border-slate-600 dark:bg-slate-900"
                    />
                    Enabled for discovery
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Base path
                </label>
                <input
                  value={sourceForm.basePath}
                  onChange={(event) =>
                    setSourceForm((current) => ({
                      ...current,
                      basePath: event.target.value,
                    }))
                  }
                  placeholder="http://10.144.79.11/obix/config/Drivers/NiagaraNetwork/O2_02/points/"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Username
                  </label>
                  <input
                    value={sourceForm.username}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    placeholder="Optional per-source username"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSourcePassword ? "text" : "password"}
                      value={sourceForm.password}
                      onChange={(event) =>
                        setSourceForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Optional per-source password"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSourcePassword((current) => !current)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      aria-label={showSourcePassword ? "Hide password" : "Show password"}
                    >
                      {showSourcePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="-mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Leave oBIX credentials blank to keep using the shared Niagara username/password from backend config.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Include patterns
                  </label>
                  <textarea
                    rows={5}
                    value={sourceForm.includePatterns}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        includePatterns: event.target.value,
                      }))
                    }
                    placeholder="O02-*"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    One wildcard rule per line.
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Exclude patterns
                  </label>
                  <textarea
                    rows={5}
                    value={sourceForm.excludePatterns}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        excludePatterns: event.target.value,
                      }))
                    }
                    placeholder="CertificateStatus-*"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Discovery will skip rows matching these patterns.
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Refresh mode
                  </label>
                  <select
                    value={sourceForm.refreshMode}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        refreshMode: event.target.value as "manual" | "scheduled",
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  >
                    <option value="manual">Manual</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Refresh interval (minutes)
                  </label>
                  <input
                    value={sourceForm.refreshIntervalMinutes}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        refreshIntervalMinutes: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </div>
              </div>

              {sourceFormError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {sourceFormError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeSourceModal}
                  className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sourceSubmitting}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {sourceSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingSource ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingSource ? "Save" : "Add source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showIvivaSourceModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {editingIvivaSource ? "Edit IVIVA source" : "Add IVIVA source"}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Store SQL connection and query details here for later batch matching.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (ivivaSourceSubmitting) return;
                  closeIvivaSourceModal();
                }}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close IVIVA source modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIvivaSourceSubmit} className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Name
                  </label>
                  <input
                    value={ivivaSourceForm.name}
                    onChange={(event) =>
                      setIvivaSourceForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="IVIVA Production"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex h-10 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={ivivaSourceForm.enabled}
                      onChange={(event) =>
                        setIvivaSourceForm((current) => ({
                          ...current,
                          enabled: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-0 dark:border-slate-600 dark:bg-slate-900"
                    />
                    Enabled for matching
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Server
                  </label>
                  <input
                    value={ivivaSourceForm.server}
                    onChange={(event) =>
                      setIvivaSourceForm((current) => ({
                        ...current,
                        server: event.target.value,
                      }))
                    }
                    placeholder="10.143.106.100"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Database
                  </label>
                  <input
                    value={ivivaSourceForm.database}
                    onChange={(event) =>
                      setIvivaSourceForm((current) => ({
                        ...current,
                        database: event.target.value,
                      }))
                    }
                    placeholder="obk_prd"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Username
                  </label>
                  <input
                    value={ivivaSourceForm.username}
                    onChange={(event) =>
                      setIvivaSourceForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    placeholder="sql_user"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showIvivaPassword ? "text" : "password"}
                      value={ivivaSourceForm.password}
                      onChange={(event) =>
                        setIvivaSourceForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowIvivaPassword((current) => !current)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      aria-label={showIvivaPassword ? "Hide password" : "Show password"}
                    >
                      {showIvivaPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Query
                </label>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">SQL</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{ivivaSourceForm.queryText.split('\n').length} lines</span>
                  </div>
                  <CodeMirror
                    value={ivivaSourceForm.queryText}
                    height="160px"
                    extensions={[sql()]}
                    theme={document.documentElement.classList.contains('dark') ? oneDark : 'light'}
                    onChange={(value) =>
                      setIvivaSourceForm((current) => ({
                        ...current,
                        queryText: value,
                      }))
                    }
                    className="text-[12px]"
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Query must return these aliases: <span className="font-mono">AssetID</span>, <span className="font-mono">PointKey</span>, <span className="font-mono">PointAddress</span>, <span className="font-mono">PointTemplateName</span>, <span className="font-mono">Units</span>, <span className="font-mono">LatestValue</span>, <span className="font-mono">LatestTime</span>.
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Refresh mode
                  </label>
                  <select
                    value={ivivaSourceForm.refreshMode}
                    onChange={(event) =>
                      setIvivaSourceForm((current) => ({
                        ...current,
                        refreshMode: event.target.value as "manual" | "scheduled",
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  >
                    <option value="manual">Manual</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Refresh interval (minutes)
                  </label>
                  <input
                    value={ivivaSourceForm.refreshIntervalMinutes}
                    onChange={(event) =>
                      setIvivaSourceForm((current) => ({
                        ...current,
                        refreshIntervalMinutes: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </div>
              </div>

              {ivivaSourceFormError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {ivivaSourceFormError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeIvivaSourceModal}
                  className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ivivaSourceSubmitting}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {ivivaSourceSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingIvivaSource ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingIvivaSource ? "Save" : "Add source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete oBIX Source Confirmation Modal */}
      {deleteSourceTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete oBIX Source</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteSourceModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                You are deleting <span className="font-semibold">{deleteSourceTarget.name}</span>.
                <br />
                This will remove only the source config. Discovered master points will remain.
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Type <span className="font-semibold text-slate-700 dark:text-slate-200">delete</span> to confirm
                </label>
                <input
                  value={deleteSourceConfirmText}
                  onChange={(event) => setDeleteSourceConfirmText(event.target.value)}
                  placeholder="delete"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeDeleteSourceModal}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteSourceConfirmText.trim().toLowerCase() !== "delete" || Boolean(deletingSourceId)}
                  onClick={() => void handleDeleteSource()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400"
                >
                  {deletingSourceId === deleteSourceTarget._id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete IVIVA Source Confirmation Modal */}
      {deleteIvivaSourceTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete IVIVA Source</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteIvivaSourceModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                You are deleting <span className="font-semibold">{deleteIvivaSourceTarget.name}</span>.
                <br />
                This will remove only the source config. No master rows will be deleted.
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Type <span className="font-semibold text-slate-700 dark:text-slate-200">delete</span> to confirm
                </label>
                <input
                  value={deleteIvivaSourceConfirmText}
                  onChange={(event) => setDeleteIvivaSourceConfirmText(event.target.value)}
                  placeholder="delete"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeDeleteIvivaSourceModal}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteIvivaSourceConfirmText.trim().toLowerCase() !== "delete" || Boolean(deletingIvivaSourceId)}
                  onClick={() => void handleDeleteIvivaSource()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400"
                >
                  {deletingIvivaSourceId === deleteIvivaSourceTarget._id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
