export interface StoredAuthSession {
  accessToken: string;
  expiresAt: string;
  user?: {
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
  };
}

const STORAGE_KEY = "bms-dashboard.auth.session";

export function loadStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredAuthSession(session: StoredAuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
