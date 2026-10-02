import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { listMyChildren, getChildFees } from "../api/portal";
import { payChildInvoice } from "../api/payments";
import {
  CreditCard,
  Banknote,
  Printer,
  QrCode,
  Building2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  User,
} from "lucide-react";

export default function ParentPayments() {
  const [searchParams] = useSearchParams();
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [fees, setFees] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [selectedVoucherInv, setSelectedVoucherInv] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    listMyChildren().then((data) => {
      setChildren(data || []);
      if (data && data.length > 0) setSelectedId(data[0].id);
    });
    const paid = searchParams.get("paid");
    if (paid === "1") {
      setMessage("Payment submitted successfully — if approved, it will reflect as Paid shortly.");
    } else if (paid === "0") {
      setError("Online payment was cancelled. You can also pay physically at any branch counter.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load() {
    if (selectedId) {
      getChildFees(selectedId).then((data) => {
        setFees(data);
        if (data?.invoices?.length > 0 && !selectedVoucherInv) {
          const unpaid = data.invoices.find((i) => i.status !== "Paid") || data.invoices[0];
          setSelectedVoucherInv(unpaid);
        }
      });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handlePay(invoiceId) {
    setPayingId(invoiceId);
    setError(null);
    setMessage(null);
    try {
      const tx = await payChildInvoice(selectedId, invoiceId);
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

  const selectedChild = children.find((c) => c.id === selectedId);
  const payable = fees?.invoices.filter((inv) => inv.status !== "Paid") ?? [];

  return (
    <DashboardShell
      title="Parent &amp; Guardian Fee Payments"
      subtitle="Settle your children's monthly tuition fees online or print physical counter payment vouchers for campus reception"
    >
      <div className="space-y-6">
        {children.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
            No student children linked to your parent account yet.
          </div>
        ) : (
          <>
            {/* Child Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl p-2.5 border border-[#E3EBE8] shadow-2xs w-fit">
              <span className="text-xs font-semibold text-slate-400 px-2">Select Student:</span>
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setSelectedVoucherInv(null);
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedId === c.id
                      ? "bg-[#0E483F] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 bg-slate-50"
                  }`}
                >
                  {c.fullName}
                </button>
              ))}
            </div>

            {/* Banners */}
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

            {/* Invoices List */}
            <div className="bg-white rounded-3xl p-6 border border-[#E3EBE8] shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Tuition Fees for {selectedChild?.fullName}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Pay online via card or generate a physical voucher to pay in cash at the counter
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Paid</th>
                      <th className="py-2.5 px-3">Outstanding</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Payment Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {!fees || fees.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No invoices found for this student.
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
                            <td className="py-3 px-3 font-bold text-red-600">Rs {remaining.toFixed(2)}</td>
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
                                    onClick={() => setSelectedVoucherInv(inv)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00A389] hover:text-white text-slate-700 text-xs font-semibold transition cursor-pointer border border-slate-200"
                                  >
                                    Counter Slip
                                  </button>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 size={13} className="text-emerald-500" />
                                  Settled
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

            {/* PHYSICAL COUNTER VOUCHER SLIP */}
            {selectedVoucherInv && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-md space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00A389] flex items-center justify-center">
                      <Banknote size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00A389]">
                        Official Counter Slip
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        Physical Cash / POS Payment Voucher
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E483F] hover:bg-[#082C26] text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <Printer size={14} />
                    <span>Print Counter Slip</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 bg-[#F9FBFA] rounded-2xl p-6 border border-slate-200 font-mono space-y-4 text-xs">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 font-sans text-sm">
                          CSMAS TUITION INSTITUTE - FRONT DESK SLIP
                        </h4>
                        <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                          Present at Colombo or Kandy campus front desk to pay with Cash or POS Card
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        PHYSICAL SETTLEMENT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block">STUDENT</span>
                        <strong className="text-slate-900 font-sans">{selectedChild?.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">STUDENT CODE</span>
                        <strong className="text-slate-900">STU-{selectedChild?.id}</strong>
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
                      <span>CASH DUE AT COUNTER:</span>
                      <span className="text-red-600 font-black">
                        Rs {(selectedVoucherInv.totalDue - selectedVoucherInv.amountPaid).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100 text-center space-y-3">
                    <div className="w-24 h-24 bg-white rounded-2xl border-2 border-[#00A389] mx-auto flex items-center justify-center p-2 shadow-2xs">
                      <QrCode size={70} className="text-[#0E483F]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800">CASHIER DESK CODE</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        #INV-{selectedVoucherInv.id}-STU{selectedChild?.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
