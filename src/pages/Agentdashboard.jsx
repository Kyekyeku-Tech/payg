import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import LogoutButton from "../components/LogoutButton";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Wallet,
  Coins,
  Send,
  TrendingUp,
  Clock,
  Sun,
  Moon,
} from "lucide-react";

/* ================= COMMISSION ================= */
// Commission = amount × 0.002 (live, any amount)
const calcCommission = (amount) =>
  Number(amount) > 0
    ? Number((Number(amount) * 0.002).toFixed(2))
    : 0;

export default function AgentDashboard() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light"); 
  const [success, setSuccess] = useState(false);
// 🌞 default

  const [form, setForm] = useState({
    customerName: "",
    amount: "",
  });

  /* ================= THEME STYLES ================= */
  const pageBg =
    theme === "dark"
      ? "bg-gradient-to-br from-[#020617] via-black to-[#0c4a6e] text-white"
      : "bg-gray-100 text-black";

  const card =
  theme === "dark"
    ? "bg-white/10 border border-white/40"
    : "bg-white border border-black/40";

const input =
  theme === "dark"
    ? "bg-black/30 border border-white/40 text-white"
    : "bg-white border border-black/40 text-black";


  /* ================= LOAD USER ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      const snap = await getDocs(
        query(collection(db, "users"), where("__name__", "==", u.uid))
      );

      snap.forEach((d) =>
        setUser({ uid: u.uid, ...d.data() })
      );
    });

    return unsub;
  }, []);

  /* ================= LOAD REPORTS ================= */
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const q = query(
        collection(db, "reports"),
        where("agentId", "==", user.uid)
      );
      const snap = await getDocs(q);
      setReports(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.createdAt?.seconds || 0) -
              (a.createdAt?.seconds || 0)
          )
      );
    };

    load();
  }, [user]);

  /* ================= SUBMIT ================= */
  const submitReport = async () => {
    if (!form.customerName || !form.amount || !user) return;

    const amount = Number(form.amount);
    const commission = calcCommission(amount);

    try {
      setLoading(true);

      const payload = {
        customerName: form.customerName,
        amount,
        commission,
        agentId: user.uid,
        agentName: user.name || user.email,
        branchId: user.branchId,
        approved: false,
        createdAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, "reports"), payload);

      // 🔥 instant UI update
      setReports((prev) => [
  { id: ref.id, ...payload, createdAt: new Date() },
  ...prev,
]);

setForm({ customerName: "", amount: "" });

setSuccess(true);
setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error(err);
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= TODAY HELPERS ================= */
const todayStr = new Date().toDateString();

const isToday = (ts) => {
  if (!ts) return false;

  const date =
    ts instanceof Date
      ? ts
      : ts.toDate
      ? ts.toDate()
      : null;

  return date
    ? date.toDateString() === todayStr
    : false;
};
const todayReports = useMemo(
  () => reports.filter((r) => isToday(r.createdAt)),
  [reports]
);

  /* ================= TOTALS (TODAY ONLY) ================= */
const totalAmount = useMemo(
  () =>
    todayReports.reduce(
      (s, r) => s + Number(r.amount || 0),
      0
    ),
  [todayReports]
);

const totalCommission = useMemo(
  () =>
    todayReports.reduce(
      (s, r) => s + Number(r.commission || 0),
      0
    ),
  [todayReports]
);

  const recent = todayReports[0];

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="max-w-5xl mx-auto p-4">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <User size={22} /> Agent Dashboard
            </h2>
            <p className="text-sm opacity-70">
              Welcome back, {user?.name || "Agent"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* THEME TOGGLE */}
            <button
              onClick={() =>
                setTheme(theme === "light" ? "dark" : "light")
              }
              className={`p-2 rounded-full ${card}`}
            >
              {theme === "light" ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}
            </button>

            <LogoutButton />
          </div>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <motion.div
            whileHover={{ scale: 1.04 }}
            className={`p-5 rounded-2xl ${card}`}
          >
            <p className="text-sm opacity-70 flex items-center gap-2">
              <Wallet size={16} /> Total Amount
            </p>
            <p className="text-3xl font-bold">
              GHS {totalAmount}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.04 }}
            className={`p-5 rounded-2xl ${card}`}
          >
            <p className="text-sm opacity-70 flex items-center gap-2">
              <Coins size={16} /> Total Commission
            </p>
            <p className="text-3xl font-bold text-emerald-500">
              GHS {totalCommission.toFixed(2)}
            </p>
          </motion.div>
        </div>

        {/* FORM */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl ${card} mb-6`}
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> New Transaction
          </h3>

          <div className="grid gap-3">
            <input
              placeholder="Customer Name"
              value={form.customerName}
              onChange={(e) =>
                setForm({ ...form, customerName: e.target.value })
              }
              className={`px-4 py-3 rounded-xl ${input}`}
            />

            <input
              type="number"
              placeholder="Amount (GHS)"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value })
              }
              className={`px-4 py-3 rounded-xl ${input}`}
            />

            {/* LIVE COMMISSION */}
            <div className="text-sm flex items-center gap-2 opacity-80">
              <Coins size={16} />
              Commission:
              <b className="text-emerald-500">
                GHS {calcCommission(form.amount)}
              </b>
            </div>

            <button
              onClick={submitReport}
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold disabled:opacity-50"
            >
              <Send size={16} />
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </motion.div>

        {/* MOST RECENT TRANSACTION */}
        <AnimatePresence>
          {recent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-black/10"
            >
              <p className="text-xs uppercase tracking-wide opacity-70 mb-2 flex items-center gap-2">
                <Clock size={14} /> Most Recent Transaction
              </p>

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">
                    {recent.customerName}
                  </p>
                  <p className="text-sm opacity-70">
                    Amount: GHS {recent.amount}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-500">
                    +GHS {recent.commission}
                  </p>
                  <p className="text-xs opacity-60">
                    Commission
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
