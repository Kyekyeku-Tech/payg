import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email) {
        throw new Error("Please enter your email address");
      }

      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl border-2 border-black shadow-2xl"
      >
        {/* HEADER */}
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold flex items-center gap-2">
            <Mail />
            Reset Password
          </h2>
          <p className="text-sm opacity-70">
            Enter your email to receive a reset link
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 text-sm p-3 rounded-xl border border-red-500 bg-red-500/10 text-red-500">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-4 text-sm p-3 rounded-xl border border-emerald-500 bg-emerald-500/10 text-emerald-600">
            Reset link sent. Check your email inbox or spam.
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 rounded-xl border-2 border-black outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-xl bg-black text-white font-bold flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Sending…
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {/* BACK TO LOGIN */}
        <button
          onClick={() => navigate("/login")}
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-semibold underline"
        >
          <ArrowLeft size={16} />
          Back to Login
        </button>
      </motion.div>
    </div>
  );
}
