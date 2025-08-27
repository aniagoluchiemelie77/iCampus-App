// Import the functions you need from the SDKs you need
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
