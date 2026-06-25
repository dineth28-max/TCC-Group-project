import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listAuditLog } from "../api/payments";

export default function AdminAuditLog() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    listAuditLog().then(setRows);
  }, []);

  return (
    <DashboardShell title="Audit Log">
      <p className="text-slate-500 text-xs mb-4">
        Who changed Payment Account, Revenue Split, Institute/Teacher Bank Details, or reset a password —
        and when.
      </p>
      <div className="bg-white rounded-lg shadow-sm border border-violet-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-slate-500 text-xs">
                  No audited changes yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-violet-100">
                  <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.actorName}</td>
                  <td className="px-4 py-2 text-xs font-mono">{r.action}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.targetDescription ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
