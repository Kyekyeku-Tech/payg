import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import LogoutButton from "../components/LogoutButton";
import { Moon, Sun } from "lucide-react";

const PAGE_SIZE = 10;

export default function HeadDashboard() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  /* ================= AUTH ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        setUser({ uid: u.uid, ...snap.data() });
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  /* ================= LOAD REPORTS ================= */
  useEffect(() => {
    if (!user?.branchId) return;

    const load = async () => {
      const q = query(
        collection(db, "Report_ECW"),
        where("branchId", "==", user.branchId)
      );
      const snap = await getDocs(q);
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    load();
  }, [user]);

  /* ================= LOAD AGENTS ================= */
  useEffect(() => {
    if (!user?.branchId) return;

    const loadAgents = async () => {
      const q = query(
        collection(db, "users"),
        where("branchId", "==", user.branchId)
      );

      const snap = await getDocs(q);
      const map = {};

      snap.docs.forEach((d) => {
        map[d.id] = d.data().name || d.data().email;
      });

      setAgents(map);
    };

    loadAgents();
  }, [user]);

  /* ================= FILTER ================= */
  const filteredReports = useMemo(() => {
    let filtered = reports.filter((r) => {
      if (selectedDate) {
        const [y, m, d] = selectedDate.split("-").map(Number);
        const picked = new Date(y, m - 1, d);
        const rd = r.createdAt?.toDate?.();
        if (!rd) return false;
        if (
          rd.getFullYear() !== picked.getFullYear() ||
          rd.getMonth() !== picked.getMonth() ||
          rd.getDate() !== picked.getDate()
        ) {
          return false;
        }
      }

      if (selectedAgent && r.agentId !== selectedAgent) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const da = a.createdAt?.toDate?.() || new Date(0);
      const db = b.createdAt?.toDate?.() || new Date(0);
      return db - da;
    });

    return filtered;
  }, [reports, selectedDate, selectedAgent]);

  useEffect(() => setPage(1), [selectedDate, selectedAgent]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);

  const paginatedReports = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, page]);

  /* ================= TOTALS ================= */
  const todayStr = new Date().toDateString();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();

  const totalToday = reports.reduce((s, r) => {
  if (!r.createdAt?.toDate) return s;
  return r.createdAt.toDate().toDateString() === todayStr
    ? s + Number(r.amountServed || 0)
    : s;
}, 0);

const totalMonth = reports.reduce((s, r) => {
  if (!r.createdAt?.toDate) return s;
  const d = r.createdAt.toDate();
  return d.getMonth() === month && d.getFullYear() === year
    ? s + Number(r.amountServed || 0)
    : s;
}, 0);

const totalAll = reports.reduce(
  (s, r) => s + Number(r.amountServed || 0),
  0
);

const totalFiltered = filteredReports.reduce(
  (s, r) => s + Number(r.amountServed || 0),
  0
);

  /* ================= AGENT PERFORMANCE ================= */
  const agentTotals = useMemo(() => {
    const map = {};

    filteredReports.forEach((r) => {
      if (!map[r.agentId]) {
  map[r.agentId] = { served: 0, count: 0 };
}
map[r.agentId].served += Number(r.amountServed || 0);
map[r.agentId].count += 1;

    });

    return map;
  }, [filteredReports]);

  /* ================= CSV EXPORT ================= */
  const exportToCSV = () => {
    if (!filteredReports.length) return alert("No data");

    const headers = [
      "Date",
      "ECW Number",
      "Agent",
      "Amount Paid",
      "Amount Served",
      "Commission",
    ];

    const rows = filteredReports.map((r) => [
      r.createdAt?.toDate?.().toLocaleDateString() || "",
      r.ecwNumber,
      agents[r.agentId] || "Unknown",
      r.amountPaid,
      r.amountServed,
      r.commission,
    ]);

    const csv =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `${user.branchId}-ECW.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pageStyle =
    theme === "dark"
      ? "bg-slate-900 text-white"
      : "bg-gray-100 text-black";

  const card =
    theme === "dark"
      ? "bg-white/5 border border-white/30"
      : "bg-white border border-black/30";

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageStyle}`}>
      <div className="p-4 max-w-7xl mx-auto">

        {/* HEADER */}
