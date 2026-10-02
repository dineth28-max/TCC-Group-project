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
  FileText,
  CreditCard,
  TrendingUp,
  Landmark,
  Package,
  Receipt,
  Wallet,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
  Building,
  KeyRound,
  ExternalLink,
  Sparkles,
  Info,
  DollarSign,
  Layers,
} from "lucide-react";

export default function SettingsManagement() {
  const { user, refreshUser } = useAuth();
  const isSystemAdmin = user?.role === "SystemAdmin";

  // Active navigation tab
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form state
  const nameParts = (user?.fullName || "Asha Perera").trim().split(" ");
  const defaultFirstName = nameParts[0] || "Asha";
  const defaultLastName = nameParts.slice(1).join(" ") || "Perera";

  const [profileForm, setProfileForm] = useState({
    firstName: defaultFirstName,
    lastName: defaultLastName,
    email: user?.email || "admin@demo.csmas",
    phone: "077 234 5678",
  });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Appearance Form state
  const [selectedThemeColor, setSelectedThemeColor] = useState("#00A389");
  const [uiMode, setUiMode] = useState("light");
  const [appearanceSuccess, setAppearanceSuccess] = useState(null);

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
    name: user?.instituteName || "Colombo Tuition Institute",
    address: "123 Galle Road, Colombo 03",
    contactEmail: "admin@colombotuition.lk",
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

  // Invoice Schedule Form state
  const [scheduleForm, setScheduleForm] = useState({
    billingDay: "1",
    graceDays: "10",
    autoSms: true,
    autoEmail: true,
    overdueWarning: true,
  });
  const [scheduleSuccess, setScheduleSuccess] = useState(null);

  // Invoice Template Form state
  const [templateForm, setTemplateForm] = useState({
    prefix: "INV-2026-",
    taxRegistration: "PV-88912-TUITION",
    signatoryTitle: "Registrar / Finance Bursar",
    footerTerms: "Tuition fees paid are strictly non-refundable and non-transferable across terms.",
  });
  const [templateSuccess, setTemplateSuccess] = useState(null);

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
            name: s.name || "Colombo Tuition Institute",
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

  // Compute initials
  const initials = useMemo(() => {
    const f = profileForm.firstName?.trim()?.[0] || "A";
    const l = profileForm.lastName?.trim()?.[0] || "P";
    return (f + l).toUpperCase();
  }, [profileForm.firstName, profileForm.lastName]);

  // Handle Photo Upload
  function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      setProfileSuccess("Profile photo updated.");
      setTimeout(() => setProfileSuccess(null), 3500);
    }
  }

  // Handle Profile Save
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    try {
      setProfileSuccess("Personal profile saved successfully.");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch {
      setProfileError("Could not update profile.");
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
                    label="Invoice Schedule"
                    icon={CalendarClock}
                    active={activeTab === "schedule"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="template"
                    label="Invoice Template"
                    icon={FileText}
                    active={activeTab === "template"}
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

              {/* Category: Subscription */}
              <div>
                <p className="text-[11px] font-bold text-[#718A85] uppercase tracking-wider px-3 mb-2 select-none">
                  Subscription
                </p>
                <div className="space-y-1">
                  <TabButton
                    id="plan"
                    label="Plan &amp; Billing"
                    icon={Package}
                    active={activeTab === "plan"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="sub-payments"
                    label="Subscription Payments"
                    icon={Receipt}
                    active={activeTab === "sub-payments"}
                    onClick={setActiveTab}
                  />
                  <TabButton
                    id="payment-method"
                    label="Payment Method"
                    icon={Wallet}
                    active={activeTab === "payment-method"}
                    onClick={setActiveTab}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Docked Plan Card matching reference screenshot */}
            <div className="p-4 rounded-2xl bg-white border border-[#E3EBE8] shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#1A2D2A]">Custom Plan</p>
                <p className="text-[11px] text-[#718A85] font-medium">Active plan</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE6E2] text-xs font-semibold text-[#1A2D2A] hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                <CreditCard size={13} className="text-[#00A389]" />
                <span>Billing</span>
              </button>
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
                    Your name, photo and contact details across the platform.
                  </p>
                </div>

                {profileSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {/* Profile Headshot */}
                <div className="space-y-3 pb-6 border-b border-[#E3EBE8]/80">
                  <div>
                    <h3 className="text-xs font-bold text-[#1A2D2A]">Profile Headshot</h3>
                    <p className="text-[11px] text-[#718A85]">Upload an avatar image. Recommended size 400×400px.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#0E4940] to-[#00A389] text-white text-lg font-bold flex items-center justify-center shadow-xs border-2 border-white overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCE6E2] text-xs font-semibold text-[#1A2D2A] hover:bg-slate-50 transition cursor-pointer shadow-2xs">
                        <Camera size={14} className="text-[#00A389]" />
                        <span>Change Photo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      </label>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl(null)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields: First Name, Last Name, Email, Phone */}
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">First Name</label>
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                        placeholder="e.g. Asha"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Last Name</label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                        placeholder="e.g. Perera"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                        placeholder="name@csmas.lk"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Phone Number</label>
                      <input
                        type="text"
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
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                    >
                      Save Profile Changes
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
                    Customize your institute accent colors, theme contrast, and display density.
                  </p>
                </div>

                {appearanceSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{appearanceSuccess}</span>
                  </div>
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

                  {/* UI Mode Toggle */}
                  <div className="pt-4 border-t border-[#E3EBE8]/80">
                    <h3 className="text-xs font-bold text-[#1A2D2A] mb-1">Interface Color Scheme</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      {[
                        { id: "light", label: "Enterprise Light", desc: "Crisp emeralds & light slates (recommended)" },
                        { id: "dark", label: "Dark OLED", desc: "High contrast dark canvas" },
                        { id: "system", label: "System Sync", desc: "Follow OS preference" },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setUiMode(mode.id)}
                          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            uiMode === mode.id
                              ? "border-[#00A389] bg-emerald-50/60 ring-1 ring-[#00A389]"
                              : "border-[#E3EBE8] hover:bg-slate-50"
                          }`}
                        >
                          <p className="text-xs font-bold text-[#1A2D2A]">{mode.label}</p>
                          <p className="text-[10px] text-[#718A85] mt-1">{mode.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAppearanceSuccess("Appearance settings saved.");
                        setTimeout(() => setAppearanceSuccess(null), 3500);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                    >
                      Save Appearance Preferences
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
                TAB 8: INVOICE SCHEDULE
                --------------------------------------------------------------------- */}
            {activeTab === "schedule" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Invoice Schedule &amp; Billing Cycles</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Automated monthly tuition invoice dispatching, due date intervals, and payment reminders.
                  </p>
                </div>

                {scheduleSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{scheduleSuccess}</span>
                  </div>
                )}

                <div className="space-y-5 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Monthly Invoicing Generation Day
                      </label>
                      <select
                        value={scheduleForm.billingDay}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, billingDay: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      >
                        <option value="1">1st of every month</option>
                        <option value="5">5th of every month</option>
                        <option value="10">10th of every month</option>
                        <option value="25">25th of every month</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Payment Due Grace Period
                      </label>
                      <select
                        value={scheduleForm.graceDays}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, graceDays: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      >
                        <option value="7">7 Days after generation</option>
                        <option value="10">10 Days after generation</option>
                        <option value="14">14 Days after generation</option>
                        <option value="30">End of calendar month</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleForm.autoEmail}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, autoEmail: e.target.checked })}
                        className="h-4 w-4 rounded text-[#00A389] focus:ring-[#00A389]"
                      />
                      <span className="text-xs text-[#1A2D2A] font-medium">
                        Automatically email printable invoice voucher to parents on generation
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleForm.overdueWarning}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, overdueWarning: e.target.checked })}
                        className="h-4 w-4 rounded text-[#00A389] focus:ring-[#00A389]"
                      />
                      <span className="text-xs text-[#1A2D2A] font-medium">
                        Trigger automated overdue notifications 3 days before cutoff
                      </span>
                    </label>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleSuccess("Billing schedule and automated cycles saved.");
                        setTimeout(() => setScheduleSuccess(null), 3500);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                    >
                      Save Invoice Schedule
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 9: INVOICE TEMPLATE
                --------------------------------------------------------------------- */}
            {activeTab === "template" && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Invoice &amp; Receipt Template</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Customize invoice numbering prefixes, receipt disclaimers, and authorized signatories.
                  </p>
                </div>

                {templateSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{templateSuccess}</span>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Invoice Number Prefix</label>
                      <input
                        type="text"
                        value={templateForm.prefix}
                        onChange={(e) => setTemplateForm({ ...templateForm, prefix: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none font-mono transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Business / Tax Registration No
                      </label>
                      <input
                        type="text"
                        value={templateForm.taxRegistration}
                        onChange={(e) => setTemplateForm({ ...templateForm, taxRegistration: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">Authorized Signatory Title</label>
                      <input
                        type="text"
                        value={templateForm.signatoryTitle}
                        onChange={(e) => setTemplateForm({ ...templateForm, signatoryTitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2C4A44] mb-1.5">
                        Receipt Footer Terms &amp; Disclaimer
                      </label>
                      <textarea
                        rows={2}
                        value={templateForm.footerTerms}
                        onChange={(e) => setTemplateForm({ ...templateForm, footerTerms: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6E2] text-xs text-[#1A2D2A] bg-slate-50/50 focus:bg-white focus:border-[#00A389] outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateSuccess("Receipt template formatting saved.");
                        setTimeout(() => setTemplateSuccess(null), 3500);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#00A389] hover:bg-[#008c75] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                    >
                      Save Receipt Template
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------------
                TAB 10: SUBSCRIPTION & PLAN (Plan & Billing / Payments / Methods)
                --------------------------------------------------------------------- */}
            {(activeTab === "plan" || activeTab === "sub-payments" || activeTab === "payment-method") && (
              <div className="bg-white rounded-2xl border border-[#E3EBE8] shadow-xs p-7 sm:p-8 space-y-6">
                <div className="border-b border-[#E3EBE8]/80 pb-5">
                  <h2 className="text-lg font-bold text-[#1A2D2A] tracking-tight">Subscription &amp; Platform License</h2>
                  <p className="text-xs text-[#718A85] mt-0.5">
                    Your institutional plan details, multi-tenant compute limits, and active billing status.
                  </p>
                </div>

                {/* Plan Hero Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0E4940] to-[#0A3731] text-white shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 -skew-x-12" />
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Active Enterprise License</span>
                      </div>
                      <h3 className="text-xl font-bold mt-2 tracking-tight">CSMAS Unlimited Campus Tier</h3>
                      <p className="text-xs text-emerald-100/80 mt-1 max-w-md">
                        Institutional multi-branch license with dedicated AI Risk Engine, counter payments terminal, and isolated data containers.
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-white">Custom Tier</p>
                      <p className="text-[11px] text-emerald-200">Renews Annually</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-800/60 text-xs">
                    <div>
                      <p className="text-[10px] text-emerald-300 uppercase font-semibold">Campuses</p>
                      <p className="font-bold text-white text-sm mt-0.5">Unlimited</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-300 uppercase font-semibold">Active Students</p>
                      <p className="font-bold text-white text-sm mt-0.5">Unlimited</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-300 uppercase font-semibold">AI Predictor</p>
                      <p className="font-bold text-white text-sm mt-0.5">Continuous Active</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-300 uppercase font-semibold">SLA Uptime</p>
                      <p className="font-bold text-white text-sm mt-0.5">99.9% Production</p>
                    </div>
                  </div>
                </div>

                {/* Subscription Payment Card */}
                <div className="p-5 rounded-2xl border border-[#E3EBE8] bg-[#F4F7F6]/60 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-white border border-[#E3EBE8] flex items-center justify-center text-[#00A389] shadow-2xs">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1A2D2A]">Primary Billing Method</p>
                      <p className="text-[11px] text-[#718A85]">Direct Institutional Contract Invoice</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#0E4940] text-xs font-bold">
                    Good Standing
                  </span>
                </div>
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
