import { useEffect, useState, useMemo } from "react";
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
import apiClient from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  User,
  Palette,
  Lock,
  Building2,
  CalendarClock,
  CreditCard,
  TrendingUp,
  Landmark,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
} from "lucide-react";

const updateMyProfile = (payload) => apiClient.put("/auth/profile", payload);

export default function SettingsManagement() {
  const { user, refreshUser } = useAuth();
  const isSystemAdmin = user?.role === "SystemAdmin";

  // Active navigation tab
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form state (real values from the signed-in account)
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phoneNumber || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Appearance Form state
  const [selectedThemeColor, setSelectedThemeColor] = useState("#00A389");
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [appearanceSuccess, setAppearanceSuccess] = useState(null);
  const [appearanceError, setAppearanceError] = useState(null);

  // Password Form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Institute Settings Form state
  const [instituteForm, setInstituteForm] = useState({
    name: user?.instituteName || "",
    address: "",
    contactEmail: "",
    logoUrl: "",
    themeColor: "#00A389",
    attendanceThresholdPercent: "75",
  });
  const [savingInstitute, setSavingInstitute] = useState(false);
  const [instituteSuccess, setInstituteSuccess] = useState(null);
  const [instituteError, setInstituteError] = useState(null);

  // Institute Bank Details Form state
  const [bankDetails, setBankDetails] = useState(null);
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    branchName: "",
    routingOrSwiftCode: "",
  });
  const [savingBank, setSavingBank] = useState(false);
  const [bankSuccess, setBankSuccess] = useState(null);
  const [bankError, setBankError] = useState(null);

  // Payment Account Form state
  const [paymentAccount, setPaymentAccount] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    gatewayProvider: "PayHere",
    accountIdentifier: "",
    apiKey: "",
    apiSecret: "",
    webhookSecret: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  // Revenue Split Form state
  const [commissionPercent, setCommissionPercent] = useState("2.00");
  const [savingSplit, setSavingSplit] = useState(false);
  const [splitSuccess, setSplitSuccess] = useState(null);
  const [splitError, setSplitError] = useState(null);
  const [simFee, setSimFee] = useState("5000");

  // Global loading
  const [initialLoading, setInitialLoading] = useState(true);

  // Load backend data safely
  useEffect(() => {
    async function loadData() {
      try {
        const [settingsData, bankData, paymentData, splitData] = await Promise.allSettled([
          getSettings(),
          getInstituteBankDetails(),
          getPaymentAccount(),
          getRevenueSplit(),
        ]);

        if (settingsData.status === "fulfilled" && settingsData.value) {
          const s = settingsData.value;
          setInstituteForm({
            name: s.name || "",
            address: s.address || "",
            contactEmail: s.contactEmail || "",
            logoUrl: s.logoUrl || "",
            themeColor: s.themeColor || "#00A389",
            attendanceThresholdPercent: String(s.attendanceThresholdPercent ?? 75),
          });
          setSelectedThemeColor(s.themeColor || "#00A389");
        }

        if (bankData.status === "fulfilled" && bankData.value) {
          const b = bankData.value;
          setBankDetails(b);
          setBankForm((f) => ({
            ...f,
            accountHolderName: b.accountHolderName || "",
            bankName: b.bankName || "",
            branchName: b.branchName || "",
            routingOrSwiftCode: b.routingOrSwiftCode || "",
          }));
        }

        if (paymentData.status === "fulfilled" && paymentData.value) {
          const p = paymentData.value;
          setPaymentAccount(p);
          setPaymentForm((f) => ({
            ...f,
            gatewayProvider: p.gatewayProvider || "PayHere",
            accountIdentifier: p.accountIdentifier || "",
          }));
        }

        if (splitData.status === "fulfilled" && splitData.value) {
          setCommissionPercent(String(splitData.value.commissionPercent ?? "2.00"));
        }
      } catch (err) {
        console.error("Settings load notice:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle Profile Save
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (savingProfile) return;
    setProfileSuccess(null);
    setProfileError(null);
    if (profileForm.fullName.trim().length < 2) {
      setProfileError("Please enter your full name.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateMyProfile({ fullName: profileForm.fullName.trim(), phoneNumber: profileForm.phone.trim() || null });
      await refreshUser();
      setProfileSuccess("Your profile was saved.");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err) {
      setProfileError(err.response?.data?.message || "Could not save your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  // Handle Appearance Save — the accent colour is stored on the institute record.
  async function handleSaveAppearance() {
    if (savingAppearance) return;
    setSavingAppearance(true);
    setAppearanceSuccess(null);
    setAppearanceError(null);
    try {
      await updateSettings({
        name: instituteForm.name,
        address: instituteForm.address || null,
        contactEmail: instituteForm.contactEmail || null,
        logoUrl: instituteForm.logoUrl || null,
        themeColor: selectedThemeColor,
        attendanceThresholdPercent: Number(instituteForm.attendanceThresholdPercent),
      });
      setInstituteForm((f) => ({ ...f, themeColor: selectedThemeColor }));
      setAppearanceSuccess("Brand colour saved.");
      setTimeout(() => setAppearanceSuccess(null), 3500);
    } catch (err) {
      setAppearanceError(err.response?.data?.message || "Could not save the brand colour.");
    } finally {
      setSavingAppearance(false);
    }
  }

  // Handle Password Save
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await apiClient.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess("Password updated successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to update password. Verify current password.");
    } finally {
      setPasswordLoading(false);
    }
  }

  // Handle Institute Settings Save
  async function handleInstituteSubmit(e) {
    e.preventDefault();
    if (savingInstitute) return;
    setSavingInstitute(true);
    setInstituteSuccess(null);
    setInstituteError(null);

    try {
      await updateSettings({
        name: instituteForm.name,
        address: instituteForm.address || null,
        contactEmail: instituteForm.contactEmail || null,
        logoUrl: instituteForm.logoUrl || null,
        themeColor: selectedThemeColor || instituteForm.themeColor || null,
        attendanceThresholdPercent: Number(instituteForm.attendanceThresholdPercent),
      });
      setInstituteSuccess("Institute branding and policies saved.");
      setTimeout(() => setInstituteSuccess(null), 4000);
    } catch (err) {
      setInstituteError(err.response?.data?.message || "Could not save institute settings.");
    } finally {
      setSavingInstitute(false);
    }
  }

  // Handle Bank Submit
  async function handleBankSubmit(e) {
    e.preventDefault();
    if (savingBank) return;
    setSavingBank(true);
    setBankSuccess(null);
    setBankError(null);

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
      setBankSuccess("Institute receiving bank details saved securely.");
      setTimeout(() => setBankSuccess(null), 4000);
    } catch (err) {
      setBankError(err.response?.data?.message || "Could not save institute bank details.");
    } finally {
      setSavingBank(false);
    }
  }

  // Handle Payment Gateway Submit
  async function handlePaymentSubmit(e) {
    e.preventDefault();
    if (savingPayment) return;
    setSavingPayment(true);
    setPaymentSuccess(null);
    setPaymentError(null);

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
      setPaymentSuccess("Online payment gateway account updated.");
      setTimeout(() => setPaymentSuccess(null), 4000);
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Could not save payment account.");
    } finally {
      setSavingPayment(false);
    }
  }

  // Handle Revenue Split Submit
  async function handleSplitSubmit(e) {
    e.preventDefault();
    if (savingSplit) return;
    setSavingSplit(true);
    setSplitSuccess(null);
    setSplitError(null);

    try {
      const updated = await updateRevenueSplit({ commissionPercent: Number(commissionPercent) });
      setCommissionPercent(String(updated.commissionPercent));
      setSplitSuccess("Revenue split configuration updated.");
      setTimeout(() => setSplitSuccess(null), 4000);
    } catch (err) {
      setSplitError(err.response?.data?.message || "Could not save revenue split.");
    } finally {
      setSavingSplit(false);
    }
  }

  // Revenue simulator calculation
  const simCalculation = useMemo(() => {
    const fee = parseFloat(simFee) || 0;
    const commPct = parseFloat(commissionPercent) || 2.0;
    const instCut = (fee * commPct) / 100;
    const teacherCut = Math.max(0, fee - instCut);
    return { instCut, teacherCut };
  }, [simFee, commissionPercent]);

  return (
    <DashboardShell title="Platform Settings">
      <div className="space-y-6">
        {/* Header matching user's requested layout */}
        <div>
          <h1 className="text-2xl font-bold text-[#1A2D2A] tracking-tight">Platform &amp; Account Settings</h1>
          <p className="text-xs text-[#718A85] mt-1 font-medium">
            Configure organization branding, integrations, and preferences
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* =========================================================================
              LEFT SUB-NAVIGATION SIDEBAR
              ========================================================================= */}
          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-5">
              {/* Category: General Account */}
              <div>
                <p className="text-[11px] font-bold text-[#718A85] uppercase tracking-wider px-3 mb-2 select-none">
                  General Account
                </p>
                <div className="space-y-1">
                  <TabButton
                    id="profile"
                    label="Profile"
                    icon={User}
                    active={activeTab === "profile"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="appearance"
                    label="Appearance"
                    icon={Palette}
                    active={activeTab === "appearance"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="password"
                    label="Change Password"
                    icon={Lock}
                    active={activeTab === "password"}
                    onClick={setActiveTab}
                  />
                </div>
              </div>

              {/* Category: Institute Branding */}
              <div>
                <p className="text-[11px] font-bold text-[#718A85] uppercase tracking-wider px-3 mb-2 select-none">
                  Institute Branding
                </p>
                <div className="space-y-1">
                  <TabButton
                    id="institute"
                    label="Institute"
                    icon={Building2}
                    active={activeTab === "institute"}
                    onClick={setActiveTab}
                  />
                </div>
              </div>

              {/* Category: Billing & Invoices */}
              <div>
                <p className="text-[11px] font-bold text-[#718A85] uppercase tracking-wider px-3 mb-2 select-none">
                  Billing &amp; Invoices
                </p>
                <div className="space-y-1">
                  <TabButton
                    id="schedule"
                    label="Billing Cycle"
                    icon={CalendarClock}
                    active={activeTab === "schedule"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="gateway"
                    label="Payment Account"
                    icon={CreditCard}
                    active={activeTab === "gateway"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="split"
                    label="Revenue Split"
                    icon={TrendingUp}
                    active={activeTab === "split"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="bank"
                    label="Institute Bank Details"
                    icon={Landmark}
                    active={activeTab === "bank"}
                    onClick={setActiveTab}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* =========================================================================
              RIGHT CONTENT PANEL
              ========================================================================= */}
          <div className="lg:col-span-9">
            {/* ---------------------------------------------------------------------
                TAB 1: PERSONAL PROFILE (Matches reference screenshot precisely)
                --------------------------------------------------------------------- */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Personal Profile</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Your name and contact details across the platform.
                  </p>
                </div>

                {profileSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{profileSuccess}</span>
                  </div>
                )}
                {profileError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{profileError}</div>
                )}

                {/* Form Fields: First Name, Last Name, Email, Phone */}
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label htmlFor="profile-name" className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Full Name</label>
                      <input
                        id="profile-name"
                        type="text"
                        required
                        maxLength={120}
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>
                    <div>
                      <label htmlFor="profile-email" className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Email Address</label>
                      <input
                        id="profile-email"
                        type="email"
                        readOnly
                        value={user?.email || ""}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-slate-500 bg-slate-100 outline-none cursor-not-allowed"
                      />
                      <p className="text-[10px] text-[#718A85] mt-1">Your sign-in email can only be changed by another administrator.</p>
                    </div>
                    <div>
                      <label htmlFor="profile-phone" className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Phone Number</label>
                      <input
                        id="profile-phone"
                        type="tel"
                        maxLength={20}
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                        placeholder="07X XXX XXXX"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                    >
                      {savingProfile ? "Saving..." : "Save Profile Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 2: APPEARANCE
                --------------------------------------------------------------------- */}
            {activeTab === "appearance" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Appearance &amp; Theme</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Choose your institute's brand accent colour.
                  </p>
                </div>

                {appearanceSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{appearanceSuccess}</span>
                  </div>
                )}
                {appearanceError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{appearanceError}</div>
                )}

                <div className="space-y-6">
                  {/* Brand Accent Swatches */}
                  <div>
                    <h3 className="text-xs font-bold text-[#1A2D2A] mb-1">Brand Accent Color</h3>
                    <p className="text-[11px] text-[#718A85] mb-3">
                      Selected color will appear on active indicator pills, primary buttons, and printable receipts.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      {[
                        { color: "#00A389", name: "Emerald Mint" },
                        { color: "#0E4940", name: "Deep Forest" },
                        { color: "#2563EB", name: "Royal Blue" },
                        { color: "#4F46E5", name: "Indigo Slate" },
                        { color: "#7C3AED", name: "Vibrant Violet" },
                        { color: "#D97706", name: "Warm Amber" },
                      ].map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => setSelectedThemeColor(item.color)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                            selectedThemeColor.toLowerCase() === item.color.toLowerCase()
                              ? "border-[#00A389] bg-emerald-50 text-[#1A2D2A]"
                              : "border-[#E3EBE8] hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </button>
                      ))}

                      {/* Custom Color Input */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E3EBE8]">
                        <input
                          type="color"
                          value={selectedThemeColor}
                          onChange={(e) => setSelectedThemeColor(e.target.value)}
                          className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono text-slate-600 uppercase">{selectedThemeColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={handleSaveAppearance}
                      disabled={savingAppearance}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                    >
                      {savingAppearance ? "Saving..." : "Save Brand Colour"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 3: CHANGE PASSWORD
                --------------------------------------------------------------------- */}
            {activeTab === "password" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Security &amp; Password</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Update your account password to protect access to administrative modules.
                  </p>
                </div>

                {passwordSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Current Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      placeholder="••••••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      placeholder="At least 8 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      placeholder="Repeat new password"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 4: INSTITUTE BRANDING
                --------------------------------------------------------------------- */}
            {activeTab === "institute" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Institute Branding</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Official organization details, public contact address, and attendance policies.
                  </p>
                </div>

                {instituteSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{instituteSuccess}</span>
                  </div>
                )}

                {instituteError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600" />
                    <span>{instituteError}</span>
                  </div>
                )}

                <form onSubmit={handleInstituteSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Institute Name</label>
                      <input
                        type="text"
                        required
                        value={instituteForm.name}
                        onChange={(e) => setInstituteForm({ ...instituteForm, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Campus Main Address</label>
                      <input
                        type="text"
                        value={instituteForm.address}
                        onChange={(e) => setInstituteForm({ ...instituteForm, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Official Contact Email</label>
                      <input
                        type="email"
                        value={instituteForm.contactEmail}
                        onChange={(e) => setInstituteForm({ ...instituteForm, contactEmail: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Attendance Warning Threshold (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={instituteForm.attendanceThresholdPercent}
                        onChange={(e) => setInstituteForm({ ...instituteForm, attendanceThresholdPercent: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Students falling below this threshold get flagged for risk intervention.
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Logo URL</label>
                      <input
                        type="url"
                        placeholder="https://domain.com/logo.png"
                        value={instituteForm.logoUrl}
                        onChange={(e) => setInstituteForm({ ...instituteForm, logoUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Logo Preview */}
                  {instituteForm.logoUrl && (
                    <div className="p-4 rounded-xl border border-[#E3EBE8] bg-slate-50 flex items-center gap-4">
                      <img src={instituteForm.logoUrl} alt="Logo preview" className="h-12 w-12 object-contain rounded" />
                      <div>
                        <p className="text-xs font-bold text-[#1A2D2A]">Logo Loaded</p>
                        <p className="text-[11px] text-[#718A85]">Will display in header and printable payment receipts.</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={savingInstitute}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingInstitute ? "Saving..." : "Save Institute Settings"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 5: INSTITUTE BANK DETAILS (Key request from user)
                --------------------------------------------------------------------- */}
            {activeTab === "bank" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Institute Bank Details</h2>
                    <p className="text-xs text-[#718A85] mt-0.5">
                      Receiving bank account for tuition fees, counter cash/slip reconciliations, and parent direct deposits.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>AES-256 Encrypted</span>
                  </div>
                </div>

                {bankSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{bankSuccess}</span>
                  </div>
                )}

                {bankError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600" />
                    <span>{bankError}</span>
                  </div>
                )}

                {/* Status Card if details already saved */}
                {bankDetails?.hasDetails ? (
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0E4940]">
                        <Landmark size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1A2D2A]">{bankDetails.bankName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 text-[10px] font-extrabold uppercase">
                            Configured &amp; Active
                          </span>
                        </div>
                        <p className="text-[11px] text-[#718A85] font-medium mt-0.5">
                          {bankDetails.accountHolderName} • Account: <span className="font-mono font-bold text-slate-700">{bankDetails.maskedAccountNumber}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center gap-3 text-xs text-amber-900">
                    <Info size={18} className="text-amber-600 shrink-0" />
                    <span>No institute bank account is currently stored. Enter details below to enable counter slip reference validation.</span>
                  </div>
                )}

                <form onSubmit={handleBankSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Bank Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bank of Ceylon / Commercial Bank / Sampath Bank"
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Beneficiary / Account Holder Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Colombo Tuition Institute (Pvt) Ltd"
                        value={bankForm.accountHolderName}
                        onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Account Number {bankDetails?.hasDetails && "(Leave blank to keep existing)"}
                      </label>
                      <input
                        type="text"
                        required={!bankDetails?.hasDetails}
                        placeholder={bankDetails?.hasDetails ? bankDetails.maskedAccountNumber : "Enter full account number"}
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none font-mono transition"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Account numbers are encrypted before being written to the database.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Branch Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Colombo Fort / Kollupitiya"
                        value={bankForm.branchName}
                        onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        SWIFT / Routing / Sort Code (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BCEYLKLX"
                        value={bankForm.routingOrSwiftCode}
                        onChange={(e) => setBankForm({ ...bankForm, routingOrSwiftCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none uppercase font-mono transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={savingBank}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingBank ? "Saving..." : "Save Institute Bank Details"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 6: PAYMENT ACCOUNT (GATEWAYS)
                --------------------------------------------------------------------- */}
            {activeTab === "gateway" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Payment Account &amp; Gateways</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Connect payment gateways for online tuition fee checkout by parents and students.
                  </p>
                </div>

                {paymentSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{paymentSuccess}</span>
                  </div>
                )}

                {paymentError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <form onSubmit={handlePaymentSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Gateway Provider</label>
                      <select
                        value={paymentForm.gatewayProvider}
                        onChange={(e) => setPaymentForm({ ...paymentForm, gatewayProvider: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      >
                        <option value="PayHere">PayHere (Sri Lanka LKR)</option>
                        <option value="Stripe">Stripe Payments</option>
                        <option value="CommercialBankIPG">Commercial Bank IPG</option>
                        <option value="MockGateway">Sandbox Test Gateway</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Merchant / Account Identifier
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1211234 or acct_12345"
                        value={paymentForm.accountIdentifier}
                        onChange={(e) => setPaymentForm({ ...paymentForm, accountIdentifier: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none font-mono transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        API Key {paymentAccount?.hasApiKey && "(Stored - leave blank to keep)"}
                      </label>
                      <input
                        type="password"
                        placeholder={paymentAccount?.hasApiKey ? "••••••••••••••••" : "Paste API Key"}
                        value={paymentForm.apiKey}
                        onChange={(e) => setPaymentForm({ ...paymentForm, apiKey: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none font-mono transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        API Secret {paymentAccount?.hasApiSecret && "(Stored - leave blank to keep)"}
                      </label>
                      <input
                        type="password"
                        placeholder={paymentAccount?.hasApiSecret ? "••••••••••••••••" : "Paste API Secret"}
                        value={paymentForm.apiSecret}
                        onChange={(e) => setPaymentForm({ ...paymentForm, apiSecret: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none font-mono transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Webhook Secret {paymentAccount?.hasWebhookSecret && "(Stored - leave blank to keep)"}
                      </label>
                      <input
                        type="password"
                        placeholder={paymentAccount?.hasWebhookSecret ? "••••••••••••••••" : "Paste Webhook Secret"}
                        value={paymentForm.webhookSecret}
                        onChange={(e) => setPaymentForm({ ...paymentForm, webhookSecret: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none font-mono transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={savingPayment}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingPayment ? "Saving..." : "Save Payment Account"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 7: REVENUE SPLIT
                --------------------------------------------------------------------- */}
            {activeTab === "split" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Tuition Revenue Split</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Percentage retained by institute upon student payment before releasing teacher net earnings.
                  </p>
                </div>

                {splitSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{splitSuccess}</span>
                  </div>
                )}

                {splitError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600" />
                    <span>{splitError}</span>
                  </div>
                )}

                <form onSubmit={handleSplitSubmit} className="space-y-6 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                      Institute Retained Commission Percentage (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        value={commissionPercent}
                        onChange={(e) => setCommissionPercent(e.target.value)}
                        className="w-40 px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none font-bold transition"
                      />
                      <span className="text-sm font-bold text-[#1A2D2A]">%</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1.5 block">
                      Applies automatically to invoices processed online and counter payments.
                    </span>
                  </div>

                  {/* Interactive Fee Calculator Preview */}
                  <div className="p-5 rounded-2xl bg-[#F4F7F6] border border-[#E3EBE8] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1A2D2A]">Live Split Calculator</span>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-slate-500">Sample Fee: LKR</span>
                        <input
                          type="number"
                          value={simFee}
                          onChange={(e) => setSimFee(e.target.value)}
                          className="w-24 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white text-right"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3.5 rounded-xl bg-white border border-[#E3EBE8]">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
                          Institute Retention ({commissionPercent}%)
                        </span>
                        <p className="text-base font-bold text-[#0E4940] mt-1">
                          LKR {simCalculation.instCut.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-[#E3EBE8]">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                          Teacher Net Payout
                        </span>
                        <p className="text-base font-bold text-slate-800 mt-1">
                          LKR {simCalculation.teacherCut.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSplit}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingSplit ? "Saving..." : "Save Revenue Split"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 8: BILLING CYCLE (read-only — this is how BillingService actually runs)
                --------------------------------------------------------------------- */}
            {activeTab === "schedule" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Billing Cycle</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    How monthly invoices, reminders and overdue notices run. These rules are fixed for every institute.
                  </p>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {[
                    ["Invoice generation", "Automatically on the 1st of every month, one invoice per active enrollment with an active fee structure."],
                    ["Due date", "14 days after the invoice is generated."],
                    ["Discounts", "Active sibling, scholarship and other discounts are applied when the invoice is generated."],
                    ["Reminders", "Linked parents get an email and in-app reminder 7 days and 1 day before the due date."],
                    ["Overdue", "Unpaid invoices are marked Overdue the day after the due date, and parents are notified."],
                    ["Run manually", "Fee Management → Run Monthly Billing generates this month's invoices immediately (it never duplicates)."],
                  ].map(([term, detail]) => (
                    <div key={term} className="p-4 rounded-xl border border-[#E3EBE8] bg-slate-50/50">
                      <dt className="font-bold text-[#1A2D2A]">{term}</dt>
                      <dd className="text-[#627D77] mt-1">{detail}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// Sub-navigation Button Component
function TabButton({ id, label, icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
        active
          ? "bg-white text-[#1A2D2A] font-bold shadow-2xs border border-[#E3EBE8]"
          : "text-[#627D77] hover:text-[#1A2D2A] hover:bg-white/60"
      }`}
    >
      <Icon size={16} className={active ? "text-[#00A389]" : "text-[#8DAAA5]"} />
      <span>{label}</span>
    </button>
  );
}
