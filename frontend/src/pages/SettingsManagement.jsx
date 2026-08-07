import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { getSettings, updateSettings } from "../api/settings";

export default function SettingsManagement() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    getSettings().then((data) =>
      setForm({
        name: data.name,
        address: data.address || "",
        contactEmail: data.contactEmail || "",
        logoUrl: data.logoUrl || "",
        themeColor: data.themeColor || "#7c3aed",
        attendanceThresholdPercent: String(data.attendanceThresholdPercent),
      })
    );
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await updateSettings({
        name: form.name,
        address: form.address || null,
        contactEmail: form.contactEmail || null,
        logoUrl: form.logoUrl || null,
        themeColor: form.themeColor || null,
        attendanceThresholdPercent: Number(form.attendanceThresholdPercent),
      });
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save settings.");
    }
  }

  if (!form) {
    return (
      <DashboardShell title="Settings">
        <p className="text-slate-500 text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Settings">
      <div className="grid grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Institute Settings</h2>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-emerald-700 text-sm">{message}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="settings-name" className="block text-xs text-slate-500 mb-1">Institute Name</label>
              <input
                id="settings-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="settings-address" className="block text-xs text-slate-500 mb-1">Address</label>
              <input
                id="settings-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-contact" className="block text-xs text-slate-500 mb-1">Contact Email</label>
              <input
                id="settings-contact"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-threshold" className="block text-xs text-slate-500 mb-1">Attendance Flag Threshold (%)</label>
              <input
                id="settings-threshold"
                type="number"
                min="0"
                max="100"
                required
                value={form.attendanceThresholdPercent}
                onChange={(e) => setForm({ ...form, attendanceThresholdPercent: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="settings-logo" className="block text-xs text-slate-500 mb-1">Logo URL</label>
              <input
                id="settings-logo"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://…"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-theme" className="block text-xs text-slate-500 mb-1">Theme / Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-theme"
                  type="color"
                  value={form.themeColor}
                  onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                  className="h-9 w-14 border border-slate-300 rounded"
                />
                <span className="text-xs font-mono text-slate-500">{form.themeColor}</span>
              </div>
            </div>
          </div>

          <button type="submit" className="bg-violet-700 text-white rounded px-5 py-2 text-sm font-medium">
            Save Settings
          </button>
        </form>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 text-center space-y-3">
          <h3 className="font-medium text-slate-700 text-sm">Preview</h3>
          <div className="flex justify-center">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Institute logo" className="h-16 w-16 object-contain rounded" />
            ) : (
              <div
                className="h-16 w-16 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: form.themeColor }}
              >
                {form.name?.[0] || "?"}
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800">{form.name}</p>
          <div className="h-9 rounded text-white text-xs flex items-center justify-center" style={{ backgroundColor: form.themeColor }}>
            Accent color preview
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
