import React, { useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import LogoutButton from "../components/LogoutButton";
import { UserPlus, Phone, MapPin, ArrowLeft, CheckCircle } from "lucide-react";

export default function AgentCustomerRegister() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    phone: "",
  });
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [manualLocation, setManualLocation] = useState(false);
  const [manualLocationName, setManualLocationName] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

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

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setDetecting(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setDetecting(false);
      },
      (err) => {
        setLocationError(err.message || "Unable to detect location.");
        setDetecting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const saveManualLocation = () => {
    if (!manualLocationName.trim()) {
      setLocationError("Please enter a location name.");
      return;
    }

    setLocation({ name: manualLocationName.trim() });
    setLocationError(null);
    setMessage("Manual location saved.");
    setTimeout(() => setMessage(""), 3000);
  };

  const shareLink = location
    ? location.name
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name)}`
      : `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
    : null;

  const copyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setMessage("Map link copied to clipboard.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Unable to copy link.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const submitCustomer = async () => {
    if (!form.name.trim() || !form.phone.trim() || !user) return;

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        phone: form.phone.trim(),
        location: location || null,
        agentId: user.uid,
        agentName: user.name || user.email || null,
        branchId: user.branchId || null,
        agentEmail: user.email || null,
        submittedByUid: user.uid,
        submittedByName: user.name || user.email || null,
        submittedByRole: user.role || "agent",
        submittedByEmail: user.email || null,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "customers"), payload);

      setForm({ name: "", businessName: "", phone: "" });
      setLocation(null);
      setMessage("Customer registered successfully.");
    } catch (err) {
      console.error("Customer registration failed", err);
      setMessage("Unable to register customer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserPlus size={24} /> Register New Customer
            </h1>
            <p className="text-sm opacity-70 mt-1">
              Capture customer details and share their location with Google Maps.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <LogoutButton />
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Customer Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="mt-2 w-full rounded-xl border border-black bg-white px-4 py-3 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Business Name</span>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="Business name"
                className="mt-2 w-full rounded-xl border border-black bg-white px-4 py-3 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Personal Number</span>
            <div className="relative mt-2">
              <Phone className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
                className="mt-1 w-full rounded-xl border border-black bg-white px-10 py-3 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>
          </label>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin size={20} /> Location
                </h2>
                <p className="text-sm opacity-70">
                  Detect the customer location once you are at their place.
                </p>
              </div>
              <div className="flex flex-row flex-wrap items-center gap-2">
                <button
                  onClick={detectLocation}
                  disabled={detecting}
                  className="rounded-xl bg-sky-600 px-3 py-2 text-xs sm:px-4 sm:text-sm text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  {detecting ? "Detecting…" : "Auto Detect"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManualLocation((prev) => !prev);
                    setLocationError(null);
                    setMessage("");
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:px-4 sm:text-sm text-slate-700 hover:bg-slate-50"
                >
                  {manualLocation ? "Hide manual" : "Manual location"}
                </button>
              </div>
            </div>

            {manualLocation && (
              <div className="grid gap-4 mb-4">
                <label className="block">
                  <span className="text-sm font-medium">Location Name</span>
                  <input
                    value={manualLocationName}
                    onChange={(e) => setManualLocationName(e.target.value)}
                    placeholder="Enter location name or address"
                    className="mt-2 w-full rounded-xl border border-black bg-white px-4 py-3 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveManualLocation}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
                >
                  Save location name
                </button>
              </div>
            )}

            {location ? (
              <div className="space-y-2">
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="font-semibold">Location</p>
                  {location.name ? (
                    <p>{location.name}</p>
                  ) : (
                    <>
                      <p>Latitude: {location.lat.toFixed(6)}</p>
                      <p>Longitude: {location.lng.toFixed(6)}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
                  >
                    <MapPin size={16} /> Open in Google Maps
                  </a>
                  <button
                    onClick={copyLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    <CheckCircle size={16} /> Copy share link
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-70">Location not selected yet.</p>
            )}

            {locationError && (
              <p className="mt-3 rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-700">
                {locationError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={submitCustomer}
              disabled={saving || !form.name.trim() || !form.phone.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Register Customer"}
            </button>
            {message && (
              <p className="text-sm text-slate-700">{message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
