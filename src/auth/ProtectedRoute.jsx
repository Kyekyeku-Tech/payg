import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";


export default function ProtectedRoute({ children, role }) {
const [allowed, setAllowed] = useState(null);


useEffect(() => {
const check = async () => {
const user = auth.currentUser;
if (!user) return setAllowed(false);
const snap = await getDoc(doc(db, "users", user.uid));
setAllowed(snap.exists() && snap.data().role === role);
};
check();
}, []);


if (allowed === null) return null;
return allowed ? children : <Navigate to="/" />;
}