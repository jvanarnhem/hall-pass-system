import React, { useState, useEffect } from "react";
import { User, AlertCircle } from "lucide-react";
import StudentCheckOut from "./components/StudentCheckOut";
import Dashboard from "./components/Dashboard";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_BASE = process.env.REACT_APP_API_BASE;

// Validate environment variables
if (!GOOGLE_CLIENT_ID || !API_BASE) {
  console.error(
    "Missing required environment variables. Please check your .env file."
  );
}

// API Service
const api = {
  async checkOut(studentId, destination, roomFrom, customDestination = null) {
    try {
      console.log("🔵 Sending checkout request:", {
        studentId,
        destination,
        roomFrom,
        customDestination,
        API_BASE,
      });

      const response = await fetch(API_BASE, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout",
          studentId,
          destination,
          roomFrom,
          customDestination,
        }),
      });

      console.log("📦 Response received:", response);
      console.log(
        "⚠️ Note: With no-cors mode, we cannot read the actual response"
      );

      return { success: true };
    } catch (error) {
      console.error("❌ Checkout error:", error);
      return { success: false, error: error.message };
    }
  },

  async checkIn(passId) {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkin",
          passId,
        }),
      });
      return { success: true };
    } catch (error) {
      console.error("Checkin error:", error);
      return { success: false, error: error.message };
    }
  },

  async getSystemSettings() {
    try {
      const params = new URLSearchParams({
        action: "getSystemSettings",
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get system settings error:", error);
      return {
        success: false,
        error: error.message,
        settings: {
          CHECKOUT_ENABLED: true,
          MAX_CHECKOUT_MINUTES: 30,
          DAY_END: "2:46 PM",
        },
      };
    }
  },

  async getActivePasses(filters = {}) {
    try {
      const params = new URLSearchParams({
        action: "getActivePasses",
        ...filters,
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get active passes error:", error);
      return { success: false, error: error.message, passes: [] };
    }
  },

  async getStudentName(studentId) {
    try {
      const params = new URLSearchParams({
        action: "getStudentName",
        studentId,
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get student name error:", error);
      return { success: false, error: error.message };
    }
  },

  async getAnalytics(days = 30) {
    try {
      const params = new URLSearchParams({
        action: "getAnalytics",
        days: days.toString(),
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get analytics error:", error);
      return { success: false, error: error.message };
    }
  },

  async autoCheckInExpiredPasses() {
    try {
      const params = new URLSearchParams({
        action: "autoCheckInExpiredPasses",
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Auto check-in error:", error);
      return { success: false, error: error.message };
    }
  },

  async verifyStaffEmail(email) {
    try {
      const params = new URLSearchParams({
        action: "verifyStaffEmail",
        email: email,
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Email verification error:", error);
      return { success: false, error: error.message };
    }
  },

  async getRoomList() {
    try {
      const params = new URLSearchParams({
        action: "getRoomList",
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get room list error:", error);
      return { success: false, error: error.message, rooms: [] };
    }
  },

  async getDestinationList() {
    try {
      const params = new URLSearchParams({
        action: "getDestinationList",
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get destination list error:", error);
      return { success: false, error: error.message, destinations: [] };
    }
  },

  async getTodayPasses(filters = {}) {
    try {
      const params = new URLSearchParams({
        action: "getTodayPasses",
        ...filters,
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get today passes error:", error);
      return { success: false, error: error.message, passes: [] };
    }
  },

  async updateArchivedPass(
    passId,
    studentId,
    studentName,
    roomFrom,
    destination,
    checkOutTime,
    checkInTime
  ) {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateArchivedPass",
          passId,
          studentId,
          studentName,
          roomFrom,
          destination,
          checkOutTime,
          checkInTime,
        }),
      });
      return { success: true };
    } catch (error) {
      console.error("Update archived pass error:", error);
      return { success: false, error: error.message };
    }
  },

  async getStaffDropdownList() {
    try {
      const params = new URLSearchParams({
        action: "getStaffDropdownList",
      });
      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get staff dropdown error:", error);
      return { success: false, error: error.message, staffList: [] };
    }
  },
}; // ← This closes the api object

// Main App Component
const App = () => {
  const [mode, setMode] = useState("student");
  const [user, setUser] = useState(null);
  const [roomNumber, setRoomNumber] = useState("101");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) setRoomNumber(room);

    if (window.google && mode === "login") {
      initializeGoogleSignIn();
    }
  }, [mode]);

  const initializeGoogleSignIn = () => {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
      auto_select: false,
    });

    window.google.accounts.id.renderButton(
      document.getElementById("googleSignInButton"),
      {
        theme: "outline",
        size: "large",
        width: 400,
        text: "signin_with",
      }
    );
  };

  const handleGoogleResponse = async (response) => {
    try {
      const userInfo = parseJwt(response.credential);

      if (!userInfo.email.endsWith("@ofcs.net")) {
        setAuthError("Only @ofcs.net accounts are allowed");
        return;
      }

      const authResult = await api.verifyStaffEmail(userInfo.email);

      if (authResult.success) {
        setUser({
          email: userInfo.email,
          name: userInfo.name,
          role: authResult.role,
          room: authResult.room,
        });
        setMode("dashboard");
        setAuthError("");
      } else {
        setAuthError(
          "Your email is not authorized. Please contact the administrator."
        );
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthError("Authentication failed. Please try again.");
    }
  };

  const parseJwt = (token) => {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  };

  const handleLogout = () => {
    setUser(null);
    setMode("student");
    window.google.accounts.id.disableAutoSelect();
  };

  if (mode === "student") {
    return (
      <>
        <StudentCheckOut roomNumber={roomNumber} api={api} />
        <button
          onClick={() => setMode("login")}
          className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 shadow-lg"
        >
          Staff Login →
        </button>
      </>
    );
  }

  if (mode === "login" || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Staff Login
            </h1>
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

          <div className="flex justify-center mb-6">
            <div id="googleSignInButton"></div>
          </div>

          <button
            onClick={() => {
              setMode("student");
              setAuthError("");
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-800 py-2"
          >
            ← Back to Student Check-Out
          </button>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-xs text-gray-500">
              Only authorized @ofcs.net staff can access the dashboard
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dashboard
        userRole={user.role}
        userRoom={user.room}
        userEmail={user.email}
        api={api}
      />
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 shadow-lg flex items-center gap-2"
      >
        <User size={16} />
        Logout
      </button>
    </>
  );
};

export default App;
