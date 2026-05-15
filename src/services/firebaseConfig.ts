
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCTbA2XAbvL4kyiw2zs2uLRI9sRACZvtCU",
  authDomain: "icampus-1f281.firebaseapp.com",
  projectId: "icampus-1f281",
  storageBucket: "icampus-1f281.firebasestorage.app",
  messagingSenderId: "323683254648",
  appId: "1:323683254648:web:de1fd0966248a19be8488d",
  measurementId: "G-YQMKNZMRER"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
