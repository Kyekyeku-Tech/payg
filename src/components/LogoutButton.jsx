import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function LogoutButton({ className = "" }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Firebase sign out
      await signOut(auth);

      // Cleanup
      localStorage.clear();
      sessionStorage.clear();

      // Redirect & prevent back navigation
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition ${className}`}
    >
      Logout
    </button>
  );
}
