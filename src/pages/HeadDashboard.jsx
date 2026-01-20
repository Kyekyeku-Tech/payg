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
      if (snap.exists()) setUser({ uid: u.uid, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, []);

  /* ================= LOAD REPORTS ================= */
  useEffect(() => {
    if (!user?.branchId) return;

    const load = async () => {
      const q = query(
        collection(db, "reports"),
        where("branchId", "==", user.branchId)
      );
      const snap = await getDocs(q);
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    load();
  }, [user]);
 useEffect(() => {
  if (!user?.branchId) return;

  const loadAgents = async () => {
    try {
      const q = query(
        collection(db, "users"),
        where("branchId", "==", user.branchId)
      );

      const snap = await getDocs(q);

      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data().name; // make sure "name" exists in users doc
      });

      setAgents(map);
    } catch (err) {
      console.error("Failed to load agents:", err);
    }
  };

  loadAgents();
}, [user]);
    const [agents, setAgents] = useState({});

  /* ================= DATE FILTER ================= */
  const filteredReports = useMemo(() => {
    let filtered = reports.filter((r) => {
      // date filter
      if (selectedDate) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const reportDate = r.createdAt?.toDate();
        if (!reportDate) return false;
        const rYear = reportDate.getFullYear();
        const rMonth = reportDate.getMonth();
        const rDay = reportDate.getDate();
        if (rYear !== year || rMonth !== month - 1 || rDay !== day) {
          return false;
        }
      }

      // agent filter
      if (selectedAgent && r.agentId !== selectedAgent) {
        return false;
      }

      return true;
    });

    // Sort by createdAt descending (most recent first)
    filtered.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });

    return filtered;
  }, [reports, selectedDate, selectedAgent]);


  /* ================= RESET PAGE ================= */
  useEffect(() => {
    setPage(1);
  }, [selectedDate]);

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
      ? s + Number(r.commission || 0)
      : s;
  }, 0);

  const totalMonth = reports.reduce((s, r) => {
    if (!r.createdAt?.toDate) return s;
    const d = r.createdAt.toDate();
    return d.getMonth() === month && d.getFullYear() === year
      ? s + Number(r.commission || 0)
      : s;
  }, 0);

  const totalAll = reports.reduce(
    (s, r) => s + Number(r.commission || 0),
    0
  );

  const totalFiltered = filteredReports.reduce(
    (s, r) => s + Number(r.commission || 0),
    0
  );
  /* ================= AGENT TOTAL PERFORMANCE ================= */
const agentTotals = useMemo(() => {
  const map = {};

  filteredReports.forEach((r) => {
    if (!map[r.agentId]) {
      map[r.agentId] = {
        amount: 0,
        commission: 0,
        count: 0,
      };
    }

    map[r.agentId].amount += Number(r.amount || 0);
    map[r.agentId].commission += Number(r.commission || 0);
    map[r.agentId].count += 1;
  });

  return map;
}, [filteredReports]);

  const exportToCSV = () => {
  if (!filteredReports.length) {
    alert("No data to export");
    return;
  }

  const headers = [
    "Date",
    "Customer",
    "Agent",
    "Amount",
    "Commission",
  ];

  const rows = filteredReports.map((r) => [
    r.createdAt?.toDate
      ? r.createdAt.toDate().toLocaleDateString()
      : "",
    r.customerName,
    agents[r.agentId] || "Unknown",
    r.amount,
    r.commission,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `${user.branchId}-transactions.csv`;
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

    {/* PAYG */}
    <button
      onClick={() => navigate("/head/report")}
      className="
        w-full sm:w-auto
        px-3 py-2 rounded-lg
        bg-yellow-500 hover:bg-yellow-400
        text-black text-sm font-medium
      "
    >
      PAYG Report
    </button>

    {/* ECW */}
    <button
      onClick={() => navigate("/head/ecw")}
      className="
        w-full sm:w-auto
        px-3 py-2 rounded-lg
        bg-blue-500 hover:bg-blue-400
        text-black text-sm font-medium
      "
    >
      ECW Dashboard
    </button>

    {/* LOGOUT */}
    <div className="self-start sm:self-auto">
      <LogoutButton />
    </div>
  </div>
</div>


        <input
  type="date"
  value={selectedDate}
  onChange={(e) => setSelectedDate(e.target.value)}
  className={`mb-6 p-2 rounded-lg border
    ${
      theme === "dark"
        ? "bg-black/40 text-white border-white/40 [color-scheme:dark]"
        : "bg-white text-black border-black/30 [color-scheme:light]"
    }`}
/>
{/* AGENT FILTER */}
<select
  value={selectedAgent}
  onChange={(e) => setSelectedAgent(e.target.value)}
  className={`mb-6 p-2 rounded-lg border
    ${
      theme === "dark"
        ? "bg-black/40 text-white border-white/40"
        : "bg-white text-black border-black/30"
    }`}
>
  <option value="">All Agents</option>
  {Object.entries(agents).map(([id, name]) => (
    <option key={id} value={id}>
      {name}
    </option>
  ))}
</select>


        {/* DASHBOARD */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${card} text-center`}>
            <p className="text-sm">Today</p>
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
            <p className="text-sm">Selected Date</p>
            <p className="text-2xl font-bold">GHS {totalFiltered}</p>
          </div>
        </div>

<div className="flex justify-between items-center mb-3">
  <span className="text-sm font-semibold opacity-70">
    Transactions
  </span>

  <button
    onClick={exportToCSV}
    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
  >
    Export CSV
  </button>
</div>
{/* AGENT PERFORMANCE SUMMARY */}
{selectedAgent && agentTotals[selectedAgent] && (
  <div className={`mb-6 p-4 rounded-xl ${card} text-center`}>
    <p className="text-sm opacity-70">
      Agent Performance
    </p>

    <p className="text-lg font-bold">
      {agents[selectedAgent]}
    </p>

    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
      <div>
        <p className="opacity-60">Transactions</p>
        <p className="font-bold">
          {agentTotals[selectedAgent].count}
        </p>
      </div>

      <div>
        <p className="opacity-60">Total Amount</p>
        <p className="font-bold">
          GHS {agentTotals[selectedAgent].amount}
        </p>
      </div>

      <div>
        <p className="opacity-60">Commission</p>
        <p className="font-bold text-emerald-500">
          GHS {agentTotals[selectedAgent].commission}
        </p>
      </div>
    </div>
  </div>
)}

        {/* TABLE */}
        <div className={`p-4 rounded-xl ${card}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Customer</th>
                <th className="text-left py-2">Agent</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">Commission</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">
                    {r.createdAt?.toDate
                      ? r.createdAt.toDate().toLocaleDateString()
                      : "-"}
                  </td>
                  <td>{r.customerName}</td>
                  <td>{agents[r.agentId] || "Unknown"}</td>
                  <td className="text-right">{r.amount}</td>
                  <td className="text-right font-bold">
                    {r.commission}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 border rounded disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm">
              Page {page} of {totalPages || 1}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
