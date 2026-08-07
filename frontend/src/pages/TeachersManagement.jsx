import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listUsers, createUser, updateUser, resetUserPassword } from "../api/users";
import { listBranches } from "../api/students";

const ROLE_TABS = ["Teacher", "Parent"];

export default function TeachersManagement() {
  const [role, setRole] = useState("Teacher");
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ fullName: "", email: "", branchId: "" });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

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
    setError(null);
    setMessage(null);
    try {
      await createUser({
        fullName: form.fullName,
        email: form.email,
        role,
        branchId: role === "Teacher" ? Number(form.branchId) : null,
      });
      setForm((f) => ({ ...f, fullName: "", email: "" }));
      setMessage("Account created with the demo default password.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create account.");
    }
  }

  async function handleToggleStatus(u) {
    await updateUser(u.id, { fullName: u.fullName, branchId: u.branchId, status: u.status === "Active" ? "Inactive" : "Active" });
    load();
  }

  async function handleReset(u) {
    const res = await resetUserPassword(u.id);
    setMessage(res.message);
  }

  return (
    <DashboardShell title="Teacher & Parent Accounts">

      <div className="flex gap-2 mb-4">
        {ROLE_TABS.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              role === r ? "bg-violet-700 text-white shadow-sm" : "bg-white text-slate-600 border border-violet-100 hover:bg-violet-100"
            }`}
          >
            {r} Accounts
          </button>
        ))}
      </div>

      {message && <p className="text-green-700 text-sm mb-3">{message}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-violet-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                {role === "Teacher" && <th className="px-4 py-2">Branch</th>}
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-slate-500 text-xs">
                    No {role.toLowerCase()} accounts yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-violet-100">
                    <td className="px-4 py-2">{u.fullName}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{u.email}</td>
                    {role === "Teacher" && (
                      <td className="px-4 py-2 text-xs">{branches.find((b) => b.id === u.branchId)?.name ?? "—"}</td>
                    )}
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${u.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
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
            {role === "Teacher" && (
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
            )}
            <button type="submit" className="bg-violet-700 text-white rounded px-4 py-2 text-sm w-full">
              Create Account
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
