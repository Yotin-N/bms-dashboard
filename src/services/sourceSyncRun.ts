import type { SourceSyncRun } from "./api";

export function isSourceSyncRunTerminal(
  run: Pick<SourceSyncRun, "status"> | null | undefined,
) {
  return (
    run?.status === "completed" ||
    run?.status === "partial_success" ||
    run?.status === "failed"
  );
}

export function getSourceSyncRunProgressText(
  run: Pick<
    SourceSyncRun,
    "currentStage" | "obixSummary" | "ivivaSummary" | "masterSummary"
  > | null,
) {
  if (!run) return "Syncing active sources...";

  switch (run.currentStage) {
    case "queued":
      return "Sync queued. Preparing background job...";
    case "discover_obix":
      return run.obixSummary.sourceCount > 0
        ? `Discovering active oBIX sources... ${run.obixSummary.completed}/${run.obixSummary.sourceCount} done`
        : "Discovering active oBIX sources...";
    case "sync_iviva":
      return run.ivivaSummary.sourceCount > 0
        ? `Syncing active IVIVA sources... ${run.ivivaSummary.completed}/${run.ivivaSummary.sourceCount} done`
        : "Syncing active IVIVA sources...";
    case "upsert_master":
      return run.masterSummary.started
        ? "Updating master data..."
        : "Preparing master update...";
    case "completed":
      return "Sync completed";
    case "failed":
      return "Sync failed";
    default:
      return "Syncing active sources...";
  }
}

export function getSourceSyncRunCompletionText(run: SourceSyncRun) {
  if (run.status === "failed") {
    return run.errors[0]?.message
      ? `Sync failed • ${run.errors[0].message}`
      : "Sync failed. Please try again.";
  }

  const summary = `${run.obixSummary.completed} oBIX, ${run.ivivaSummary.completed} IVIVA, ${run.masterSummary.totalRows.toLocaleString()} master rows`;

  if (run.status === "partial_success") {
    return `Sync completed with warnings • ${summary}`;
  }

  return `Sync completed • ${summary}`;
}
