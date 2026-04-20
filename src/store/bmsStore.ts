import { create } from "zustand";
import type {
  PointData,
  PointDelta,
  ConnectionStatus,
  MappingFilter,
  SegmentFilters,
  SegmentKey,
} from "../types/bms";
import { SEGMENT_LABELS, parseSegments } from "../types/bms";

export type SortDirection = "asc" | "desc" | null;
export type SortableColumn =
  | "indexCode"
  | "displayName"
  | "template"
  | "serialNumber"
  | "units"
  | "n4Val"
  | "ivivaVal"
  | "diff"
  | "n4Status"
  | "mappingStatus";

export type ColumnFilterSets = Record<SortableColumn, Set<string>>;

export interface Metrics {
  total: number;
  matched: number;
  mismatch: number;
  n4Only: number;
  totalAssets: number;
  faultPoints: number;
}

interface BmsState {
  // Connection
  status: ConnectionStatus;
  clientId: string | null;

  // Data — Map keyed by displayName for O(1) merge
  pointMap: Map<string, PointData>;
  pointList: PointData[]; // derived sorted array for rendering
  lastUpdate: string | null;

  // Recently changed displayNames (for row highlight)
  changedKeys: Set<string>;

  // Filters
  filter: MappingFilter;
  searchQuery: string;
  segmentFilters: SegmentFilters;
  segmentOptions: Record<SegmentKey, string[]>; // unique sorted values per segment
  columnFilters: ColumnFilterSets;
  showFaultPointsOnly: boolean;

  // Sorting
  sortColumn: SortableColumn | null;
  sortDirection: SortDirection;

  // Metrics
  metrics: Metrics;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setClientId: (id: string) => void;
  applySnapshot: (points: PointData[]) => void;
  applyDelta: (deltas: PointDelta[]) => void;
  setFilter: (filter: MappingFilter) => void;
  setSearchQuery: (query: string) => void;
  setShowFaultPointsOnly: (show: boolean) => void;
  setSegmentFilter: (key: SegmentKey, value: string | null) => void;
  clearSegmentFilters: () => void;
  clearChangedKeys: () => void;
  toggleColumnFilterValue: (column: SortableColumn, value: string) => void;
  setColumnFilterValues: (column: SortableColumn, values: Set<string>) => void;
  clearColumnFilter: (column: SortableColumn) => void;
  clearAllColumnFilters: () => void;
  toggleSort: (column: SortableColumn) => void;
}

function createEmptyColumnFilters(): ColumnFilterSets {
  return {
    indexCode: new Set(),
    displayName: new Set(),
    template: new Set(),
    serialNumber: new Set(),
    units: new Set(),
    n4Val: new Set(),
    ivivaVal: new Set(),
    diff: new Set(),
    n4Status: new Set(),
    mappingStatus: new Set(),
  };
}

function computeMetrics(map: Map<string, PointData>): Metrics {
  let matched = 0,
    mismatch = 0,
    n4Only = 0,
    faultPoints = 0;
  const assetSet = new Set<string>();

  for (const p of map.values()) {
    // Count unique assets by indexCode
    if (p.indexCode) {
      assetSet.add(p.indexCode);
    }

    // Count fault points (n4Status not ok/OK or null)
    if (p.n4Status && p.n4Status !== "ok" && p.n4Status !== "OK") {
      faultPoints++;
    }

    switch (p.mappingStatus) {
      case "MATCHED":
        matched++;
        break;
      case "MISMATCH":
        mismatch++;
        break;
      case "N4_ONLY":
        n4Only++;
        break;
    }
  }
  return {
    total: map.size,
    matched,
    mismatch,
    n4Only,
    totalAssets: assetSet.size,
    faultPoints,
  };
}

