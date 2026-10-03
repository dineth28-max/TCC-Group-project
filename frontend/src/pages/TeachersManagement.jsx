import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listUsers, createUser, updateUser, resetUserPassword } from "../api/users";
import { listBranches } from "../api/students";
import { Search, UserPlus } from "lucide-react";

const ROLE_TABS = ["Teacher", "Parent"];
const EMPTY_FORM = { fullName: "", email: "", branchId: "", password: "", phoneNumber: "", nationalId: "", address: "", dateOfJoining: "", subjects: "" };

function initials(name) {
  if (!name) return "TC";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeachersManagement() {
  const [role, setRole] = useState("Teacher");
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState(null);

  async function load() {
    try {
      setUsers(await listUsers({ role }));
    } catch (err) {
      setError(err.response?.data?.message || "Could not load accounts. Please refresh the page.");
    }
  }

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.subjects || "").toLowerCase().includes(term)
    );
  }, [users, search]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    listBranches()
      .then((data) => {
        setBranches(data);
        if (data.length > 0) setForm((f) => ({ ...f, branchId: String(data[0].id) }));
      })
      .catch(() => setBranches([]));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setTemporaryPassword(null);
    try {
      const { user, temporaryPassword: tempPassword } = await createUser({
        fullName: form.fullName,
        email: form.email,
        role,
        branchId: role === "Teacher" ? Number(form.branchId) : null,
        password: form.password || null,
        phoneNumber: role === "Teacher" ? form.phoneNumber || null : null,
        nationalId: role === "Teacher" ? form.nationalId || null : null,
        address: role === "Teacher" ? form.address || null : null,
        dateOfJoining: role === "Teacher" ? form.dateOfJoining || null : null,
        subjects: role === "Teacher" ? form.subjects || null : null,
      });
      setForm((f) => ({ ...EMPTY_FORM, branchId: f.branchId }));
      setMessage(`${user.fullName}'s account was created successfully.`);
      if (tempPassword) setTemporaryPassword({ name: user.fullName, password: tempPassword });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus(u) {
    const deactivating = u.status === "Active";
    if (deactivating && !window.confirm(`Deactivate ${u.fullName}? They will not be able to sign in until reactivated.`)) {
      return;
    }
    setActionId(u.id);
    setError(null);
    setMessage(null);
    try {
      await updateUser(u.id, {
        fullName: u.fullName,
        branchId: u.branchId,
        status: deactivating ? "Inactive" : "Active",
        phoneNumber: u.phoneNumber,
        nationalId: u.nationalId,
        address: u.address,
        dateOfJoining: u.dateOfJoining,
        subjects: u.subjects,
      });
      setMessage(`${u.fullName} was ${deactivating ? "deactivated" : "reactivated"}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || `Could not update ${u.fullName}.`);
    } finally {
      setActionId(null);
    }
  }

  async function handleReset(u) {
    if (!window.confirm(`Reset the password for ${u.fullName}? Their current password will stop working immediately.`)) {
      return;
    }
    setTemporaryPassword(null);
    setActionId(u.id);
    setError(null);
    setMessage(null);
    try {
      const res = await resetUserPassword(u.id);
      setMessage(res.message);
      if (res.temporaryPassword) setTemporaryPassword({ name: u.fullName, password: res.temporaryPassword });
    } catch (err) {
      setError(err.response?.data?.message || `Could not reset the password for ${u.fullName}.`);
    } finally {
      setActionId(null);
    }
  }

  return (
    <DashboardShell title="Staff & Accounts">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff & Stakeholder Accounts</h1>
          <p className="text-xs text-slate-500 mt-1">Manage teacher specializations, parent accounts, and authentication credentials</p>
        </div>

        {/* Role Toggle Pills */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          {ROLE_TABS.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                setSearch("");
                setTemporaryPassword(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                role === r
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r} Accounts
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C8FF3D] border border-emerald-600" />
          {message}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{error}</div>
      )}

      {temporaryPassword && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-6 text-sm">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            One-Time Temporary Password for {temporaryPassword.name}
          </p>
          <p className="font-mono text-base font-bold text-amber-900 mt-1.5 select-all">
            {temporaryPassword.password}
          </p>
          <p className="text-amber-700 text-xs mt-1">
            Copy and deliver securely. They will be prompted to choose their own password upon first sign in.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={role === "Teacher" ? "Search name, email or subject..." : "Search name or email..."}
                aria-label={`Search ${role.toLowerCase()} accounts`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:bg-white focus:border-[#2457FF]"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {visibleUsers.length} of {users.length} {role.toLowerCase()}s
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-5">Email</th>
                  {role === "Teacher" && <th className="py-3 px-5">Branch</th>}
                  {role === "Teacher" && <th className="py-3 px-5">Specialization</th>}
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                      {users.length === 0
                        ? `No ${role.toLowerCase()} accounts registered yet.`
                        : "No accounts match your search."}
                    </td>
                  </tr>
                ) : (
                  visibleUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-blue-50 text-[#2457FF] text-xs font-bold flex items-center justify-center shrink-0">
                            {initials(u.fullName)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{u.fullName}</div>
                            {u.mustChangePassword && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                                Pending setup
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-xs text-slate-500 font-medium">
                        {u.email}
                      </td>

                      {role === "Teacher" && (
                        <td className="py-3.5 px-5 text-xs text-slate-600 font-medium">
                          {branches.find((b) => b.id === u.branchId)?.name ?? "—"}
                        </td>
                      )}

                      {role === "Teacher" && (
                        <td className="py-3.5 px-5 text-xs text-slate-500 font-medium">
                          {u.subjects ?? "—"}
                        </td>
                      )}

                      <td className="py-3.5 px-5">
                        {u.status === "Active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#C8FF3D] border border-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleReset(u)}
                          disabled={actionId === u.id}
                          className="text-xs font-semibold text-[#2457FF] hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionId === u.id}
                          className={`text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                            u.status === "Active"
                              ? "text-slate-500 hover:text-red-600"
                              : "text-emerald-700 hover:underline"
                          }`}
                        >
                          {u.status === "Active" ? "Deactivate" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={18} className="text-[#2457FF]" />
            <h2 className="text-sm font-bold text-slate-900">New {role} Profile</h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label htmlFor="user-fullname" className="block text-xs font-semibold text-slate-600 mb-1">
                Full Name
              </label>
              <input
                id="user-fullname"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none transition"
                placeholder="Dr. Samantha Perera"
              />
            </div>

            <div>
              <label htmlFor="user-email" className="block text-xs font-semibold text-slate-600 mb-1">
                Email Address
              </label>
              <input
                id="user-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none transition"
                placeholder="teacher@institute.lk"
              />
            </div>

            <div>
              <label htmlFor="user-password" className="block text-xs font-semibold text-slate-600 mb-1">
                Initial Password <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="user-password"
                type="password"
                autoComplete="off"
                minLength={8}
                placeholder="Leave blank to auto-generate"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none transition"
              />
            </div>

            {role === "Teacher" && (
              <>
                <div>
                  <label htmlFor="user-branch" className="block text-xs font-semibold text-slate-600 mb-1">
                    Branch Assignment
                  </label>
                  <select
                    id="user-branch"
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none transition"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="user-subjects" className="block text-xs font-semibold text-slate-600 mb-1">
                    Subjects Taught
                  </label>
                  <input
                    id="user-subjects"
                    placeholder="e.g. Mathematics, Physics"
                    value={form.subjects}
                    onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none transition"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#2457FF] hover:bg-[#1b45db] text-white rounded-xl py-2.5 text-xs font-bold transition shadow-xs shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {busy ? "Registering..." : `Create ${role} Profile`}
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
