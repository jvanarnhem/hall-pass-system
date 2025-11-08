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
} from 'firebase/firestore';
import { db } from './config';

// Collections
export const COLLECTIONS = {
  STUDENTS: 'students',
  STAFF: 'staff',
  ACTIVE_PASSES: 'activePasses',
  PASS_HISTORY: 'passHistory',
  SETTINGS: 'settings',
  DESTINATIONS: 'destinations',
};

// Get student by ID
export const getStudent = async (studentId) => {
  try {
    const docRef = doc(db, COLLECTIONS.STUDENTS, studentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, student: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Student not found' };
    }
  } catch (error) {
    console.error('Error getting student:', error);
    return { success: false, error: error.message };
  }
};

// Get all destinations
export const getDestinations = async () => {
  try {
    const q = query(
      collection(db, COLLECTIONS.DESTINATIONS),
      where('active', '==', true),
      orderBy('order')
    );
    const snapshot = await getDocs(q);
    const destinations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, destinations };
  } catch (error) {
    console.error('Error getting destinations:', error);
    return { success: false, error: error.message, destinations: [] };
  }
};

// Get system settings
export const getSystemSettings = async () => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'system');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, settings: docSnap.data() };
    } else {
      return { 
        success: false, 
        error: 'Settings not found',
        settings: {
          checkoutEnabled: true,
          maxCheckoutMinutes: 46,
          blockWeekends: true,
        }
      };
    }
  } catch (error) {
    console.error('Error getting settings:', error);
    return { 
      success: false, 
      error: error.message,
      settings: {
        checkoutEnabled: true,
        maxCheckoutMinutes: 46,
        blockWeekends: true,
      }
    };
  }
};

// Create checkout (student creates pass)
export const createCheckout = async (studentId, destination, roomFrom, customDestination = null) => {
  try {
    const passData = {
      studentId,
      destination,
      roomFrom,
      customDestination,
      checkOutTime: serverTimestamp(),
      status: 'OUT',
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.ACTIVE_PASSES), passData);
    
    return { 
      success: true, 
      passId: docRef.id,
      checkOutTime: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating checkout:', error);
    return { success: false, error: error.message };
  }
};

// Check in a pass
export const checkInPass = async (passId) => {
  try {
    const passRef = doc(db, COLLECTIONS.ACTIVE_PASSES, passId);
    const passSnap = await getDoc(passRef);
    
    if (!passSnap.exists()) {
      return { success: false, error: 'Pass not found' };
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
      status: 'IN',
    });
    
    // Delete from active
    await deleteDoc(passRef);
    
    return { 
      success: true, 
      checkInTime: checkInTime.toISOString(),
      duration
    };
  } catch (error) {
    console.error('Error checking in:', error);
    return { success: false, error: error.message };
  }
};

// Subscribe to active passes (real-time)
export const subscribeToActivePasses = (callback, filters = {}) => {
  let q = collection(db, COLLECTIONS.ACTIVE_PASSES);
  
  // Add filters if provided
  const conditions = [where('status', '==', 'OUT')];
  
  if (filters.roomFrom) {
    conditions.push(where('roomFrom', '==', filters.roomFrom));
  }
  
  if (filters.destination) {
    conditions.push(where('destination', '==', filters.destination));
  }
  
  q = query(q, ...conditions, orderBy('checkOutTime', 'desc'));
  
  // Return unsubscribe function
  return onSnapshot(q, 
    (snapshot) => {
      const passes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        checkOutTime: doc.data().checkOutTime?.toDate()?.toISOString(),
      }));
      callback({ success: true, passes });
    },
    (error) => {
      console.error('Error in active passes subscription:', error);
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