import { getApiBaseUrl } from "./config";

const API_BASE = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  requestId: string | null;
  details: unknown;

  constructor(message: string, status: number, requestId: string | null, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phoneNumber: string;
  role: "admin" | "editor" | "viewer";
  isActive: boolean;
  isPasswordSet: boolean;
  lastLoginAt: string | null;
}

export interface AuthSuccessResponse {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
}

export interface PasswordChangeRequiredResponse {
  requiresPasswordChange: true;
  passwordSetupToken: string;
  user: AuthUser;
}

export type LoginResponse = AuthSuccessResponse | PasswordChangeRequiredResponse;

export interface UserActionResponse {
  message: string;
  user?: AuthUser;
  temporaryPassword?: string;
}

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phoneNumber: string;
  role: "admin" | "editor" | "viewer";
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  company?: string;
  phoneNumber?: string;
  role?: "admin" | "editor" | "viewer";
}

export interface MagicLinkConsumeResponse {
  passwordSetupToken: string;
  user: AuthUser;
}

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

export interface MappingStatusSummary {
  total: number;
  matched: number;
  mismatch: number;
  n4Only: number;
}

export interface AttachmentRecord {
  _id: string;
  displayName: string;
  pointKey: number | null;
  indexCode: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    role: "admin" | "editor" | "viewer";
  };
}

export interface RemarkLogRecord {
  _id: string;
  displayName: string;
  pointKey: number | null;
  indexCode: string | null;
  message: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    role: "admin" | "editor" | "viewer";
  };
  attachmentIds: AttachmentRecord[];
}

export interface PointResourceSummary {
  displayName: string;
  remarkCount: number;
  attachmentCount: number;
  latestRemarkAt: string | null;
  latestAttachmentAt: string | null;
}

export interface PointExportPayload {
  displayName: string;
  indexCode?: string | null;
  pointName?: string | null;
  serialNumber?: string | null;
  units?: string | null;
  bmsValue?: string | null;
  ivivaValue?: string | null;
  diff?: string | null;
  status?: string | null;
}

