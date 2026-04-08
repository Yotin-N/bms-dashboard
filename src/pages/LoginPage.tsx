import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import oneBangkokLogo from "../assets/one-bangkok-logo.png";
import oneBangkokBuilding from "../assets/one-bangkok-building.jpg";
import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "../services/api";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to sign in right now.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, status } = useAuth();
  const redirectTo = useMemo(
    () => (location.state as { from?: string } | null)?.from || "/",
    [location.state],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await login(email, password);
      if ("requiresPasswordChange" in response) {
        navigate(`/set-password?setupToken=${encodeURIComponent(response.passwordSetupToken)}`, {
          replace: true,
          state: {
            user: response.user,
          },
        });
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${oneBangkokBuilding})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <img
              src={oneBangkokLogo}
              alt="One Bangkok"
              className="mx-auto h-10 w-auto object-contain invert"
            />
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 transition focus-within:border-white/40 focus-within:bg-white/10">
                <Mail className="h-5 w-5 text-white/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-white/50"
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 transition focus-within:border-white/40 focus-within:bg-white/10">
                <LockKeyhole className="h-5 w-5 text-white/60" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-white/50"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/20 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || status === "loading"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-slate-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
