// src/App.js
import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import StudentCheckOut from "./components/StudentCheckOut";
import Dashboard from "./components/Dashboard";
import LoginPage from "./components/LoginPage"; // Import the new login page
import ProtectedRoute from "./components/ProtectedRoute"; // Import the gatekeeper

const App = () => {
  const [roomNumber, setRoomNumber] = useState("101");

  // Get room from URL (this is good, keep it)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) setRoomNumber(room);
  }, []);

  return (
    <Routes>
      {/* Route 1: The Student Page (public) */}
      <Route
        path="/"
        element={<StudentCheckOut roomNumber={roomNumber} />}
      />

      {/* Route 2: The Login Page (public) */}
      <Route path="/login" element={<LoginPage />} />

      {/* Route 3: The Dashboard (PROTECTED) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;