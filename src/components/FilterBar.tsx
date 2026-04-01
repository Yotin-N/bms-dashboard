import { useRef, useState, useEffect } from "react";
import { Search, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { useBmsStore } from "../store/bmsStore";
import { SEGMENT_LABELS } from "../types/bms";
import type { SegmentKey } from "../types/bms";

/* ── Segment Dropdown ─────────────────────────────────── */

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
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
          active
            ? "bg-blue-600/15 border border-blue-500/40 text-blue-300"
            : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
        }`}
      >
        <span className="text-slate-500">{label}</span>
        {active ? (
          <>
            <span className="px-1 rounded bg-blue-600/25 text-blue-200 text-[10px] font-semibold">
              {value}
            </span>
            <X
              className="w-3 h-3 text-blue-400 hover:text-blue-200"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            />
          </>
        ) : (
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && options.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[120px] max-h-[220px] overflow-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl shadow-black/30">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
              !active ? "bg-blue-600/15 text-blue-300" : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}
          >
            All
          </button>
          <div className="border-t border-slate-700/50" />
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                value === opt
                  ? "bg-blue-600/15 text-blue-300 font-semibold"
                  : "text-slate-300 hover:bg-slate-700 hover:text-slate-100"
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

/* ── Combined Filter Bar ──────────────────────────────── */

export function FilterBar() {
  const searchQuery = useBmsStore((s) => s.searchQuery);
  const segmentFilters = useBmsStore((s) => s.segmentFilters);
  const segmentOptions = useBmsStore((s) => s.segmentOptions);
  const setSearchQuery = useBmsStore((s) => s.setSearchQuery);
  const setSegmentFilter = useBmsStore((s) => s.setSegmentFilter);
  const clearSegmentFilters = useBmsStore((s) => s.clearSegmentFilters);

  const activeSegCount = Object.values(segmentFilters).filter((v) => v !== null).length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative w-75">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by displayName or indexCode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
        />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-700/60" />

      {/* Segment Dropdowns */}
      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
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
          className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
