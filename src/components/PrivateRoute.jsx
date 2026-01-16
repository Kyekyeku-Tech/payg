import { Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function PrivateRoute({ children, allow }) {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const loadRole = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      // Only fetch role if we need to check permissions
      if (!allow || allow.length === 0) {
        setChecking(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        setRole(snap.data().role);
      }

      setChecking(false);
    };

    loadRole();
  }, [user, allow]);

  // 🔥 CRITICAL: WAIT — DO NOT REDIRECT YET
  if (loading || (checking && allow && allow.length > 0)) {
    return (
      <div className="h-screen flex items-center justify-center">
        Restoring session…
      </div>
    );
  }

  // ❌ NOT LOGGED IN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ❌ ROLE NOT ALLOWED (only check if allow prop is provided)
  if (allow && allow.length > 0 && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  // ✅ ACCESS GRANTED
  return children;
}
