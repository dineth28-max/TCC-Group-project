import { Component, useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Catches render-time crashes in any page so one bad record can't white-screen the whole app.
 */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F6] p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md text-center">
          <AlertTriangle className="mx-auto text-amber-500" size={32} />
          <h1 className="mt-3 text-lg font-bold text-slate-900">Something went wrong</h1>
          <p className="mt-1 text-sm text-slate-500">
            This page hit an unexpected error. Your data is safe — reload to continue.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#2457FF] text-white hover:bg-[#1b45db] cursor-pointer"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Safety net for any API call a page didn't handle itself: instead of the action silently doing
 * nothing, the user sees the server's message (or a sensible fallback) as a toast.
 */
export function GlobalErrorToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onUnhandledRejection(event) {
      const reason = event.reason;
      // Only surface API failures (axios errors); unrelated rejections stay in the console.
      if (!reason?.isAxiosError && !reason?.response) return;
      // 401s are handled by the auth interceptor (session refresh / redirect to login).
      if (reason.response?.status === 401) return;
      const message = reason.response?.data?.message || "Something went wrong. Please try again.";
      const id = Date.now() + Math.random();
      setToasts((list) => [...list.filter((t) => t.message !== message), { id, message }].slice(-3));
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 6000);
    }
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="alert" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-start gap-3 bg-white border border-red-200 shadow-lg rounded-xl px-4 py-3 text-xs text-red-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="text-red-400 hover:text-red-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
