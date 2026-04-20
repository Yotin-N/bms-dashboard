import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Edit3,
  KeyRound,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useSearchParams } from "react-router-dom";
import {
  ApiError,
  api,
  type AuthUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "../services/api";

type SettingsFilter = "all" | "active" | "inactive" | "pending";

type InviteFormState = CreateUserPayload;
type EditFormState = UpdateUserPayload;

const DEFAULT_FORM: InviteFormState = {
  email: "",
  firstName: "",
  lastName: "",
  company: "",
  phoneNumber: "",
  role: "viewer",
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div className="text-slate-400 dark:text-slate-500">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function formatLastLogin(value: string | null) {
  if (!value) return "Never";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Never";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { accessToken, user, reloadUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SettingsFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<InviteFormState>(DEFAULT_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    firstName: "",
    lastName: "",
    company: "",
    phoneNumber: "",
    role: "viewer",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [temporaryCredential, setTemporaryCredential] = useState<{
    email: string;
    password: string;
    mode: "create" | "reset";
  } | null>(null);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const loadUsers = async () => {
    if (!accessToken || !isAdmin) return;
    setLoadingUsers(true);
    try {
      const nextUsers = await api.listUsers(accessToken);
      setUsers(nextUsers);
    } catch (error) {
      setPageMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [accessToken, isAdmin]);

  useEffect(() => {
    if (searchParams.get("edit") !== "self" || !user) return;
    openEditModal(user);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("edit");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, user]);

  useEffect(() => {
    if (!openActionMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-settings-action-menu]")) return;
      setOpenActionMenuId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openActionMenuId]);

  useEffect(() => {
    if (!pageMessage) return;
    const timeout = window.setTimeout(() => {
      setPageMessage(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [pageMessage]);

  const stats = useMemo(() => {
    const active = users.filter((entry) => entry.isActive).length;
    const pending = users.filter((entry) => !entry.isPasswordSet).length;
    const editors = users.filter((entry) => entry.role === "editor").length;
    return {
      total: users.length,
      active,
      pending,
      editors,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return users.filter((entry) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "active"
            ? entry.isActive
            : filter === "inactive"
              ? !entry.isActive
              : !entry.isPasswordSet;

      if (!matchesFilter) return false;
      if (!normalized) return true;

      return [
        entry.firstName,
        entry.lastName,
        entry.email,
        entry.company,
        entry.phoneNumber,
        entry.role,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [filter, search, users]);

  const displayedUsers = useMemo(() => {
    if (isAdmin) return filteredUsers;
    return user ? [user] : [];
  }, [filteredUsers, isAdmin, user]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setPageMessage({ type: "success", text: "Temporary password copied." });
    } catch {
      setPageMessage({ type: "error", text: "Unable to copy to clipboard." });
    }
  };

  const openEditModal = (entry: AuthUser) => {
    setEditTarget(entry);
    setEditForm({
      firstName: entry.firstName,
      lastName: entry.lastName,
      company: entry.company,
      phoneNumber: entry.phoneNumber,
      role: entry.role,
    });
    setEditError(null);
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditTarget(null);
    setEditError(null);
  };

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    setFormSubmitting(true);
    setFormError(null);
    setPageMessage(null);

    try {
      const response = await api.createUser(accessToken, form);
      setForm(DEFAULT_FORM);
      setInviteOpen(false);
      setShowTemporaryPassword(false);
      setTemporaryCredential(
        response.temporaryPassword
          ? {
              email: form.email,
              password: response.temporaryPassword,
              mode: "create",
            }
          : null,
      );
      setPageMessage({ type: "success", text: response.message });
      await loadUsers();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setFormSubmitting(false);
    }
  };

  const runUserAction = async (
    key: string,
    action: () => Promise<{ message: string; temporaryPassword?: string }>,
    entry: AuthUser,
    mode?: "reset",
  ) => {
    setActionKey(key);
    setPageMessage(null);

    try {
      const response = await action();
      if (response.temporaryPassword) {
        setShowTemporaryPassword(false);
        setTemporaryCredential({
          email: entry.email,
          password: response.temporaryPassword,
          mode: mode || "reset",
        });
      } else {
        setTemporaryCredential(null);
      }
      setPageMessage({ type: "success", text: response.message });
      await loadUsers();
    } catch (error) {
      setPageMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setActionKey(null);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !editTarget) return;

    setEditSubmitting(true);
    setEditError(null);
    setPageMessage(null);

    try {
      const payload: UpdateUserPayload = {
        firstName: editForm.firstName?.trim(),
        lastName: editForm.lastName?.trim(),
        company: editForm.company?.trim(),
        phoneNumber: editForm.phoneNumber?.trim(),
      };

      const isSelf = editTarget.id === user?.id;
      if (!isSelf && isAdmin) {
        payload.role = editForm.role;
      }

      const response = isSelf
        ? await api.updateMe(accessToken, payload)
        : await api.updateUser(accessToken, editTarget.id, payload);

      setPageMessage({ type: "success", text: response.message });
      closeEditModal();
      await loadUsers();
      if (isSelf) {
        await reloadUser();
      }
    } catch (error) {
      setEditError(getErrorMessage(error));
    } finally {
      setEditSubmitting(false);
    }
  };

  const openDeleteModal = (entry: AuthUser) => {
    setOpenActionMenuId(null);
    setDeleteConfirmText("");
    setDeleteTarget(entry);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteConfirmText("");
  };

  const handleDeleteUser = async () => {
    if (!accessToken) return;
    if (!deleteTarget) return;
    if (deleteConfirmText.trim().toLowerCase() !== "delete") return;

    setActionKey(`${deleteTarget.id}:delete`);
    setPageMessage(null);

    try {
      const response = await api.deleteUser(accessToken, deleteTarget.id);
      setPageMessage({ type: "success", text: response.message });
      closeDeleteModal();
      await loadUsers();
    } catch (error) {
      setPageMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setActionKey(null);
    }
  };

  return (
    <>
    <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-5 dark:bg-slate-950">
      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4">
        {isAdmin ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total users" value={stats.total} icon={<Users className="h-4 w-4" />} />
            <StatTile label="Active" value={stats.active} icon={<BadgeCheck className="h-4 w-4" />} />
            <StatTile label="Pending" value={stats.pending} icon={<Mail className="h-4 w-4" />} />
            <StatTile label="Editors" value={stats.editors} icon={<ShieldCheck className="h-4 w-4" />} />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  My Profile
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => user && openEditModal(user)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-200/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700/80 dark:hover:border-slate-600"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            </div>
          </div>
        )}

        <section className="flex min-h-[calc(100vh-220px)] flex-1 flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/50">
            <div className="flex-1 overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/60">
                    <th colSpan={isAdmin ? 8 : 7} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="relative w-56">
                            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input
                              value={search}
                              onChange={(event) => setSearch(event.target.value)}
                              placeholder="Search users..."
                              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-700 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                            />
                          </div>

                          <div className="flex gap-1.5">
                            {([
                              ["all", "All"],
                              ["active", "Active"],
                              ["inactive", "Inactive"],
                              ["pending", "Pending"],
                            ] as const).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setFilter(value)}
                              className={`flex h-8 items-center rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                                  filter === value
                                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-slate-100"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setInviteOpen(true);
                              setFormError(null);
                            }}
                            className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-200/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700/80 dark:hover:border-slate-600"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Invite
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/50">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Company
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Role
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Phone
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Last Login
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Loading...
                      </td>
                    </tr>
                  ) : displayedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    displayedUsers.map((entry) => {
                      const isSelf = entry.id === user?.id;
                      const pending = !entry.isPasswordSet;

                      return (
                        <tr
                          key={entry.id}
                          className="h-[62px] even:bg-slate-50/50 dark:even:bg-slate-900/30 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                {entry.firstName} {entry.lastName}
                              </div>
                              {isSelf && (
                                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="truncate text-[11px] text-slate-600 dark:text-slate-400">
                              {entry.email}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="truncate text-[11px] text-slate-600 dark:text-slate-400">
                              {entry.company || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {entry.role}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              {entry.phoneNumber || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              {formatLastLogin(entry.lastLoginAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-1.5">
                              {!entry.isActive && (
                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Paused
                                </span>
                              )}
                              {pending && (
                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Pending
                                </span>
                              )}
                              {entry.isActive && !pending && (
                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Active
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex justify-end gap-1.5">
                              {(isAdmin || isSelf) && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(entry)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  title={isSelf ? "Edit profile" : "Edit user"}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {isAdmin ? (
                                <div className="relative" data-settings-action-menu>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenActionMenuId((current) =>
                                        current === entry.id ? null : entry.id,
                                      )
                                    }
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    title="More actions"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>

                                  {openActionMenuId === entry.id ? (
                                    <div className="absolute right-0 top-10 z-20 min-w-[170px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
                                      <button
                                        type="button"
                                        disabled={actionKey === `${entry.id}:activate` || actionKey === `${entry.id}:deactivate` || isSelf}
                                        onClick={() => {
                                          if (!accessToken) return;
                                          setOpenActionMenuId(null);
                                          if (entry.isActive) {
                                            void runUserAction(
                                              `${entry.id}:deactivate`,
                                              () => api.deactivateUser(accessToken, entry.id),
                                              entry,
                                            );
                                          } else {
                                            void runUserAction(
                                              `${entry.id}:activate`,
                                              () => api.activateUser(accessToken, entry.id),
                                              entry,
                                            );
                                          }
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        {entry.isActive ? "Pause user" : "Activate user"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={actionKey === `${entry.id}:reset`}
                                        onClick={() => {
                                          if (!accessToken) return;
                                          setOpenActionMenuId(null);
                                          void runUserAction(
                                            `${entry.id}:reset`,
                                            () => api.resetPasswordLink(accessToken, entry.id),
                                            entry,
                                            "reset",
                                          );
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                      >
                                        <KeyRound className="h-3.5 w-3.5" />
                                        Reset password
                                      </button>
                                      <button
                                        type="button"
                                        disabled={actionKey === `${entry.id}:delete` || isSelf}
                                        onClick={() => openDeleteModal(entry)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete user
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* Invite User Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invite User</h2>
              <button
                onClick={() => {
                  setInviteOpen(false);
                  setFormError(null);
                  setForm(DEFAULT_FORM);
                }}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      First Name
                    </label>
                    <input
                      value={form.firstName}
                      onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                      placeholder="Enter first name"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Last Name
                    </label>
                    <input
                      value={form.lastName}
                      onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                      placeholder="Enter last name"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Enter email address"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Company
                  </label>
                  <input
                    value={form.company}
                    onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                    placeholder="Enter company name"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    value={form.phoneNumber}
                    onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    placeholder="Enter phone number"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          role: event.target.value as CreateUserPayload["role"],
                        }))
                      }
                      className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>

                {formError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {formError}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setInviteOpen(false);
                    setFormError(null);
                    setForm(DEFAULT_FORM);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {temporaryCredential ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Temporary Password
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Share this password with {temporaryCredential.email} and ask them to change it on first login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemporaryCredential(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Close temporary password"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                This password will only be shown once. Copy it before closing this dialog.
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium tracking-wider text-slate-500 dark:text-slate-400">
                  {temporaryCredential.mode === "create" ? "Created user" : "Password reset for"}
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {temporaryCredential.email}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="text-[11px] font-medium tracking-wider text-slate-500 dark:text-slate-400">
                  Temporary password
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <code className="min-w-0 overflow-x-auto whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {showTemporaryPassword
                      ? temporaryCredential.password
                      : "*".repeat(Math.max(8, temporaryCredential.password.length))}
                  </code>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTemporaryPassword((current) => !current)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {showTemporaryPassword ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Show
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(temporaryCredential.password)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setTemporaryCredential(null)}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pageMessage ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[90]">
          <div
            className={`pointer-events-auto min-w-[240px] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/10 dark:shadow-black/30 ${
              pageMessage.type === "success"
                ? "border-emerald-200 bg-white text-slate-700 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-slate-200"
                : "border-red-200 bg-white text-slate-700 dark:border-red-900/40 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={`text-[11px] font-medium uppercase tracking-wider ${
                    pageMessage.type === "success"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {pageMessage.type === "success" ? "Success" : "Error"}
                </div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{pageMessage.text}</div>
              </div>
              <button
                type="button"
                onClick={() => setPageMessage(null)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Dismiss feedback"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {editTarget.id === user?.id ? "Edit Profile" : "Edit User"}
                </h2>

              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      First Name
                    </label>
                    <input
                      value={editForm.firstName || ""}
                      onChange={(event) => setEditForm((current) => ({ ...current, firstName: event.target.value }))}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Last Name
                    </label>
                    <input
                      value={editForm.lastName || ""}
                      onChange={(event) => setEditForm((current) => ({ ...current, lastName: event.target.value }))}
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
                    value={editForm.company || ""}
                    onChange={(event) => setEditForm((current) => ({ ...current, company: event.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    value={editForm.phoneNumber || ""}
                    onChange={(event) => setEditForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                    required
                  />
                </div>

                {isAdmin && editTarget.id !== user?.id ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Role
                    </label>
                    <div className="relative">
                      <select
                        value={editForm.role || "viewer"}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            role: event.target.value as CreateUserPayload["role"],
                          }))
                        }
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                ) : null}

                {editError ? (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {editError}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Delete User
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  This action permanently removes the account.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                You are deleting <span className="font-semibold">{deleteTarget.firstName} {deleteTarget.lastName}</span>.
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Type <span className="font-semibold text-slate-700 dark:text-slate-200">delete</span> to confirm
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="delete"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText.trim().toLowerCase() !== "delete" || actionKey === `${deleteTarget.id}:delete`}
                  onClick={() => void handleDeleteUser()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400"
                >
                  {actionKey === `${deleteTarget.id}:delete` ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
