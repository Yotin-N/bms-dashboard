import type { MeterBillingReportResponse } from "./api";

type MeterBillingCacheEntry = {
  response: MeterBillingReportResponse;
};

const CACHE_KEY_PREFIX = "meter-billing-report:";
const REPORT_MONTH_STATE_KEY = "meter-billing:selected-report-month";

const cache = new Map<string, MeterBillingCacheEntry>();
let selectedReportMonth: string | null = null;

function safeRead<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

export function getCachedMeterBillingReport(reportMonth: string) {
  const inMemory = cache.get(reportMonth);
  if (inMemory) return inMemory.response;

  const stored = safeRead<MeterBillingReportResponse>(`${CACHE_KEY_PREFIX}${reportMonth}`);
  if (stored) {
    cache.set(reportMonth, { response: stored });
    return stored;
  }

  return null;
}

export function setCachedMeterBillingReport(
  reportMonth: string,
  response: MeterBillingReportResponse,
) {
  cache.set(reportMonth, { response });
  safeWrite(`${CACHE_KEY_PREFIX}${reportMonth}`, response);
}

export function getSelectedMeterBillingReportMonth() {
  if (selectedReportMonth) return selectedReportMonth;
  const stored = safeRead<string>(REPORT_MONTH_STATE_KEY);
  if (stored) {
    selectedReportMonth = stored;
    return stored;
  }
  return null;
}

export function setSelectedMeterBillingReportMonth(reportMonth: string) {
  selectedReportMonth = reportMonth;
  safeWrite(REPORT_MONTH_STATE_KEY, reportMonth);
}
