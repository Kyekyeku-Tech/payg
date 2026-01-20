import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import LogoutButton from "../components/LogoutButton";
import {
  Loader2,
  Users,
  Sun,
  Moon,
  CalendarDays,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ================= BRANCH LIST ================= */
const BRANCHES = [
  "AGONA","BAKAEKYIR","ELUBO","AXIM","ESIAMA",
  "VOL-MAGT","TYPE-C","KOJOKROM","ANAJI-K","MPOHOR",
];

const PAGE_SIZE = 10;

export default function GMDashboard() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [reports, setReports] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [theme, setTheme] = useState("light");
  const [exactDate, setExactDate] = useState("");
  const [page, setPage] = useState(1);

  /* ================= LOAD ================= */
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "Report_ECW"));
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeBranch, exactDate]);

  /* ================= DELETE ================= */
  const deleteReport = async (id) => {
    if (!window.confirm("Delete this ECW transaction?")) return;

    try {
      setLoadingId(id);
      await deleteDoc(doc(db, "Report_ECW", id));
      setReports(prev => prev.filter(r => r.id !== id));
    } finally {
      setLoadingId(null);
    }
  };

  /* ================= DATE HELPERS (STABLE) ================= */
  const isToday = useCallback((ts) => {
    const d = ts?.toDate?.();
    if (!d) return false;
    return d.toDateString() === new Date().toDateString();
  }, []);

  const isThisMonth = useCallback((ts) => {
    const d = ts?.toDate?.();
    if (!d) return false;
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }, []);

  const isExactDate = useCallback(
    (ts) => {
      if (!exactDate) return true;
      const d = ts?.toDate?.();
      if (!d) return false;
      const [y, m, day] = exactDate.split("-").map(Number);
      return (
        d.getFullYear() === y &&
        d.getMonth() === m - 1 &&
        d.getDate() === day
      );
    },
    [exactDate]
  );
  /* ================= BRANCH BASE ================= */
const branchBaseReports = useMemo(() => {
  if (!activeBranch) return [];
  return reports.filter(r => r.branchId === activeBranch);
}, [reports, activeBranch]);

/* ================= BRANCH SELECTED (DATE FILTER) ================= */
const branchSelectedReports = useMemo(() => {
  if (!activeBranch) return [];

  const filtered = exactDate
    ? branchBaseReports.filter(r => isExactDate(r.createdAt))
    : branchBaseReports.filter(r => isToday(r.createdAt));

  return filtered.sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  );
}, [
  activeBranch,
  branchBaseReports,
  exactDate,
  isExactDate,
  isToday,
]);


  /* ================= GLOBAL TOTALS (AMOUNT-BASED) ================= */
const totalRequestToday = useMemo(
  () =>
    reports
      .filter(r => isToday(r.createdAt))
      .reduce((s, r) => s + Number(r.amountPaid || 0), 0),
  [reports, isToday]
);

const totalServedToday = useMemo(
  () =>
    reports
      .filter(r => isToday(r.createdAt))
      .reduce((s, r) => s + Number(r.amountServed || 0), 0),
  [reports, isToday]
);

const monthRequest = useMemo(
  () =>
    reports
      .filter(r => isThisMonth(r.createdAt))
      .reduce((s, r) => s + Number(r.amountPaid || 0), 0),
  [reports, isThisMonth]
);

const monthServed = useMemo(
  () =>
    reports
      .filter(r => isThisMonth(r.createdAt))
      .reduce((s, r) => s + Number(r.amountServed || 0), 0),
  [reports, isThisMonth]
);

  /* ================= BRANCH TOTALS (AMOUNT-BASED) ================= */
const branchRequestToday = useMemo(
  () =>
    branchBaseReports
      .filter(r => isToday(r.createdAt))
      .reduce((s, r) => s + Number(r.amountPaid || 0), 0),
  [branchBaseReports, isToday]
);

const branchServedToday = useMemo(
  () =>
    branchBaseReports
      .filter(r => isToday(r.createdAt))
      .reduce((s, r) => s + Number(r.amountServed || 0), 0),
  [branchBaseReports, isToday]
);

const branchMonthRequest = useMemo(
  () =>
    branchBaseReports
      .filter(r => isThisMonth(r.createdAt))
      .reduce((s, r) => s + Number(r.amountPaid || 0), 0),
  [branchBaseReports, isThisMonth]
);

