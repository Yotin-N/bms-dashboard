type SerializedFilters = Record<string, string[]>;

export type BmsImportPageViewState = {
  selectedBatchId: string | null;
  selectedSourceId: string | null;
  selectedIvivaSourceId: string | null;
  searchInput: string;
  metadataSegment: "ALL" | "WARNING" | "MATCHED" | "IMPORT_ONLY" | "OBIX_ONLY";
  sortColumn:
    | "displayName"
    | "bacnetKey"
    | "mappingStatus"
    | "matchStatus"
    | "sourceBatchFileName"
    | "obixSourceName"
    | "ivivaSourceName"
    | null;
  sortDirection: "asc" | "desc";
  visibleCount: number;
  columnFilters: SerializedFilters;
  tableScrollTop: number;
};

export type MappingDashboardViewState = {
  searchInput: string;
  segment:
    | "ALL"
    | "MATCHED"
    | "NEEDS_REVIEW"
    | "METADATA_WARNING"
    | "IVIVA_MISMATCH";
  componentFilter: string;
  sortColumn:
    | "indexCode"
    | "displayName"
    | "pointName"
    | "units"
    | "bms"
    | "iviva"
    | "metadataStatus"
    | "ivivaMapping"
    | null;
  sortDirection: "asc" | "desc";
  visibleCount: number;
  columnFilters: SerializedFilters;
  tableScrollTop: number;
};

const BMS_IMPORT_PAGE_STATE_KEY = "bms-import-page-state";
const MAPPING_DASHBOARD_STATE_KEY = "mapping-dashboard-page-state";

let bmsImportPageState: BmsImportPageViewState | null = null;
let mappingDashboardState: MappingDashboardViewState | null = null;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function safeRead<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore session storage quota or serialization issues for view state.
  }
}

export function getBmsImportPageState() {
  if (bmsImportPageState) return bmsImportPageState;
  const stored = safeRead<BmsImportPageViewState>(BMS_IMPORT_PAGE_STATE_KEY);
  if (stored) {
    bmsImportPageState = stored;
  }
  return stored;
}

export function setBmsImportPageState(nextState: BmsImportPageViewState) {
  bmsImportPageState = nextState;
  safeWrite(BMS_IMPORT_PAGE_STATE_KEY, nextState);
}

export function getMappingDashboardState() {
  if (mappingDashboardState) return mappingDashboardState;
  const stored = safeRead<MappingDashboardViewState>(MAPPING_DASHBOARD_STATE_KEY);
  if (stored) {
    mappingDashboardState = stored;
  }
  return stored;
}

export function setMappingDashboardState(nextState: MappingDashboardViewState) {
  mappingDashboardState = nextState;
  safeWrite(MAPPING_DASHBOARD_STATE_KEY, nextState);
}
