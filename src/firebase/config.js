import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-lYjdAj3M35vwjOpiIHs4KLscsRbWU-I",
  authDomain: "ofhs-hall-pass.firebaseapp.com",
  projectId: "ofhs-hall-pass",
  storageBucket: "ofhs-hall-pass.firebasestorage.app",
  messagingSenderId: "679070766223",
  appId: "1:679070766223:web:dc5c5922ae1bcd77474cfa",
  measurementId: "G-VM7B69WDXY",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ✅ KEEP THIS - restricts login to @ofcs.net domain
googleProvider.setCustomParameters({
  prompt: "select_account",
  hd: "ofcs.net", // Only allow @ofcs.net domain
});

// ✅ NEW - Enable persistent caching
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

// ✅ KEEP THIS - default export
export default app;