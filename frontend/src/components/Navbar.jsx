import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./navbar.css";

export default function Navbar() {
  const { user, signOutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOutUser();
      navigate("/"); // optional: send home after logout
    } catch (e) {
      console.error("Sign out failed:", e);
    }
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
          <Link
            to="/login"
            state={{ from: location }}   // so we can return after login
            className="nav-link"
          >
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
