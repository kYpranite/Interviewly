import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import AuthContext from "./AuthContext";
import LoginModal from "../components/LoginModal";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/code");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);
      // Close login modal when user successfully logs in
      if (u) {
        setShowLoginModal(false);
      }
    });
    return () => unsub();
  }, []);

  const signOutUser = () => signOut(auth);
  
  const openLoginModal = (destination = "/code") => {
    setRedirectTo(destination);
    setShowLoginModal(true);
  };
  
  const closeLoginModal = () => setShowLoginModal(false);
  
  const value = useMemo(() => ({ 
    user, 
    loading, 
    signOutUser, 
    openLoginModal, 
    closeLoginModal,
    showLoginModal 
  }), [user, loading, showLoginModal]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={closeLoginModal} 
        redirectTo={redirectTo}
      />
    </AuthContext.Provider>
  );
}
