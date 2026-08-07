import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { getMyBankDetails, saveMyBankDetails } from "../api/payments";

export default function TeacherBankDetails() {
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState({ accountHolderName: "", bankName: "", accountNumber: "" });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyBankDetails().then((data) => {
      setDetails(data);
      setForm({ accountHolderName: data.accountHolderName || "", bankName: data.bankName || "", accountNumber: "" });
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await saveMyBankDetails(form);
      setDetails(updated);
      setForm((f) => ({ ...f, accountNumber: "" }));
      setMessage("Bank details saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save bank details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell title="Bank Details">
      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Payout Account</h2>
          <p className="text-xs text-slate-500">
            This is the account your earnings are paid out to. It's visible to admins on the Teacher Bank Details page.
          </p>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-emerald-700 text-sm">{message}</p>}
          {details?.hasDetails && (
            <p className="text-xs text-slate-500">
              Currently on file: {details.accountHolderName} · {details.bankName} · {details.maskedAccountNumber}
            </p>
          )}
          <div>
            <label htmlFor="my-bank-holder" className="block text-xs text-slate-500 mb-1">Account Holder Name</label>
            <input
              id="my-bank-holder"
              required
              value={form.accountHolderName}
              onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="my-bank-name" className="block text-xs text-slate-500 mb-1">Bank Name</label>
            <input
              id="my-bank-name"
              required
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="my-bank-account" className="block text-xs text-slate-500 mb-1">Account Number</label>
            <input
              id="my-bank-account"
              required
              autoComplete="off"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder={details?.hasDetails ? "Enter new number to replace the one on file" : ""}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" disabled={busy} className="bg-violet-700 text-white rounded px-5 py-2 text-sm font-medium disabled:opacity-50">
            Save Bank Details
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
