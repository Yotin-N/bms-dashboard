import { useRef, useState, useEffect } from "react";
import { ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { useBmsStore } from "../store/bmsStore";
import { SEGMENT_LABELS } from "../types/bms";
import type { SegmentKey } from "../types/bms";



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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasValue = value !== null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${
          hasValue
            ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
            : "bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
        }`}
      >

        <span className="text-slate-500">{label}</span>
        {hasValue && (
          <span className="px-1.5 py-0.5 rounded bg-blue-600/25 text-blue-200 text-[11px] font-semibold">
            {value}
          </span>
        )}
        {hasValue ? (
          <X
            className="w-3 h-3 text-blue-400 hover:text-blue-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        ) : (
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && options.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[140px] max-h-[240px] overflow-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl shadow-black/30">
          {/* All option */}
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
              value === null
                ? "bg-blue-600/15 text-blue-300"
                : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}
          >
            All {label}s
          </button>
          <div className="border-t border-slate-700/50" />
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
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

export function SegmentFilter() {
  const segmentFilters = useBmsStore((s) => s.segmentFilters);
  const segmentOptions = useBmsStore((s) => s.segmentOptions);
  const setSegmentFilter = useBmsStore((s) => s.setSegmentFilter);
  const clearSegmentFilters = useBmsStore((s) => s.clearSegmentFilters);

  const activeCount = Object.values(segmentFilters).filter((v) => v !== null).length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-slate-500 mr-1">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">Segments</span>
      </div>

      {SEGMENT_LABELS.map((label) => (
        <SegmentDropdown
          key={label}
          label={label}
          options={segmentOptions[label]}
          value={segmentFilters[label]}
          onChange={(val) => setSegmentFilter(label, val)}
        />
      ))}

      {activeCount > 0 && (
        <button
          onClick={clearSegmentFilters}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}
