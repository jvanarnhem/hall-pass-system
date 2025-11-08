// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration - PASTE YOUR CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyB-lYjdAj3M35vwjOpiIHs4KLscsRbWU-I",
  authDomain: "ofhs-hall-pass.firebaseapp.com",
  projectId: "ofhs-hall-pass",
  storageBucket: "ofhs-hall-pass.firebasestorage.app",
  messagingSenderId: "679070766223",
  appId: "1:679070766223:web:dc5c5922ae1bcd77474cfa",
  measurementId: "G-VM7B69WDXY",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: "select_account",
  hd: "ofcs.net", // Only allow @ofcs.net domain
});

export default app;
