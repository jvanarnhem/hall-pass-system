// src/firebase/auth.js
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from './config';
import { COLLECTIONS } from './db';

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Verify email domain
    if (!user.email.endsWith('@ofcs.net')) {
      await firebaseSignOut(auth);
      return { 
        success: false, 
        error: 'Only @ofcs.net accounts are allowed' 
      };
    }
    
    // Check if user is staff
    const staffDoc = await getDoc(doc(db, COLLECTIONS.STAFF, user.email));
    
    if (!staffDoc.exists()) {
      await firebaseSignOut(auth);
      return { 
        success: false, 
        error: 'Your email is not authorized. Please contact the administrator.' 
      };
    }
    
    const staffData = staffDoc.data();
    
    return {
      success: true,
      user: {
        email: user.email,
        name: staffData.name || user.displayName,
        role: staffData.role,
        room: staffData.room,
      }
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

// Listen to auth state changes
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && user.email.endsWith('@ofcs.net')) {
      // Get staff data
      const staffDoc = await getDoc(doc(db, COLLECTIONS.STAFF, user.email));
      
      if (staffDoc.exists()) {
        const staffData = staffDoc.data();
        callback({
          email: user.email,
          name: staffData.name || user.displayName,
          role: staffData.role,
          room: staffData.room,
        });
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};

export default {
  signInWithGoogle,
  signOut,
  onAuthChange,
};