import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { getMyFees } from "../api/me";
import { payMyInvoice } from "../api/payments";

export default function StudentPayments() {
  const [searchParams] = useSearchParams();
  const [fees, setFees] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  function load() {
    getMyFees().then(setFees);
  }

  useEffect(() => {
    load();
    const paid = searchParams.get("paid");
    if (paid === "1") setMessage("Payment submitted — if it succeeded, it may take a few seconds to reflect below.");
    else if (paid === "0") setError("Payment was cancelled.");
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

  return (
    <DashboardShell title="Payments">
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {message && <p className="text-emerald-700 text-sm mb-4">{message}</p>}

      <div className="bg-white rounded-lg shadow-sm border border-violet-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Outstanding</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {!fees || payable.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-slate-500 text-xs">
                  No outstanding invoices.
                </td>
              </tr>
            ) : (
              payable.map((inv) => (
                <tr key={inv.id} className="border-t border-violet-100">
                  <td className="px-4 py-2">{inv.subject}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{inv.billingPeriod}</td>
                  <td className="px-4 py-2 font-medium text-red-600">{(inv.totalDue - inv.amountPaid).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${inv.status === "Overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handlePay(inv.id)}
                      disabled={payingId === inv.id}
                      className="bg-violet-700 text-white rounded px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      {payingId === inv.id ? "Processing…" : "Pay Now"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
