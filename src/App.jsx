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
import AgentEcw from "./pages/AgentEcw";
import HeadECW from "./pages/HeadECW";
import GMEcw from "./pages/GMEcw";
import AdminApproval from "./pages/AdminApproval";
import PrivateRoute from "./components/PrivateRoute";
import AgentLeaderboard from "./pages/AgentLeaderboard";
import Ecwleader from "./pages/Ecwleader";
import BranchReport from "./pages/BranchReport";
import HeadSubmit from "./pages/HeadSubmit";

/* ================= ROOT REDIRECT ================= */
function RootRedirect() {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!user) return;

    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setRole(snap.data().role);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const lastRoute = localStorage.getItem("lastRoute");
  if (lastRoute && lastRoute !== "/login") {
    return <Navigate to={lastRoute} replace />;
  }

  if (role === "agent") return <Navigate to="/agent/dashboard" replace />;
  if (role === "branch_head") return <Navigate to="/head/dashboard" replace />;
  if (role === "gm") return <Navigate to="/gm/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

/* ================= APP ================= */
export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />

      <Routes>
        {/* ROOT */}
        <Route path="/" element={<RootRedirect />} />

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* ================= AGENT ================= */}
        <Route
          path="/agent/dashboard"
          element={
            <PrivateRoute allow={["agent"]}>
              <AgentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/agent/ecw"
          element={
            <PrivateRoute allow={["agent"]}>
              <AgentEcw />
            </PrivateRoute>
          }
        />
        <Route
          path="/agent/leaderboard"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <AgentLeaderboard />
            </PrivateRoute>
          }
        />

        {/* ================= BRANCH HEAD ================= */}
        <Route
          path="/head/dashboard"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <HeadDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/head/ecw"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <HeadECW />
            </PrivateRoute>
          }
        />
        <Route
          path="/head/report"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <BranchReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/head/submit"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <HeadSubmit />
            </PrivateRoute>
          }
        />

        {/* ================= GM ================= */}
        <Route
          path="/gm/dashboard"
          element={
            <PrivateRoute allow={["gm"]}>
              <GMDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/gm/ecw"
          element={
            <PrivateRoute allow={["gm"]}>
              <GMEcw />
            </PrivateRoute>
          }
        />
        <Route
          path="/gm/leaderboard"
          element={
            <PrivateRoute allow={["gm"]}>
              <AgentLeaderboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/gm/ecwleaderboard"
          element={
            <PrivateRoute allow={["gm"]}>
              <Ecwleader />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/approvals"
          element={
            <PrivateRoute allow={["gm"]}>
              <AdminApproval />
            </PrivateRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
