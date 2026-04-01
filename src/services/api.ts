const API_BASE = import.meta.env.VITE_GATEWAY_URL;

export interface TrendRecord {
  timestamp: string;
  metadata: {
    displayName: string;
    pointKey: number | null;
    mappingStatus: string;
  };
  n4Val: string | null;
  ivivaVal: string | null;
}

export interface PointSnapshot {
  displayName: string;
  pointKey: number | null;
  indexCode: string | null;
  units: string | null;
  template: string | null;
  mappingStatus: string;
  n4Val: string | null;
  n4Status: string | null;
  ivivaVal: string | null;
  ivivaTime: string | null;
  lastUpdate: string | null;
}

export interface MappingStatusSummary {
  total: number;
  matched: number;
  mismatch: number;
  n4Only: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  /** Get mapping status summary */
  getMappingStatus(): Promise<MappingStatusSummary> {
    return fetchJson(`${API_BASE}/trend/mapping-status`);
  },

  /** Get all point snapshots, optionally filtered by status */
  getAllPoints(status?: string): Promise<PointSnapshot[]> {
    const params = status ? `?status=${status}` : "";
    return fetchJson(`${API_BASE}/trend/all-points${params}`);
  },

  /** Get trend history by displayName */
  getTrendByDisplayName(
    displayName: string,
    startDate?: string,
    endDate?: string,
  ): Promise<TrendRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return fetchJson(
      `${API_BASE}/trend/history/${encodeURIComponent(displayName)}${qs}`,
    );
  },

  /** Get trend history by pointKey */
  getTrendByPointKey(
    pointKey: number,
    startDate?: string,
    endDate?: string,
  ): Promise<TrendRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return fetchJson(`${API_BASE}/trend/history/point/${pointKey}${qs}`);
  },

  /** Get latest snapshot for a single point */
  getSnapshot(displayName: string): Promise<PointSnapshot> {
    return fetchJson(
      `${API_BASE}/trend/snapshot/${encodeURIComponent(displayName)}`,
    );
  },
};
