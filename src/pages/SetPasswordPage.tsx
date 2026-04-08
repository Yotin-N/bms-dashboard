import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import oneBangkokLogo from "../assets/one-bangkok-logo.png";
import oneBangkokBuilding from "../assets/one-bangkok-building.jpg";
import { useAuth } from "../auth/AuthProvider";
import { ApiError, type AuthUser } from "../services/api";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete this action.";
}

export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { consumeMagicLink, setInitialPassword, isAuthenticated } = useAuth();
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const magicToken = useMemo(() => searchParams.get("token"), [searchParams]);
  const setupTokenParam = useMemo(() => searchParams.get("setupToken"), [searchParams]);
  const preloadedUser = (location.state as { user?: AuthUser } | null)?.user ?? null;

  useEffect(() => {
    if (setupTokenParam) {
      setSetupToken(setupTokenParam);
      setUser(preloadedUser);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    if (!magicToken) {
      setLoading(false);
      setErrorMessage("This magic link is missing its token.");
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    consumeMagicLink(magicToken)
      .then((response) => {
        if (!active) return;
        setSetupToken(response.passwordSetupToken);
        setUser(response.user);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [consumeMagicLink, magicToken, preloadedUser, setupTokenParam]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!setupToken) return;

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await setInitialPassword(setupToken, password);
      navigate("/", { replace: true });
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

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 text-sm text-white/80">
            <Loader2 className="h-5 w-5 animate-spin" />
            Validating your magic link...
          </div>
        ) : errorMessage ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-400/30 bg-red-500/20 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
            <Link
              to="/login"
              className="inline-flex text-sm font-medium text-white/80 underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {user ? (
              <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-white/60">
                      {user.email} · {user.company}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 transition focus-within:border-white/40 focus-within:bg-white/10">
                  <LockKeyhole className="h-5 w-5 text-white/60" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-white/50"
                    placeholder="Choose a strong password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 transition focus-within:border-white/40 focus-within:bg-white/10">
                  <LockKeyhole className="h-5 w-5 text-white/60" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-white/50"
                    placeholder="Retype the password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/20 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || !setupToken}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-slate-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Password
              </button>
            </form>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
