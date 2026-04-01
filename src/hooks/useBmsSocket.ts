import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useBmsStore } from "../store/bmsStore";
import type {
  ConnectedPayload,
  SnapshotPayload,
  DeltaPayload,
  MappingFilter,
} from "../types/bms";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3001";
const NAMESPACE = "/bms";

export function useBmsSocket(filter: MappingFilter = "ALL") {
  const socketRef = useRef<Socket | null>(null);
  const { setStatus, setClientId, applySnapshot, applyDelta, clearChangedKeys } =
    useBmsStore();

  useEffect(() => {
    setStatus("connecting");

    const socket = io(`${GATEWAY_URL}${NAMESPACE}`, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
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
  }, [filter]);

  return socketRef;
}
