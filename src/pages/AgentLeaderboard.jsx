import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  ArrowLeft,
  Sun,
  Moon,
} from "lucide-react";
import { Download } from "lucide-react";

/* ===== RECHARTS ===== */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/* ================= MAIN ================= */
export default function AgentLeaderboard() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState({});
  const [theme, setTheme] = useState("light");

  const [filterType, setFilterType] = useState("month"); // all | today | month | week | date
  const [exactDate, setExactDate] = useState("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const load = async () => {
      const [repSnap, userSnap] = await Promise.all([
        getDocs(collection(db, "reports")),
        getDocs(collection(db, "users")),
      ]);

      setReports(repSnap.docs.map((d) => d.data()));

      const map = {};
      userSnap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setUsers(map);
    };

    load();
  }, []);

 /* ================= DATE HELPERS ================= */
const todayStr = new Date().toDateString();
const thisMonth = new Date().getMonth();
const thisYear = new Date().getFullYear();

const isToday = React.useCallback(
  (ts) => ts?.toDate?.().toDateString() === todayStr,
  [todayStr]
);

const isThisMonth = React.useCallback(
  (ts) => {
    const d = ts?.toDate?.();
    return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  },
  [thisMonth, thisYear]
);

const isThisWeek = React.useCallback((ts) => {
  const d = ts?.toDate?.();
  if (!d) return false;

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return d >= start && d <= end;
}, []);

const isExactDate = React.useCallback(
  (ts) => {
    if (!exactDate) return true;
    const [y, m, d] = exactDate.split("-").map(Number);
    const rd = ts?.toDate?.();
    if (!rd) return false;
    return (
      rd.getFullYear() === y &&
      rd.getMonth() === m - 1 &&
      rd.getDate() === d
    );
  },
  [exactDate]
);


  /* ================= LEADERBOARD ================= */
