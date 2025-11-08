import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { User, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../firebase/auth';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const { user, authLoading: authContextLoading } = useAuth();
  const location = useLocation();

  // Where to send user after login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError('');
    const result = await signInWithGoogle();
    if (!result.success) {
      setAuthError(result.error);
    }
    // No need to setUser, the AuthProvider will do it automatically
    setAuthLoading(false);
  };

  // If user is already logged in, send them to the dashboard
  if (!authContextLoading && user) {
    return <Navigate to={from} replace />;
  }

  // Show the login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Staff Login</h1>
          <p className="text-gray-600">
            Sign in with your @ofcs.net Google account
          </p>
        </div>

        {authError && (
          <div className="mb-6 p-4 rounded-lg flex items-start gap-3 bg-red-50 text-red-800">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm">{authError}</span>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={authLoading}
          className="w-full bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {authLoading ? (
            'Loading...'
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <Link
          to="/"
          className="block w-full text-sm text-gray-600 hover:text-gray-800 py-2 mt-4 text-center"
        >
          ← Back to Student Check-Out
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;