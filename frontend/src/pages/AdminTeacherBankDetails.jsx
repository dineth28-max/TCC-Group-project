import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listUsers } from "../api/users";
import { getTeacherBankDetails, saveTeacherBankDetails } from "../api/payments";

export default function AdminTeacherBankDetails() {
  const [teachers, setTeachers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState({ accountHolderName: "", bankName: "", accountNumber: "" });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    listUsers({ role: "Teacher" }).then((data) => {
      setTeachers(data);
      if (data.length > 0) setSelectedId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let stale = false;
    setError(null);
    setMessage(null);
    getTeacherBankDetails(selectedId).then((data) => {
      // Switching teachers quickly can resolve out of order — ignore a response that's no
      // longer for the currently-selected teacher rather than showing the wrong one's details.
      if (stale) return;
      setDetails(data);
      setForm({ accountHolderName: data.accountHolderName || "", bankName: data.bankName || "", accountNumber: "" });
    });
    return () => {
      stale = true;
    };
  }, [selectedId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const updated = await saveTeacherBankDetails(selectedId, form);
      setDetails(updated);
      setForm((f) => ({ ...f, accountNumber: "" }));
      setMessage("Bank details saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save bank details.");
    }
  }

  return (
    <DashboardShell title="Teacher Bank Details">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 overflow-hidden">
          <ul>
            {teachers.length === 0 ? (
              <li className="px-4 py-4 text-slate-500 text-xs">No teacher accounts yet.</li>
            ) : (
              teachers.map((t) => (
                <li key={t.id} className="border-t border-violet-100 first:border-t-0">
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-4 py-2 text-sm ${selectedId === t.id ? "bg-violet-50 text-violet-700 font-medium" : "text-slate-700"}`}
                  >
                    {t.fullName}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="md:col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Payout Account</h2>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-emerald-700 text-sm">{message}</p>}
          {details?.hasDetails && (
            <p className="text-xs text-slate-500">
              Currently on file: {details.accountHolderName} · {details.bankName} · {details.maskedAccountNumber}
            </p>
          )}
          <div>
            <label htmlFor="bank-holder" className="block text-xs text-slate-500 mb-1">Account Holder Name</label>
            <input
              id="bank-holder"
              required
              value={form.accountHolderName}
              onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="bank-name" className="block text-xs text-slate-500 mb-1">Bank Name</label>
            <input
              id="bank-name"
              required
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="bank-account" className="block text-xs text-slate-500 mb-1">Account Number</label>
            <input
              id="bank-account"
              required
              autoComplete="off"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder={details?.hasDetails ? "Enter new number to replace the one on file" : ""}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="bg-violet-700 text-white rounded px-5 py-2 text-sm font-medium">
            Save Bank Details
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
