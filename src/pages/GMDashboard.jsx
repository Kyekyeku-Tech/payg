import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import LogoutButton from "../components/LogoutButton";
import {
  CheckCircle,
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

export default function GMDashboard() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [reports, setReports] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [theme, setTheme] = useState("light");

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
  }, [activeBranch, exactDate]);


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

  const isToday = (ts) =>
    ts?.toDate()?.toDateString() === today.toDateString();

  const isThisMonth = (ts) => {
    const d = ts?.toDate();
    return (
      d &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isExactDate = (ts) => {
    if (!exactDate) return true;
    return (
      ts?.toDate()?.toDateString() ===
      new Date(exactDate).toDateString()
    );
  };
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
    r.commission,
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

  /* ================= BRANCH TOTALS ================= */
  const branchToday = useMemo(
    () =>
      reports
        .filter(
          r =>
            r.branchId === activeBranch &&
            isToday(r.createdAt)
        )
        .reduce((s, r) => s + Number(r.commission || 0), 0),
    [reports, activeBranch]
  );

  const branchMonth = useMemo(
    () =>
      reports
        .filter(
          r =>
            r.branchId === activeBranch &&
            isThisMonth(r.createdAt)
        )
        .reduce((s, r) => s + Number(r.commission || 0), 0),
    [reports, activeBranch]
  );

  /* ================= TABLE DATA ================= */
  const tableData = useMemo(() => {
  if (!activeBranch) return [];
  return reports.filter(
    r =>
      r.branchId === activeBranch &&
      isExactDate(r.createdAt)
  );
}, [reports, activeBranch, exactDate]);

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
      ? "bg-white/5 border border-white/10"
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
            <h2 className="text-3xl font-bold">GM Dashboard</h2>
            <p className="opacity-70 text-sm">
              Daily & Monthly Performance
            </p>
          </div>

          <div className="flex gap-2">
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


            <LogoutButton />
          </div>
        </div>

        {/* GLOBAL DASHBOARD */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className={`p-6 rounded-2xl ${card}`}>
            <p className="text-sm opacity-70">Total Commission (TODAY)</p>
            <p className="text-3xl font-bold">GHS {totalToday}</p>
          </div>

          <div className={`p-6 rounded-2xl ${card}`}>
            <p className="text-sm opacity-70">Total Commission (THIS MONTH)</p>
            <p className="text-3xl font-bold">GHS {totalMonth}</p>
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

        {/* BRANCH DASHBOARD */}
        {activeBranch && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className={`p-5 rounded-2xl ${card}`}>
              <p className="text-sm opacity-70">
                {activeBranch} (TODAY)
              </p>
              <p className="text-2xl font-bold">
                GHS {branchToday}
              </p>
            </div>

            <div className={`p-5 rounded-2xl ${card}`}>
              <p className="text-sm opacity-70">
                {activeBranch} (THIS MONTH)
              </p>
              <p className="text-2xl font-bold">
                GHS {branchMonth}
              </p>
            </div>
          </div>
        )}

        {/* EXACT DATE FILTER (TABLE ONLY) */}
       {/* EXACT DATE FILTER + EXPORT */}
{activeBranch && (
  <div className="flex items-center justify-between mb-3">
    
    {/* DATE FILTER */}
    <div className="flex items-center gap-2">
      <CalendarDays size={16} />
      <input
        type="date"
        value={exactDate}
        onChange={(e) => setExactDate(e.target.value)}
        className="px-3 py-2 rounded-lg border"
      />
      <span className="text-sm opacity-70">
        Filter exact date
      </span>
    </div>

    {/* EXPORT BUTTON */}
    <button
      onClick={exportToCSV}
      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
    >
      Export CSV
    </button>

  </div>
)}


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
                GHS {r.commission}
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