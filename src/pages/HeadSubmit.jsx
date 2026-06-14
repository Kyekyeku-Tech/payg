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
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

/* ================= COMMISSION ================= */
// Default = 0.002
// MPOHOR = 0.001
const calcCommission = (amount, branchId) => {
  const num = Number(amount);
  if (!num || num <= 0) return 0;

  const rate = branchId === "MPOHOR" ? 0.001 : 0.002;
  return Number((num * rate).toFixed(2));
};

/* ================= AMOUNT SERVED ================= */
// Amount Served = Amount Paid + Commission
const calcAmountServed = (amount, branchId) => {
  const paid = Number(amount);
  if (!paid || paid <= 0) return 0;

  const commission = calcCommission(paid, branchId);
  return Number((paid + commission).toFixed(2));
};

export default function HeadSubmit() {
    const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    ecwNumber: "",
    amountPaid: "",
  });

  /* ================= THEME ================= */
  const pageBg =
    theme === "dark"
      ? "bg-gradient-to-br from-[#020617] via-black to-[#0c4a6e] text-white"
      : "bg-gray-100 text-black";

  const card =
    theme === "dark"
      ? "bg-white/10 border border-white/30"
      : "bg-white border border-black/20";

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
        collection(db, "Report_ECW"),
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
    if (!form.ecwNumber || !form.amountPaid || !user) return;

    const amountPaid = Number(form.amountPaid);
    const commission = calcCommission(amountPaid, user.branchId);
    const amountServed = calcAmountServed(amountPaid, user.branchId);

    try {
      setLoading(true);

      const payload = {
        ecwNumber: form.ecwNumber,
        amountPaid,
        amountServed,
        commission,

        agentId: user.uid,
        agentName: user.name || user.email,
        branchId: user.branchId,

        approved: false,
        createdAt: serverTimestamp(),
      };

      const ref = await addDoc(
        collection(db, "Report_ECW"),
        payload
      );

      setReports((prev) => [
        { id: ref.id, ...payload, createdAt: new Date() },
        ...prev,
      ]);

      setForm({ ecwNumber: "", amountPaid: "" });
        alert("Submission successful");

    } catch (err) {
      console.error(err);
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= TODAY HELPERS ================= */
  const todayStr = new Date().toDateString();

const isToday = React.useCallback((ts) => {
  if (!ts) return false;
  const date =
    ts instanceof Date
      ? ts
      : ts.toDate
      ? ts.toDate()
      : null;
  return date ? date.toDateString() === todayStr : false;
}, [todayStr]);


  const todayReports = useMemo(
    () => reports.filter((r) => isToday(r.createdAt)),
    [reports, isToday]
  );

  const totalAmount = useMemo(
    () =>
      todayReports.reduce(
        (s, r) => s + Number(r.amountPaid || 0),
        0
      ),
    [todayReports]
  );

  const totalServed = useMemo(
  () =>
    todayReports.reduce(
      (s, r) => s + Number(r.amountServed || 0),
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
              <User size={22} /> OFFICE | ECW
            </h2>
            <p className="text-sm opacity-70">
              Welcome back, {user?.name || "Agent"}
            </p>
          </div>
           <button
                      onClick={() => navigate("/head/report")}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium flex items-center gap-1"
                    >
                      <Users size={14} />
                      PAYG Report
                    </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setTheme(theme === "light" ? "dark" : "light")
              }
              className={`p-2 rounded-full ${card}`}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <LogoutButton />
          </div>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className={`p-5 rounded-2xl ${card}`}>
            <p className="text-sm opacity-70 flex items-center gap-2">
              <Wallet size={16} /> Total Paid (Today)
            </p>
            <p className="text-3xl font-bold">GHS {totalAmount}</p>
          </div>

          <div className={`p-5 rounded-2xl ${card}`}>
  <p className="text-sm opacity-70 flex items-center gap-2">
    <Coins size={16} /> Total Served (Today)
  </p>
  <p className="text-3xl font-bold text-emerald-500">
    GHS {totalServed.toFixed(2)}
  </p>
</div>
        </div>

        {/* FORM */}
        <div className={`p-6 rounded-2xl ${card} mb-6`}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> New ECW Report
          </h3>

          <div className="grid gap-3">
            <input
              placeholder="Customer ECW Number"
              value={form.ecwNumber}
              onChange={(e) =>
                setForm({ ...form, ecwNumber: e.target.value })
              }
              className={`px-4 py-3 rounded-xl ${input}`}
            />

            <input
              type="number"
              placeholder="Amount Paid (GHS)"
              value={form.amountPaid}
              onChange={(e) =>
                setForm({ ...form, amountPaid: e.target.value })
              }
              className={`px-4 py-3 rounded-xl ${input}`}
            />

            <input
              readOnly
              value={calcAmountServed(form.amountPaid, user?.branchId)}
              placeholder="Amount Served"
              className={`px-4 py-3 rounded-xl opacity-70 cursor-not-allowed ${input}`}
            />

            <p className="text-xs opacity-60">
              Amount Served is calculated automatically
            </p>

            <button
              onClick={submitReport}
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold disabled:opacity-50"
            >
              <Send size={16} />
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>

        {/* MOST RECENT */}
        <AnimatePresence>
          {recent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20"
            >
              <p className="text-xs uppercase opacity-70 mb-2 flex items-center gap-2">
                <Clock size={14} /> Most Recent
              </p>

              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-lg">
                    ECW: {recent.ecwNumber}
                  </p>
                  <p className="text-sm opacity-70">
                    Paid: GHS {recent.amountPaid}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-500">
                    +GHS {recent.commission}
                  </p>
                  <p className="text-xs opacity-60">Commission</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
