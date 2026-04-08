import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import oneBangkokLogo from "../../assets/one-bangkok-logo.png";

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "editor" | "viewer">;
}) {
  const location = useLocation();
  const { status, isAuthenticated, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
        <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900">
          <img
            src={oneBangkokLogo}
            alt="One Bangkok"
            className="h-8 w-auto object-contain dark:invert dark:contrast-200 dark:opacity-95"
          />
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Restoring secure session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from: redirectTo }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
