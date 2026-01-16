import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import RouteTracker from "./components/RouteTracker";

import Login from "./pages/Login";
import AgentDashboard from "./pages/Agentdashboard";
import HeadDashboard from "./pages/HeadDashboard";
import GMDashboard from "./pages/GMDashboard";
import AdminApproval from "./pages/AdminApproval";
import PrivateRoute from "./components/PrivateRoute";
import AgentLeaderboard from "./pages/AgentLeaderboard";
import BranchReport from "./pages/BranchReport";

// Smart root component that handles initial redirect
function RootRedirect() {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      if (!user) {
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
  }, [user]);

  if (loading || checking) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, redirect to appropriate dashboard or lastRoute
  const lastRoute = localStorage.getItem("lastRoute");
  if (lastRoute && lastRoute !== "/login") {
    return <Navigate to={lastRoute} replace />;
  }

  // Default to role-based dashboard
  if (role === "agent") return <Navigate to="/agent/dashboard" replace />;
  if (role === "branch_head") return <Navigate to="/head/dashboard" replace />;
  if (role === "gm") return <Navigate to="/gm/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />

      <Routes>
        {/* ROOT - Smart redirect */}
        <Route path="/" element={<RootRedirect />} />

        <Route
  path="/gm/leaderboard"
  element={<AgentLeaderboard />}
/>
<Route
  path="/head/report"
  element={<BranchReport />}
/>


        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* AGENT */}
        <Route
          path="/agent/dashboard"
          element={
            <PrivateRoute allow={["agent"]}>
              <AgentDashboard />
            </PrivateRoute>
          }
        />

        {/* BRANCH HEAD */}
        <Route
          path="/head/dashboard"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <HeadDashboard />
            </PrivateRoute>
          }
        />

        {/* GM DASHBOARD */}
        <Route
          path="/gm/dashboard"
          element={
            <PrivateRoute allow={["gm"]}>
              <GMDashboard />
            </PrivateRoute>
          }
        />

        {/* ADMIN / GM APPROVAL */}
        <Route
          path="/admin/approvals"
          element={
            <PrivateRoute allow={["gm"]}>
              <AdminApproval />
            </PrivateRoute>
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
