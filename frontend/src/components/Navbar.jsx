import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./navbar.css";

export default function Navbar() {
  const { user, signOutUser, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOutUser();
      navigate("/"); // optional: send home after logout
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  };

  const handleLoginClick = () => {
    openLoginModal();
  };

  // Get readable path name
  const getPathName = (pathname) => {
    switch (pathname) {
      case "/":
        return "Home";
      case "/dashboard":
        return "Dashboard";
      case "/code":
        return "Code";
      case "/results":
        return "Results";
      case "/login":
        return "Login";
      default:
        return pathname.slice(1); // Remove leading slash and capitalize
    }
  };

  return (
    <header className="nav">
      <nav aria-label="Main" className="nav-inner">
        <div className="nav-left">
          <Link
            to="/"
            className="brand"
            aria-label="Interviewly Home"
          >
            Interviewly
          </Link>
          <span className="nav-path">
            <span className="nav-separator">/</span>
            <span className="nav-current-path">{getPathName(location.pathname)}</span>
          </span>
        </div>

        {user ? (
          <button className="btn btn--md nav-auth-btn" onClick={handleLogout}>
            Log out
          </button>
        ) : (
          <button className="btn btn--ghost btn--md" onClick={handleLoginClick}>
            Log in
          </button>
        )}
      </nav>
    </header>
  );
}
