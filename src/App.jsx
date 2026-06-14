import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import RouteTracker from "./components/RouteTracker";

/* ================= PAGES ================= */
import Login from "./pages/Login";
import AgentDashboard from "./pages/Dsrdashboard";
import HeadDashboard from "./pages/HeadDashboard";
import GMDashboard from "./pages/ManagementDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import AgentEcw from "./pages/AgentEcw";
import AgentCustomerRegister from "./pages/AgentCustomerRegister";
import AgentCustomerList from "./pages/AgentCustomerList";
import BAgentRegistration from "./pages/BAgentRegistration";
import BAgentList from "./pages/BAgentList";
import HeadECW from "./pages/HeadECW";
import GMEcw from "./pages/GMEcw";
import GMCustomerList from "./pages/GMcustomerlist";

import AdminApproval from "./pages/AdminApproval";
import AgentLeaderboard from "./pages/PaygLeaderboard";
import Ecwleader from "./pages/Ecwleader";
import BranchReport from "./pages/HeadReport";
import HeadSubmit from "./pages/HeadSubmit";

import PrivateRoute from "./components/PrivateRoute";

/* ================= ROOT REDIRECT ================= */
function RootRedirect() {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      if (!user) {
        if (mounted) setCheckingRole(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      if (mounted && snap.exists()) {
        setRole(snap.data().role);
      }
      if (mounted) setCheckingRole(false);
    };

    loadRole();
    return () => (mounted = false);
  }, [user]);

  /* ⛔ DO NOTHING UNTIL AUTH IS READY */
  if (loading || checkingRole) {
    return (
      <div className="h-screen flex items-center justify-center">
        Restoring session…
      </div>
    );
  }

  /* ❌ NOT LOGGED IN */
  if (!user) return <Navigate to="/login" replace />;

  /* 🎯 ROLE LANDING */
  if (role === "agent") return <Navigate to="/agent/dashboard" replace />;
  if (role === "branch_head") return <Navigate to="/head/dashboard" replace />;
  if (role === "gm") return <Navigate to="/gm/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

/* ================= APP ================= */
export default function App() {
  return (
    <div className="app-modern">
      <BrowserRouter>
        <RouteTracker />

        <Routes>
          {/* ROOT */}
          <Route path="/" element={<RootRedirect />} />

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />


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
          path="/agent/customers/new"
          element={
            <PrivateRoute allow={["agent"]}>
              <AgentCustomerRegister />
            </PrivateRoute>
          }
        />

        <Route
          path="/agent/customers"
          element={
            <PrivateRoute allow={["agent"]}>
              <AgentCustomerList />
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
          path="/head/customers/new"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <BAgentRegistration />
            </PrivateRoute>
          }
        />

        <Route
          path="/head/customers"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <BAgentList />
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

        <Route
          path="/head/leaderboard"
          element={
            <PrivateRoute allow={["branch_head"]}>
              <AgentLeaderboard />
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
          path="/gm/customers"
          element={
            <PrivateRoute allow={["gm"]}>
              <GMCustomerList />
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

        {/* SAFE FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
