import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from "../api/announcements";

export default function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: "", body: "" });
  const [error, setError] = useState(null);

  async function load() {
    setAnnouncements(await listAnnouncements());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await createAnnouncement({ title: form.title, body: form.body, branchId: null });
      setForm({ title: "", body: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not post announcement.");
    }
  }

  async function handleDelete(id) {
    await deleteAnnouncement(id);
    load();
  }

  return (
    <DashboardShell title="Announcements">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          {announcements.length === 0 ? (
            <p className="text-slate-500 text-sm">No announcements posted yet.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-700 text-sm">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{a.body}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {a.branchName ?? "Institute-wide"} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(a.id)} className="text-xs text-slate-500 hover:text-red-600">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Post Announcement</h2>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label htmlFor="ann-title" className="block text-xs text-slate-500 mb-1">Title</label>
              <input
                id="ann-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="ann-body" className="block text-xs text-slate-500 mb-1">Body</label>
              <textarea
                id="ann-body"
                required
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="bg-violet-700 text-white rounded px-4 py-2 text-sm w-full">
              Post
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
