import { Link } from "react-router-dom";
import "./navbar.css";

export default function Navbar() {
  return (
    <header className="nav">
      <nav aria-label="Main" className="nav-inner">
        <Link to="/" className="brand" aria-label="Interviewly Home">
          Interviewly
        </Link>
        <Link to="/login" className="nav-link">Log in</Link>
      </nav>
    </header>
  );
}
