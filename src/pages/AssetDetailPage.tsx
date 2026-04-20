import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import {
  api,
  ApiError,
  type AttachmentRecord,
  type RemarkLogRecord,
} from "../services/api";
import { prepareAttachmentImageFile } from "../utils/attachment-files";
import { useBmsStore } from "../store/bmsStore";
import { useBmsSocket } from "../hooks/useBmsSocket";
import {
  PointResourceActionsCell,
  PointResourceModal,
} from "../components/point-resources/PointResourceUI";
import type { PointData } from "../types/bms";

const TABLE_GRID_COLS =
  "grid-cols-[1.45fr_0.95fr_120px_70px_96px_96px_82px_104px_72px]";

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

function StatusDot({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>;
  }

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

export function AssetDetailPage() {
  useBmsSocket("ALL");

  const { accessToken, user } = useAuth();
  const { indexCode } = useParams<{ indexCode: string }>();
  const decodedIndexCode = indexCode ? decodeURIComponent(indexCode) : "";
  const navigate = useNavigate();
  const pointMap = useBmsStore((s) => s.pointMap);
  const changedKeys = useBmsStore((s) => s.changedKeys);

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

  const points = useMemo(() => {
    return Array.from(pointMap.values())
      .filter((p) => p.indexCode === decodedIndexCode)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [pointMap, decodedIndexCode]);

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

  const matchedCount = points.filter((p) => p.mappingStatus === "MATCHED").length;
  const faultCount = points.filter(
    (p) => p.n4Status && p.n4Status !== "ok" && p.n4Status !== "OK",
  ).length;
  const activeRemarks = activePoint ? remarkLogsByPoint[activePoint.displayName] || [] : [];
  const activeAttachments = activePoint
    ? attachmentsByPoint[activePoint.displayName] || []
    : [];

  return (
    <>
      <div className="flex flex-col flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/equipment")}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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

        <div className="flex flex-col flex-1 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">
          <div className={`grid ${TABLE_GRID_COLS} gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Display Name</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Point Name</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">SN</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Units</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">BMS Value</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">IVIVA Value</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Status</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Remarks / Files</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Trend</span>
          </div>

          <div className="flex-1 overflow-auto">
            {points.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                {pointMap.size === 0 ? "Waiting for data..." : "No points found for this asset"}
              </div>
            ) : (
              points.map((point, i) => {
                const isChanged = changedKeys.has(point.displayName);
                const isOk = point.n4Status === "OK" || point.n4Status === "ok";
                const isFault = !!point.n4Status && !isOk;
                const leftBorderClass = isFault
                  ? "border-l-4 border-l-red-500 dark:border-l-red-400"
                  : point.mappingStatus === "N4_ONLY"
                    ? "border-l-4 border-l-orange-500 dark:border-l-orange-400"
                    : "border-l-4 border-l-transparent";

                return (
                  <div
                    key={point.displayName}
                    className={`grid ${TABLE_GRID_COLS} gap-3 px-4 py-3 items-center border-b border-slate-100 dark:border-slate-800/30 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      isChanged ? "row-flash" : ""
                    } ${i % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""} ${leftBorderClass}`}
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
                    <span
                      className="text-[11px] font-mono text-slate-700 dark:text-slate-200 truncate"
                      title={point.serialNumber || "-"}
                    >
                      {point.serialNumber || "-"}
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
                      <StatusDot status={point.n4Status} />
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
                      />
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/trend/${encodeURIComponent(point.displayName)}`)}
                        className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
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
