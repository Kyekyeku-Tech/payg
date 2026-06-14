import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import LogoutButton from "../components/LogoutButton";
import { User, Briefcase, Phone, ArrowLeft } from "lucide-react";

export default function AgentCustomerList() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((customer) => {
      const branchText = customer.branchName || customer.branchId || "";
      return [customer.name, customer.businessName, customer.phone, branchText]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [customers, searchTerm]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      const snap = await getDocs(
        query(collection(db, "users"), where("__name__", "==", u.uid))
      );

      const profile = snap.docs[0]?.data() || {};
      setUser({ uid: u.uid, email: u.email, ...profile });
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadCustomers = async () => {
      try {
        setLoading(true);

        const queries = [];
        if (user.branchId) {
          queries.push(
            getDocs(
              query(
                collection(db, "customers"),
                where("branchId", "==", user.branchId)
              )
            )
          );
        }

        queries.push(
          getDocs(
            query(collection(db, "customers"), where("agentId", "==", user.uid))
          )
        );

        const snapshots = await Promise.all(queries);
        const docs = snapshots.flatMap((snapshot) =>
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );

        const uniqueCustomers = [...new Map(docs.map((customer) => [customer.id, customer])).values()];
        setCustomers(uniqueCustomers);
      } catch (err) {
        console.error("Failed to load customers", err);
        setError("Unable to load customers.");
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User size={24} /> Customer List
            </h1>
            <p className="text-sm opacity-70 mt-1">
              View all registered customers and open their location in Google Maps.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <LogoutButton />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Customers</p>
              <h2 className="text-xl font-semibold">Your branch customers</h2>
            </div>
            <p className="text-sm text-slate-600">
              {loading ? "Loading..." : `${filteredCustomers.length} customer${filteredCustomers.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="mb-4">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, business, phone, or branch..."
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />

            {error && (
              <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            {!loading && customers.length === 0 && !error && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-600">
                No customers have been registered yet.
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3">Customer</th>
                  <th className="border-b border-slate-200 px-4 py-3">Business</th>
                  <th className="border-b border-slate-200 px-4 py-3">Branch</th>
                  <th className="border-b border-slate-200 px-4 py-3">Phone</th>
                  <th className="border-b border-slate-200 px-4 py-3">Location</th>
                  <th className="border-b border-slate-200 px-4 py-3">Map</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const location = customer.location || {};
                  const hasLocation = location.lat && location.lng;
                  const mapsUrl = location.name
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name)}`
                    : hasLocation
                    ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
                    : null;

                  const locationLabel = location.name
                    ? location.name
                    : hasLocation
                    ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
                    : "Not available";

                  return (
                    <tr key={customer.id} className="border-b border-slate-200 last:border-b-0 bg-white hover:bg-slate-50">
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-sm font-semibold text-white">
                            {(customer.name || "").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "NA"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{customer.name || "Unnamed"}</div>
                            <div className="mt-1 text-xs text-slate-500">{customer.email || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700">
                        <div className="flex items-center gap-2">
                          <Briefcase size={14} className="text-slate-400" />
                          <span className="truncate">{customer.businessName || "No business name"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700">{customer.branchName || customer.branchId || "Unknown"}</td>
                      <td className="px-4 py-4 align-top text-slate-700">
                        <div className="inline-flex items-center gap-2">
                          <Phone size={14} className="text-slate-400" />
                          <span>{customer.phone || "No phone"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700 truncate max-w-[180px]">{locationLabel}</td>
                      <td className="px-4 py-4 align-top">
                        {mapsUrl ? (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Maps
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No map</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
