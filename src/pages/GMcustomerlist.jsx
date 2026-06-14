import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Download,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { db } from "../firebase";
import LogoutButton from "../components/LogoutButton";

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

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate) return value.toDate();
  return null;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleString() : "-";
};

const formatLocation = (location) => {
  if (!location) return "Not available";
  if (location.name) return location.name;
  if (location.lat != null && location.lng != null) {
    return `${Number(location.lat).toFixed(6)}, ${Number(location.lng).toFixed(6)}`;
  }
  return "Not available";
};

const mapsUrlFor = (location) => {
  if (!location) return null;
  if (location.name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location.name
    )}`;
  }
  if (location.lat != null && location.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
  }
  return null;
};

const excelCell = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export default function GMCustomerList() {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const users = {};

        snap.docs.forEach((userDoc) => {
          users[userDoc.id] = userDoc.data();
        });

        setUsersById(users);
      } catch (err) {
        console.error("Failed to load users for customer names", err);
      }
    };

    loadUsers();
  }, []);

  const registeredByName = useCallback((customer) => {
    const userId = customer.submittedByUid || customer.agentId;
    const profile = userId ? usersById[userId] : null;

    return (
      customer.submittedByName ||
      customer.agentName ||
      profile?.name ||
      profile?.displayName ||
      customer.submittedByEmail ||
      customer.agentEmail ||
      userId ||
      "Unknown"
    );
  }, [usersById]);

  useEffect(() => {
    if (!selectedBranch) {
      setCustomers([]);
      setError("");
      return;
    }

    const loadCustomers = async () => {
      try {
        setLoading(true);
        setError("");

        const snap = await getDocs(
          query(
            collection(db, "customers"),
            where("branchId", "==", selectedBranch)
          )
        );

        const docs = snap.docs
          .map((customerDoc) => ({ id: customerDoc.id, ...customerDoc.data() }))
          .sort((a, b) => {
            const left = toDate(a.createdAt)?.getTime() || 0;
            const right = toDate(b.createdAt)?.getTime() || 0;
            return right - left;
          });

        setCustomers(docs);
      } catch (err) {
        console.error("Failed to load GM customers", err);
        setError("Unable to load customers for this branch.");
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [selectedBranch, refreshKey]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.businessName,
        customer.phone,
        registeredByName(customer),
        customer.agentEmail,
        customer.submittedByEmail,
        customer.submittedByRole,
        customer.branchId,
        formatLocation(customer.location),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [customers, searchTerm, registeredByName]);

  const deleteCustomer = async (customer) => {
    const name = customer.name || "this customer";
    const ok = window.confirm(
      `Delete ${name} from ${customer.branchId || selectedBranch}? This cannot be undone.`
    );

    if (!ok) return;

    try {
      setDeletingId(customer.id);
      await deleteDoc(doc(db, "customers", customer.id));
      setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
    } catch (err) {
      console.error("Failed to delete customer", err);
      alert(
        err?.code === "permission-denied"
          ? "Permission denied. Update Firestore rules so GM can delete customers."
          : "Failed to delete customer."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const exportToExcel = () => {
    if (!selectedBranch) {
      alert("Select a branch first.");
      return;
    }

    if (!filteredCustomers.length) {
      alert("No customers to export.");
      return;
    }

    const headers = [
      "Customer",
      "Business",
      "Phone",
      "Branch",
      "Registered By",
      "Submitter Role",
      "Location",
      "Map Link",
      "Registered Date",
    ];

    const rows = filteredCustomers.map((customer) => {
      const mapLink = mapsUrlFor(customer.location) || "";

      return [
        customer.name || "",
        customer.businessName || "",
        customer.phone || "",
        customer.branchId || "",
        registeredByName(customer),
        customer.submittedByRole || "",
        formatLocation(customer.location),
        mapLink,
        formatDate(customer.createdAt),
      ];
    });

    const tableRows = [headers, ...rows]
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${excelCell(cell)}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <caption>${excelCell(selectedBranch)} Customers</caption>
            ${tableRows}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedBranch}-customers.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Users size={24} /> Management Customers
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Select one branch to view, delete, and export registered customers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/gm/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Dashboard
            </button>
            <LogoutButton />
          </div>
        </div>

        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[220px_1fr_auto_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Exact Branch
            </span>
            <select
              value={selectedBranch}
              onChange={(event) => {
                setSelectedBranch(event.target.value);
                setSearchTerm("");
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            >
              <option value="">Select branch</option>
              {BRANCHES.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Search Selected Branch
            </span>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                size={16}
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                disabled={!selectedBranch}
                placeholder="Search name, business, phone, location..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-10 py-3 text-sm disabled:opacity-60 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>
          </label>

          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={!selectedBranch || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            disabled={!selectedBranch || !filteredCustomers.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>

        {selectedBranch ? (
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Building2 size={16} /> Selected Branch
              </p>
              <p className="mt-2 text-2xl font-bold">{selectedBranch}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">Registered Customers</p>
              <p className="mt-2 text-2xl font-bold">{customers.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">Showing</p>
              <p className="mt-2 text-2xl font-bold">
                {filteredCustomers.length}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            Select an exact branch to load registered customers.
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {selectedBranch && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Customer
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Business
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Phone
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Registered By
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Location
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Date
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <Loader2 className="animate-spin" size={16} />
                        Loading customers...
                      </span>
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredCustomers.map((customer) => {
                    const mapsUrl = mapsUrlFor(customer.location);

                    return (
                      <tr key={customer.id} className="bg-white hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          <p className="font-semibold text-slate-900">
                            {customer.name || "Unnamed"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {customer.branchId || selectedBranch}
                          </p>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top text-slate-700">
                          {customer.businessName || "No business name"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top text-slate-700">
                          {customer.phone || "No phone"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top text-slate-700">
                          <p>
                            {registeredByName(customer)}
                          </p>
                          {customer.submittedByRole && (
                            <p className="mt-1 text-xs text-slate-500">
                              {customer.submittedByRole}
                            </p>
                          )}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top text-slate-700">
                          <p className="max-w-[220px] truncate">
                            {formatLocation(customer.location)}
                          </p>
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              <MapPin size={12} /> Maps
                            </a>
                          )}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top text-slate-700">
                          {formatDate(customer.createdAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top text-right">
                          <button
                            onClick={() => deleteCustomer(customer)}
                            disabled={deletingId === customer.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                          >
                            {deletingId === customer.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && filteredCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No customers found for {selectedBranch}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
