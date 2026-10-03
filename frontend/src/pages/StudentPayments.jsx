import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { getMyFees } from "../api/me";
import { payMyInvoice } from "../api/payments";
import {
  CreditCard,
  Banknote,
  Printer,
  QrCode,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Building2,
  ShieldCheck,
} from "lucide-react";

export default function StudentPayments() {
  const [searchParams] = useSearchParams();
  const [fees, setFees] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [selectedVoucherInv, setSelectedVoucherInv] = useState(null);
  const [payMode, setPayMode] = useState("all"); // "all" | "online" | "physical"
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  function load() {
    getMyFees()
      .then((data) => {
        setFees(data);
        // Refresh the selected voucher too, so its status/amount is current after a payment.
        setSelectedVoucherInv((current) => {
          const invoices = data?.invoices || [];
          const refreshed = current && invoices.find((i) => i.id === current.id);
          if (refreshed) return refreshed;
          return invoices.find((i) => i.status !== "Paid") || invoices[0] || null;
        });
      })
      .catch((err) => setError(err?.response?.data?.message || "Could not load your fees. Please refresh the page."));
  }

  useEffect(() => {
    load();
    const paid = searchParams.get("paid");
    if (paid === "1") {
      setMessage("Payment submitted successfully — your invoice status will reflect as Paid shortly.");
    } else if (paid === "0") {
      setError("Online payment was cancelled. You can also pay physically at any branch counter.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay(invoiceId) {
    setPayingId(invoiceId);
    setError(null);
    setMessage(null);
    try {
      const tx = await payMyInvoice(invoiceId);
      if (tx.checkoutUrl) {
        window.location.href = tx.checkoutUrl;
        return;
      }
      setMessage(tx.status === "Success" ? "Payment successful." : `Payment ${tx.status.toLowerCase()}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Payment could not be completed.");
    } finally {
      setPayingId(null);
    }
  }

  const payable = fees?.invoices.filter((inv) => inv.status !== "Paid") ?? [];
  const paidInvoices = fees?.invoices.filter((inv) => inv.status === "Paid") ?? [];

  return (
    <DashboardShell
      title="Student Tuition &amp; Fee Payments"
      subtitle="View outstanding monthly tuition fees, pay online, or generate official physical counter vouchers for campus payment"
    >
      <div className="space-y-6">
        
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-[#E3EBE8] shadow-2xs">
            <span className="text-xs font-semibold text-slate-400">Total Outstanding Due</span>
            <p className="text-2xl font-black text-red-600 mt-1">
              Rs {Number(fees?.totalDue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {payable.length} unpaid class {payable.length === 1 ? "invoice" : "invoices"}
            </span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-[#E3EBE8] shadow-2xs">
            <span className="text-xs font-semibold text-slate-400">Total Tuition Paid</span>
            <p className="text-2xl font-black text-[#00A389] mt-1">
              Rs {Number(fees?.totalPaid || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {paidInvoices.length} settled {paidInvoices.length === 1 ? "invoice" : "invoices"}
            </span>
          </div>

          <div className="bg-[#0E483F] text-white rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-300">Physical Counter Payment</span>
              <p className="text-sm font-bold text-white mt-0.5">Pay in Cash at Branch</p>
              <p className="text-[11px] text-white/70 mt-1">
                Accepted: Cash, Card POS &amp; LankaQR at any campus reception.
              </p>
            </div>
            <button
              onClick={() => {
                setPayMode("physical");
                window.scrollTo({ top: 350, behavior: "smooth" });
              }}
              className="mt-3 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white text-emerald-300 hover:text-[#0E483F] text-xs font-bold transition text-left w-fit"
            >
              Generate Physical Voucher &rarr;
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Method Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setPayMode("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              payMode === "all"
                ? "bg-[#0E483F] text-white"
                : "text-slate-600 hover:text-slate-900 bg-slate-50"
            }`}
          >
            All Fee Invoices
          </button>
          <button
            onClick={() => setPayMode("physical")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              payMode === "physical"
                ? "bg-[#00A389] text-white"
                : "text-slate-600 hover:text-slate-900 bg-slate-50"
            }`}
          >
            <Banknote size={14} />
            <span>Pay Physically at Campus (Voucher)</span>
          </button>
        </div>

        {/* Section 1: Invoices Table */}
        <div className="bg-white rounded-3xl p-6 border border-[#E3EBE8] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Current Tuition Invoices
              </h3>
              <span className="text-xs text-slate-400">
                Choose online settlement or get a physical counter slip below
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Billing Period</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Paid</th>
                  <th className="py-2.5 px-3">Remaining Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Payment Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {!fees || fees.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No tuition invoices on record.
                    </td>
                  </tr>
                ) : (
                  fees.invoices.map((inv) => {
                    const remaining = inv.totalDue - inv.amountPaid;
                    const isPaid = inv.status === "Paid";

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{inv.subject}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{inv.billingPeriod}</td>
                        <td className="py-3 px-3 text-slate-700">Rs {Number(inv.totalDue).toFixed(2)}</td>
                        <td className="py-3 px-3 text-emerald-700 font-semibold">Rs {Number(inv.amountPaid).toFixed(2)}</td>
                        <td className="py-3 px-3 font-bold text-red-600">
                          Rs {remaining.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
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
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          {!isPaid ? (
                            <>
                              <button
                                onClick={() => handlePay(inv.id)}
                                disabled={payingId === inv.id}
                                className="px-3 py-1.5 rounded-xl bg-[#2457FF] hover:bg-[#1b43c9] text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs"
                              >
                                {payingId === inv.id ? "Redirecting..." : "Pay Online"}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedVoucherInv(inv);
                                  setPayMode("physical");
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00A389] hover:text-white text-slate-700 text-xs font-semibold transition cursor-pointer border border-slate-200"
                              >
                                Physical Voucher
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              Receipt Issued
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: PHYSICAL PAYMENT VOUCHER & CAMPUS COUNTER INSTRUCTIONS */}
        {(payMode === "physical" || selectedVoucherInv) && selectedVoucherInv && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00A389] flex items-center justify-center">
                  <Banknote size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00A389]">
                    Campus Front Desk Payment Slip
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Physical Payment Counter Voucher
                  </h3>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E483F] hover:bg-[#082C26] text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Printer size={14} />
                <span>Print Physical Voucher</span>
              </button>
            </div>

            {/* Voucher Printable Ticket */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Slip Details (md:col-span-8) */}
              <div className="md:col-span-8 bg-[#F9FBFA] rounded-2xl p-6 border border-slate-200 font-mono space-y-4">
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 font-sans text-sm">
                      CSMAS TUITION INSTITUTE - OFFICIAL COUNTER SLIP
                    </h4>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                      Present this slip or Student ID barcode at the campus cashier desk
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    VALID FOR CASH / POS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">STUDENT NAME</span>
                    <strong className="text-slate-900 font-sans">{selectedVoucherInv.studentName || "Student"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">STUDENT CODE</span>
                    <strong className="text-slate-900">STU-{selectedVoucherInv.studentId}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">SUBJECT / BATCH</span>
                    <strong className="text-slate-900">{selectedVoucherInv.subject}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">BILLING PERIOD</span>
                    <strong className="text-slate-900">{selectedVoucherInv.billingPeriod}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-base font-extrabold text-slate-900">
                  <span>OUTSTANDING DUE AT COUNTER:</span>
                  <span className="text-red-600 font-black">
                    Rs {(selectedVoucherInv.totalDue - selectedVoucherInv.amountPaid).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* QR / Barcode & Instructions (md:col-span-4) */}
              <div className="md:col-span-4 bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100 text-center space-y-3">
                <div className="w-24 h-24 bg-white rounded-2xl border-2 border-[#00A389] mx-auto flex items-center justify-center p-2 shadow-2xs">
                  <QrCode size={70} className="text-[#0E483F]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800">CASHIER SCAN CODE</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    #INV-{selectedVoucherInv.id}-STU{selectedVoucherInv.studentId}
                  </p>
                </div>
              </div>
            </div>

            {/* Campus Cashier Locations & Hours */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 size={14} className="text-[#00A389]" />
                <span>Physical Payment Counter Hours &amp; Locations</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="font-semibold text-slate-700 block">• Colombo Main Campus Front Desk</span>
                  <span className="text-slate-500">Mon – Sat: 08:00 AM – 06:00 PM | Sun: 08:00 AM – 02:00 PM</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">• Kandy Branch Cashier Counter</span>
                  <span className="text-slate-500">Mon – Sat: 08:30 AM – 05:30 PM | Sun: 08:30 AM – 01:00 PM</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/80">
                Accepted physical payment methods: <strong>Cash</strong>, <strong>Visa/Mastercard POS swipe</strong>, <strong>Bank Deposit Slips</strong>, and <strong>LankaQR</strong>. Instant printed official receipts and class entry stamps issued immediately upon settlement.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
