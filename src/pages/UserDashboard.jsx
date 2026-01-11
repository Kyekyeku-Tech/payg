import SubmissionForm from "../components/SubmissionForm";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";


export default function UserDashboard() {
const [branch, setBranch] = useState(null);


useEffect(() => {
getDoc(doc(db, "users", auth.currentUser.uid)).then(s => setBranch(s.data()));
}, []);


if (!branch) return null;


return (
<div className="container">
<h4>{branch.branchName}</h4>
<SubmissionForm branch={branch} />
</div>
);
}