import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { useBmsStore } from "../store/bmsStore";
import { useBmsSocket } from "../hooks/useBmsSocket";

export function AssetDetailPage() {
  useBmsSocket("ALL");

  const { indexCode } = useParams<{ indexCode: string }>();
  const decodedIndexCode = indexCode ? decodeURIComponent(indexCode) : "";
  const navigate = useNavigate();
  const pointMap = useBmsStore((s) => s.pointMap);
  const changedKeys = useBmsStore((s) => s.changedKeys);

  const points = useMemo(() => {
    return Array.from(pointMap.values())
      .filter((p) => p.indexCode === decodedIndexCode)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [pointMap, decodedIndexCode]);

  const matchedCount = points.filter((p) => p.mappingStatus === "MATCHED").length;
  const faultCount = points.filter(
    (p) => p.n4Status && p.n4Status !== "ok" && p.n4Status !== "OK"
  ).length;

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/equipment")}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono">
            {decodedIndexCode}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {points.length} points · {matchedCount} matched
            {faultCount > 0 && (
              <span className="text-red-500 dark:text-red-400"> · {faultCount} faults</span>
            )}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col flex-1 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">
        {/* Header */}
        <div className="grid grid-cols-[1.5fr_1fr_80px_100px_100px_80px_70px_60px] gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Display Name</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Point Name</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Units</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">BMS Value</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">IVIVA Value</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Status</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Mapping</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Trend</span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-auto">
          {points.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
              {pointMap.size === 0 ? "Waiting for data..." : "No points found for this asset"}
            </div>
          ) : (
            points.map((point, i) => {
              const isChanged = changedKeys.has(point.displayName);
              const isOk = point.n4Status === "OK" || point.n4Status === "ok";

              return (
                <div
                  key={point.displayName}
                  className={`grid grid-cols-[1.5fr_1fr_80px_100px_100px_80px_70px_60px] gap-3 px-4 py-2.5 items-center border-b border-slate-100 dark:border-slate-800/30 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    isChanged ? "row-flash" : ""
                  } ${i % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""}`}
                >
                  <span
                    className="text-[11px] font-mono text-slate-800 dark:text-slate-200 truncate"
                    title={point.displayName}
                  >
                    {point.displayName}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={point.template || "—"}>
                    {point.template || "—"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    {point.units || "—"}
                  </span>
                  <span
                    className={`text-[11px] font-mono text-center tabular-nums ${
                      isChanged
                        ? "text-emerald-600 dark:text-emerald-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {point.n4Val ?? "—"}
                  </span>
                  <span className="text-[11px] font-mono text-center tabular-nums text-slate-700 dark:text-slate-300">
                    {point.ivivaVal ?? "—"}
                  </span>
                  <div className="flex justify-center">
                    {point.n4Status ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOk ? "bg-emerald-500 dark:bg-emerald-400" : "bg-red-500 dark:bg-red-400"
                          }`}
                        />
                        <span
                          className={`text-[11px] ${
                            isOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {point.n4Status}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <MappingBadge status={point.mappingStatus} />
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => navigate(`/trend/${encodeURIComponent(point.displayName)}`)}
                      className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                      title="View trend"
                    >
                      <TrendingUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function MappingBadge({ status }: { status: string }) {
  const cls =
    status === "N4_ONLY"
      ? "bg-orange-50 text-orange-600 dark:bg-orange-500/8 dark:text-orange-300"
      : "bg-slate-100 text-slate-600 dark:bg-slate-500/8 dark:text-slate-300";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {status}
    </span>
  );
}
