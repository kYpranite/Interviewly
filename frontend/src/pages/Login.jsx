import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import "./auth.css";

async function createUserDocument(user) {
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      emailVerified: user.emailVerified,
      createdAt: serverTimestamp(),
      role: "user",
      isActive: true,
    });
  }
}

export default function Login() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const redirectTo = state?.from?.pathname || "/code";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && user) nav(redirectTo, { replace: true });
  }, [loading, user, nav, redirectTo]);

  const handleGoogle = async () => {
    try {
      setBusy(true);
      setErr("");
      const res = await signInWithPopup(auth, googleProvider);
      await createUserDocument(res.user);
      nav(redirectTo, { replace: true });
    } catch (e) {
      setErr("Sign-in failed. Please try again.");
      console.error(e);
      setBusy(false);
    }
  };

  if (loading) return null; // no “login stuff”; just wait silently

  return (
    <div className="auth-wrap">
      <button
        className="btn btn--primary"
        onClick={handleGoogle}
        disabled={busy}
        aria-label="Continue with Google"
      >
        <span className="g-logo" aria-hidden="true">
          {/* Google "G" SVG */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.23 9.23 3.64l6.9-6.9C35.9 2.38 30.4 0 24 0 14.62 0 6.4 5.38 2.47 13.22l8.1 6.29C12.43 13.15 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.22-.44-4.74H24v9h12.65c-.55 2.96-2.21 5.48-4.71 7.18l7.2 5.59C43.77 37.5 46.5 31.5 46.5 24.5z"/>
            <path fill="#FBBC05" d="M10.57 25.51a14.5 14.5 0 0 1 0-9.02l-8.1-6.29C.86 13.08 0 16.41 0 20c0 3.59.86 6.92 2.47 9.8l8.1-6.29z"/>
            <path fill="#34A853" d="M24 48c6.4 0 11.85-2.11 15.8-5.74l-7.2-5.59c-2 1.35-4.56 2.15-8.6 2.15-6.26 0-11.57-3.65-13.43-8.73l-8.1 6.29C6.4 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
        </span>
        <span className="label">{busy ? "Signing in…" : "Continue with Google"}</span>
      </button>

      {err && <div className="auth-error">{err}</div>}
    </div>
  );
}
