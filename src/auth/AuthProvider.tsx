import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ApiError,
  authApi,
  type AuthSuccessResponse,
  type AuthUser,
  type LoginResponse,
} from "../services/api";
import {
  clearStoredAuthSession,
  loadStoredAuthSession,
  saveStoredAuthSession,
  type StoredAuthSession,
} from "../services/authStorage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  accessToken: string | null;
  expiresAt: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  refreshSession: () => Promise<string>;
  reloadUser: () => Promise<AuthUser | null>;
  consumeMagicLink: (token: string) => ReturnType<typeof authApi.consumeMagicLink>;
  setInitialPassword: (
    passwordSetupToken: string,
    newPassword: string,
  ) => Promise<AuthSuccessResponse>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isExpired(expiresAt: string) {
  return Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now();
}

function createStoredSession(response: AuthSuccessResponse): StoredAuthSession {
  return {
    accessToken: response.accessToken,
    expiresAt: response.expiresAt,
    user: response.user,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    loadStoredAuthSession()?.accessToken ? "loading" : "unauthenticated",
  );
  const [session, setSession] = useState<StoredAuthSession | null>(() =>
    loadStoredAuthSession(),
  );
  const refreshPromiseRef = useRef<Promise<string> | null>(null);
  const sessionRef = useRef<StoredAuthSession | null>(session);

  const applySession = useCallback((nextSession: StoredAuthSession) => {
    sessionRef.current = nextSession;
    saveStoredAuthSession(nextSession);
    setSession(nextSession);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    sessionRef.current = null;
    refreshPromiseRef.current = null;
    clearStoredAuthSession();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const stored = loadStoredAuthSession();
    if (!stored?.accessToken) {
      setStatus("unauthenticated");
      return;
    }

    if (isExpired(stored.expiresAt)) {
      logout();
      return;
    }

    let isMounted = true;

    authApi
      .getMe(stored.accessToken)
      .then((user) => {
        if (!isMounted) return;
        applySession({
          ...stored,
          user,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        logout();
      });

    return () => {
      isMounted = false;
    };
  }, [applySession, logout]);

  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const currentSession = sessionRef.current;
    if (!currentSession?.accessToken) {
      logout();
      throw new ApiError("No active session", 401, null, null);
    }

    const refreshPromise = authApi
      .refresh(currentSession.accessToken)
      .then((response) => {
        const nextSession = createStoredSession(response);
        applySession(nextSession);
        return response.accessToken;
      })
      .catch((error) => {
        logout();
        throw error;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [applySession, logout]);

  const reloadUser = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession?.accessToken) {
      logout();
      return null;
    }

    try {
      const user = await authApi.getMe(currentSession.accessToken);
      applySession({
        ...currentSession,
        user,
      });
      return user;
    } catch (error) {
      logout();
      throw error;
    }
  }, [applySession, logout]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.expiresAt) return;

    const expiresAtMs = Date.parse(session.expiresAt);
    if (Number.isNaN(expiresAtMs)) {
      logout();
      return;
    }

    const refreshLeadMs = 5 * 60 * 1000;
    const timeoutMs = Math.max(5_000, expiresAtMs - Date.now() - refreshLeadMs);

    const timeoutId = window.setTimeout(() => {
      void refreshSession().catch(() => {
        logout();
      });
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [logout, refreshSession, session?.expiresAt, status]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const currentSession = sessionRef.current;
      if (
        document.visibilityState !== "visible" ||
        !currentSession?.expiresAt ||
        status !== "authenticated"
      ) {
        return;
      }

      if (Date.parse(currentSession.expiresAt) - Date.now() < 2 * 60 * 1000) {
        void refreshSession().catch(() => {
          logout();
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [logout, refreshSession, status]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password);
      if ("accessToken" in response) {
        applySession(createStoredSession(response));
      }
      return response;
    },
    [applySession],
  );

  const setInitialPassword = useCallback(
    async (passwordSetupToken: string, newPassword: string) => {
      const response = await authApi.setInitialPassword(passwordSetupToken, newPassword);
      applySession(createStoredSession(response));
      return response;
    },
    [applySession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      accessToken: session?.accessToken || null,
      expiresAt: session?.expiresAt || null,
      user: session?.user || null,
      isAuthenticated: status === "authenticated" && !!session?.accessToken,
      login,
      logout,
      refreshSession,
      reloadUser,
      consumeMagicLink: authApi.consumeMagicLink,
      setInitialPassword,
    }),
    [
      login,
      logout,
      refreshSession,
      reloadUser,
      session?.accessToken,
      session?.expiresAt,
      session?.user,
      setInitialPassword,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