export interface BmsImportBatch {
  _id: string;
  fileName: string;
  fileType: "xlsx" | "csv";
  uploadedBy: string;
  uploadedAt: string;
  sheetNames: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  isActive: boolean;
  status: "processing" | "processed" | "failed";
  matchStatus: "pending" | "completed" | "failed";
  matchedRows: number;
  wrongIndexCodeRows: number;
  pointAddressMismatchRows: number;
  notFoundRows: number;
  lastMatchedAt: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MappingPointRecord {
  _id: string;
  batchId: string | null;
  sheetName: string | null;
  rowNumber: number | null;
  displayName: string | null;
  slotPath?: string | null;
  sourceBatchId?: string | null;
  sourceBatchFileName?: string | null;
  controllerName: string | null;
  objectId: string | null;
  controllerId: string | null;
  objectTypeRaw: string | null;
  objectType: string | null;
  instanceNumber: string | null;
  bacnetKey: string | null;
  indexCodeCandidate: string | null;
  pointSuffix: string | null;
  existsInImport?: boolean;
  existsInObix?: boolean;
  obixSourceConfigId?: string | null;
  obixPath?: string | null;
  obixHref?: string | null;
  obixDisplayName?: string | null;
  obixRawType?: string | null;
  bmsValueRaw?: string | null;
  bmsValue?: string | null;
  bmsUnit?: string | null;
  bmsStatus?: string | null;
  bmsLastSeenAt?: string | null;
  mappingStatus?:
    | "matched"
    | "obix_only"
    | "import_only"
    | "mapping_conflict";
  remark?: string | null;
  reviewFlags?: string[];
  normalizationStatus: "normalized" | "invalid";
  normalizationErrors: string[];
  matchStatus:
    | "pending"
    | "matched"
    | "wrong_index_code"
    | "point_address_mismatch"
    | "not_found";
  matchRemark: string | null;
  attachId: string | null;
  ivivaSourceConfigId?: string | null;
  ivivaAssetId: string | null;
  ivivaPointKey: number | null;
  ivivaPointAddress: string | null;
  ivivaPointTemplateName: string | null;
  ivivaUnits: string | null;
  ivivaLatestValue?: string | null;
  ivivaLatestTime?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ObixSourceConfig {
  _id: string;
  name: string;
  basePath: string;
  username: string | null;
  password: string | null;
  enabled: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  refreshMode: "manual" | "scheduled";
  refreshIntervalMinutes: number;
  lastDiscoveredAt: string | null;
  lastDiscoveryPointCount: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface IvivaSourceConfig {
  _id: string;
  name: string;
  server: string;
  database: string;
  username: string;
  password: string;
  queryText: string;
  enabled: boolean;
  refreshMode: "manual" | "scheduled";
  refreshIntervalMinutes: number;
  lastSyncedAt: string | null;
  lastSyncRowCount: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UploadBmsImportResponse {
  message: string;
  batch: BmsImportBatch;
  preview: {
    normalized: MappingPointRecord[];
    invalid: MappingPointRecord[];
  };
}

export interface BmsImportBatchListResponse {
  items: BmsImportBatch[];
  pagination: PaginationMeta;
}

export interface BmsImportBatchDetailResponse {
  batch: BmsImportBatch;
  counts: {
    normalized: number;
    invalid: number;
    matched: number;
    wrongIndexCode: number;
    pointAddressMismatch: number;
    notFound: number;
  };
}

export interface MappingPointListResponse {
  items: MappingPointRecord[];
  pagination: PaginationMeta;
}

export interface RunBmsImportMatchResponse {
  message: string;
  batch: {
    _id: string;
    fileName: string;
    matchStatus: "pending" | "completed" | "failed";
    matchedRows: number;
    wrongIndexCodeRows: number;
    pointAddressMismatchRows: number;
    notFoundRows: number;
    lastMatchedAt: string | null;
  } | null;
  summary: {
    matched: number;
    wrongIndexCode: number;
    pointAddressMismatch: number;
    notFound: number;
  };
}

export interface DeleteBmsImportBatchResponse {
  message: string;
  batchId: string;
  fileName: string;
  deletedRows: number;
}

export interface UpdateBmsImportBatchResponse {
  batch: BmsImportBatch;
}

export interface ObixSourceConfigListResponse {
  items: ObixSourceConfig[];
  pagination: PaginationMeta;
}

export interface ObixSourceConfigResponse {
  config: ObixSourceConfig;
}

export interface IvivaSourceConfigListResponse {
  items: IvivaSourceConfig[];
  pagination: PaginationMeta;
}

export interface IvivaSourceConfigResponse {
  config: IvivaSourceConfig;
}

export interface SyncIvivaSourceResponse {
  message: string;
  config: IvivaSourceConfig;
  summary: {
    synced: number;
    bacnetCandidates: number;
    assetIds: number;
    appliedToMaster: boolean;
  };
}

export interface DiscoverObixSourceResponse {
  message: string;
  config: ObixSourceConfig | null;
  summary: {
    discovered: number;
    created: number;
    updated: number;
    skipped: number;
  };
}

export interface DeleteObixSourceResponse {
  message: string;
  sourceId: string;
  name: string;
}

export interface DeleteIvivaSourceResponse {
  message: string;
  sourceId: string;
  name: string;
}

export interface ImportPointSourceRecord extends MappingPointRecord {
  batch: {
    _id: string;
    fileName: string;
    isActive: boolean;
    uploadedAt: string | null;
  } | null;
}

export interface ImportPointSourcesResponse {
  displayName: string;
  items: ImportPointSourceRecord[];
}

type RequestOptions = RequestInit & {
  accessToken?: string | null;
};

async function parseErrorResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  let details: unknown = null;

  if (contentType.includes("application/json")) {
    try {
      details = await response.json();
    } catch {
      details = null;
    }
  } else {
    try {
      details = await response.text();
    } catch {
      details = null;
    }
  }

  const message =
    typeof details === "object" &&
    details !== null &&
    "message" in details &&
    typeof (details as { message?: unknown }).message === "string"
      ? ((details as { message: string }).message)
      : Array.isArray((details as { message?: unknown })?.message)
        ? ((details as { message: string[] }).message.join(" | "))
        : response.statusText || "Request failed";

  throw new ApiError(
    message,
    response.status,
    response.headers.get("x-request-id"),
    details,
  );
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: requestHeaders,
    body,
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { accessToken, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: requestHeaders,
    body,
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response.blob();
}

export const authApi = {
  login(email: string, password: string) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  getMe(accessToken: string) {
    return request<AuthUser>("/auth/me", {
      method: "GET",
      accessToken,
    });
  },

  updateMe(accessToken: string, payload: UpdateUserPayload) {
    return request<UserActionResponse>("/auth/me", {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  refresh(accessToken: string) {
    return request<AuthSuccessResponse>("/auth/refresh", {
      method: "POST",
      accessToken,
    });
  },

  consumeMagicLink(token: string) {
    return request<MagicLinkConsumeResponse>("/auth/magic-link/consume", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  setInitialPassword(passwordSetupToken: string, newPassword: string) {
    return request<AuthSuccessResponse>("/auth/set-password", {
      method: "POST",
      body: JSON.stringify({ passwordSetupToken, newPassword }),
    });
  },
};

export const api = {
  updateMe(accessToken: string, payload: UpdateUserPayload) {
    return request<UserActionResponse>("/auth/me", {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  listUsers(accessToken: string) {
    return request<AuthUser[]>("/users", {
      accessToken,
    });
  },

  createUser(accessToken: string, payload: CreateUserPayload) {
    return request<UserActionResponse>("/users", {
      method: "POST",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  updateUser(accessToken: string, userId: string, payload: UpdateUserPayload) {
    return request<UserActionResponse>(`/users/${userId}`, {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  activateUser(accessToken: string, userId: string) {
    return request<UserActionResponse>(`/users/${userId}/activate`, {
      method: "PATCH",
      accessToken,
    });
  },

  deactivateUser(accessToken: string, userId: string) {
    return request<UserActionResponse>(`/users/${userId}/deactivate`, {
      method: "PATCH",
      accessToken,
    });
  },

  deleteUser(accessToken: string, userId: string) {
    return request<{ message: string; userId: string }>(`/users/${userId}`, {
      method: "DELETE",
      accessToken,
    });
  },

  resendMagicLink(accessToken: string, userId: string) {
    return request<UserActionResponse>(`/users/${userId}/resend-magic-link`, {
      method: "POST",
      accessToken,
    });
  },

  resetPasswordLink(accessToken: string, userId: string) {
    return request<UserActionResponse>(`/users/${userId}/reset-password-link`, {
      method: "POST",
      accessToken,
    });
  },

  getMappingStatus(accessToken: string) {
    return request<MappingStatusSummary>("/trend/mapping-status", {
      accessToken,
    });
  },

  getAllPoints(accessToken: string, status?: string) {
    const params = status ? `?status=${status}` : "";
    return request<PointSnapshot[]>(`/trend/all-points${params}`, {
      accessToken,
    });
  },

  getTrendByDisplayName(
    accessToken: string,
    displayName: string,
    startDate?: string,
    endDate?: string,
  ) {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<TrendRecord[]>(
      `/trend/history/${encodeURIComponent(displayName)}${qs}`,
      { accessToken },
    );
  },

  getTrendByPointKey(
    accessToken: string,
    pointKey: number,
    startDate?: string,
    endDate?: string,
  ) {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<TrendRecord[]>(`/trend/history/point/${pointKey}${qs}`, {
      accessToken,
    });
  },

  getSnapshot(accessToken: string, displayName: string) {
    return request<PointSnapshot>(`/trend/snapshot/${encodeURIComponent(displayName)}`, {
      accessToken,
    });
  },

  getRemarks(accessToken: string, displayName: string) {
    return request<RemarkLogRecord[]>(`/remarks/${encodeURIComponent(displayName)}`, {
      accessToken,
    });
  },

  getPointResourceSummary(accessToken: string) {
    return request<PointResourceSummary[]>("/remarks/summary", {
      accessToken,
    });
  },

  createRemark(
    accessToken: string,
    payload: {
      displayName: string;
      pointKey?: number;
      indexCode?: string;
      message: string;
      attachmentIds?: string[];
    },
  ) {
    return request<RemarkLogRecord>("/remarks", {
      method: "POST",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  updateRemark(accessToken: string, remarkId: string, message: string) {
    return request<RemarkLogRecord>(`/remarks/${remarkId}`, {
      method: "PATCH",
      accessToken,
      body: JSON.stringify({ message }),
    });
  },

  deleteRemark(accessToken: string, remarkId: string) {
    return request<{ success: boolean; id: string }>(`/remarks/${remarkId}`, {
      method: "DELETE",
      accessToken,
    });
  },

  getAttachments(accessToken: string, displayName: string) {
    return request<AttachmentRecord[]>(`/attachments/${encodeURIComponent(displayName)}`, {
      accessToken,
    });
  },

  uploadAttachment(
    accessToken: string,
    payload: {
      displayName: string;
      pointKey?: number;
      indexCode?: string;
      file: File;
    },
  ) {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("displayName", payload.displayName);
    if (payload.pointKey !== undefined) {
      formData.append("pointKey", String(payload.pointKey));
    }
    if (payload.indexCode) {
      formData.append("indexCode", payload.indexCode);
    }

    return request<AttachmentRecord>("/attachments", {
      method: "POST",
      accessToken,
      body: formData,
    });
  },

  downloadAttachment(accessToken: string, attachmentId: string) {
    return requestBlob(`/attachments/file/${attachmentId}`, {
      accessToken,
    });
  },

  deleteAttachment(accessToken: string, attachmentId: string) {
    return request<{ success: boolean; id: string }>(`/attachments/${attachmentId}`, {
      method: "DELETE",
      accessToken,
    });
  },

  exportPointsReport(accessToken: string, points: PointExportPayload[]) {
    return requestBlob("/reports/points-export", {
      method: "POST",
      accessToken,
      body: JSON.stringify({ points }),
    });
  },

  uploadBmsImportBatch(
    accessToken: string,
    payload: {
      file: File;
      notes?: string;
    },
  ) {
    const formData = new FormData();
    formData.append("file", payload.file);
    if (payload.notes?.trim()) {
      formData.append("notes", payload.notes.trim());
    }

    return request<UploadBmsImportResponse>("/bms-import/batches", {
      method: "POST",
      accessToken,
      body: formData,
    });
  },

  listBmsImportBatches(
    accessToken: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ) {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    const qs = params.toString() ? `?${params.toString()}` : "";

    return request<BmsImportBatchListResponse>(`/bms-import/batches${qs}`, {
      accessToken,
    });
  },

  getBmsImportBatch(accessToken: string, batchId: string) {
    return request<BmsImportBatchDetailResponse>(`/bms-import/batches/${batchId}`, {
      accessToken,
    });
  },

  updateBmsImportBatch(
    accessToken: string,
    batchId: string,
    payload: {
      isActive?: boolean;
    },
  ) {
    return request<UpdateBmsImportBatchResponse>(`/bms-import/batches/${batchId}`, {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  deleteBmsImportBatch(accessToken: string, batchId: string) {
    return request<DeleteBmsImportBatchResponse>(`/bms-import/batches/${batchId}`, {
      method: "DELETE",
      accessToken,
    });
  },

  listBmsImportPoints(
    accessToken: string,
    batchId: string,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      sheetName?: string;
      normalizationStatus?: "normalized" | "invalid";
      matchStatus?:
        | "pending"
        | "matched"
        | "wrong_index_code"
        | "point_address_mismatch"
        | "not_found";
    },
  ) {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    if (options?.search?.trim()) params.set("search", options.search.trim());
    if (options?.sheetName?.trim()) params.set("sheetName", options.sheetName.trim());
    if (options?.normalizationStatus) {
      params.set("normalizationStatus", options.normalizationStatus);
    }
    if (options?.matchStatus) {
      params.set("matchStatus", options.matchStatus);
    }
    const qs = params.toString() ? `?${params.toString()}` : "";

    return request<MappingPointListResponse>(`/bms-import/batches/${batchId}/points${qs}`, {
      accessToken,
    });
  },

  listBmsMasterPoints(
    accessToken: string,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      sourceBatchId?: string;
      warningStatus?:
        | "duplicate_display_name"
        | "duplicate_bacnet_key"
        | "obix_snapshot_ambiguous"
        | "none";
      mappingStatus?:
        | "matched"
        | "obix_only"
        | "import_only";
      matchStatus?:
        | "pending"
        | "matched"
        | "wrong_index_code"
        | "point_address_mismatch"
        | "not_found";
      sortBy?:
        | "displayName"
        | "bacnetKey"
        | "controllerName"
        | "objectId"
        | "mappingStatus"
        | "matchStatus"
        | "sourceBatchFileName";
      sortDirection?: "asc" | "desc";
    },
  ) {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    if (options?.search?.trim()) params.set("search", options.search.trim());
    if (options?.sourceBatchId?.trim()) {
      params.set("sourceBatchId", options.sourceBatchId.trim());
    }
    if (options?.warningStatus) {
      params.set("warningStatus", options.warningStatus);
    }
    if (options?.mappingStatus) {
      params.set("mappingStatus", options.mappingStatus);
    }
    if (options?.matchStatus) {
      params.set("matchStatus", options.matchStatus);
    }
    if (options?.sortBy) {
      params.set("sortBy", options.sortBy);
    }
    if (options?.sortDirection) {
      params.set("sortDirection", options.sortDirection);
    }
    const qs = params.toString() ? `?${params.toString()}` : "";

    return request<MappingPointListResponse>(`/bms-import/master-points${qs}`, {
      accessToken,
    });
  },

  listBmsImportPointSources(
    accessToken: string,
    options: {
      displayName: string;
      batchId?: string;
    },
  ) {
    const params = new URLSearchParams();
    params.set("displayName", options.displayName);
    if (options.batchId?.trim()) {
      params.set("batchId", options.batchId.trim());
    }

    return request<ImportPointSourcesResponse>(
      `/bms-import/import-point-sources?${params.toString()}`,
      {
        accessToken,
      },
    );
  },

  runBmsImportBatchMatch(
    accessToken: string,
    batchId: string,
    options?: {
      ivivaSourceId?: string;
    },
  ) {
    return request<RunBmsImportMatchResponse>(`/bms-import/batches/${batchId}/match`, {
      method: "POST",
      accessToken,
      body: JSON.stringify(
        options?.ivivaSourceId ? { ivivaSourceId: options.ivivaSourceId } : {},
      ),
    });
  },

  createObixSourceConfig(
    accessToken: string,
    payload: {
      name: string;
      basePath: string;
      username?: string;
      password?: string;
      enabled?: boolean;
      includePatterns?: string[];
      excludePatterns?: string[];
      refreshMode?: "manual" | "scheduled";
      refreshIntervalMinutes?: number;
    },
  ) {
    return request<ObixSourceConfigResponse>("/bms-import/obix-sources", {
      method: "POST",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  listObixSourceConfigs(
    accessToken: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ) {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    const qs = params.toString() ? `?${params.toString()}` : "";

    return request<ObixSourceConfigListResponse>(`/bms-import/obix-sources${qs}`, {
      accessToken,
    });
  },

  updateObixSourceConfig(
    accessToken: string,
    sourceId: string,
    payload: {
      name?: string;
      basePath?: string;
      username?: string;
      password?: string;
      enabled?: boolean;
      includePatterns?: string[];
      excludePatterns?: string[];
      refreshMode?: "manual" | "scheduled";
      refreshIntervalMinutes?: number;
    },
  ) {
    return request<ObixSourceConfigResponse>(`/bms-import/obix-sources/${sourceId}`, {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  discoverObixSource(accessToken: string, sourceId: string) {
    return request<DiscoverObixSourceResponse>(
      `/bms-import/obix-sources/${sourceId}/discover`,
      {
        method: "POST",
        accessToken,
      },
    );
  },

  deleteObixSourceConfig(accessToken: string, sourceId: string) {
    return request<DeleteObixSourceResponse>(`/bms-import/obix-sources/${sourceId}`, {
      method: "DELETE",
      accessToken,
    });
  },

  createIvivaSourceConfig(
    accessToken: string,
    payload: {
      name: string;
      server: string;
      database: string;
      username: string;
      password: string;
      queryText: string;
      enabled?: boolean;
      refreshMode?: "manual" | "scheduled";
      refreshIntervalMinutes?: number;
    },
  ) {
    return request<IvivaSourceConfigResponse>("/bms-import/iviva-sources", {
      method: "POST",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  listIvivaSourceConfigs(
    accessToken: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ) {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    const qs = params.toString() ? `?${params.toString()}` : "";

    return request<IvivaSourceConfigListResponse>(`/bms-import/iviva-sources${qs}`, {
      accessToken,
    });
  },

  updateIvivaSourceConfig(
    accessToken: string,
    sourceId: string,
    payload: {
      name?: string;
      server?: string;
      database?: string;
      username?: string;
      password?: string;
      queryText?: string;
      enabled?: boolean;
      refreshMode?: "manual" | "scheduled";
      refreshIntervalMinutes?: number;
    },
  ) {
    return request<IvivaSourceConfigResponse>(`/bms-import/iviva-sources/${sourceId}`, {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(payload),
    });
  },

  syncIvivaSource(accessToken: string, sourceId: string) {
    return request<SyncIvivaSourceResponse>(`/bms-import/iviva-sources/${sourceId}/sync`, {
      method: "POST",
      accessToken,
    });
  },

  deleteIvivaSourceConfig(accessToken: string, sourceId: string) {
    return request<DeleteIvivaSourceResponse>(`/bms-import/iviva-sources/${sourceId}`, {
      method: "DELETE",
      accessToken,
    });
  },
};
