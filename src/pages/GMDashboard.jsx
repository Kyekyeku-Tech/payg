import React, { useEffect, useMemo, useState } from "react";
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
import { useCallback } from "react";

/* ================= BRANCH LIST ================= */
const BRANCHES = [
  "AGONA","BAKAEKYIR","ELUBO","AXIM","ESIAMA",
  "VOL-MAGT","TYPE-C","KOJOKROM","ANAJI-K","MPOHOR",
];
const formatGhs = (value) =>
  Number(value || 0).toFixed(2);

export default function GMDashboard() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [reports, setReports] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [theme, setTheme] = useState("light");
  const [useRange, setUseRange] = useState(false);
const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");


  // table filter only
  const [exactDate, setExactDate] = useState("");
    // pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);


  /* ================= LOAD ================= */
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "reports"));
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);
    /* ================= RESET PAGE ON FILTER CHANGE ================= */
useEffect(() => {
  setPage(1);
}, [activeBranch, exactDate, fromDate, toDate, useRange]);



  const deleteReport = async (id) => {
  const confirm = window.confirm(
    "Are you sure you want to delete this transaction?"
  );

  if (!confirm) return;

  try {
    setLoadingId(id);
    await deleteDoc(doc(db, "reports", id));
    setReports(prev => prev.filter(r => r.id !== id));
  } catch (err) {
    console.error(err);
    alert("Failed to delete transaction");
  } finally {
    setLoadingId(null);
  }
};


  /* ================= DATE HELPERS ================= */
  const today = new Date();

  

const isToday = useCallback((ts) => {
  return ts?.toDate()?.toDateString() === new Date().toDateString();
}, []);

