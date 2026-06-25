import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { changePassword } from "../api/auth";

const HOME_BY_ROLE = {
  SystemAdmin: "/admin",
  BranchAdmin: "/branch",
  Teacher: "/teacher",
  Parent: "/portal",
  Student: "/student",
};

export default function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      const fresh = await refreshUser();
      navigate(HOME_BY_ROLE[fresh.role] || "/login", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-8 w-full max-w-md">
        <h1 className="text-lg font-semibold text-slate-800 mb-1">Set Your Password</h1>
        <p className="text-sm text-slate-500 mb-6">
          {user?.mustChangePassword
            ? "Your account was just created or reset with a temporary password. Choose your own password to continue."
            : "Change your account password."}
        </p>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cp-current" className="block text-xs text-slate-500 mb-1">Current / Temporary Password</label>
            <input
              id="cp-current"
              type="password"
              required
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="cp-new" className="block text-xs text-slate-500 mb-1">New Password (min 8 characters)</label>
            <input
              id="cp-new"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="cp-confirm" className="block text-xs text-slate-500 mb-1">Confirm New Password</label>
            <input
              id="cp-confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-violet-700 text-white rounded px-4 py-2 text-sm w-full disabled:opacity-50"
          >
            {saving ? "Saving…" : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
