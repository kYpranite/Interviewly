// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7yqceXImF0RUHODrD6jcYCIZAUM1GkaE",
  authDomain: "interviewly-cb4ad.firebaseapp.com",
  projectId: "interviewly-cb4ad",
  storageBucket: "interviewly-cb4ad.firebasestorage.app",
  messagingSenderId: "161349235243",
  appId: "1:161349235243:web:23f23c8c91e632e97df06e",
  measurementId: "G-VM97RCV935"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
