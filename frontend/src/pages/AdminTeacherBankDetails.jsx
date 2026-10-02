import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listUsers } from "../api/users";
import { getTeacherBankDetails, saveTeacherBankDetails } from "../api/payments";
import { Landmark, Search, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function AdminTeacherBankDetails() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState({ accountHolderName: "", bankName: "", accountNumber: "" });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadTeachers() {
    setLoading(true);
    setListError(null);
    try {
      const data = await listUsers(search ? { role: "Teacher", search } : { role: "Teacher" });
      setTeachers(data);
      if (data.length > 0 && !data.some((t) => t.id === selectedId)) setSelectedId(data[0].id);
      if (data.length === 0) setSelectedId(null);
    } catch {
      setListError("Could not load teachers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      setForm({ accountHolderName: "", bankName: "", accountNumber: "" });
      return;
    }
    let stale = false;
    setError(null);
    setMessage(null);
    getTeacherBankDetails(selectedId).then((data) => {
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
    setSaving(true);
    try {
      const updated = await saveTeacherBankDetails(selectedId, form);
      setDetails(updated);
      setForm((f) => ({ ...f, accountNumber: "" }));
      setMessage("Bank details successfully encrypted and saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save bank details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Teacher Bank Accounts">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Payout Banking Records</h1>
        <p className="text-xs text-slate-500 mt-1">Manage and verify teacher disbursement accounts with AES encryption</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Teachers List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTeachers()}
                placeholder="Search faculty..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:bg-white"
              />
            </div>
            <button
              onClick={loadTeachers}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3"
            >
              Search
            </button>
          </div>

          {listError && <p className="px-4 py-2 text-red-600 text-xs">{listError}</p>}

          <ul className="max-h-[30rem] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <li className="px-4 py-6 text-center text-slate-400 text-xs">Loading faculty list...</li>
            ) : teachers.length === 0 ? (
              <li className="px-4 py-6 text-center text-slate-400 text-xs">No faculty found.</li>
            ) : (
              teachers.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-4 py-3 text-xs transition flex items-center justify-between ${
                      selectedId === t.id
                        ? "bg-blue-50/80 text-[#2457FF] font-bold border-l-4 border-[#2457FF]"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span>{t.fullName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{t.email}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Right Column: Banking Form */}
        {!selectedId ? (
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center text-xs text-slate-400">
            Select a teacher from the left panel to configure their bank account.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Landmark size={18} className="text-[#2457FF]" />
              <h2 className="text-sm font-bold text-slate-900">Direct Deposit Payout Account</h2>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                {error}
              </div>
            )}
            {message && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{message}</span>
              </div>
            )}

            {details?.hasDetails && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <span className="font-semibold text-slate-700">Currently Verified On File: </span>
                <span className="text-slate-600">
                  {details.accountHolderName} · {details.bankName} ·{" "}
                  <span className="font-mono font-bold text-slate-800">{details.maskedAccountNumber}</span>
                </span>
              </div>
            )}

            <div>
              <label htmlFor="bank-holder" className="block text-xs font-semibold text-slate-600 mb-1">
                Beneficiary Account Holder Name
              </label>
              <input
                id="bank-holder"
                required
                value={form.accountHolderName}
                onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none"
              />
            </div>

            <div>
              <label htmlFor="bank-name" className="block text-xs font-semibold text-slate-600 mb-1">
                Bank Institution Name
              </label>
              <input
                id="bank-name"
                required
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none"
              />
            </div>

            <div>
              <label htmlFor="bank-account" className="block text-xs font-semibold text-slate-600 mb-1">
                Account Number
              </label>
              <input
                id="bank-account"
                required
                autoComplete="off"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder={details?.hasDetails ? "Enter new account number to replace existing record" : ""}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-[#2457FF] hover:bg-[#1b45db] text-white rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-xs shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? "Encrypting & Saving..." : "Save Bank Record"}
            </button>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
