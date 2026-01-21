import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ children, allow }) {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (mounted && snap.exists()) {
          setRole(snap.data().role);
        }
      } catch (err) {
        console.error("Role check failed:", err);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    loadRole();
    return () => (mounted = false);
  }, [user]);

  /* ⏳ WAIT FOR AUTH + ROLE */
  if (loading || checking) {
    return (
      <div className="h-screen flex items-center justify-center">
        Checking access…
      </div>
    );
  }

  /* 🔐 NOT LOGGED IN */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* 🚫 ROLE NOT ALLOWED */
  if (allow && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  /* ✅ ALLOWED */
  return children;
}
