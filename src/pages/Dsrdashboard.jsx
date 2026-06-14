import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import LogoutButton from "../components/LogoutButton";
import { BRANCH_CUSTOMERS } from "../data/branchCustomers";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Wallet,
  Coins,
  Send,
  TrendingUp,
  Clock,
  Menu,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";


/* ================= COMMISSION ================= */
// Default rate = 0.002
// MPOHOR rate = 0.001 (500 → 0.50)

const calcCommission = (amount, branchId) => {
  const num = Number(amount);
  if (!num || num <= 0) return 0;

  const rate = branchId === "MPOHOR" ? 0.001 : 0.002;

  return Number((num * rate).toFixed(2));
};

const makeCustomerSuggestionId = (agentId, branchId, customerName) => {
  const cleanName = customerName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${agentId}_${branchId || "branch"}_${cleanName || "customer"}`;
};


export default function AgentDashboard() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [registeredCustomers, setRegisteredCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");
  const [menuOpen, setMenuOpen] = useState(false);

// 🌞 default

  const [form, setForm] = useState({
    customerName: "",
    amount: "",
  });

    /* ================= CUSTOMER AUTOCOMPLETE ================= */
  const [suggestions, setSuggestions] = useState([]);

  const customerOptions = useMemo(() => {
    const map = new Map();

    const remember = (customer) => {
      const name = customer?.name || customer?.customerName;
      if (!name) return;

      const key = name.trim().toLowerCase();
      const existing = map.get(key) || {};

      map.set(key, {
        ...existing,
        ...customer,
        name: name.trim(),
      });
    };

    (BRANCH_CUSTOMERS[user?.branchId] || []).forEach((name) =>
      remember({ name })
    );

    reports.forEach((report) =>
      remember({
        name: report.customerName,
        lastAmount: report.amount,
        lastUsedAt: report.createdAt,
      })
    );

    savedCustomers
      .filter((customer) => !user?.branchId || customer.branchId === user.branchId)
      .forEach(remember);

    return Array.from(map.values());
  }, [reports, savedCustomers, user?.branchId]);

  const handleCustomerChange = (value) => {
    setForm({ ...form, customerName: value });

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const search = value.toLowerCase();
    const filtered = customerOptions.filter((customer) =>
      customer.name.toLowerCase().includes(search)
    );

    setSuggestions(filtered.slice(0, 6));
  };

  const selectCustomerSuggestion = (customer) => {
    setForm({
      ...form,
      customerName: customer.name,
    });
    setSuggestions([]);
  };

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
      const reportsQuery = query(
        collection(db, "reports"),
        where("agentId", "==", user.uid)
      );

      const savedCustomersQuery = query(
        collection(db, "customer_suggestions"),
        where("agentId", "==", user.uid)
      );

      const registeredCustomersQuery = query(
        collection(db, "customers"),
        where("agentId", "==", user.uid)
      );

      const [snap, savedSnap, registeredSnap] = await Promise.all([
        getDocs(reportsQuery),
        getDocs(savedCustomersQuery),
        getDocs(registeredCustomersQuery),
      ]);

      setReports(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.createdAt?.seconds || 0) -
              (a.createdAt?.seconds || 0)
          )
      );

      setSavedCustomers(
        savedSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );

      setRegisteredCustomers(
        registeredSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    };

    load();
  }, [user]);

  /* ================= SUBMIT ================= */
  const submitReport = async () => {
    if (!form.customerName || !form.amount || !user) return;

    const amount = Number(form.amount);
    const commission = calcCommission(amount, user.branchId);


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

      const customerSuggestion = {
        name: form.customerName.trim(),
        customerName: form.customerName.trim(),
        lastAmount: amount,
        agentId: user.uid,
        branchId: user.branchId,
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(
          db,
          "customer_suggestions",
          makeCustomerSuggestionId(user.uid, user.branchId, form.customerName)
        ),
        customerSuggestion,
        { merge: true }
      );

      // 🔥 instant UI update
      setReports((prev) => [
  { id: ref.id, ...payload, createdAt: new Date() },
  ...prev,
]);

setSavedCustomers((prev) => {
  const key = customerSuggestion.name.toLowerCase();
  const next = prev.filter(
    (customer) => (customer.name || customer.customerName || "").toLowerCase() !== key
  );
  return [{ ...customerSuggestion, updatedAt: new Date() }, ...next];
});

setForm({ customerName: "", amount: "" });

    } catch (err) {
      console.error("Dsrdashboard submit failed", err);
      alert("Submission failed: " + (err?.message || err));
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

  return date
    ? date.toDateString() === todayStr
    : false;
}, [todayStr]);

const todayReports = useMemo(
  () => reports.filter((r) => isToday(r.createdAt)),
  [reports, isToday]
);

const todayRegistrations = useMemo(
  () => registeredCustomers.filter((customer) => isToday(customer.createdAt)),
  [registeredCustomers, isToday]
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

const totalRegister = useMemo(
  () => todayRegistrations.length,
  [todayRegistrations]
);

  const recent = todayReports[0];

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="max-w-5xl mx-auto p-4">

        {/* HEADER */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold flex flex-wrap items-center gap-2">
                <User size={20} /> Agent / DSR
              </h2>
              <p className="text-sm sm:text-base opacity-70 max-w-xl">
                Welcome back, {user?.name || "Agent"}. Tap menu to open quick actions.
              </p>
            </div>

            <button
              onClick={() => setMenuOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 sm:hidden"
            >
              <Menu size={18} /> Menu
            </button>
          </div>

          <div className="hidden sm:block overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-3 min-w-max">
              <button
                onClick={() => navigate("/agent/customers/new")}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500"
              >
                <Users size={16} />
                Register
              </button>

              <button
                onClick={() => navigate("/agent/ecw")}
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-500"
              >
                <Users size={16} />
                ECW Report
              </button>

              <button
                onClick={() => navigate("/agent/customers")}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
              >
                <Send size={16} />
                View Customers
              </button>

              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${card} shadow-lg shadow-black/10 hover:bg-slate-100`}
              >
                {theme === "light" ? "Dark" : "Light"}
              </button>

              <LogoutButton className="inline-flex rounded-full px-4 py-2 text-sm font-semibold shadow-lg shadow-rose-500/20" />
            </div>
          </div>
        </div>

        {/* SLIDE MENU */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
            <div className="w-72 max-w-full bg-slate-950 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs uppercase opacity-60 tracking-[0.25em]">Navigation</p>
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-100 hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/agent/customers/new");
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Register Customer
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/agent/ecw");
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-slate-800"
                >
                  ECW Report
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/agent/customers");
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-slate-800"
                >
                  View Customers
                </button>

                <button
                  onClick={() => {
                    setTheme(theme === "light" ? "dark" : "light");
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Toggle Theme
                </button>

                <div className="pt-4 border-t border-slate-800">
                  <LogoutButton className="w-full rounded-2xl px-4 py-3 text-sm font-semibold" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              className="flex-1"
            />
          </div>
        )}

        {/* STATS */}
        <div className="mb-6 grid grid-cols-3 gap-2">
          <motion.div
            whileHover={{ scale: 1.04 }}
            className={`p-3 rounded-2xl ${card} text-center`}
          >
            <p className="text-[10px] opacity-80 flex items-center justify-center gap-1">
              <Wallet size={14} /> Total Amount
            </p>
            <p className="text-xl font-bold mt-2">
              GHS {totalAmount}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.04 }}
            className={`p-3 rounded-2xl ${card} text-center`}
          >
            <p className="text-[10px] opacity-80 flex items-center justify-center gap-1">
              <Coins size={14} /> Total Commission
            </p>
            <p className="text-xl font-bold text-emerald-500 mt-2">
              GHS {totalCommission.toFixed(2)}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.04 }}
            className={`p-3 rounded-2xl ${card} text-center`}
          >
            <p className="text-[10px] opacity-80 flex items-center justify-center gap-1">
              <Users size={14} /> Total Register
            </p>
            <p className="text-xl font-bold text-sky-600 mt-2">
              {totalRegister}
            </p>
          </motion.div>
        </div>

        {/* FORM */}
        <motion.div
          ref={formRef}
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl ${card} mb-6`}
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> New Transaction
          </h3>

          <div className="grid gap-3">
           <div className="relative">
  <input
    placeholder="Customer Name"
    value={form.customerName}
    onChange={(e) => handleCustomerChange(e.target.value)}
    className={`px-4 py-3 rounded-xl w-full ${input}`}
  />

  {suggestions.length > 0 && (
    <div
      className={`absolute z-20 mt-1 w-full rounded-xl overflow-hidden shadow-xl
        ${theme === "dark"
          ? "bg-black border border-white/30"
          : "bg-white border border-black/20"}
      `}
    >
      {suggestions.map((customer, i) => (
        <button
          key={i}
          type="button"
          onClick={() => selectCustomerSuggestion(customer)}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-sky-500/20`}
        >
          <span className="font-semibold">{customer.name}</span>
          {customer.lastAmount !== undefined && customer.lastAmount !== null && (
            <span className="block text-xs opacity-70">
              Last amount: GHS {customer.lastAmount}
            </span>
          )}
        </button>
      ))}
    </div>
  )}
</div>


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
                GHS {calcCommission(form.amount, user?.branchId)}

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
