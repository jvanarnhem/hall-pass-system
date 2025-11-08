import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange } from '../firebase/auth'; // Your existing auth function

// Create the context
const AuthContext = createContext();

// Create the "Provider" component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // onAuthChange is your function from auth.js
    const unsubscribe = onAuthChange((userData) => {
      // userData is either the full staff object or null
      setUser(userData); 
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    authLoading,
  };

  // Provide the user data to the whole app
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create the "useAuth" hook to easily get the data
export const useAuth = () => {
  return useContext(AuthContext);
};