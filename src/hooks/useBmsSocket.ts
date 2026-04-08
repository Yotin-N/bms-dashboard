import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useBmsStore } from "../store/bmsStore";
import { useAuth } from "../auth/AuthProvider";
import type {
  ConnectedPayload,
  SnapshotPayload,
  DeltaPayload,
  MappingFilter,
} from "../types/bms";
import { getSocketBaseUrl } from "../services/config";

const SOCKET_BASE_URL = getSocketBaseUrl();

export function useBmsSocket(filter: MappingFilter = "ALL") {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, refreshSession, logout, isAuthenticated } = useAuth();
  const { setStatus, setClientId, applySnapshot, applyDelta, clearChangedKeys } =
    useBmsStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      auth: {
        token: accessToken,
      },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
    });

    socket.on("connected", (data: ConnectedPayload) => {
      setClientId(data.clientId);

      // Subscribe to dashboard with optional filter
      const payload = filter !== "ALL" ? { filter } : {};
      socket.emit("subscribe:dashboard", payload);
    });

    socket.on("points:snapshot", (data: SnapshotPayload) => {
      applySnapshot(data.points);
    });

    socket.on("points:delta", (data: DeltaPayload) => {
      applyDelta(data.points);

      // Clear highlight after animation
      setTimeout(() => {
        clearChangedKeys();
      }, 1500);
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    socket.on("auth:revalidate", async () => {
      try {
        const freshToken = await refreshSession();
        socket.emit("auth:refresh", { token: freshToken });
      } catch {
        socket.disconnect();
        logout();
      }
    });

    socket.on("auth:expired", () => {
      socket.disconnect();
      logout();
    });

    socket.on("connect_error", async (error) => {
      if (
        error.message.toLowerCase().includes("unauthorized") ||
        error.message.toLowerCase().includes("authentication")
      ) {
        try {
          const freshToken = await refreshSession();
          socket.auth = { token: freshToken };
          socket.connect();
        } catch {
          logout();
        }
      }
    });

    socket.io.on("reconnect_attempt", () => {
      setStatus("reconnecting");
    });

    socket.io.on("reconnect", () => {
      setStatus("connected");
    });

    return () => {
      socket.emit("unsubscribe");
      socket.disconnect();
      socketRef.current = null;
      setStatus("disconnected");
    };
  }, [
    accessToken,
    applyDelta,
    applySnapshot,
    clearChangedKeys,
    filter,
    isAuthenticated,
    logout,
    refreshSession,
    setClientId,
    setStatus,
  ]);

  return socketRef;
}
