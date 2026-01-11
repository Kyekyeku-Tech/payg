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
  const [page, setPage] = useState(1);

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
    if (!selectedDate) return reports;
    const picked = new Date(selectedDate).toDateString();
    return reports.filter(
      (r) =>
        r.createdAt?.toDate &&
        r.createdAt.toDate().toDateString() === picked
    );
  }, [reports, selectedDate]);

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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">Branch Head Dashboard</h2>
            <p className="text-gray-500">
              Branch: <b>{user.branchId}</b>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setTheme(theme === "dark" ? "light" : "dark")
              }
              className="p-2 rounded-full border"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* DATE FILTER */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mb-6 p-2 border rounded-lg"
        />

        {/* DASHBOARD */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${card}`}>
            <p className="text-sm">Today</p>
            <p className="text-2xl font-bold">GHS {totalToday}</p>
          </div>
          <div className={`p-4 rounded-xl ${card}`}>
            <p className="text-sm">This Month</p>
            <p className="text-2xl font-bold">GHS {totalMonth}</p>
          </div>
          <div className={`p-4 rounded-xl ${card}`}>
            <p className="text-sm">All Time</p>
            <p className="text-2xl font-bold">GHS {totalAll}</p>
          </div>
          <div className={`p-4 rounded-xl ${card}`}>
            <p className="text-sm">Selected Date</p>
            <p className="text-2xl font-bold">GHS {totalFiltered}</p>
          </div>
        </div>

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
