import { useEffect, useState, useMemo } from "react";
import DashboardShell from "./DashboardShell";
import { listStudents } from "../api/students";
import { listInvoices, recordPayment } from "../api/fees";
import { useAuth } from "../auth/AuthContext";
import {
  Banknote,
  CreditCard,
  Building2,
  QrCode,
  Search,
  CheckCircle2,
  Printer,
  Receipt,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function PhysicalPaymentsPortal() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Payment form states
  const [paymentMethod, setPaymentMethod] = useState("Cash"); // "Cash" | "CounterCard" | "BankDeposit" | "CounterQR"
  const [payAmount, setPayAmount] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [cashierNotes, setCashierNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentReceipt, setRecentReceipt] = useState(null);

  // Load active student list
  async function loadStudents() {
    try {
      const data = await listStudents();
      setStudents(data || []);
      if (data && data.length > 0 && !selectedStudent) {
        handleSelectStudent(data[0]);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    }
  }

  // Load unpaid invoices for selected student
  async function loadStudentInvoices(studentId) {
    setLoading(true);
    try {
      const data = await listInvoices({ studentId });
      setInvoices(data || []);
      // Auto-select first unpaid invoice if available
      const unpaid = (data || []).find((i) => i.status !== "Paid");
      if (unpaid) {
        handleSelectInvoice(unpaid);
      } else {
        setSelectedInvoice(null);
        setPayAmount("");
      }
    } catch (err) {
      console.error("Failed to load student invoices:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectStudent(student) {
    setSelectedStudent(student);
    setSelectedInvoice(null);
    setRecentReceipt(null);
    setError(null);
    loadStudentInvoices(student.id);
  }

  function handleSelectInvoice(inv) {
    setSelectedInvoice(inv);
    const remaining = inv.totalDue - inv.amountPaid;
    setPayAmount(remaining.toFixed(2));
    setCashTendered(remaining.toFixed(2));
  }

  // Filter students by name or code
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
        (s.contactNumber && s.contactNumber.includes(q))
    );
  }, [students, searchQuery]);

  // Cash change calculation
  const amountToPayNum = parseFloat(payAmount) || 0;
  const cashTenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashTenderedNum - amountToPayNum);

  // Process physical payment
  async function handleProcessPayment(e) {
    e.preventDefault();
    if (!selectedInvoice) {
      setError("Please select an invoice to settle.");
      return;
    }
    if (amountToPayNum <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }
    const remainingDue = selectedInvoice.totalDue - selectedInvoice.amountPaid;
    if (amountToPayNum > remainingDue) {
      setError(`Payment amount cannot exceed the remaining due of Rs ${remainingDue.toFixed(2)}.`);
      return;
    }
    if (paymentMethod === "Cash" && cashTenderedNum < amountToPayNum) {
      setError("Cash tendered is less than the required payment amount.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recorded = await recordPayment(selectedInvoice.id, {
        amount: amountToPayNum,
        method: paymentMethod,
      });

      // Generate receipt
      const receiptData = {
        receiptNo: `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleString(),
        studentName: selectedStudent.fullName,
        studentCode: selectedStudent.studentCode || `STU-${selectedStudent.id}`,
        branchName: selectedStudent.branchName || "Main Branch Campus",
        subject: selectedInvoice.subject,
        billingPeriod: selectedInvoice.billingPeriod,
        amountPaid: amountToPayNum,
        paymentMethod: paymentMethod,
        cashTendered: paymentMethod === "Cash" ? cashTenderedNum : null,
        changeDue: paymentMethod === "Cash" ? changeDue : null,
        referenceCode: referenceCode || "N/A",
        cashier: user?.fullName || "Front Desk Cashier",
        status: recorded.status,
      };

      setRecentReceipt(receiptData);
      // Reload student invoices
      await loadStudentInvoices(selectedStudent.id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell
      title="Physical Payment Counter Portal"
      subtitle="Front-desk cashier terminal for physical cash collection, POS card swipe, bank slips, and instant official receipts"
    >
      <div className="space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-[#0E483F] text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative z-10">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300">
              Campus Cashier &amp; POS Terminal
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5">
              Physical Tuition Fee Collection Counter
            </h2>
            <p className="text-xs text-white/80 mt-1 max-w-xl">
              Collect tuition fees in person, calculate exact cash change, and issue verified official printed receipts for students and parents.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-300" />
              <span>Official Physical Ledger Mode</span>
            </div>
          </div>
        </div>

        {/* 3-Column Layout: Student Lookup (Col 3) + Pending Invoices (Col 4) + Payment Terminal & Receipt (Col 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =================================================================
              COLUMN 1: Student Lookup & Profile (lg:col-span-3)
              ================================================================= */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-5 border border-[#E3EBE8] shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <User size={16} className="text-[#00A389]" />
                <span>1. Select Student</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Search by name, student code, or phone
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#00A389] transition"
              />
            </div>

            {/* Student List */}
            <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No students found.</p>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedStudent?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition cursor-pointer border flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-50 border-[#00A389] text-[#0E483F] font-bold shadow-2xs"
                          : "border-slate-100 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">{s.fullName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {s.studentCode || `STU-${s.id}`}
                        </p>
                      </div>
                      <ArrowRight size={14} className={isSelected ? "text-[#00A389]" : "text-slate-300"} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Selected Student Card */}
            {selectedStudent && (
              <div className="p-3 bg-[#F9FBFA] rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#00A389]">Active Customer Profile</span>
                <p className="font-bold text-slate-900 text-sm">{selectedStudent.fullName}</p>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p>Code: <strong className="text-slate-700 font-mono">{selectedStudent.studentCode || `STU-${selectedStudent.id}`}</strong></p>
                  <p>Contact: {selectedStudent.contactNumber || "None registered"}</p>
                </div>
              </div>
            )}
          </div>

          {/* =================================================================
              COLUMN 2: Unpaid Invoices & Class Fees (lg:col-span-4)
              ================================================================= */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-[#E3EBE8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Receipt size={16} className="text-[#00A389]" />
                  <span>2. Pending Fees</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Select fee invoice to collect
                </span>
              </div>

              {selectedStudent && (
                <button
                  onClick={() => loadStudentInvoices(selectedStudent.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
                  title="Refresh Invoices"
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>

            {/* Invoices List */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-8">Loading invoices...</p>
              ) : invoices.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-400 space-y-2">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                  <p className="text-xs font-semibold text-slate-700">No outstanding invoices</p>
                  <p className="text-[11px] text-slate-400">
                    All class fees for this student have been cleared!
                  </p>
                </div>
              ) : (
                invoices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id;
                  const remaining = inv.totalDue - inv.amountPaid;
                  const isPaid = inv.status === "Paid";

                  return (
                    <div
                      key={inv.id}
                      onClick={() => !isPaid && handleSelectInvoice(inv)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-2 ${
                        isSelected
                          ? "border-[#00A389] bg-emerald-50/40 shadow-xs"
                          : isPaid
                          ? "border-slate-100 bg-slate-50 opacity-60 cursor-default"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-xs text-slate-900 leading-tight">
                            {inv.subject}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Period: {inv.billingPeriod} • Due: {inv.dueDate}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : inv.status === "Partial"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500 text-[11px]">
                          Paid: <strong className="text-slate-700 font-medium">Rs {inv.amountPaid.toFixed(2)}</strong>
                        </span>
                        <span className="font-bold text-slate-900">
                          Due: <span className="text-red-600">Rs {remaining.toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* =================================================================
              COLUMN 3: Cashier Physical Payment Terminal & Receipt (lg:col-span-5)
              ================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            {/* Terminal Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#E3EBE8] shadow-2xs space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Banknote size={16} className="text-[#00A389]" />
                  <span>3. Collect Physical Payment</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Choose physical payment method, enter tendered money, and confirm settlement
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Payment Mode Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "Cash", label: "Cash", icon: Banknote },
                  { id: "CounterCard", label: "Card POS", icon: CreditCard },
                  { id: "BankDeposit", label: "Bank Slip", icon: Building2 },
                  { id: "CounterQR", label: "LankaQR", icon: QrCode },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      paymentMethod === m.id
                        ? "bg-[#0E483F] text-white border-[#0E483F] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <m.icon size={16} />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Payment Form */}
              <form onSubmit={handleProcessPayment} className="space-y-4">
                {/* Amount to Pay */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount to Collect (LKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rs
                    </span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-[#00A389] transition bg-[#F9FBFA]"
                    />
                  </div>
                </div>

                {/* Cash Tendered & Change Due (If Cash selected) */}
                {paymentMethod === "Cash" && (
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cash Given (Tendered)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 5000"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-[#00A389] bg-white"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Change to Return
                      </span>
                      <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-emerald-700">
                        Rs {changeDue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Reference code (For Card POS / Bank slip / QR) */}
                {paymentMethod !== "Cash" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {paymentMethod === "CounterCard"
                        ? "Card Terminal Auth / Approval Code"
                        : paymentMethod === "BankDeposit"
                        ? "Bank Deposit Slip Ref Number"
                        : "Merchant QR Transaction Reference"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TXN-948204 or Slip #40192"
                      value={referenceCode}
                      onChange={(e) => setReferenceCode(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#00A389] transition"
                    />
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading || !selectedInvoice}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#00A389] hover:bg-[#008f77] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>Processing Payment...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Collect Payment &amp; Issue Receipt</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* =================================================================
                PRINTABLE OFFICIAL RECEIPT VIEW (Appears once payment completes)
                ================================================================= */}
            {recentReceipt && (
              <div className="bg-white rounded-3xl p-6 border-2 border-emerald-400 shadow-lg space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      Official Tuition Payment Receipt
                    </h4>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Print Receipt</span>
                  </button>
                </div>

                {/* Receipt Ticket Box */}
                <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-dashed border-slate-300 text-xs space-y-3 font-mono">
                  <div className="text-center pb-2 border-b border-slate-200">
                    <p className="font-extrabold text-slate-900 text-sm tracking-wider">
                      CSMAS TUITION INSTITUTE
                    </p>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                      Physical Fee Collection • Campus Front Desk
                    </p>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Receipt No:</span>
                    <strong className="text-slate-900">{recentReceipt.receiptNo}</strong>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Date &amp; Time:</span>
                    <span>{recentReceipt.date}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Student:</span>
                    <strong className="text-slate-900 font-sans">{recentReceipt.studentName}</strong>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Student ID:</span>
                    <span>{recentReceipt.studentCode}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Subject / Period:</span>
                    <span>{recentReceipt.subject} ({recentReceipt.billingPeriod})</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Payment Mode:</span>
                    <strong className="text-[#0E483F] font-sans">{recentReceipt.paymentMethod.toUpperCase()}</strong>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>AMOUNT PAID:</span>
                    <span className="text-emerald-700">Rs {recentReceipt.amountPaid.toFixed(2)}</span>
                  </div>

                  {recentReceipt.changeDue !== null && (
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Change Returned:</span>
                      <span>Rs {recentReceipt.changeDue.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400 font-sans">
                    <p>Cashier: {recentReceipt.cashier}</p>
                    <p className="font-bold text-emerald-600 mt-0.5">*** VERIFIED &amp; PAID IN FULL ***</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
