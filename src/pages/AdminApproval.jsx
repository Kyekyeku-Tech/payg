import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Loader2,
  CheckCircle,
  UserCog,
  Search,
  Sun,
  Moon,
  Trash2,
  ArrowLeft,
} from "lucide-react";

/* ================= BRANCHES ================= */
const BRANCHES = [
  "AGONA","BAKAEKYIR","ELUBO","AXIM","ESIAMA",
  "VOL-MAGT","TYPE-C","KOJOKROM","ANAJI-K","MPOHOR",
];

/* ================= ROLES ================= */
const ROLES = [
  { value: "agent", label: "Agent" },
  { value: "branch_head", label: "Branch Head" },
  { value: "gm", label: "General Manager" },
];

export default function AdminApproval() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [search, setSearch] = useState("");

  /* 🌞 DEFAULT LIGHT THEME */
  const [theme, setTheme] = useState(
    () => localStorage.getItem("admin-theme") || "light"
  );

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/login");

      const snap = await getDocs(collection(db, "users"));
      const me = snap.docs.find((d) => d.id === user.uid);

      if (!me || me.data().role !== "gm") {
        navigate("/login");
      }
    });

    return unsub;
  }, [navigate]);

  /* ================= LOAD USERS ================= */
  const loadUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /* ================= SEARCH ================= */
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  /* ================= UPDATE USER ================= */
  const updateUser = async (id, updates) => {
    setProcessing(id);
    await updateDoc(doc(db, "users", id), updates);
    await loadUsers();
    setProcessing(null);
  };

  /* ================= DELETE USER ================= */
  const deleteUser = async (id, name) => {
    const ok = window.confirm(
      `Are you sure you want to delete ${name || "this user"}?`
    );
    if (!ok) return;

    try {
      setProcessing(id);
      await deleteDoc(doc(db, "users", id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert("Failed to delete user");
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  /* ================= THEME ================= */
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("admin-theme", next);
  };

  const bg =
    theme === "dark"
      ? "bg-gradient-to-br from-[#020617] via-black to-[#0c4a6e] text-white"
      : "bg-gray-100 text-black";

  const card =
    theme === "dark"
      ? "bg-white/5 border border-white/30"
      : "bg-white border border-black/30";

  const input =
    theme === "dark"
      ? "bg-black/40 border border-white/40"
      : "bg-white border border-black/40";

  /* ================= UI ================= */
  return (
    <div className={`min-h-screen ${bg} p-6`}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-sky-500" size={30} />
            <h1 className="text-3xl font-extrabold">
              User Manag.
            </h1>
          </div>

          <div className="flex gap-2">
            {/* BACK */}
            <button
              onClick={() => navigate("/gm/dashboard")}
              className="px-4 py-2 rounded-xl border flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>

            {/* THEME */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3.5 opacity-60" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className={`w-full pl-10 p-3 rounded-xl outline-none ${input}`}
          />
        </div>

       {loading ? (
  <div className="flex justify-center p-10">
    <Loader2 className="animate-spin" size={32} />
  </div>
) : filteredUsers.length === 0 ? (
  <div className={`p-10 rounded-2xl text-center ${card}`}>
    No users found
  </div>
) : (
  <div
    className={`rounded-2xl overflow-x-auto ${card}`}
    style={{ maxHeight: "65vh" }}
  >
    <table className="min-w-full text-sm">
      <thead className="sticky top-0 backdrop-blur bg-black/5">
        <tr className="border-b">
          <th className="p-3 text-left">User</th>
          <th className="p-3 text-left">Role</th>
          <th className="p-3 text-left">Branch</th>
          <th className="p-3 text-center">Approve</th>
          <th className="p-3 text-center">Delete</th>
        </tr>
      </thead>

      <tbody>
        {filteredUsers.map((u) => (
          <tr
            key={u.id}
            className="border-b hover:bg-black/5 transition"
          >
            {/* USER */}
            <td className="p-3">
              <p className="font-semibold">
                {u.name || "No name"}
              </p>
              <p className="text-xs opacity-60">
                {u.email}
              </p>
            </td>

            {/* ROLE */}
            <td className="p-3">
              <select
                value={u.role}
                onChange={(e) =>
                  updateUser(u.id, {
                    role: e.target.value,
                    branchId:
                      e.target.value === "gm"
                        ? null
                        : u.branchId,
                  })
                }
                className={`px-2 py-1 rounded-lg text-xs ${input}`}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </td>

            {/* BRANCH */}
            <td className="p-3">
              <select
                disabled={u.role === "gm"}
                value={u.branchId || ""}
                onChange={(e) =>
                  updateUser(u.id, {
                    branchId: e.target.value,
                  })
                }
                className={`px-2 py-1 rounded-lg text-xs disabled:opacity-40 ${input}`}
              >
                <option value="">—</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </td>

            {/* APPROVE */}
            <td className="p-3 text-center">
              <button
                disabled={u.approved || processing === u.id}
                onClick={() =>
                  updateUser(u.id, { approved: true })
                }
                className={`px-3 py-1 rounded-full text-xs font-semibold
                  ${
                    u.approved
                      ? "bg-green-500/20 text-green-600"
                      : "bg-sky-600 text-white hover:bg-sky-500"
                  }`}
              >
                {processing === u.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : u.approved ? (
                  "Approved"
                ) : (
                  "Approve"
                )}
              </button>
            </td>

            {/* DELETE */}
            <td className="p-3 text-center">
              <button
                disabled={processing === u.id}
                onClick={() => deleteUser(u.id, u.name)}
                className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white"
              >
                <Trash2 size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

      </motion.div>
    </div>
  );
}