const isThisMonth = useCallback((ts) => {
  const d = ts?.toDate();
  const now = new Date();
  return (
    d &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}, []);

const isExactDate = useCallback((ts) => {
  if (!exactDate) return true;
  const [y, m, d] = exactDate.split("-").map(Number);
  const r = ts?.toDate();
  return r &&
    r.getFullYear() === y &&
    r.getMonth() === m - 1 &&
    r.getDate() === d;
}, [exactDate]);

const isInRange = useCallback((ts) => {
  if (!fromDate || !toDate) return true;
  const d = ts?.toDate();
  if (!d) return false;

  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(toDate);
  end.setHours(23, 59, 59, 999);

  return d >= start && d <= end;
}, [fromDate, toDate]);

  /* ================= EXPORT CSV ================= */
  const exportToCSV = () => {
  if (!tableData.length) {
    alert("No data to export");
    return;
  }

  const headers = [
    "Customer",
    "Amount",
    "Commission",
    "Branch",
    "Date",
  ];

  const rows = tableData.map(r => [
    r.customerName,
    r.amount,
    formatGhs(r.commission),
    r.branchId,
    r.createdAt?.toDate()?.toLocaleDateString(),
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...rows]
      .map(e => e.join(","))
      .join("\n");

  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `${activeBranch}-transactions.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
/* ================= BRANCH FILTERED BASE ================= */
const branchBaseReports = useMemo(() => {
  if (!activeBranch) return [];
  return reports.filter(r => r.branchId === activeBranch);
}, [reports, activeBranch]);

const branchSelectedReports = useMemo(() => {
  if (!activeBranch) return [];

  let filtered;

  if (useRange) {
    filtered = branchBaseReports.filter(r => isInRange(r.createdAt));
  } else if (exactDate) {
    filtered = branchBaseReports.filter(r => isExactDate(r.createdAt));
  } else {
    filtered = branchBaseReports.filter(r => isToday(r.createdAt));
  }

  return filtered.sort((a, b) =>
    b.createdAt?.toDate?.() - a.createdAt?.toDate?.()
  );
}, [
  branchBaseReports,
  activeBranch,
  exactDate,
  useRange,
  isToday,
  isExactDate,
  isInRange
]);


const branchSelectedCommission = useMemo(
  () =>
    branchSelectedReports.reduce(
      (s, r) => s + Number(r.commission || 0),
      0
    ),
  [branchSelectedReports]
);

const branchSelectedCount = branchSelectedReports.length;

/* ================= MONTHLY ================= */
const branchMonthReports = useMemo(
  () =>
    branchBaseReports.filter(r =>
      isThisMonth(r.createdAt)
    ),
  [branchBaseReports]
);

const branchMonthCommission = useMemo(
  () =>
    branchMonthReports.reduce(
      (s, r) => s + Number(r.commission || 0),
      0
    ),
  [branchMonthReports]
);

const branchMonthCount = branchMonthReports.length;

/* ================= ALL TIME ================= */
const branchAllCommission = useMemo(
  () =>
    branchBaseReports.reduce(
      (s, r) => s + Number(r.commission || 0),
      0
    ),
  [branchBaseReports]
);

const branchAllCount = branchBaseReports.length;



  /* ================= GLOBAL TOTALS ================= */
  const totalToday = useMemo(
    () =>
      reports
        .filter(r => isToday(r.createdAt))
        .reduce((s, r) => s + Number(r.commission || 0), 0),
    [reports]
  );

  const totalMonth = useMemo(
    () =>
      reports
        .filter(r => isThisMonth(r.createdAt))
        .reduce((s, r) => s + Number(r.commission || 0), 0),
    [reports]
  );
/* ================= GLOBAL COUNTS ================= */
const todayCount = useMemo(
  () =>
    reports.filter(r => isToday(r.createdAt)).length,
  [reports]
);

const monthCount = useMemo(
  () =>
    reports.filter(r => isThisMonth(r.createdAt)).length,
  [reports]
);

const tableData = branchSelectedReports;



/* ================= PAGINATION ================= */
const totalPages = Math.ceil(tableData.length / PAGE_SIZE);

const paginatedData = useMemo(() => {
  const start = (page - 1) * PAGE_SIZE;
  return tableData.slice(start, start + PAGE_SIZE);
}, [tableData, page]);




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

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="p-4 max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">PAYG Management</h2>
            <p className="opacity-70 text-sm">
              Daily & Monthly Tracker
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setTheme(t => (t === "light" ? "dark" : "light"))}
              className={`px-3 py-2 rounded-xl ${btn}`}
            >
              {theme === "light" ? <Moon /> : <Sun />}
            </button>

            <button
  onClick={() => navigate("/admin/approvals")}
  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium flex items-center gap-1"
>
  <Users size={14} />
  Approvals
</button>
<button
  onClick={() => navigate("/gm/leaderboard")}
  className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium"
>
  PAYG Leaderboard
</button>
<button
  onClick={() => navigate("/gm/ecw")}
  className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium"
>
  ECW Report
</button>



            <LogoutButton />
          </div>
        </div>

       {/* ================= GLOBAL DASHBOARD ================= */}
<div className="grid md:grid-cols-4 gap-4 mb-6">
  <div className={`p-5 rounded-2xl ${card} text-center`}>
    <p className="text-sm opacity-70">Today Commission</p>
    <p className="text-2xl font-bold">
      GHS {formatGhs(totalToday)}
    </p>
    <p className="text-xs opacity-60">
      {todayCount} transactions
    </p>
  </div>

  <div className={`p-5 rounded-2xl ${card} text-center`}>
    <p className="text-sm opacity-70">Today Count</p>
    <p className="text-2xl font-bold">{todayCount}</p>
    <p className="text-xs opacity-60">transactions</p>
  </div>

  <div className={`p-5 rounded-2xl ${card} text-center`}>
    <p className="text-sm opacity-70">Monthly Commission</p>
    <p className="text-2xl font-bold">
      GHS {formatGhs(totalMonth)}
    </p>
    <p className="text-xs opacity-60">
      {monthCount} transactions
    </p>
  </div>

  <div className={`p-5 rounded-2xl ${card} text-center`}>
    <p className="text-sm opacity-70">Monthly Count</p>
    <p className="text-2xl font-bold">{monthCount}</p>
    <p className="text-xs opacity-60">transactions</p>
  </div>
</div>

{/* ================= BRANCH SELECT ================= */}
<div className="flex flex-wrap gap-2 mb-4">
  {BRANCHES.map((b) => (
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

{/* ================= DATE FILTERS ================= */}
{activeBranch && (
  <div className="flex flex-col gap-3 mb-5">

    {/* RANGE TOGGLE */}
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={useRange}
        onChange={(e) => {
          setUseRange(e.target.checked);
          setExactDate("");
        }}
      />
      Use Date Range
    </label>

    {/* RANGE PICKER */}
    {useRange ? (
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className={`p-2 rounded-lg border
            ${theme === "dark"
              ? "bg-black/40 text-white border-white/40 [color-scheme:dark]"
              : "bg-white text-black border-black/30"}`}
        />

        <span className="text-sm opacity-70">to</span>

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className={`p-2 rounded-lg border
            ${theme === "dark"
              ? "bg-black/40 text-white border-white/40 [color-scheme:dark]"
              : "bg-white text-black border-black/30"}`}
        />
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <CalendarDays size={16} />
        <input
          type="date"
          value={exactDate}
          onChange={(e) => setExactDate(e.target.value)}
          className={`p-2 rounded-lg border
            ${theme === "dark"
              ? "bg-black/40 text-white border-white/40 [color-scheme:dark]"
              : "bg-white text-black border-black/30"}`}
        />
        <span className="text-sm opacity-70">
          Filter exact date
        </span>
      </div>
    )}
  </div>
)}

{/* ================= BRANCH DASHBOARD ================= */}
{activeBranch && (
  <div className="grid md:grid-cols-3 gap-4 mb-6">

    <div className={`p-5 rounded-2xl ${card} text-center`}>
      <p className="text-sm opacity-70">
        {useRange && fromDate && toDate
          ? `${activeBranch} (${fromDate} → ${toDate})`
          : exactDate
          ? `${activeBranch} (${exactDate})`
          : `${activeBranch} Today`}
      </p>

      <p className="text-2xl font-bold">
        GHS {formatGhs(branchSelectedCommission)}
      </p>

      <p className="text-xs opacity-60">
        {branchSelectedCount} transactions
      </p>
    </div>

    <div className={`p-5 rounded-2xl ${card} text-center`}>
      <p className="text-sm opacity-70">
        {activeBranch} This Month
      </p>

      <p className="text-2xl font-bold">
        GHS {formatGhs(branchMonthCommission)}
      </p>

      <p className="text-xs opacity-60">
        {branchMonthCount} transactions
      </p>
    </div>

    <div className={`p-5 rounded-2xl ${card} text-center`}>
      <p className="text-sm opacity-70">
        {activeBranch} All Time
      </p>

      <p className="text-2xl font-bold">
        GHS {formatGhs(branchAllCommission)}
      </p>

      <p className="text-xs opacity-60">
        {branchAllCount} transactions
      </p>
    </div>

  </div>
)}

{/* ================= REPORT TABLE ================= */}
<div className="mb-20">
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-xl font-bold">
      {activeBranch
        ? `Transactions for ${activeBranch}`
        : "Select a branch to view transactions"}
    </h3>
    {activeBranch && (
      <button
        onClick={exportToCSV}
        className={`px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white ${btn}`}
      >
        Export CSV
      </button>
    )}
  </div>
</div>


       {/* TABLE */}
{activeBranch && (
  <>
    <div className={`overflow-x-auto rounded-2xl ${card}`}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Customer</th>
            <th className="p-3 text-left">Amount</th>
            <th className="p-3 text-left">Commission</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {paginatedData.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3 font-semibold">
                {r.customerName}
              </td>

              <td className="p-3">
                GHS {r.amount}
              </td>

              <td className="p-3 font-bold">
                GHS {formatGhs(r.commission)}
              </td>

              <td className="p-3">
                {r.createdAt?.toDate()?.toLocaleDateString()}
              </td>

              <td className="p-3">
                <button
                  disabled={loadingId === r.id}
                  onClick={() => deleteReport(r.id)}
                  className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50"
                >
                  {loadingId === r.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </td>
            </tr>
          ))}

          {paginatedData.length === 0 && (
            <tr>
              <td
                colSpan="5"
                className="p-6 text-center opacity-70"
              >
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {/* PAGINATION CONTROLS */}
    {totalPages > 1 && (
      <div className="flex justify-center items-center gap-3 mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className={`px-4 py-2 rounded-lg ${btn} disabled:opacity-40`}
        >
          Prev
        </button>

        <span className="text-sm font-semibold">
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className={`px-4 py-2 rounded-lg ${btn} disabled:opacity-40`}
        >
          Next
        </button>
      </div>
    )}
  </>
)}
        </div>
    </div>
    );
}
