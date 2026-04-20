// Full point data — received in points:snapshot
export interface PointData {
  displayName: string;
  pointKey: number | null;
  indexCode: string | null;
  serialNumber: string | null;
  units: string | null;
  template: string | null;
  mappingStatus: string;
  n4Val: string | null;
  n4Status: string | null;
  ivivaVal: string | null;
  ivivaTime: string | null;
  lastUpdate: string | null;
}

// Delta values — received in points:delta
export interface PointDelta {
  displayName: string;
  n4Val: string | null;
  n4Status: string | null;
  ivivaVal: string | null;
  ivivaTime: string | null;
  lastUpdate: string | null;
}

export interface SnapshotPayload {
  type: "dashboard" | "selected";
  count: number;
  points: PointData[];
  timestamp: string;
}

export interface DeltaPayload {
  count: number;
  total: number;
  points: PointDelta[];
  timestamp: string;
}

export interface ConnectedPayload {
  message: string;
  clientId: string;
  cacheSize: number;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export type MappingFilter = "ALL" | "MATCHED" | "MISMATCH" | "N4_ONLY";

// Display name convention: O02-006-ME06-EE-DISB-PDIGMT-008_Pf
// Segments:                 [0]  [1]  [2]  [3] [4]   [5]    [6]
export const SEGMENT_LABELS = [
  "Building",
  "Floor",
  "Room",
  "System",
  "Subsystem",
  "Equipment",
] as const;

export type SegmentKey = (typeof SEGMENT_LABELS)[number];

export type SegmentFilters = Record<SegmentKey, string | null>;

export function parseSegments(
  displayName: string,
): Record<SegmentKey, string> | null {
  const parts = displayName.split("-");
  if (parts.length < 7) return null;
  return {
    Building: parts[0],
    Floor: parts[1],
    Room: parts[2],
    System: parts[3],
    Subsystem: parts[4],
    Equipment: parts[5],
  };
}
