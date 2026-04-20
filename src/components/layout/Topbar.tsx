import { Menu, LogOut, Loader2, UserCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useBmsStore } from "../../store/bmsStore";
import { useAuth } from "../../auth/AuthProvider";
import oneBangkokLogo from "../../assets/one-bangkok-logo.png";
import { api, ApiError } from "../../services/api";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const status = useBmsStore((s) => s.status);
  const lastUpdate = useBmsStore((s) => s.lastUpdate);
  const { accessToken, user, logout, reloadUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    phoneNumber: "",
  });

  const isSettingsPage = location.pathname === "/settings";
  const isBmsImportPage = location.pathname === "/bms-import";
  const isMappingDashboardPage = location.pathname === "/mapping-dashboard";

  const statusConfig = {
    connected: { dot: "bg-emerald-500", label: "Connected" },
    connecting: { dot: "bg-amber-500 animate-pulse", label: "Connecting..." },
    reconnecting: { dot: "bg-amber-500 animate-pulse", label: "Reconnecting..." },
    disconnected: { dot: "bg-red-500", label: "Disconnected" },
  }[status];

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!profileOpen || !user) return;
    setProfileForm({
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      phoneNumber: user.phoneNumber,
    });
    setProfileError(null);
  }, [profileOpen, user]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      await api.updateMe(accessToken, {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        company: profileForm.company.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
      });
      await reloadUser();
      setProfileOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setProfileError(error.message);
      } else if (error instanceof Error) {
        setProfileError(error.message);
      } else {
        setProfileError("Unable to update profile.");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 px-3 sm:px-4 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      {/* Left: Menu toggle (mobile) + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img
          src={oneBangkokLogo}
          alt="One Bangkok"
          className="h-5 w-auto object-contain dark:invert dark:contrast-200 dark:opacity-95 sm:h-6"
        />
      </div>

      {/* Right: Status + Last update + User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection Status - Hidden on Settings and BMS Import pages */}
        {!isSettingsPage && !isBmsImportPage && !isMappingDashboardPage && (
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800 sm:flex">
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {statusConfig.label}
            </span>
          </div>
        )}

        {/* Last Update - Hidden on Settings page */}
        {!isSettingsPage && lastUpdate && (
          <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-500">
            Last: {new Date(lastUpdate).toLocaleTimeString([], {
              timeZone: BANGKOK_TIME_ZONE,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((current) => !current)}
            className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
            title="Open user menu"
          >
            <UserCircle className="h-5 w-5" />
            {user ? (
              <span className="hidden text-left lg:block">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  {user.firstName} {user.lastName}
                </span>
              </span>
            ) : null}
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-11 z-30 min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setProfileOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <UserCircle className="h-3.5 w-3.5" />
                My Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
    {profileOpen ? (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                My Profile
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Update your account details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleProfileSubmit} className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    First Name
                  </label>
                  <input
                    value={profileForm.firstName}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Last Name
                  </label>
                  <input
                    value={profileForm.lastName}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, lastName: event.target.value }))
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Company
                </label>
                <input
                  value={profileForm.company}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, company: event.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <input
                  value={profileForm.phoneNumber}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />
              </div>

              {profileError ? (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  {profileError}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
    </>
  );
}
