import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyCFW4WMIvJjbFiyeym7I6OCk_FPAovAMIE",
  authDomain: "payg-6219f.firebaseapp.com",
  projectId: "payg-6219f",
  storageBucket: "payg-6219f.firebasestorage.app",
  messagingSenderId: "340280657976",
  appId: "1:340280657976:web:b4e80a90254bb616aefecd",
  measurementId: "G-YQ9CL0WR8G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);