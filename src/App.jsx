import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RouteTracker from "./components/RouteTracker";

import Login from "./pages/Login";
import AgentDashboard from "./pages/Agentdashboard";
import HeadDashboard from "./pages/HeadDashboard";
import GMDashboard from "./pages/GMDashboard";
import AdminApproval from "./pages/AdminApproval";
import PrivateRoute from "./components/PrivateRoute";
import AgentLeaderboard from "./pages/AgentLeaderboard";


export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />

      <Routes>
        {/* ROOT */}
        <Route
          path="/"
          element={
            <Navigate
              to={localStorage.getItem("lastRoute") || "/login"}
              replace
            />
          }
        />
        <Route
  path="/gm/leaderboard"
  element={<AgentLeaderboard />}
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
