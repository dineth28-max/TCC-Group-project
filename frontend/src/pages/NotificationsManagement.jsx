import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listTemplates, updateTemplate, getDeliveryLog } from "../api/notifications";

const STATUS_COLORS = {
  Sent: "bg-emerald-100 text-emerald-700",
  Queued: "bg-amber-100 text-amber-700",
  Failed: "bg-red-100 text-red-700",
};

export default function NotificationsManagement() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ subject: "", body: "" });
  const [log, setLog] = useState([]);
  const [message, setMessage] = useState(null);

  async function loadTemplates() {
    setTemplates(await listTemplates());
  }
  async function loadLog() {
    setLog(await getDeliveryLog());
  }

  useEffect(() => {
    loadTemplates();
    loadLog();
  }, []);

  function startEdit(t) {
    setEditing(t.eventType);
    setForm({ subject: t.subject, body: t.body });
  }

  async function handleSave(eventType) {
    await updateTemplate(eventType, form);
    setEditing(null);
    setMessage("Template updated.");
    loadTemplates();
  }

  return (
    <DashboardShell title="Notification Engine">
      {message && <p className="text-green-700 text-sm mb-3">{message}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Templates</h2>
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.eventType} className="border border-slate-100 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{t.eventType}</span>
                  <div className="flex items-center gap-2">
                    {t.isCustomized && <span className="text-[10px] bg-violet-50 text-violet-700 rounded px-1.5 py-0.5">Customized</span>}
                    <button onClick={() => startEdit(t)} className="text-xs text-violet-700 hover:underline">
                      {editing === t.eventType ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>
                {editing === t.eventType ? (
                  <div className="space-y-2 mt-2">
                    <input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                      placeholder="Subject"
                    />
                    <textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                      rows={3}
                      placeholder="Body — use {StudentName}, {Subject}, {TotalDue}, {DueDate}, etc."
                    />
                    <button onClick={() => handleSave(t.eventType)} className="bg-violet-700 text-white rounded px-3 py-1 text-xs">
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">{t.subject}</p>
                    <p className="text-xs text-slate-500">{t.body}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Delivery Log</h3>
            <button onClick={loadLog} className="text-xs text-violet-700 hover:underline">
              Refresh
            </button>
          </div>
          <div className="overflow-y-auto max-h-[480px]" tabIndex={0} role="region" aria-label="Delivery log table">
            <table className="w-full text-xs">
              <thead className="bg-violet-50 text-slate-600 text-left sticky top-0">
                <tr>
                  <th className="px-2 py-1.5">When</th>
                  <th className="px-2 py-1.5">Event</th>
                  <th className="px-2 py-1.5">Channel</th>
                  <th className="px-2 py-1.5">To</th>
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {log.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100" title={row.failureReason ?? ""}>
                    <td className="px-2 py-1.5 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-1.5">{row.eventType}</td>
                    <td className="px-2 py-1.5">{row.channel}</td>
                    <td className="px-2 py-1.5">{row.recipientEmail ?? row.recipientName}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-2 py-0.5 rounded ${STATUS_COLORS[row.status] || "bg-slate-100 text-slate-600"}`}>
                        {row.status}
                        {row.attemptCount > 0 && row.status !== "Sent" ? ` (${row.attemptCount})` : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