const leaderboard = useMemo(() => {
  const map = {};

  reports.forEach((r) => {
    if (
      (filterType === "today" && !isToday(r.createdAt)) ||
      (filterType === "month" && !isThisMonth(r.createdAt)) ||
      (filterType === "week" && !isThisWeek(r.createdAt)) ||
      (filterType === "date" && !isExactDate(r.createdAt))
    ) {
      return;
    }

    const uid = r.agentId;
    if (!uid || !users[uid]) return;

    if (!map[uid]) {
      map[uid] = {
        agentName: users[uid].name || users[uid].email,
        branch: r.branchId,
        amount: 0,
        commission: 0,
        count: 0,
      };
    }

    map[uid].amount += Number(r.amount || 0);
    map[uid].commission =
  Math.round((map[uid].commission + Number(r.commission || 0)) * 100) / 100;

    map[uid].count += 1;
  });

  return Object.values(map).sort(
    (a, b) => b.commission - a.commission
  );
}, [
  reports,
  users,
  filterType,
  isToday,
  isThisMonth,
  isThisWeek,
  isExactDate,
]);


  /* ================= EXPORT CSV ================= */
  const exportLeaderboardCSV = () => {
    if (!leaderboard.length) {
      alert("No data to export");
      return;
    }

    const headers = [
      "Agent",
      "Branch",
      "Total Amount",
      "Total Commission",
      "Transaction Count",
    ];

    const rows = leaderboard.map((a) => [
      a.agentName,
      a.branch,
      a.amount,
      a.commission,
      a.count,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((row) => row.join(","))
        .join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "agent-leaderboard.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= THEME ================= */
  const bg =
    theme === "dark"
      ? "bg-slate-900 text-white"
      : "bg-gray-100 text-black";

  const card =
    theme === "dark"
      ? "bg-white/5 border border-white/30"
      : "bg-white border border-black/30";

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="max-w-6xl mx-auto p-4">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            <h2 className="text-3xl font-bold">Agent Leaderboard</h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportLeaderboardCSV}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-1"
            >
              <Download size={14} />
              Export CSV
            </button>

            <button
              onClick={() =>
                setTheme(theme === "light" ? "dark" : "light")
              }
              className="p-2 rounded-full border"
            >
              {theme === "light" ? <Moon /> : <Sun />}
            </button>

            <button
              onClick={() => navigate("/gm/dashboard")}
              className="px-3 py-1.5 rounded-lg border flex items-center gap-1 text-sm"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
        </div>

       <div className="flex flex-wrap items-center gap-2 mb-4">

  <select
    value={filterType}
    onChange={(e) => setFilterType(e.target.value)}
    className={`h-10 px-3 rounded-lg border outline-none
      ${
        theme === "dark"
          ? "bg-black text-white border-white/40 [color-scheme:dark]"
          : "bg-white text-black border-black/30 [color-scheme:light]"
      }`}
  >
    <option value="all">All Time</option>
    <option value="month">This Month</option>
    <option value="week">This Week</option>
    <option value="today">Today</option>
    <option value="date">Exact Date</option>
  </select>

  {filterType === "date" && (
    <input
      type="date"
      value={exactDate}
      onChange={(e) => setExactDate(e.target.value)}
      className={`h-10 px-3 rounded-lg border outline-none
        ${
          theme === "dark"
            ? "bg-black text-white border-white/40 [color-scheme:dark]"
            : "bg-white text-black border-black/30 [color-scheme:light]"
        }`}
    />
  )}

</div>


    
        {/* TABLE */}
        <div className={`rounded-xl overflow-x-auto ${card}`}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left">Rank</th>
                <th className="p-3 text-left">Agent</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Commission</th>
                <th className="p-3 text-right">Count</th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((a, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3 font-bold">#{i + 1}</td>
                  <td className="p-3 font-semibold">{a.agentName}</td>
                  <td className="p-3">{a.branch || "-"}</td>
                  <td className="p-3 text-right">GHS {a.amount}</td>
                  <td className="p-3 text-right font-bold text-emerald-500">
                    GHS {a.commission}
                  </td>
                  <td className="p-3 text-right">{a.count}</td>
                </tr>
              ))}

              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-6 text-center opacity-70">
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
 {/* CHART */}
        <div
  className={`mb-6 rounded-2xl p-5 backdrop-blur-xl transition
    ${
      theme === "dark"
        ? "bg-white/5 border border-white/20"
        : "bg-white border border-black/10 shadow-sm"
    }`}
>
  {/* HEADER */}
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-semibold tracking-wide opacity-80">
      Top Performing Agents
    </h3>

    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
      🥇Agent Ranking
    </span>
  </div>

  {/* CHART */}
  <div className="w-full h-60">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={leaderboard.slice(0, 8)}
        layout="vertical"
        margin={{ top: 0, right: 30, left: 70, bottom: 0 }}
      >
        {/* VALUE */}
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />

        {/* AGENT NAME TAG */}
        <YAxis
          type="category"
          dataKey="agentName"
          tick={({ payload, x, y }) => {
            const index = leaderboard.findIndex(
              (a) => a.agentName === payload.value
            );

            const badge =
              index === 0
                ? "🥇"
                : index === 1
                ? "🥈"
                : index === 2
                ? "🥉"
                : `#${index + 1}`;

            return (
              <g transform={`translate(${x - 8},${y})`}>
                <text
                  x={0}
                  y={0}
                  dy={4}
                  textAnchor="end"
                  className="text-[11px] font-medium fill-current"
                >
                  {badge} {payload.value}
                </text>
              </g>
            );
          }}
          axisLine={false}
          tickLine={false}
          width={140}
        />

        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={{
            borderRadius: 12,
            border: "none",
            background:
              theme === "dark"
                ? "rgba(15,23,42,.95)"
                : "#fff",
            boxShadow: "0 10px 30px rgba(0,0,0,.15)",
          }}
          formatter={(v) => [`GHS ${v}`, "Commission"]}
        />

        <Bar
          dataKey="commission"
          radius={[0, 8, 8, 0]}
          barSize={20}
          fill="#22c55e"
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
    </div>
  );
}
