import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 24, color: "#fff" }}>Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
