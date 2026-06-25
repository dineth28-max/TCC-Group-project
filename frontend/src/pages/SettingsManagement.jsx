import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { getSettings, updateSettings } from "../api/settings";
import {
  getPaymentAccount,
  updatePaymentAccount,
  getRevenueSplit,
  updateRevenueSplit,
  getInstituteBankDetails,
  saveInstituteBankDetails,
} from "../api/payments";

export default function SettingsManagement() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [paymentAccount, setPaymentAccount] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ gatewayProvider: "", accountIdentifier: "", apiKey: "", apiSecret: "", webhookSecret: "" });
  const [paymentError, setPaymentError] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);

  const [commissionPercent, setCommissionPercent] = useState("2.00");
  const [splitError, setSplitError] = useState(null);
  const [splitMessage, setSplitMessage] = useState(null);
  const [savingSplit, setSavingSplit] = useState(false);

  const [bankDetails, setBankDetails] = useState(null);
  const [bankForm, setBankForm] = useState({ accountHolderName: "", bankName: "", accountNumber: "", branchName: "", routingOrSwiftCode: "" });
  const [bankError, setBankError] = useState(null);
  const [bankMessage, setBankMessage] = useState(null);
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    getSettings().then((data) =>
      setForm({
        name: data.name,
        address: data.address || "",
        contactEmail: data.contactEmail || "",
        logoUrl: data.logoUrl || "",
        themeColor: data.themeColor || "#7c3aed",
        attendanceThresholdPercent: String(data.attendanceThresholdPercent),
      })
    );
    getPaymentAccount().then((data) => {
      setPaymentAccount(data);
      setPaymentForm((f) => ({ ...f, gatewayProvider: data.gatewayProvider || "", accountIdentifier: data.accountIdentifier || "" }));
    });
    getRevenueSplit().then((data) => setCommissionPercent(String(data.commissionPercent)));
    getInstituteBankDetails().then((data) => {
      setBankDetails(data);
      setBankForm((f) => ({
        ...f,
        accountHolderName: data.accountHolderName || "",
        bankName: data.bankName || "",
        branchName: data.branchName || "",
        routingOrSwiftCode: data.routingOrSwiftCode || "",
      }));
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (savingSettings) return;
    setSavingSettings(true);
    setError(null);
    setMessage(null);
    try {
      await updateSettings({
        name: form.name,
        address: form.address || null,
        contactEmail: form.contactEmail || null,
        logoUrl: form.logoUrl || null,
        themeColor: form.themeColor || null,
        attendanceThresholdPercent: Number(form.attendanceThresholdPercent),
      });
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    if (savingPayment) return;
    setSavingPayment(true);
    setPaymentError(null);
    setPaymentMessage(null);
    try {
      const updated = await updatePaymentAccount({
        gatewayProvider: paymentForm.gatewayProvider,
        accountIdentifier: paymentForm.accountIdentifier || null,
        apiKey: paymentForm.apiKey || null,
        apiSecret: paymentForm.apiSecret || null,
        webhookSecret: paymentForm.webhookSecret || null,
      });
      setPaymentAccount(updated);
      setPaymentForm((f) => ({ ...f, apiKey: "", apiSecret: "", webhookSecret: "" }));
      setPaymentMessage("Payment account saved.");
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Could not save payment account.");
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleSplitSubmit(e) {
    e.preventDefault();
    if (savingSplit) return;
    setSavingSplit(true);
    setSplitError(null);
    setSplitMessage(null);
    try {
      const updated = await updateRevenueSplit({ commissionPercent: Number(commissionPercent) });
      setCommissionPercent(String(updated.commissionPercent));
      setSplitMessage("Revenue split saved — applies to online payments from now on, not retroactively.");
    } catch (err) {
      setSplitError(err.response?.data?.message || "Could not save revenue split.");
    } finally {
      setSavingSplit(false);
    }
  }

  async function handleBankSubmit(e) {
    e.preventDefault();
    if (savingBank) return;
    setSavingBank(true);
    setBankError(null);
    setBankMessage(null);
    try {
      const updated = await saveInstituteBankDetails({
        accountHolderName: bankForm.accountHolderName,
        bankName: bankForm.bankName,
        accountNumber: bankForm.accountNumber,
        branchName: bankForm.branchName || null,
        routingOrSwiftCode: bankForm.routingOrSwiftCode || null,
      });
      setBankDetails(updated);
      setBankForm((f) => ({ ...f, accountNumber: "" }));
      setBankMessage("Institute bank details saved.");
    } catch (err) {
      setBankError(err.response?.data?.message || "Could not save institute bank details.");
    } finally {
      setSavingBank(false);
    }
  }

  if (!form) {
    return (
      <DashboardShell title="Settings">
        <p className="text-slate-500 text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Settings">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="md:col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Institute Settings</h2>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-emerald-700 text-sm">{message}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="settings-name" className="block text-xs text-slate-500 mb-1">Institute Name</label>
              <input
                id="settings-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-address" className="block text-xs text-slate-500 mb-1">Address</label>
              <input
                id="settings-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-contact" className="block text-xs text-slate-500 mb-1">Contact Email</label>
              <input
                id="settings-contact"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-threshold" className="block text-xs text-slate-500 mb-1">Attendance Flag Threshold (%)</label>
              <input
                id="settings-threshold"
                type="number"
                min="0"
                max="100"
                required
                value={form.attendanceThresholdPercent}
                onChange={(e) => setForm({ ...form, attendanceThresholdPercent: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-logo" className="block text-xs text-slate-500 mb-1">Logo URL</label>
              <input
                id="settings-logo"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://…"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-theme" className="block text-xs text-slate-500 mb-1">Theme / Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-theme"
                  type="color"
                  value={form.themeColor}
                  onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                  className="h-9 w-14 border border-slate-300 rounded"
                />
                <span className="text-xs font-mono text-slate-500">{form.themeColor}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={savingSettings} className="bg-violet-700 text-white rounded px-5 py-2 text-sm font-medium disabled:opacity-50">
            Save Settings
          </button>
        </form>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 text-center space-y-3">
          <h3 className="font-medium text-slate-700 text-sm">Preview</h3>
          <div className="flex justify-center">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Institute logo" className="h-16 w-16 object-contain rounded" />
            ) : (
              <div
                className="h-16 w-16 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: form.themeColor }}
              >
                {form.name?.[0] || "?"}
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800">{form.name}</p>
          <div className="h-9 rounded text-white text-xs flex items-center justify-center" style={{ backgroundColor: form.themeColor }}>
            Accent color preview
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <form onSubmit={handlePaymentSubmit} className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Payment Account</h2>
          {paymentError && <p className="text-red-600 text-sm">{paymentError}</p>}
          {paymentMessage && <p className="text-emerald-700 text-sm">{paymentMessage}</p>}
          <p className="text-xs text-slate-500">
            API key/secret are encrypted at rest and never shown again after saving — leave them blank to keep
            the current credential unchanged.
            {paymentAccount && (
              <span className="block mt-1">
                Key: {paymentAccount.hasApiKey ? "configured" : "not set"} · Secret: {paymentAccount.hasApiSecret ? "configured" : "not set"}
              </span>
            )}
          </p>
          <div>
            <label htmlFor="pay-provider" className="block text-xs text-slate-500 mb-1">Gateway Provider</label>
            <input
              id="pay-provider"
              required
              value={paymentForm.gatewayProvider}
              onChange={(e) => setPaymentForm({ ...paymentForm, gatewayProvider: e.target.value })}
              placeholder="MockPay"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="pay-account-id" className="block text-xs text-slate-500 mb-1">Account Identifier</label>
            <input
              id="pay-account-id"
              value={paymentForm.accountIdentifier}
              onChange={(e) => setPaymentForm({ ...paymentForm, accountIdentifier: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="pay-api-key" className="block text-xs text-slate-500 mb-1">API Key</label>
            <input
              id="pay-api-key"
              type="password"
              autoComplete="off"
              value={paymentForm.apiKey}
              onChange={(e) => setPaymentForm({ ...paymentForm, apiKey: e.target.value })}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="pay-api-secret" className="block text-xs text-slate-500 mb-1">API Secret</label>
            <input
              id="pay-api-secret"
              type="password"
              autoComplete="off"
              value={paymentForm.apiSecret}
              onChange={(e) => setPaymentForm({ ...paymentForm, apiSecret: e.target.value })}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="pay-webhook-secret" className="block text-xs text-slate-500 mb-1">
              Webhook Signing Secret
            </label>
            <input
              id="pay-webhook-secret"
              type="password"
              autoComplete="off"
              value={paymentForm.webhookSecret}
              onChange={(e) => setPaymentForm({ ...paymentForm, webhookSecret: e.target.value })}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              For Stripe: the whsec_... value from your Stripe webhook endpoint config — separate from the API secret above.
              {paymentAccount && <span className="block">Webhook secret: {paymentAccount.hasWebhookSecret ? "configured" : "not set"}</span>}
            </p>
          </div>
          <button type="submit" disabled={savingPayment} className="bg-violet-700 text-white rounded px-5 py-2 text-sm font-medium disabled:opacity-50">
            Save Payment Account
          </button>
        </form>

        <form onSubmit={handleSplitSubmit} className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Revenue Split</h2>
          {splitError && <p className="text-red-600 text-sm">{splitError}</p>}
          {splitMessage && <p className="text-emerald-700 text-sm">{splitMessage}</p>}
          <p className="text-xs text-slate-500">
            Platform commission applied to every online payment going forward only — changing this never
            rewrites past transactions.
          </p>
          <div>
            <label htmlFor="split-percent" className="block text-xs text-slate-500 mb-1">Commission Percent</label>
            <input
              id="split-percent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" disabled={savingSplit} className="bg-violet-700 text-white rounded px-5 py-2 text-sm font-medium disabled:opacity-50">
            Save Revenue Split
          </button>
        </form>

        <form onSubmit={handleBankSubmit} className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Institute Bank Details</h2>
          {bankError && <p className="text-red-600 text-sm">{bankError}</p>}
          {bankMessage && <p className="text-emerald-700 text-sm">{bankMessage}</p>}
          <p className="text-xs text-slate-500">
            Where the institute's own money lands — separate from the gateway credentials above. Encrypted at
            rest, masked to last 4 digits on every read.
            {bankDetails?.hasDetails && (
              <span className="block mt-1">
                On file: {bankDetails.bankName} · {bankDetails.maskedAccountNumber}
              </span>
            )}
          </p>
          <div>
            <label htmlFor="bank-holder" className="block text-xs text-slate-500 mb-1">Account Holder Name</label>
            <input
              id="bank-holder"
              required
              value={bankForm.accountHolderName}
              onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="bank-name" className="block text-xs text-slate-500 mb-1">Bank Name</label>
            <input
              id="bank-name"
              required
              value={bankForm.bankName}
              onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="bank-account" className="block text-xs text-slate-500 mb-1">Account Number</label>
            <input
              id="bank-account"
              required
              autoComplete="off"
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
              placeholder={bankDetails?.hasDetails ? "Enter new number to replace the one on file" : ""}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bank-branch" className="block text-xs text-slate-500 mb-1">Branch</label>
              <input
                id="bank-branch"
                value={bankForm.branchName}
                onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="bank-swift" className="block text-xs text-slate-500 mb-1">Routing / SWIFT</label>
              <input
                id="bank-swift"
                value={bankForm.routingOrSwiftCode}
                onChange={(e) => setBankForm({ ...bankForm, routingOrSwiftCode: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button type="submit" disabled={savingBank} className="bg-violet-700 text-white rounded px-5 py-2 text-sm font-medium disabled:opacity-50">
            Save Institute Bank Details
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
