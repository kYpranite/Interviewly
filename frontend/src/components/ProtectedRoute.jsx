import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading, openLoginModal } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      openLoginModal(location.pathname);
    }
  }, [loading, user, openLoginModal, location.pathname]);

  if (loading) return <div style={{ padding: 24, color: "#fff" }}>Checking your session…</div>;
  if (!user) return <div style={{ padding: 24, color: "#fff" }}>Please sign in to continue…</div>;
  return children;
}
