import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { Wallet, CreditCard, Play, Plus, Percent, CheckCircle, Clock, Banknote } from "lucide-react";

const INVOICE_PAGE_SIZE = 50;
const INVOICE_STATUSES = ["All", "Paid", "Partial", "Pending", "Overdue"];
const STATUS_BADGE = {
  Paid: { className: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dot: "bg-[#C8FF3D] border border-emerald-600" },
  Partial: { className: "bg-blue-50 text-blue-700 border-blue-200/60", dot: "bg-blue-500" },
  Pending: { className: "bg-amber-50 text-amber-700 border-amber-200/60", dot: "bg-amber-500" },
  Overdue: { className: "bg-rose-50 text-rose-700 border-rose-200/60", dot: "bg-rose-500" },
};

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
  const [billingBusy, setBillingBusy] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState("All");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePage, setInvoicePage] = useState(0);

  const filteredInvoices = useMemo(() => {
    const term = invoiceSearch.trim().toLowerCase();
    return invoices.filter(
      (i) =>
        (invoiceStatus === "All" || i.status === invoiceStatus) &&
        (!term || i.studentName.toLowerCase().includes(term) || i.subject.toLowerCase().includes(term))
    );
  }, [invoices, invoiceStatus, invoiceSearch]);
  const invoicePageCount = Math.max(1, Math.ceil(filteredInvoices.length / INVOICE_PAGE_SIZE));
  const currentInvoicePage = Math.min(invoicePage, invoicePageCount - 1);
  const pagedInvoices = filteredInvoices.slice(
    currentInvoicePage * INVOICE_PAGE_SIZE,
    (currentInvoicePage + 1) * INVOICE_PAGE_SIZE
  );

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
    if (c.length > 0 && !structureForm.classId) setStructureForm((f) => ({ ...f, classId: String(c[0].id) }));
    if (s.length > 0 && !discountForm.studentId) setDiscountForm((f) => ({ ...f, studentId: String(s[0].id) }));
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
    setBillingBusy(true);
    try {
      const result = await runBilling();
      setBillingResult(result);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Billing run failed.");
    } finally {
      setBillingBusy(false);
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

  const formatCurrency = (val) =>
    `Rs ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DashboardShell title="Fee Management">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fee Management &amp; Invoicing</h1>
          <p className="text-xs text-slate-500 mt-1">Configure class tuition rates, apply scholarships, run automated billing, and log collections</p>
        </div>

        <Link
          to="/counter-payments"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0E483F] hover:bg-[#082C26] text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Banknote size={16} />
          <span>Physical Counter Payment Portal</span>
        </Link>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          {error}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Collection Rate ({summary?.period || thisPeriod()})
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {summary ? `${summary.collectionRatePercent}%` : "…"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {summary ? formatCurrency(summary.totalInvoiced) : "…"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</p>
          <p className="text-2xl font-bold text-[#2457FF] mt-2">
            {summary ? formatCurrency(summary.totalCollected) : "…"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <button
            onClick={handleRunBilling}
            disabled={billingBusy}
            className="w-full bg-[#2457FF] hover:bg-[#1b45db] text-white rounded-xl py-2 px-3 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play size={13} fill="currentColor" />
            {billingBusy ? "Running Billing..." : "Run Monthly Billing"}
          </button>
          {billingResult && (
            <p className="text-[11px] text-emerald-700 font-semibold mt-2 text-center">
              ✓ {billingResult.invoicesCreated} invoices generated for {billingResult.period}
            </p>
          )}
        </div>
      </div>

      {/* Fee Structures & Discounts Two-Column Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Fee Structures */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-[#2457FF]" />
            <h2 className="text-sm font-bold text-slate-900">Class Fee Structures</h2>
          </div>

          <form onSubmit={handleCreateStructure} className="flex gap-2 mb-4">
            <select
              aria-label="Class"
              value={structureForm.classId}
              onChange={(e) => setStructureForm({ ...structureForm, classId: e.target.value })}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:bg-white outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount (Rs)"
              required
              value={structureForm.amount}
              onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
              className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:bg-white outline-none"
            />
            <button
              type="submit"
              className="bg-[#2457FF] hover:bg-[#1b45db] text-white font-bold rounded-xl px-4 py-1.5 text-xs transition cursor-pointer"
            >
              Save Rate
            </button>
          </form>

          <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Subject Class</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3 text-right">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {structures.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{f.subject}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{formatCurrency(f.amount)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        {f.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discount Rules */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <Percent size={16} className="text-[#2457FF]" />
            <h2 className="text-sm font-bold text-slate-900">Scholarships & Discounts</h2>
          </div>

          <form onSubmit={handleCreateDiscount} className="flex gap-2 mb-4">
            <select
              aria-label="Student"
              value={discountForm.studentId}
              onChange={(e) => setDiscountForm({ ...discountForm, studentId: e.target.value })}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:bg-white outline-none"
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:bg-white outline-none"
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
              className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:bg-white outline-none"
            />
            <button
              type="submit"
              className="bg-[#2457FF] hover:bg-[#1b45db] text-white font-bold rounded-xl px-4 py-1.5 text-xs transition cursor-pointer"
            >
              Apply
            </button>
          </form>

          <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Discount</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{d.studentName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{d.type}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">{d.percentOff}% off</td>
                    <td className="py-2.5 px-3 text-right">
                      {d.isActive && (
                        <button
                          onClick={() => deactivateDiscount(d.id).then(loadAll)}
                          className="text-xs font-semibold text-red-600 hover:underline"
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
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Period Invoices ({thisPeriod()})</h2>
          <span className="text-xs text-slate-500">{invoices.length} invoices generated</span>
        </div>

        {invoices.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
            {INVOICE_STATUSES.map((status) => {
              const count = status === "All" ? invoices.length : invoices.filter((i) => i.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => {
                    setInvoiceStatus(status);
                    setInvoicePage(0);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                    invoiceStatus === status
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {status} ({count})
                </button>
              );
            })}
            <input
              type="search"
              placeholder="Search student or class..."
              value={invoiceSearch}
              onChange={(e) => {
                setInvoiceSearch(e.target.value);
                setInvoicePage(0);
              }}
              className="ml-auto w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-[#2457FF]"
            />
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No invoices for this billing cycle yet. Click "Run Monthly Billing" above to generate invoices.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-5">Subject Class</th>
                  <th className="py-3 px-5">Total Due</th>
                  <th className="py-3 px-5">Amount Paid</th>
                  <th className="py-3 px-5">Payment Status</th>
                  <th className="py-3 px-5">Due Date</th>
                  <th className="py-3 px-5 text-right">Record Cash Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagedInvoices.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-xs text-slate-900">
                      {i.studentName}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-600">{i.subject}</td>
                    <td className="py-3.5 px-5 text-xs font-mono font-bold text-slate-800">
                      {formatCurrency(i.totalDue)}
                    </td>
                    <td className="py-3.5 px-5 text-xs font-mono font-medium text-emerald-700">
                      {formatCurrency(i.amountPaid)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          (STATUS_BADGE[i.status] || STATUS_BADGE.Pending).className
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${(STATUS_BADGE[i.status] || STATUS_BADGE.Pending).dot}`} />
                        {i.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-500">{i.dueDate}</td>
                    <td className="py-3.5 px-5 text-right">
                      {i.status !== "Paid" && (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <input
                            type="number"
                            placeholder="Amount"
                            min="0.01"
                            max={i.totalDue - i.amountPaid}
                            step="0.01"
                            value={payAmounts[i.id] || ""}
                            onChange={(e) => setPayAmounts((prev) => ({ ...prev, [i.id]: e.target.value }))}
                            className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:bg-white focus:border-[#2457FF]"
                          />
                          <button
                            onClick={() => handlePay(i)}
                            className="bg-[#2457FF] hover:bg-[#1b45db] text-white px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Log Pay
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                {filteredInvoices.length === 0
                  ? "No invoices match this filter"
                  : `Showing ${currentInvoicePage * INVOICE_PAGE_SIZE + 1}–${Math.min(
                      (currentInvoicePage + 1) * INVOICE_PAGE_SIZE,
                      filteredInvoices.length
                    )} of ${filteredInvoices.length}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInvoicePage(currentInvoicePage - 1)}
                  disabled={currentInvoicePage === 0}
                  className="px-3 py-1 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <span>
                  Page {currentInvoicePage + 1} of {invoicePageCount}
                </span>
                <button
                  onClick={() => setInvoicePage(currentInvoicePage + 1)}
                  disabled={currentInvoicePage >= invoicePageCount - 1}
                  className="px-3 py-1 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
