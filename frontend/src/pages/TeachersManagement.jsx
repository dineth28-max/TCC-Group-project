import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listUsers, createUser, updateUser, resetUserPassword } from "../api/users";
import { listBranches } from "../api/students";

const ROLE_TABS = ["Teacher", "Parent"];
const EMPTY_FORM = { fullName: "", email: "", branchId: "", password: "", phoneNumber: "", nationalId: "", address: "", dateOfJoining: "", subjects: "" };

export default function TeachersManagement() {
  const [role, setRole] = useState("Teacher");
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setUsers(await listUsers({ role }));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    listBranches().then((data) => {
      setBranches(data);
      if (data.length > 0) setForm((f) => ({ ...f, branchId: String(data[0].id) }));
    });
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
      setMessage(`${user.fullName}'s account was created.`);
      if (tempPassword) setTemporaryPassword({ name: user.fullName, password: tempPassword });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus(u) {
    await updateUser(u.id, {
      fullName: u.fullName,
      branchId: u.branchId,
      status: u.status === "Active" ? "Inactive" : "Active",
      phoneNumber: u.phoneNumber,
      nationalId: u.nationalId,
      address: u.address,
      dateOfJoining: u.dateOfJoining,
      subjects: u.subjects,
    });
    load();
  }

  async function handleReset(u) {
    setTemporaryPassword(null);
    const res = await resetUserPassword(u.id);
    setMessage(res.message);
    if (res.temporaryPassword) setTemporaryPassword({ name: u.fullName, password: res.temporaryPassword });
  }

  return (
    <DashboardShell title="Teacher & Parent Accounts">

      <div className="flex gap-2 mb-4">
        {ROLE_TABS.map((r) => (
          <button
            key={r}
            onClick={() => {
              setRole(r);
              setTemporaryPassword(null);
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              role === r ? "bg-violet-700 text-white shadow-sm" : "bg-white text-slate-600 border border-violet-100 hover:bg-violet-100"
            }`}
          >
            {r} Accounts
          </button>
        ))}
      </div>

      {message && <p className="text-green-700 text-sm mb-3">{message}</p>}
      {temporaryPassword && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm">
          <p className="font-medium text-amber-800">
            One-time password for {temporaryPassword.name} — shown once, write it down now:
          </p>
          <p className="font-mono text-lg text-amber-900 mt-1">{temporaryPassword.password}</p>
          <p className="text-amber-700 text-xs mt-1">
            They'll be required to set their own password the first time they log in.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-violet-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                {role === "Teacher" && <th className="px-4 py-2">Branch</th>}
                {role === "Teacher" && <th className="px-4 py-2">Phone</th>}
                {role === "Teacher" && <th className="px-4 py-2">Subjects</th>}
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-slate-500 text-xs">
                    No {role.toLowerCase()} accounts yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-violet-100">
                    <td className="px-4 py-2">
                      {u.fullName}
                      {u.mustChangePassword && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">
                          Pending first login
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{u.email}</td>
                    {role === "Teacher" && (
                      <td className="px-4 py-2 text-xs">{branches.find((b) => b.id === u.branchId)?.name ?? "—"}</td>
                    )}
                    {role === "Teacher" && <td className="px-4 py-2 text-xs text-slate-500">{u.phoneNumber ?? "—"}</td>}
                    {role === "Teacher" && <td className="px-4 py-2 text-xs text-slate-500">{u.subjects ?? "—"}</td>}
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${u.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => handleReset(u)} className="text-xs text-violet-700 hover:underline">
                        Reset password
                      </button>
                      <button onClick={() => handleToggleStatus(u)} className="text-xs text-slate-500 hover:text-red-600">
                        {u.status === "Active" ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">New {role} Account</h2>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label htmlFor="user-fullname" className="block text-xs text-slate-500 mb-1">Full Name</label>
              <input
                id="user-fullname"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="user-email" className="block text-xs text-slate-500 mb-1">Email</label>
              <input
                id="user-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="user-password" className="block text-xs text-slate-500 mb-1">
                Initial Password (optional)
              </label>
              <input
                id="user-password"
                type="password"
                autoComplete="off"
                minLength={8}
                placeholder="Leave blank to auto-generate one"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Either way, they must set their own password on first login.
              </p>
            </div>
            {role === "Teacher" && (
              <>
                <div>
                  <label htmlFor="user-branch" className="block text-xs text-slate-500 mb-1">Branch</label>
                  <select
                    id="user-branch"
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="user-phone" className="block text-xs text-slate-500 mb-1">Phone Number</label>
                  <input
                    id="user-phone"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="user-nic" className="block text-xs text-slate-500 mb-1">National ID</label>
                  <input
                    id="user-nic"
                    value={form.nationalId}
                    onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="user-address" className="block text-xs text-slate-500 mb-1">Address</label>
                  <input
                    id="user-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="user-join-date" className="block text-xs text-slate-500 mb-1">Date of Joining</label>
                  <input
                    id="user-join-date"
                    type="date"
                    value={form.dateOfJoining}
                    onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="user-subjects" className="block text-xs text-slate-500 mb-1">Subject Specialization(s)</label>
                  <input
                    id="user-subjects"
                    placeholder="e.g. Mathematics, Physics"
                    value={form.subjects}
                    onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <button type="submit" disabled={busy} className="bg-violet-700 text-white rounded px-4 py-2 text-sm w-full disabled:opacity-50">
              Create Account
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
