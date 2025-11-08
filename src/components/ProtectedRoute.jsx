import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // We will create this hook next

const ProtectedRoute = ({ children }) => {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    // Show a loading screen while we check auth
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    // Not logged in? Redirect them to the login page.
    // Save the page they were trying to go to ("location")
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If we get here, the user is logged in.
  // We can trust the 'user' object from our auth logic,
  // which already verifies they are staff.
  return children;
};

export default ProtectedRoute;