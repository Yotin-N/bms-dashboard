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
};
