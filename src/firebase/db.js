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
export const checkInPass = async (passId) => {
  try {
    const passRef = doc(db, COLLECTIONS.ACTIVE_PASSES, passId);
    const passSnap = await getDoc(passRef);

    if (!passSnap.exists()) {
      return { success: false, error: "Pass not found" };
    }

    const passData = passSnap.data();
    const checkInTime = new Date();
    const checkOutTime = passData.checkOutTime?.toDate() || new Date();
    const duration = Math.round((checkInTime - checkOutTime) / 60000);

    // Move to history
    await addDoc(collection(db, COLLECTIONS.PASS_HISTORY), {
      ...passData,
      passId,
      checkInTime: serverTimestamp(),
      duration,
      status: "IN",
    });

    // Delete from active
    await deleteDoc(passRef);

    return {
      success: true,
      checkInTime: checkInTime.toISOString(),
      duration,
    };
  } catch (error) {
    console.error("Error checking in:", error);
    return { success: false, error: error.message };
  }
};

// src/firebase/db.js

export const subscribeToActivePasses = (callback, filters = {}) => {
  console.log("🟢 subscribeToActivePasses called");

  const q = query(
    collection(db, COLLECTIONS.ACTIVE_PASSES),
    where("status", "==", "OUT"),
    orderBy("checkOutTime", "desc")
  );

  console.log("🟡 Setting up onSnapshot listener...");

  return onSnapshot(
    q,
    (snapshot) => {
      console.log("🔵 Snapshot callback fired!");
      console.log("📊 Snapshot size:", snapshot.size);
      console.log("📦 Raw snapshot docs:", snapshot.docs.length);

      const passes = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("📄 Processing doc:", doc.id);
        console.log("   Raw data:", data);

        return {
          id: doc.id,
          ...data,
          checkOutTime: data.checkOutTime?.toDate()?.toISOString(),
        };
      });

      console.log("✅ Final passes array:", passes);
      callback({ success: true, passes });
    },
    (error) => {
      console.error("❌ Snapshot error:", error);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error message:", error.message);
      callback({ success: false, error: error.message, passes: [] });
    }
  );
};

export default {
  getStudent,
  getDestinations,
  getSystemSettings,
  createCheckout,
  checkInPass,
  subscribeToActivePasses,
};
