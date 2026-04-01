import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, X, Loader2, ChevronDown, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useBmsStore } from "../store/bmsStore";
import { useBmsSocket } from "../hooks/useBmsSocket";
import { SEGMENT_LABELS, parseSegments, type SegmentKey } from "../types/bms";

/* ── Sort Icon ────────────────────────────────── */

function SortIcon({ column, sortColumn, sortDirection }: {
  column: AssetSortableColumn;
  sortColumn: AssetSortableColumn | null;
  sortDirection: AssetSortDirection
}) {
  if (sortColumn !== column) return <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 dark:text-slate-600" />;
  if (sortDirection === "asc") return <ArrowUp className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />;
  return <ArrowDown className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />;
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
        className={`flex items-center gap-1 px-2 py-2 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
          active
            ? "bg-blue-50 dark:bg-blue-600/15 border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        <span className="text-slate-400 dark:text-slate-500">{label}</span>
        {active ? (
          <>
            <span className="px-1 rounded bg-blue-100 dark:bg-blue-600/25 text-blue-700 dark:text-blue-200 text-[10px] font-semibold">{value}</span>
            <X
              className="w-3 h-3 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200"
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
              !active ? "bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
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
                  ? "bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-300 font-semibold"
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

interface AssetRow {
  indexCode: string;
  building?: string;
  floor?: string;
  room?: string;
  system?: string;
  subsystem?: string;
  equipment?: string;
}

const PAGE_SIZE = 50;
const LOAD_MORE_THRESHOLD = 10;

type AssetSortableColumn =
  | "indexCode"
  | "building"
  | "floor"
  | "room"
  | "system"
  | "subsystem"
  | "equipment";

type AssetSortDirection = "asc" | "desc" | null;

export function EquipmentPage() {
  useBmsSocket("ALL");

  const pointMap = useBmsStore((s) => s.pointMap);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [sortColumn, setSortColumn] = useState<AssetSortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<AssetSortDirection>(null);
  const [segmentFilters, setSegmentFilters] = useState<Record<SegmentKey, string | null>>(
    Object.fromEntries(SEGMENT_LABELS.map(k => [k as SegmentKey, null])) as Record<SegmentKey, string | null>
  );

  const assets = useMemo(() => {
    const map = new Map<string, AssetRow>();

    for (const p of pointMap.values()) {
      if (!p.indexCode) continue;
      const existing = map.get(p.indexCode);
      const seg = parseSegments(p.displayName);

      if (existing) {
        // Asset already exists, no need to increment counter
      } else {
        map.set(p.indexCode, {
          indexCode: p.indexCode,
          building: seg?.Building,
          floor: seg?.Floor,
          room: seg?.Room,
          system: seg?.System,
          subsystem: seg?.Subsystem,
          equipment: seg?.Equipment,
        });
      }
    }

    return Array.from(map.values());
  }, [pointMap]);

  const filtered = useMemo(() => {
    let result = assets;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.indexCode.toLowerCase().includes(q) ||
          a.building?.toLowerCase().includes(q) ||
          a.floor?.toLowerCase().includes(q) ||
          a.room?.toLowerCase().includes(q) ||
          a.system?.toLowerCase().includes(q) ||
          a.subsystem?.toLowerCase().includes(q) ||
          a.equipment?.toLowerCase().includes(q)
      );
    }

    // Segment filters
    const activeSegments = SEGMENT_LABELS.filter(k => segmentFilters[k] !== null);
    if (activeSegments.length > 0) {
      result = result.filter((a) => {
        for (const key of activeSegments) {
          const filterValue = segmentFilters[key];
          if (filterValue !== null) {
            // Map segment keys to AssetRow properties
            let assetValue: string | undefined;
            switch (key) {
              case "Building": assetValue = a.building; break;
              case "Floor": assetValue = a.floor; break;
              case "Room": assetValue = a.room; break;
              case "System": assetValue = a.system; break;
              case "Subsystem": assetValue = a.subsystem; break;
              case "Equipment": assetValue = a.equipment; break;
              default: assetValue = undefined;
            }
            if (assetValue !== filterValue) return false;
          }
        }
        return true;
      });
    }

    // Sorting
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortColumn] ?? "";
        const bVal = b[sortColumn] ?? "";
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [assets, search, segmentFilters, sortColumn, sortDirection]);

  const displayedData = useMemo(() => filtered.slice(0, displayedCount), [filtered, displayedCount]);
  const hasMore = displayedCount < filtered.length;
  const shouldShowLoadMore = hasMore && filtered.length - displayedCount <= LOAD_MORE_THRESHOLD;

  const toggleSort = (column: AssetSortableColumn) => {
    setDisplayedCount(PAGE_SIZE);
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + PAGE_SIZE, filtered.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, filtered.length]);

  const resetDisplay = useCallback(() => {
    setDisplayedCount(PAGE_SIZE);
  }, []);

  useEffect(() => {
    resetDisplay();
  }, [search, segmentFilters, sortColumn, sortDirection, resetDisplay]);

  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(loadMoreRef.current);
    }
    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore, isLoadingMore]);

  const clearSegmentFilters = () => {
    setSegmentFilters(Object.fromEntries(SEGMENT_LABELS.map(k => [k as SegmentKey, null])) as Record<SegmentKey, string | null>);
  };

  const segmentOptions = useMemo(() => {
    const options: Record<SegmentKey, string[]> = {
      Building: [],
      Floor: [],
      Room: [],
      System: [],
      Subsystem: [],
      Equipment: []
    };

    assets.forEach(asset => {
      if (asset.building) options.Building.push(asset.building);
      if (asset.floor) options.Floor.push(asset.floor);
      if (asset.room) options.Room.push(asset.room);
      if (asset.system) options.System.push(asset.system);
      if (asset.subsystem) options.Subsystem.push(asset.subsystem);
      if (asset.equipment) options.Equipment.push(asset.equipment);
    });

    // Sort and deduplicate
    Object.keys(options).forEach(key => {
      options[key as SegmentKey] = [...new Set(options[key as SegmentKey])].sort();
    });

    return options;
  }, [assets]);

  const activeSegments = SEGMENT_LABELS.filter(k => segmentFilters[k] !== null);

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Equipment</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length} assets · {pointMap.size} total points
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col flex-1 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">
        {/* Toolbar: Search + Segments + Actions */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/50 flex-wrap">
          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search indexCode, segments..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetDisplay(); }}
              className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
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
              onChange={(val) => {
                setSegmentFilters(prev => ({
                  ...prev,
                  [label]: val
                }));
                resetDisplay();
              }}
            />
          ))}
          {activeSegments.length > 0 && (
            <button
              onClick={clearSegmentFilters}
              className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_60px] gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
          {[
            { key: "indexCode", label: "Index Code" },
            { key: "building", label: "Building" },
            { key: "floor", label: "Floor" },
            { key: "room", label: "Room" },
            { key: "system", label: "System" },
            { key: "subsystem", label: "Subsystem" },
            { key: "equipment", label: "Equipment" },
          ].map(col => (
            <div key={col.key} className="flex items-center gap-0.5 justify-start">
              <button
                onClick={() => toggleSort(col.key as AssetSortableColumn)}
                className={`flex items-center gap-0.5 text-[10px] font-semibold tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${
                  sortColumn === col.key ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {col.label}
                <SortIcon column={col.key as AssetSortableColumn} sortColumn={sortColumn} sortDirection={sortDirection} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Action
          </div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-auto">
          {displayedData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
              {assets.length === 0 ? "Waiting for data..." : "No assets match your search"}
            </div>
          ) : (
            <>
              {displayedData.map((asset, i) => (
              <div
                key={asset.indexCode}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_60px] gap-2 px-4 py-2.5 items-center border-b border-slate-100 dark:border-slate-800/30 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  i % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""
                }`}
              >
                <span className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate" title={asset.indexCode}>
                  {asset.indexCode}
                </span>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{asset.building || "—"}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{asset.floor || "—"}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{asset.room || "—"}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{asset.system || "—"}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{asset.subsystem || "—"}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{asset.equipment || "—"}</div>
                <div className="flex justify-center">
                  <button
                    onClick={() => navigate(`/equipment/${encodeURIComponent(asset.indexCode)}`)}
                    className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    title="View points"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

              {/* Load More Trigger */}
              {hasMore && (
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-4"
                >
                  {shouldShowLoadMore && (
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More ({filtered.length - displayedCount} remaining)
                        </>
                      )}
                    </button>
                  )}
                  {!shouldShowLoadMore && isLoadingMore && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
