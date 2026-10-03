import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listAuditLog } from "../api/payments";
import { ScrollText, ShieldCheck, User } from "lucide-react";

export default function AdminAuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listAuditLog()
      .then(setRows)
      .catch((err) => setError(err.response?.data?.message || "Could not load the audit log. Please refresh the page."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell title="System Audit Log">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & System Audit Log</h1>
        <p className="text-xs text-slate-500 mt-1">
          Immutable trail of administrative configuration updates, payout modifications, banking alterations, and credential resets
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-xs text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit records...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No audited system actions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5">Actor / User</th>
                  <th className="py-3 px-5">Security Action</th>
                  <th className="py-3 px-5 text-right">Target Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-xs text-slate-900">
                      {r.actorName}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#2457FF] border border-blue-200/60">
                        {r.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-xs text-slate-600 font-medium">
                      {r.targetDescription ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
