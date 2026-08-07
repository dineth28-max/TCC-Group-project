import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ roles, children }) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return <div className="p-8 text-center text-gray-500">Loading session…</div>;
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
