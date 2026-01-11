import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/login") {
      localStorage.setItem("lastRoute", location.pathname);
    }
  }, [location]);

  return null;
}