<div className="
  flex flex-col gap-4 mb-6
  sm:flex-row sm:items-center
">
  {/* LEFT SIDE */}
  <div>
    <h2 className="text-3xl font-bold">Branch Head</h2>
    <p className="text-gray-500">
      Branch: <b>{user.branchId}</b>
    </p>
  </div>

  {/* RIGHT SIDE BUTTONS */}
  <div
    className="
      flex flex-col gap-2
      sm:flex-row sm:gap-2
      sm:ml-auto sm:justify-end
    "
  >
    {/* THEME */}
    <button
      onClick={() =>
        setTheme(theme === "dark" ? "light" : "dark")
      }
      className="p-2 rounded-full border self-start sm:self-auto"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>

    {/* ECW Report*/}
    <button
      onClick={() => navigate("/head/submit")}
      className="
        w-full sm:w-auto
        px-3 py-2 rounded-lg
        bg-yellow-500 hover:bg-yellow-400
        text-black text-sm font-medium
      "
    >
      ECW Report
    </button>

    {/* PAYG DASHBOARD */}
    <button
      onClick={() => navigate("/head/dashboard")}
      className="
        w-full sm:w-auto
        px-3 py-2 rounded-lg
        bg-blue-500 hover:bg-blue-400
        text-black text-sm font-medium
      "
    >
      PAYG Dashboard
    </button>

    {/* LOGOUT */}
    <div className="self-start sm:self-auto">
      <LogoutButton />
    </div>
  </div>
</div>


        {/* FILTERS */}
        <div className="flex gap-3 mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`p-2 rounded-lg border ${theme === "dark"
              ? "bg-black/40 text-white border-white/40 [color-scheme:dark]"
              : "bg-white border-black/30"}`}
          />

          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className={`p-2 rounded-lg border ${theme === "dark"
              ? "bg-black/40 text-white border-white/40"
              : "bg-white border-black/30"}`}
          >
            <option value="">All Agents</option>
            {Object.entries(agents).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${card} text-center`}>
           <p className="text-sm">Total Served Today</p>
<p className="text-2xl font-bold">GHS {totalToday}</p>
          </div>
          <div className={`p-4 rounded-xl ${card} text-center`}>
            <p className="text-sm">This Month</p>
            <p className="text-2xl font-bold">GHS {totalMonth}</p>
          </div>
          <div className={`p-4 rounded-xl ${card} text-center`}>
            <p className="text-sm">All Time</p>
            <p className="text-2xl font-bold">GHS {totalAll}</p>
          </div>
          <div className={`p-4 rounded-xl ${card} text-center`}>
            <p className="text-sm">Filtered</p>
            <p className="text-2xl font-bold">GHS {totalFiltered}</p>
          </div>
        </div>
        {/* AGENT PERFORMANCE */}
{Object.keys(agentTotals).length > 0 && (
  <div className="mb-6">
    <h3 className="font-bold mb-3">Agent Performance</h3>

    <div className="grid md:grid-cols-3 gap-4">
      {Object.entries(agentTotals).map(([agentId, data]) => (
        <div
          key={agentId}
          className={`p-4 rounded-xl ${card}`}
        >
          <p className="font-semibold">
            {agents[agentId] || "Unknown Agent"}
          </p>
          <p className="text-sm opacity-70">
            Transactions: {data.count}
          </p>
          <p className="text-lg font-bold">
            GHS {data.served.toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  </div>
)}


        {/* EXPORT */}
        <div className="flex justify-between mb-3">
          <span className="font-semibold opacity-70">Transactions</span>
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs"
          >
            Export CSV
          </button>
        </div>

        {/* TABLE */}
        <div className={`p-4 rounded-xl ${card}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th>Date</th>
                <th>ECW</th>
                <th>Agent</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Served</th>
                <th className="text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td>{r.createdAt?.toDate?.().toLocaleDateString()}</td>
                  <td>{r.ecwNumber}</td>
                  <td>{agents[r.agentId] || "Unknown"}</td>
                  <td className="text-right">{r.amountPaid}</td>
                  <td className="text-right">{r.amountServed}</td>
                  <td className="text-right font-bold">{r.commission}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="flex justify-between mt-4">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {page} of {totalPages || 1}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}
