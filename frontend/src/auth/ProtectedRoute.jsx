import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ roles, children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <div className="p-8 text-center text-gray-500">Loading session…</div>;
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace />;
  }
  // Phase 16: an admin-created or admin-reset account must set its own password before reaching
  // any dashboard — the credential the admin set/generated is meaningfully secret, not permanent.
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
