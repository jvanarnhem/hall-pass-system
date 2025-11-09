// src/firebase/db.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

// Collections
export const COLLECTIONS = {
  STUDENTS: "students",
  STAFF: "staff",
  ACTIVE_PASSES: "activePasses",
  PASS_HISTORY: "passHistory",
  SETTINGS: "settings",
  DESTINATIONS: "destinations",
};

// Get student by ID
export const getStudent = async (studentId) => {
  try {
    const docRef = doc(db, COLLECTIONS.STUDENTS, studentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, student: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: "Student not found" };
    }
  } catch (error) {
    console.error("Error getting student:", error);
    return { success: false, error: error.message };
  }
};

// Get all destinations
export const getDestinations = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.DESTINATIONS),
      where("active", "==", true),
      orderBy("order")
    );
    const snapshot = await getDocs(q);
    const destinations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, destinations };
  } catch (error) {
    console.error("Error getting destinations:", error);
    return { success: false, error: error.message, destinations: [] };
  }
};

// Get system settings
export const getSystemSettings = async () => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, "system");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, settings: docSnap.data() };
    } else {
      return {
        success: false,
        error: "Settings not found",
        settings: {
          checkoutEnabled: true,
          maxCheckoutMinutes: 46,
          blockWeekends: true,
        },
      };
    }
  } catch (error) {
    console.error("Error getting settings:", error);
    return {
      success: false,
      error: error.message,
      settings: {
        checkoutEnabled: true,
        maxCheckoutMinutes: 46,
        blockWeekends: true,
      },
    };
  }
};

// Create checkout (student creates pass)
export const createCheckout = async (
  studentId,
  studentName,
  destination,
  roomFrom,
  customDestination = null
) => {
  try {
    const passData = {
      studentId,
      studentName, // <-- ADD THIS
      destination,
      roomFrom,
      customDestination,
      checkOutTime: serverTimestamp(),
      status: "OUT",
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, COLLECTIONS.ACTIVE_PASSES),
      passData
    );

    return {
      success: true,
      passId: docRef.id,
      checkOutTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error creating checkout:", error);
    return { success: false, error: error.message };
  }
};

// Check in a pass
export async function checkInPass(passId) {
  try {
    const passRef = doc(db, COLLECTIONS.ACTIVE_PASSES, passId);
    const snap = await getDoc(passRef);
    if (!snap.exists()) {
      return { success: false, error: "Active pass not found." };
    }

    const activeData = snap.data() || {};
    const outTs = activeData.checkOutTime;
    const inDate = new Date();

    let duration = null;
    if (outTs && typeof outTs.toMillis === "function") {
      const ms = Date.now() - outTs.toMillis();
      duration = ms > 0 ? Math.round(ms / 60000) : 0;
    }

    // Write to history with ALL fields (includes customDestination)
    const historyRef = doc(collection(db, COLLECTIONS.PASS_HISTORY));
    await setDoc(historyRef, {
      ...activeData,
      status: "IN",
      passId,
      checkInTime: serverTimestamp(),          // exact server time in Firestore
      // keep original createdAt if present, else set now so Today view sees it
      createdAt: activeData.createdAt ?? serverTimestamp(),
      duration,
    });

    // Remove from active
    await deleteDoc(passRef);

    return {
      success: true,
      checkInTime: inDate.toISOString(),
      duration,
      historyId: historyRef.id,
    };
  } catch (error) {
    console.error("Error checking in:", error);
    return { success: false, error: String(error?.message || error) };
  }
}
// src/firebase/db.js

// Subscribe to active passes (real-time) - KEEP TIMESTAMPS
export const subscribeToActivePasses = (callback, filters = {}) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ACTIVE_PASSES),
      where("status", "==", "OUT"),
      orderBy("checkOutTime", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const passes = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            // Spread all data to keep customDestination and other fields
            ...data,
            // Keep Timestamps as-is (DON'T convert to ISO)
            // timeHelpers.js now handles both Timestamps and ISO strings
            checkOutTime: data.checkOutTime ?? null,
            checkInTime: data.checkInTime ?? null,
          };
        });
        callback({ success: true, passes });
      },
      (err) => {
        console.error("subscribeToActivePasses error:", err);
        callback({ success: false, error: String(err), passes: [] });
      }
    );

    return unsub;
  } catch (err) {
    console.error("subscribeToActivePasses setup error:", err);
    return () => {};
  }
};

export default {
  getStudent,
  getDestinations,
  getSystemSettings,
  createCheckout,
  checkInPass,
  subscribeToActivePasses,
};
