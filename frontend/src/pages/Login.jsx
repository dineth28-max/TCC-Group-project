import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { roleHomePath } from "../roleRouting";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(email, password);
      navigate(roleHomePath(me.role), { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || "Could not sign in. Check your email and password.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-violet-500 to-purple-400 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm space-y-4"
      >
        <div className="flex flex-col items-center text-center gap-2 mb-2">
          <div className="h-12 w-12 rounded-xl bg-violet-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            CS
          </div>
          <h1 className="text-xl font-semibold text-slate-800">CSMAS Sign In</h1>
          <p className="text-xs text-slate-500">Class & Student Management System</p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-500 outline-none transition"
            placeholder="you@institute.lk"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-500 outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium transition shadow-sm"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </main>
  );
}
