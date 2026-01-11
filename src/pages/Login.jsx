import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  Sun,
  Moon,
  User,
  Briefcase,
  Crown,
} from "lucide-react";

/* ================= BRANCHES ================= */
const BRANCHES = [
  "AGONA",
  "BAKAEKYIR",
  "ELUBO",
  "AXIM",
  "ESIAMA",
  "VOL-MAGT",
  "TYPE-C",
  "KOJOKROM",
  "ANAJI-K",
  "MPOHOR",
];

export default function Login() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [name, setName] = useState(""); // ✅ ADDED
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [branchId, setBranchId] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      /* ===== REGISTER ===== */
      if (isRegister) {
        if (!name || !email || !password)
          throw new Error("All fields are required");

        if (password.length < 6)
          throw new Error("Password must be at least 6 characters");

        if (role !== "gm" && !branchId)
          throw new Error("Please select a branch");

        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password.trim()
        );

        await setDoc(doc(db, "users", cred.user.uid), {
          name: name.trim(), // ✅ SAVED
          email: email.trim(),
          role,
          branchId: role === "gm" ? null : branchId,
          approved: role === "agent",
          createdAt: serverTimestamp(),
        });

        if (role !== "agent") {
          throw new Error(
            "Account created successfully. Await admin approval before login."
          );
        }
      }

      /* ===== LOGIN ===== */
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim()
      );

      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) throw new Error("User profile not found");

      const user = snap.data();

      if (!user.approved) {
        throw new Error("Your account is pending admin approval");
      }

      if (user.role === "agent") navigate("/agent/dashboard");
      else if (user.role === "branch_head") navigate("/head/dashboard");
      else if (user.role === "gm") navigate("/gm/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= THEME ================= */
  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  const container =
    theme === "dark"
      ? "min-h-screen flex items-center justify-center bg-gradient-to-br from-[#020617] via-black to-[#0c4a6e] p-4"
      : "min-h-screen flex items-center justify-center bg-gray-100 p-4";

  const card =
    theme === "dark"
      ? "w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/40 shadow-2xl text-white"
      : "w-full max-w-md bg-white p-8 rounded-3xl border-2 border-black shadow-2xl text-black";

  const input =
    "w-full p-3 rounded-xl outline-none transition focus:ring-2 " +
    (theme === "dark"
      ? "bg-black/40 text-white border border-slate-700/40 focus:ring-sky-500 placeholder-gray-400"
      : "bg-white text-black border-2 border-black focus:ring-black");

  const button =
    "w-full p-3 rounded-xl font-bold flex justify-center items-center gap-2 transition " +
    (loading
      ? "opacity-60 cursor-not-allowed"
      : theme === "dark"
      ? "bg-sky-600 hover:bg-sky-500"
      : "bg-black text-white hover:bg-gray-900");

  /* ================= UI ================= */
  return (
    <div className={container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={card}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-extrabold flex items-center gap-2">
              <ShieldCheck className="text-sky-500" />
              PAYG System
            </h2>
            <p className="text-sm opacity-70">
              {isRegister ? "Create a new account" : "Sign in to continue"}
            </p>
          </div>

          <button onClick={toggleTheme} className="p-2 rounded-full border">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 text-sm text-center p-3 rounded-xl border border-red-500 bg-red-500/10 text-red-500">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ NAME INPUT (REGISTER ONLY) */}
          {isRegister && (
            <input
              className={input}
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            className={input}
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className={input}
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* ROLE SELECT */}
          {isRegister && (
            <div className="grid grid-cols-3 gap-2">
              <RoleCard icon={<User />} label="DSR/AGENT" value="agent" role={role} setRole={setRole} theme={theme} />
              <RoleCard icon={<Briefcase />} label="HEAD" value="branch_head" role={role} setRole={setRole} theme={theme} />
              <RoleCard icon={<Crown />} label="MANAGER" value="gm" role={role} setRole={setRole} theme={theme} />
            </div>
          )}

          {/* BRANCH */}
          {isRegister && role !== "gm" && (
            <select
              className={input}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">Select Branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          <button type="submit" className={button}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Please wait…
              </>
            ) : isRegister ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* TOGGLE */}
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="mt-5 w-full text-sm font-semibold text-center underline"
        >
          {isRegister
            ? "Already have an account? Sign In"
            : "Create new user account"}
        </button>
      </motion.div>
    </div>
  );
}

/* ================= ROLE CARD ================= */
function RoleCard({ icon, label, value, role, setRole, theme }) {
  const active = role === value;

  return (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={`p-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 transition-all duration-200
        ${
          active
            ? theme === "dark"
              ? "bg-sky-600/20 border-sky-500 text-white"
              : "bg-black text-white border-black"
            : theme === "dark"
              ? "border-slate-700/40 hover:bg-white/5"
              : "border-black/30 hover:bg-black/10"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