const branchMonthServed = useMemo(
  () =>
    branchBaseReports
      .filter(r => isThisMonth(r.createdAt))
      .reduce((s, r) => s + Number(r.amountServed || 0), 0),
  [branchBaseReports, isThisMonth]
);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(
    branchSelectedReports.length / PAGE_SIZE
  );

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return branchSelectedReports.slice(start, start + PAGE_SIZE);
  }, [branchSelectedReports, page]);

  /* ================= EXPORT ================= */
  const exportToCSV = () => {
    if (!branchSelectedReports.length) {
      alert("No data");
      return;
    }

    const headers = [
      "ECW Number",
      "Amount Paid",
      "Amount Served",
      "Commission",
      "Branch",
      "Date",
    ];

    const rows = branchSelectedReports.map(r => [
      r.ecwNumber,
      r.amountPaid,
      r.amountServed,
      r.commission,
      r.branchId,
      r.createdAt?.toDate()?.toLocaleDateString(),
    ]);

    const csv =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map(r => r.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `${activeBranch}-ECW.csv`;
    link.click();
  };

  /* ================= THEME ================= */
  const bg =
    theme === "dark"
      ? "bg-gradient-to-br from-[#020617] via-black to-[#0c4a6e] text-white"
      : "bg-gray-100 text-black";

  const card =
    theme === "dark"
      ? "bg-white/5 border border-white/40"
      : "bg-white border border-black/10";

  const btn =
    theme === "dark"
      ? "border border-white/10 hover:bg-white/5"
      : "border border-black/20 hover:bg-black/5";

  /* ================= UI ================= */
  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="p-4 max-w-7xl mx-auto">

       {/* HEADER */}
<div className="
  flex flex-col gap-4 mb-6
  sm:flex-row sm:items-center
">
  {/* LEFT SIDE */}
  <div>
    <h2 className="text-3xl font-bold">ECW Management</h2>
    <p className="opacity-70 text-sm">Daily & Monthly Tracker</p>
  </div>

  {/* RIGHT SIDE BUTTONS */}
  <div
    className="
      flex flex-col gap-2
      sm:flex-row sm:gap-3
      sm:ml-auto sm:items-center
    "
  >
    {/* THEME */}
    <button
      onClick={() => setTheme(t => (t === "light" ? "dark" : "light"))}
      className={`p-2 rounded-xl ${btn} self-start sm:self-auto`}
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>

    {/* PAYG */}
    <button
      onClick={() => navigate("/gm/dashboard")}
      className="
        w-full sm:w-auto
        px-3 py-2 rounded-lg
        bg-sky-600 hover:bg-sky-500
        text-white text-sm flex items-center gap-1
      "
    >
      <Users size={14} />
      PAYG Report
    </button>

    {/* ECW LEADERBOARD */}
    <button
      onClick={() => navigate("/gm/ecwleaderboard")}
      className="
        w-full sm:w-auto
        px-3 py-2 rounded-lg
        bg-yellow-500 hover:bg-yellow-400
        text-black text-sm
      "
    >
      ECW Leaderboard
    </button>

    {/* LOGOUT */}
    <div className="self-start sm:self-auto">
      <LogoutButton />
    </div>
  </div>
</div>

        {/* GLOBAL STATS */}
<div className="grid md:grid-cols-4 gap-4 mb-6">

  <div className={`p-5 rounded-2xl ${card} text-center`}>
    <p className="text-sm opacity-70">Total Request Today</p>
    <p className="text-2xl font-bold">
      GHS {totalRequestToday.toFixed(2)}
    </p>
  </div>

  <div className={`p-5 rounded-2xl ${card} text-center`}>
    <p className="text-sm opacity-70">Total Served Today</p>
    <p className="text-2xl font-bold">
      GHS {totalServedToday.toFixed(2)}
    </p>
  </div>

  <div className={`p-5 rounded-2xl ${card} text-center`}>
    <p className="text-sm opacity-70">Month Request</p>
    <p className="text-2xl font-bold">
      GHS {monthRequest.toFixed(2)}
    </p>
  </div>

  <div className={`p-5 rounded-2xl ${card} text-center`}>
    <p className="text-sm opacity-70">Month Served</p>
    <p className="text-2xl font-bold">
      GHS {monthServed.toFixed(2)}
    </p>
  </div>

</div>


        {/* BRANCH SELECT */}
        <div className="flex flex-wrap gap-2 mb-4">
          {BRANCHES.map(b => (
            <button
              key={b}
              onClick={() => setActiveBranch(b)}
              className={`px-4 py-2 rounded-full text-sm font-semibold
                ${activeBranch === b ? "bg-sky-600 text-white" : btn}`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* DATE + EXPORT */}
        {activeBranch && (
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-2 items-center">
              <CalendarDays size={16} />
              <input
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className={`p-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-black/40 text-white border-white/40"
                    : "bg-white border-black/30"
                }`}
              />
            </div>

            <button
              onClick={exportToCSV}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs"
            >
              Export
            </button>
          </div>
        )}

        {/* TABLE */}
        {activeBranch && (
          <div className={`rounded-2xl overflow-x-auto ${card}`}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">ECW</th>
                  <th className="p-3 text-left">Paid</th>
                  <th className="p-3 text-left">Served</th>
                  <th className="p-3 text-left">Commission</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-semibold">{r.ecwNumber}</td>
                    <td className="p-3">GHS {r.amountPaid}</td>
                    <td className="p-3">GHS {r.amountServed}</td>
                    <td className="p-3 font-bold">GHS {r.commission}</td>
                    <td className="p-3">
                      {r.createdAt?.toDate()?.toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <button
                        disabled={loadingId === r.id}
                        onClick={() => deleteReport(r.id)}
                        className="px-3 py-1 rounded-full bg-red-600 text-white text-xs"
                      >
                        {loadingId === r.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}

                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-6 text-center opacity-70">
                      No records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex justify-center gap-3 p-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className={`px-4 py-2 rounded-lg ${btn}`}
                >
                  Prev
                </button>

                <span>Page {page} of {totalPages}</span>

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className={`px-4 py-2 rounded-lg ${btn}`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