function mapToSortedArray(map: Map<string, PointData>): PointData[] {
  return Array.from(map.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

const emptySegmentFilters: SegmentFilters = {
  Building: null,
  Floor: null,
  Room: null,
  System: null,
  Subsystem: null,
  Equipment: null,
};

function computeSegmentOptions(
  map: Map<string, PointData>,
): Record<SegmentKey, string[]> {
  const sets = SEGMENT_LABELS.reduce(
    (acc, label) => {
      acc[label] = new Set<string>();
      return acc;
    },
    {} as Record<SegmentKey, Set<string>>,
  );

  for (const p of map.values()) {
    const seg = parseSegments(p.displayName);
    if (!seg) continue;
    for (const label of SEGMENT_LABELS) {
      sets[label].add(seg[label]);
    }
  }

  return SEGMENT_LABELS.reduce(
    (acc, label) => {
      acc[label] = [...sets[label]].sort();
      return acc;
    },
    {} as Record<SegmentKey, string[]>,
  );
}

export const useBmsStore = create<BmsState>((set) => ({
  status: "disconnected",
  clientId: null,
  pointMap: new Map(),
  pointList: [],
  lastUpdate: null,
  changedKeys: new Set(),
  filter: "ALL",
  searchQuery: "",
  segmentFilters: { ...emptySegmentFilters },
  segmentOptions: {
    Building: [],
    Floor: [],
    Room: [],
    System: [],
    Subsystem: [],
    Equipment: [],
  },
  metrics: {
    total: 0,
    matched: 0,
    mismatch: 0,
    n4Only: 0,
    totalAssets: 0,
    faultPoints: 0,
  },
  columnFilters: createEmptyColumnFilters(),
  sortColumn: null,
  sortDirection: null,
  showFaultPointsOnly: false,

  setStatus: (status) => set({ status }),
  setClientId: (clientId) => set({ clientId }),

  applySnapshot: (points) => {
    const map = new Map<string, PointData>();
    for (const p of points) {
      map.set(p.displayName, p);
    }
    set({
      pointMap: map,
      pointList: mapToSortedArray(map),
      metrics: computeMetrics(map),
      segmentOptions: computeSegmentOptions(map),
      lastUpdate: new Date().toISOString(),
    });
  },

  applyDelta: (deltas) =>
    set((state) => {
      const map = new Map(state.pointMap);
      const changed = new Set<string>();

      for (const d of deltas) {
        const existing = map.get(d.displayName);
        if (existing) {
          map.set(d.displayName, {
            ...existing,
            n4Val: d.n4Val,
            n4Status: d.n4Status,
            ivivaVal: d.ivivaVal,
            ivivaTime: d.ivivaTime,
            lastUpdate: d.lastUpdate,
          });
          changed.add(d.displayName);
        }
      }

      return {
        pointMap: map,
        pointList: mapToSortedArray(map),
        metrics: computeMetrics(map),
        changedKeys: changed,
        lastUpdate: new Date().toISOString(),
      };
    }),

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowFaultPointsOnly: (showFaultPointsOnly) => set({ showFaultPointsOnly }),
  setSegmentFilter: (key, value) =>
    set((state) => ({
      segmentFilters: { ...state.segmentFilters, [key]: value },
    })),
  clearSegmentFilters: () =>
    set({ segmentFilters: { ...emptySegmentFilters } }),
  clearChangedKeys: () => set({ changedKeys: new Set() }),
  toggleColumnFilterValue: (column, value) =>
    set((state) => {
      const newSet = new Set(state.columnFilters[column]);
      if (newSet.has(value)) newSet.delete(value);
      else newSet.add(value);
      return { columnFilters: { ...state.columnFilters, [column]: newSet } };
    }),
  setColumnFilterValues: (column, values) =>
    set((state) => ({
      columnFilters: { ...state.columnFilters, [column]: values },
    })),
  clearColumnFilter: (column) =>
    set((state) => ({
      columnFilters: { ...state.columnFilters, [column]: new Set<string>() },
    })),
  clearAllColumnFilters: () =>
    set({ columnFilters: createEmptyColumnFilters() }),
  toggleSort: (column) =>
    set((state) => {
      if (state.sortColumn === column) {
        if (state.sortDirection === "asc")
          return { sortDirection: "desc" as SortDirection };
        if (state.sortDirection === "desc")
          return { sortColumn: null, sortDirection: null };
      }
      return { sortColumn: column, sortDirection: "asc" as SortDirection };
    }),
}));
