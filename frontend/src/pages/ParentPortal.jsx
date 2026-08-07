import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DashboardShell from "./DashboardShell";
import {
  listMyChildren,
  getChildAttendance,
  getChildFees,
  listPortalAnnouncements,
  listMyNotifications,
  markNotificationRead,
} from "../api/portal";

export default function ParentPortal() {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [fees, setFees] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [inbox, setInbox] = useState({ unreadCount: 0, items: [] });
  const [showInbox, setShowInbox] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyChildren().then((data) => {
      setChildren(data);
      if (data.length > 0) setSelectedId(data[0].id);
      setLoading(false);
    });
    listPortalAnnouncements().then(setAnnouncements);
    listMyNotifications().then(setInbox);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getChildAttendance(selectedId).then(setAttendance);
    getChildFees(selectedId).then(setFees);
  }, [selectedId]);

  async function handleOpenInbox() {
    setShowInbox((v) => !v);
  }

  async function handleReadNotification(id) {
    await markNotificationRead(id);
    const fresh = await listMyNotifications();
    setInbox(fresh);
  }

  const selectedChild = children.find((c) => c.id === selectedId);

  if (loading) {
    return (
      <DashboardShell title="Parent / Guardian Portal">
        <p className="text-slate-500 text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Parent / Guardian Portal">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        {children.length === 0 ? (
          <p className="text-slate-500 text-sm">No children are linked to your account yet.</p>
        ) : (
          <div className="flex gap-2 bg-white border border-violet-100 rounded-full p-1.5 shadow-sm w-fit">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedId === c.id ? "bg-violet-700 text-white shadow-sm" : "text-slate-600 hover:bg-violet-100"
                }`}
              >
                {c.fullName}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <button
            onClick={handleOpenInbox}
            className="relative bg-white border border-violet-100 rounded-full px-4 py-2 text-sm shadow-sm hover:bg-violet-50"
          >
            🔔 Notifications
            {inbox.unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {inbox.unreadCount}
              </span>
            )}
          </button>
          {showInbox && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-violet-100 rounded-lg shadow-lg p-3 z-10 max-h-96 overflow-y-auto">
              {inbox.items.length === 0 ? (
                <p className="text-xs text-slate-500">No notifications yet.</p>
              ) : (
                inbox.items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleReadNotification(n.id)}
                    className={`block w-full text-left text-xs border-b border-slate-100 py-2 last:border-0 ${
                      n.isRead ? "text-slate-500" : "text-slate-700 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{n.subject}</span>
                      {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                    </div>
                    <p className="text-slate-500 mt-0.5">{n.message}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {selectedChild && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">Attendance — {selectedChild.fullName}</h2>
                <span className="text-2xl font-semibold text-violet-700">
                  {attendance ? `${attendance.overallRatePercent}%` : "…"}
                </span>
              </div>
              {attendance && attendance.bySubject.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={attendance.bySubject}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                    <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip />
                    <Bar dataKey="ratePercent" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-500">No closed sessions yet for this child.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Announcements</h3>
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-500">No announcements yet.</p>
              ) : (
                <ul className="space-y-3">
                  {announcements.map((a) => (
                    <li key={a.id} className="border-b border-slate-100 pb-2 last:border-0">
                      <p className="text-sm font-medium text-slate-700">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.body}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Fee Statement</h3>
            {fees ? (
              <>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Outstanding</span>
                  <span className="font-semibold text-red-600">{fees.totalDue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-slate-500">Paid to date</span>
                  <span className="font-semibold text-emerald-700">{fees.totalPaid.toFixed(2)}</span>
                </div>
                <ul className="space-y-2 text-xs">
                  {fees.invoices.map((inv) => (
                    <li key={inv.id} className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span>{inv.subject} · {inv.billingPeriod}</span>
                      <span
                        className={
                          inv.status === "Paid"
                            ? "text-emerald-700"
                            : inv.status === "Overdue"
                              ? "text-red-600"
                              : "text-amber-700"
                        }
                      >
                        {inv.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-slate-500">Loading…</p>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
