import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../auth/AuthContext";
import { listBranches, createBranch, updateBranch, deactivateBranch, reactivateBranch } from "../api/branches";

const emptyForm = { name: "", geoLat: "", geoLng: "", geoRadiusM: "100" };

export default function BranchesManagement() {
  const { user } = useAuth();
  const canManage = user?.role === "SystemAdmin";

  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function load() {
    setBranches(await listBranches());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(b) {
    setEditingId(b.id);
    setForm({ name: b.name, geoLat: String(b.geoLat), geoLng: String(b.geoLng), geoRadiusM: String(b.geoRadiusM) });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const payload = {
      name: form.name,
      geoLat: Number(form.geoLat),
      geoLng: Number(form.geoLng),
      geoRadiusM: Number(form.geoRadiusM),
    };
    try {
      if (editingId) {
        await updateBranch(editingId, payload);
        setMessage("Branch updated.");
      } else {
        await createBranch(payload);
        setMessage("Branch created.");
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this branch.");
    }
  }

  async function handleToggleStatus(b) {
    if (b.status === "Active") {
      await deactivateBranch(b.id);
    } else {
      await reactivateBranch(b.id);
    }
    load();
  }

  return (
    <DashboardShell title="Branches">
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">All Branches</h2>
          {branches.length === 0 ? (
            <p className="text-slate-500 text-sm">No branches yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1.5">Name</th>
                  <th className="py-1.5">Geo Location</th>
                  <th className="py-1.5">Radius</th>
                  <th className="py-1.5">Status</th>
                  {canManage && <th className="py-1.5"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="py-1.5">{b.name}</td>
                    <td className="py-1.5 text-xs text-slate-500">{b.geoLat}, {b.geoLng}</td>
                    <td className="py-1.5">{b.geoRadiusM}m</td>
                    <td className="py-1.5">
                      <span className={b.status === "Active" ? "text-emerald-700" : "text-slate-400"}>{b.status}</span>
                    </td>
                    {canManage && (
                      <td className="py-1.5 text-right space-x-3 whitespace-nowrap">
                        <button onClick={() => startEdit(b)} className="text-xs text-violet-700 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => handleToggleStatus(b)} className="text-xs text-slate-500 hover:text-red-600">
                          {b.status === "Active" ? "Deactivate" : "Reactivate"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {canManage && (
          <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">{editingId ? "Edit Branch" : "Create Branch"}</h2>
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            {message && <p className="text-emerald-700 text-sm mb-2">{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="branch-name" className="block text-xs text-slate-500 mb-1">Name</label>
                <input
                  id="branch-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="branch-lat" className="block text-xs text-slate-500 mb-1">Geo Latitude</label>
                <input
                  id="branch-lat"
                  type="number"
                  step="0.000001"
                  required
                  value={form.geoLat}
                  onChange={(e) => setForm({ ...form, geoLat: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="branch-lng" className="block text-xs text-slate-500 mb-1">Geo Longitude</label>
                <input
                  id="branch-lng"
                  type="number"
                  step="0.000001"
                  required
                  value={form.geoLng}
                  onChange={(e) => setForm({ ...form, geoLng: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="branch-radius" className="block text-xs text-slate-500 mb-1">Geofence Radius (m)</label>
                <input
                  id="branch-radius"
                  type="number"
                  min="1"
                  required
                  value={form.geoRadiusM}
                  onChange={(e) => setForm({ ...form, geoRadiusM: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-violet-700 text-white rounded px-4 py-2 text-sm flex-1">
                  {editingId ? "Save Changes" : "Create"}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
