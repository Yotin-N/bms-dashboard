import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  MessageSquareMore,
  RefreshCw,
  SendHorizontal,
  Trash2,
  TrendingUp,
  X,
  Pencil,
} from "lucide-react";
import type { PointData } from "../../types/bms";
import type { AttachmentRecord, RemarkLogRecord } from "../../services/api";
import { ATTACHMENT_IMAGE_ACCEPT } from "../../utils/attachment-files";

export function formatLogTime(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLogDateKey(timestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function formatLogDateLabel(timestamp: string) {
  return new Date(timestamp).toLocaleDateString([], {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatActorName(
  actor:
    | RemarkLogRecord["createdBy"]
    | AttachmentRecord["uploadedBy"],
) {
  return `${actor.firstName} ${actor.lastName}`.trim() || actor.email;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PointResourceModal({
  point,
  serialNumber,
  remarks,
  attachments,
  isLoading,
  isSubmittingRemark,
  isUploading,
  errorMessage,
  remarkDraft,
  onRemarkDraftChange,
  onSubmitRemark,
  onRefresh,
  onUploadFile,
  onOpenAttachment,
  onLoadAttachmentPreview,
  onDeleteAttachment,
  onDeleteRemark,
  onUpdateRemark,
  currentUserId,
  currentUserRole,
  onClose,
}: {
  point: PointData;
  serialNumber: string;
  remarks: RemarkLogRecord[];
  attachments: AttachmentRecord[];
  isLoading: boolean;
  isSubmittingRemark: boolean;
  isUploading: boolean;
  errorMessage: string | null;
  remarkDraft: string;
  onRemarkDraftChange: (value: string) => void;
  onSubmitRemark: () => void;
  onRefresh: () => void;
  onUploadFile: (file: File) => void;
  onOpenAttachment: (attachment: AttachmentRecord) => void;
  onLoadAttachmentPreview: (attachment: AttachmentRecord) => Promise<string>;
  onDeleteAttachment: (attachment: AttachmentRecord) => void;
  onDeleteRemark: (remark: RemarkLogRecord) => void;
  onUpdateRemark: (remark: RemarkLogRecord, message: string) => Promise<void>;
  currentUserId: string | null;
  currentUserRole: "admin" | "editor" | "viewer" | null;
  onClose: () => void;
}) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingRemarkDraft, setEditingRemarkDraft] = useState("");
  const [isSavingRemarkEdit, setIsSavingRemarkEdit] = useState(false);
  const wasSubmittingRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const imageAttachment = useMemo(
    () => attachments.find((attachment) => attachment.mimeType.startsWith("image/")) || null,
    [attachments],
  );
  const remarkGroups = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; items: RemarkLogRecord[] }
    >();

    for (const log of remarks) {
      const key = getLogDateKey(log.createdAt);
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(log);
      } else {
        groups.set(key, {
          label: formatLogDateLabel(log.createdAt),
          items: [log],
        });
      }
    }

    return Array.from(groups.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      items: value.items,
    }));
  }, [remarks]);

  useEffect(() => {
    setIsComposerOpen(false);
    setEditingRemarkId(null);
    setEditingRemarkDraft("");
    setIsSavingRemarkEdit(false);
  }, [point.displayName]);

  useEffect(() => {
    if (remarkDraft.trim()) {
      setIsComposerOpen(true);
    }
  }, [remarkDraft]);

  useEffect(() => {
    // Track submission state
    if (isSubmittingRemark) {
      wasSubmittingRef.current = true;
    } else if (wasSubmittingRef.current && !remarkDraft.trim() && isComposerOpen) {
      // Close modal only after successful submission
      setIsComposerOpen(false);
      wasSubmittingRef.current = false;
    }
  }, [isSubmittingRemark, remarkDraft, isComposerOpen]);

  useEffect(() => {
    if (!imageAttachment) {
      setPreviewAttachmentId(null);
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      setIsPreviewLoading(false);
      return;
    }

    let active = true;
    let nextPreviewUrl: string | null = null;

    setIsPreviewLoading(true);
    setPreviewAttachmentId(imageAttachment._id);

    void onLoadAttachmentPreview(imageAttachment)
      .then((url) => {
        if (!active) {
          window.URL.revokeObjectURL(url);
          return;
        }

        nextPreviewUrl = url;
        if (previewUrlRef.current) {
          window.URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = url;
        setPreviewUrl(url);
      })
      .catch(() => {
        if (!active) return;
        if (previewUrlRef.current) {
          window.URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
        setPreviewUrl(null);
      })
      .finally(() => {
        if (active) {
          setIsPreviewLoading(false);
        }
      });

    return () => {
      active = false;
      if (nextPreviewUrl) {
        window.URL.revokeObjectURL(nextPreviewUrl);
      }
    };
  }, [imageAttachment, onLoadAttachmentPreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const canDeleteAttachment = (attachment: AttachmentRecord) =>
    currentUserRole === "admin" || attachment.uploadedBy.userId === currentUserId;
  const canManageResources =
    currentUserRole === "admin" || currentUserRole === "editor";

  const canDeleteRemark = (remark: RemarkLogRecord) =>
    currentUserRole === "admin" || remark.createdBy.userId === currentUserId;

  const canEditRemark = (remark: RemarkLogRecord) =>
    currentUserRole === "admin" || remark.createdBy.userId === currentUserId;

  const startEditingRemark = (remark: RemarkLogRecord) => {
    setEditingRemarkId(remark._id);
    setEditingRemarkDraft(remark.message);
    setIsSavingRemarkEdit(false);
  };

  const cancelEditingRemark = () => {
    setEditingRemarkId(null);
    setEditingRemarkDraft("");
    setIsSavingRemarkEdit(false);
  };

  const handleSaveRemarkEdit = async (remark: RemarkLogRecord) => {
    if (!editingRemarkDraft.trim()) return;
    setIsSavingRemarkEdit(true);
    try {
      await onUpdateRemark(remark, editingRemarkDraft.trim());
      cancelEditingRemark();
    } catch {
      setIsSavingRemarkEdit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
      <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:h-[84vh] sm:rounded-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6">
          <div className="flex items-center gap-4">
            <div>
              <h3
                className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg"
                title={point.indexCode || "—"}
              >
                {point.indexCode}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {point.template} · SN {serialNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Reload point details"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6 lg:border-b-0 lg:border-r">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Attachment
                  </h4>
                  {canManageResources ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => uploadInputRef.current?.click()}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                        {attachments.length > 0 ? "Replace Image" : "Upload Image"}
                      </button>
                    </div>
                  ) : null}
                </div>

                {canManageResources ? (
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept={ATTACHMENT_IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUploadFile(file);
                      event.currentTarget.value = "";
                    }}
                  />
                ) : null}

                {attachments.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    No file attached to this point yet.
                  </div>
                ) : (
                  attachments.map((attachment) => (
                    <div key={attachment._id} className="space-y-3">
                      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenAttachment(attachment)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                              <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                {attachment.originalName}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatFileSize(attachment.size)}
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            {canDeleteAttachment(attachment) ? (
                              <button
                                type="button"
                                onClick={() => onDeleteAttachment(attachment)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                                title="Delete file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                          {formatActorName(attachment.uploadedBy)} · {formatLogTime(attachment.createdAt)}
                        </div>
                      </div>

                      {attachment.mimeType.startsWith("image/") ? (
                        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => onOpenAttachment(attachment)}
                            className="block w-full overflow-hidden bg-slate-50 dark:bg-slate-950"
                            title="Open image"
                          >
                            {isPreviewLoading && previewAttachmentId === attachment._id ? (
                              <div className="flex h-48 items-center justify-center text-slate-400 dark:text-slate-500">
                                <Loader2 className="h-5 w-5 animate-spin" />
                              </div>
                            ) : previewUrl && previewAttachmentId === attachment._id ? (
                              <img
                                src={previewUrl}
                                alt={attachment.originalName}
                                className="h-48 w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-48 items-center justify-center text-slate-400 dark:text-slate-500">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            )}
                          </button>
                        </div>
                      ) : null}

                      {attachments.length > 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                          Uploading a new file will replace the current file.
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </section>
            </aside>

            <section className="relative min-h-0 overflow-hidden flex flex-col p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Remark Logs
                </h4>
                {canManageResources ? (
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen((current) => !current)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    {isComposerOpen ? <X className="h-3.5 w-3.5" /> : <SendHorizontal className="h-3.5 w-3.5" />}
                    {isComposerOpen ? "Close" : "Add remark"}
                  </button>
                ) : null}
              </div>

              {errorMessage ? (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>{errorMessage}</div>
                </div>
              ) : null}

              <div
                className={`min-h-0 flex-1 overflow-auto custom-scrollbar ${isComposerOpen ? "pb-36 sm:pb-32" : ""}`}
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#64748b #f1f5f9',
                }}
              >
                {remarks.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    No remarks yet for this point.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {remarkGroups.map((group) => (
                      <div key={group.key} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                            {group.label}
                          </div>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        </div>
                        <div className="space-y-2">
                          {group.items.map((log) => (
                            <div key={log._id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                    {formatActorName(log.createdBy)}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                    {formatLogTime(log.createdAt)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {canEditRemark(log) ? (
                                    <button
                                      type="button"
                                      onClick={() => startEditingRemark(log)}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                      title="Edit remark"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                  {canDeleteRemark(log) ? (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteRemark(log)}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                                      title="Delete remark"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                              {editingRemarkId === log._id ? (
                                <div className="mt-3 space-y-3">
                                  <textarea
                                    value={editingRemarkDraft}
                                    onChange={(event) => setEditingRemarkDraft(event.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-600"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={cancelEditingRemark}
                                      className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleSaveRemarkEdit(log)}
                                      disabled={isSavingRemarkEdit || !editingRemarkDraft.trim()}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                                    >
                                      {isSavingRemarkEdit ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <SendHorizontal className="h-3.5 w-3.5" />
                                      )}
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                  {log.message}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isComposerOpen ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 overflow-y-auto sm:inset-0 sm:items-center sm:p-6">
                  <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      New remark
                    </div>
                    <textarea
                      value={remarkDraft}
                      onChange={(event) => onRemarkDraftChange(event.target.value)}
                      rows={3}
                      placeholder="Add a short verification note..."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-600"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Keep it concise and operational.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onRemarkDraftChange("");
                            setIsComposerOpen(false);
                          }}
                          className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={onSubmitRemark}
                          disabled={isSubmittingRemark || !remarkDraft.trim()}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                        >
                          {isSubmittingRemark ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <SendHorizontal className="h-3.5 w-3.5" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PointResourceActionsCell({
  point,
  remarkCount,
  attachmentCount,
  isUploading,
  currentUserRole,
  onOpenLogs,
  onUploadFile,
  onOpenTrend,
}: {
  point: PointData;
  remarkCount: number;
  attachmentCount: number;
  isUploading: boolean;
  currentUserRole: "admin" | "editor" | "viewer" | null;
  onOpenLogs: () => void;
  onUploadFile: (file: File) => void;
  onOpenTrend?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canManageResources =
    currentUserRole === "admin" || currentUserRole === "editor";
  const baseButtonClass =
    "relative flex items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-60 h-8 w-8 sm:h-5 sm:w-5";

  return (
    <div className="flex items-center justify-center gap-1.5">
      {canManageResources ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={`${baseButtonClass} ${
              attachmentCount > 0
                ? "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
                : "border-slate-200 bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            }`}
            title={`${attachmentCount > 0 ? "Replace" : "Upload"} file for ${point.displayName}`}
          >
            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ATTACHMENT_IMAGE_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadFile(file);
              event.currentTarget.value = "";
            }}
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={onOpenLogs}
        className={`${baseButtonClass} ${
          remarkCount > 0
            ? "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
            : "border-slate-200 bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        }`}
        title={`Open remarks for ${point.displayName}`}
      >
        <MessageSquareMore className="h-3 w-3" />
        {remarkCount > 0 ? (
          <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-yellow-500" />
        ) : null}
      </button>

      {onOpenTrend ? (
        <button
          type="button"
          onClick={onOpenTrend}
          className={`${baseButtonClass} border-slate-200 bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300`}
          title={`Open trend for ${point.displayName}`}
        >
          <TrendingUp className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
