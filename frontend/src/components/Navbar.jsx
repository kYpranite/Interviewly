import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./navbar.css";

export default function Navbar() {
  const { user, signOutUser, openLoginModal } = useAuth();
  const navigate = useNavigate();

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

  return (
    <header className="nav">
      <nav aria-label="Main" className="nav-inner">
        <Link
          to="/"
          className="brand"
          aria-label="Interviewly Home"
        >
          Interviewly
        </Link>

        {user ? (
          <button className="nav-link nav-btn" onClick={handleLogout}>
            Log out
          </button>
        ) : (
          <button className="nav-link nav-btn" onClick={handleLoginClick}>
            Log in
          </button>
        )}
      </nav>
    </header>
  );
}
