import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listClasses } from "../api/classes";
import { listStudents } from "../api/students";
import {
  listFeeStructures,
  createFeeStructure,
  listDiscounts,
  createDiscount,
  deactivateDiscount,
  listInvoices,
  recordPayment,
  runBilling,
  getCollectionSummary,
} from "../api/fees";

const thisPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function FeesManagement() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [structures, setStructures] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [structureForm, setStructureForm] = useState({ classId: "", amount: "" });
  const [discountForm, setDiscountForm] = useState({ studentId: "", type: "Sibling", percentOff: "" });
  const [payAmounts, setPayAmounts] = useState({});
  const [error, setError] = useState(null);
  const [billingResult, setBillingResult] = useState(null);

  async function loadAll() {
    const [c, s, fs, d, inv, sum] = await Promise.all([
      listClasses(),
      listStudents(),
      listFeeStructures(),
      listDiscounts(),
      listInvoices({ period: thisPeriod() }),
      getCollectionSummary(thisPeriod()),
    ]);
    setClasses(c);
    setStudents(s);
    setStructures(fs);
    setDiscounts(d);
    setInvoices(inv);
    setSummary(sum);
    if (c.length > 0) setStructureForm((f) => ({ ...f, classId: String(c[0].id) }));
    if (s.length > 0) setDiscountForm((f) => ({ ...f, studentId: String(s[0].id) }));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateStructure(e) {
    e.preventDefault();
    setError(null);
    try {
      await createFeeStructure({ classId: Number(structureForm.classId), amount: Number(structureForm.amount) });
      setStructureForm((f) => ({ ...f, amount: "" }));
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create fee structure.");
    }
  }

  async function handleCreateDiscount(e) {
    e.preventDefault();
    setError(null);
    try {
      await createDiscount({
        studentId: Number(discountForm.studentId),
        type: discountForm.type,
        percentOff: Number(discountForm.percentOff),
      });
      setDiscountForm((f) => ({ ...f, percentOff: "" }));
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create discount.");
    }
  }

  async function handleRunBilling() {
    setError(null);
    try {
      const result = await runBilling();
      setBillingResult(result);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Billing run failed.");
    }
  }

  async function handlePay(invoice) {
    const amount = Number(payAmounts[invoice.id]);
    const remainingDue = invoice.totalDue - invoice.amountPaid;
    if (!amount || amount <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (amount > remainingDue) {
      setError(`Payment amount cannot exceed the remaining due (${remainingDue.toFixed(2)}).`);
      return;
    }
    setError(null);
    try {
      await recordPayment(invoice.id, { amount, method: "Cash" });
      setPayAmounts((prev) => ({ ...prev, [invoice.id]: "" }));
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed.");
    }
  }

  return (
    <DashboardShell title="Fee Management">
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-4">
          <p className="text-xs text-slate-500">Collection Rate ({summary?.period})</p>
          <p className="text-2xl font-semibold text-slate-800">{summary ? `${summary.collectionRatePercent}%` : "…"}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-4">
          <p className="text-xs text-slate-500">Total Invoiced</p>
          <p className="text-2xl font-semibold text-slate-800">{summary ? summary.totalInvoiced : "…"}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-4">
          <p className="text-xs text-slate-500">Total Collected</p>
          <p className="text-2xl font-semibold text-slate-800">{summary ? summary.totalCollected : "…"}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-4 flex flex-col justify-between">
          <button onClick={handleRunBilling} className="bg-violet-700 text-white rounded px-3 py-1.5 text-sm">
            Run Billing Now
          </button>
          {billingResult && (
            <p className="text-xs text-slate-500 mt-1">
              {billingResult.invoicesCreated} invoices created for {billingResult.period}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Fee Structures</h2>
          <form onSubmit={handleCreateStructure} className="flex gap-2 mb-4">
            <select
              aria-label="Class"
              value={structureForm.classId}
              onChange={(e) => setStructureForm({ ...structureForm, classId: e.target.value })}
              className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              required
              value={structureForm.amount}
              onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
              className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
            <button type="submit" className="bg-violet-700 text-white rounded px-3 py-1.5 text-sm">
              Save
            </button>
          </form>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1.5">Subject</th>
                <th className="py-1.5">Amount</th>
                <th className="py-1.5">Active</th>
              </tr>
            </thead>
            <tbody>
              {structures.map((f) => (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="py-1.5">{f.subject}</td>
                  <td className="py-1.5">{f.amount}</td>
                  <td className="py-1.5">{f.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Discount Rules</h2>
          <form onSubmit={handleCreateDiscount} className="flex gap-2 mb-4">
            <select
              aria-label="Student"
              value={discountForm.studentId}
              onChange={(e) => setDiscountForm({ ...discountForm, studentId: e.target.value })}
              className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
            <select
              aria-label="Discount type"
              value={discountForm.type}
              onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="Sibling">Sibling</option>
              <option value="Scholarship">Scholarship</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="number"
              placeholder="% off"
              required
              value={discountForm.percentOff}
              onChange={(e) => setDiscountForm({ ...discountForm, percentOff: e.target.value })}
              className="w-20 border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
            <button type="submit" className="bg-violet-700 text-white rounded px-3 py-1.5 text-sm">
              Add
            </button>
          </form>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1.5">Student</th>
                <th className="py-1.5">Type</th>
                <th className="py-1.5">% Off</th>
                <th className="py-1.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="py-1.5">{d.studentName}</td>
                  <td className="py-1.5">{d.type}</td>
                  <td className="py-1.5">{d.percentOff}%</td>
                  <td className="py-1.5 text-right">
                    {d.isActive && (
                      <button
                        onClick={() => deactivateDiscount(d.id).then(loadAll)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Invoices — {thisPeriod()}</h2>
        {invoices.length === 0 ? (
          <p className="text-slate-500 text-sm">No invoices for this period yet. Run billing above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1.5">Student</th>
                <th className="py-1.5">Subject</th>
                <th className="py-1.5">Total Due</th>
                <th className="py-1.5">Paid</th>
                <th className="py-1.5">Status</th>
                <th className="py-1.5">Due Date</th>
                <th className="py-1.5">Record Payment</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="py-1.5">{i.studentName}</td>
                  <td className="py-1.5">{i.subject}</td>
                  <td className="py-1.5">{i.totalDue}</td>
                  <td className="py-1.5">{i.amountPaid}</td>
                  <td className="py-1.5">{i.status}</td>
                  <td className="py-1.5">{i.dueDate}</td>
                  <td className="py-1.5">
                    {i.status !== "Paid" && (
                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder="Amount"
                          min="0.01"
                          max={i.totalDue - i.amountPaid}
                          step="0.01"
                          value={payAmounts[i.id] || ""}
                          onChange={(e) => setPayAmounts((prev) => ({ ...prev, [i.id]: e.target.value }))}
                          className="w-20 border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                        <button onClick={() => handlePay(i)} className="text-xs text-violet-700 hover:underline">
                          Pay
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}
