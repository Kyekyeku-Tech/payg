import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function PrivateRoute({ children, allow }) {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (mounted && snap.exists()) {
          setRole(snap.data().role);
        }
      } catch (err) {
        console.error("Role fetch error:", err);
      } finally {
        if (mounted) setCheckingRole(false);
      }
    };

    loadRole();
    return () => (mounted = false);
  }, [user]);

  // 🛑 ABSOLUTELY CRITICAL
  if (loading || checkingRole) {
    return (
      <div className="h-screen flex items-center justify-center">
        Restoring session…
      </div>
    );
  }

  // ❌ only now we decide
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
