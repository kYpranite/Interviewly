import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD7yqceXImF0RUHODrD6jcYCIZAUM1GkaE",
  authDomain: "interviewly-cb4ad.firebaseapp.com",
  projectId: "interviewly-cb4ad",
  storageBucket: "interviewly-cb4ad.firebasestorage.app",
  messagingSenderId: "161349235243",
  appId: "1:161349235243:web:23f23c8c91e632e97df06e",
  measurementId: "G-VM97RCV935",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
