// src/components/StudentCheckOut.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // Import Link
import { useAuth } from "../hooks/useAuth"; // Import our new hook
import { LogOut, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { TIMEOUTS } from "../constants";
// --- ADD THESE IMPORTS BACK ---
import {
  getStudent,
  getDestinations,
  getSystemSettings,
  createCheckout,
} from "../firebase/db";
// ------------------------------
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const StudentCheckOut = ({ roomNumber }) => {
  // Use the central auth state
  const { user, authLoading } = useAuth();

  // --- ADD ALL YOUR STATE VARIABLES BACK ---
  const [systemSettings, setSystemSettings] = useState(null);
  const [checkoutBlocked, setCheckoutBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [studentId, setStudentId] = useState("");
  const [destination, setDestination] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  // ------------------------------------------

  // --- Helper Function ---
  const checkIfCheckoutAllowed = (settings) => {
    const now = new Date();

    if (!settings.checkoutEnabled) {
      setCheckoutBlocked(true);
      setBlockReason(
        "Hall passes are currently disabled. Please check with the office."
      );
      return false;
    }

    if (settings.blockWeekends) {
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setCheckoutBlocked(true);
        setBlockReason("Hall passes are only available during school days.");
        return false;
      }
    }

    setCheckoutBlocked(false);
    setBlockReason("");
    return true;
  };

  // --- Auth & Data Loading Effect ---
  useEffect(() => {
    // We must wait for the auth check to finish
    if (authLoading) {
      return; // Still checking who the user is
    }

    if (user) {
      // --- User is logged in ---
      // Now we can safely load all data
      const loadData = async () => {
        try {
          // Load destinations
          const destResult = await getDestinations();
          if (destResult.success && destResult.destinations) {
            const destNames = destResult.destinations.map((d) => d.name);
            setDestinations(destNames);
          } else {
            setDestinations(["Restroom", "Nurse", "Guidance", "Other"]);
          }

          // Load staff for "Other" dropdown
          const staffQuery = query(
            collection(db, "staff"),
            where("active", "==", true),
            orderBy("name")
          );
          const staffSnapshot = await getDocs(staffQuery);
          const staff = staffSnapshot.docs.map(
            (doc) => doc.data().dropdownText
          );
          setStaffList(staff);
          setFilteredStaff(staff);
          console.log("Loaded staff:", staff.length);

          // Load system settings
          const settingsResult = await getSystemSettings();
          if (settingsResult.success) {
            setSystemSettings(settingsResult.settings);
            checkIfCheckoutAllowed(settingsResult.settings);
          }
        } catch (error) {
          console.error("Error during data load:", error);
        }
      };

      loadData();
    } else {
      // --- User is not logged in ---
      // (We could load public data like destinations here if we wanted)
    }
  }, [user, authLoading]); // Run this effect when auth state changes

  // --- ADD ALL YOUR HELPER FUNCTIONS BACK ---
  const handleStaffSearch = (searchText) => {
    setCustomDestination(searchText);

    if (searchText === "") {
      setFilteredStaff(staffList);
    } else {
      const filtered = staffList.filter((staff) =>
        staff.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredStaff(filtered);
    }
    setShowStaffDropdown(true);
  };

  const selectStaff = (staff) => {
    setCustomDestination(staff);
    setShowStaffDropdown(false);
  };

  const handleSubmit = async () => {
    // Prevent double-submission
    if (submitting) return;

    // Check if checkout is blocked
    if (checkoutBlocked) {
      setStatus({
        type: "error",
        message: blockReason,
      });
      return;
    }

    // Validate inputs
    if (studentId.length !== 6) {
      setStatus({ type: "error", message: "Student ID must be 6 digits" });
      return;
    }

    if (!destination) {
      setStatus({ type: "error", message: "Please select a destination" });
      return;
    }

    if (destination === "other" && !customDestination.trim()) {
      setStatus({ type: "error", message: "Please specify your destination" });
      return;
    }

    // Start loading
    setLoading(true);
    setSubmitting(true);
    setStatus(null);

    try {
      // Step 1: Verify student exists
      const studentCheck = await getStudent(studentId);

      if (!studentCheck.success || !studentCheck.student) {
        setStatus({
          type: "error",
          message: "Student ID not found. Please check and try again.",
        });
        setLoading(false);
        setSubmitting(false);
        return;
      }

      // Step 3: Actually create the checkout
      const result = await createCheckout(
        studentId,
        studentCheck.student.name, // <-- ADD THIS
        destination,
        roomNumber,
        destination === "other" ? customDestination : null
      );

      // Step 4: Check if it succeeded
      if (!result.success) {
        setStatus({
          type: "error",
          message: result.error || "Checkout failed. Please try again.",
        });
        setLoading(false);
        setSubmitting(false);
        return;
      }

      // SUCCESS
      const finalDestination =
        destination === "other" ? customDestination : destination;

      setStatus({
        type: "success",
        message: `${studentCheck.student.name} checked out successfully. Please proceed to ${finalDestination}.`,
      });

      // Clear the form
      setStudentId("");
      setDestination("");
      setCustomDestination("");
      setLoading(false);
      setSubmitting(false);

      // Clear success message
      setTimeout(() => {
        setStatus(null);
      }, TIMEOUTS.SUCCESS_MESSAGE);
    } catch (error) {
      console.error("Checkout error:", error);
      setStatus({
        type: "error",
        message: "System error. Please contact your teacher.",
      });
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit();
    }
  };
  // ------------------------------------------

  // --- Render Logic ---
  if (authLoading) {
    // This is the new "isLoading"
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    // Show login prompt if not authenticated
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2>Welcome to the Hall Pass System</h2>
        <p>Please log in with your @ofcs.net account to continue.</p>
        <Link
          to="/login"
          style={{
            fontSize: "1.2rem",
            padding: "0.5rem 1rem",
            marginTop: "1rem",
            backgroundColor: "#4f46e5",
            color: "white",
            textDecoration: "none",
            borderRadius: "0.5rem",
          }}
        >
          Sign in with Google
        </Link>
      </div>
    );
  }

  // Main component render (if logged in)
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom right, #f0f4ff, #d9e5ff)",
      }}
    >
      {/* --- ADD THIS LINK FOR STAFF --- */}
      {user.role && (
        <Link
          to="/dashboard"
          className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 shadow-lg z-50"
        >
          Staff Dashboard →
        </Link>
      )}

      {/* --- THE REST OF YOUR COMPONENT --- */}
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: "#00008b" }}
          >
            <LogOut size={24} style={{ color: "#FFD700" }} />
          </div>
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: "#00008b" }}
          >
            Olmsted Falls High School
          </h2>
          <h1
            className="text-2xl font-bold mb-1 flex items-center justify-center gap-2"
            style={{ color: "#00008b" }}
          >
            🐾 Hall Pass 🐾
          </h1>
          <p className="text-gray-600 text-sm">Room {roomNumber}</p>
        </div>

        {checkoutBlocked && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <p className="font-semibold text-sm">{blockReason}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) =>
                setStudentId(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyPress={handleKeyPress}
              placeholder="Enter 6-digit ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Where are you going?
            </label>
            <div className="space-y-2">
              {destinations.map((dest) => (
                <label
                  key={dest}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    destination === dest.toLowerCase()
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-300 bg-white hover:border-indigo-300 hover:bg-gray-50"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="radio"
                    name="destination"
                    value={dest.toLowerCase()}
                    checked={destination === dest.toLowerCase()}
                    onChange={(e) => setDestination(e.target.value)}
                    disabled={loading}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="ml-3 text-lg font-medium text-gray-900 capitalize">
                    {dest}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {destination === "other" && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Staff Member or Room
              </label>
              <input
                type="text"
                value={customDestination}
                onChange={(e) => handleStaffSearch(e.target.value)}
                onFocus={() => setShowStaffDropdown(true)}
                onKeyPress={handleKeyPress}
                placeholder="Search by name or room..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
              />

              {showStaffDropdown && filteredStaff.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStaff.map((staff, index) => (
                    <div
                      key={index}
                      onClick={() => selectStaff(staff)}
                      className="px-4 py-2 hover:bg-indigo-50 cursor-pointer transition-colors"
                    >
                      {staff}
                    </div>
                  ))}
                </div>
              )}

              {showStaffDropdown && (
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setShowStaffDropdown(false)}
                />
              )}
            </div>
          )}

          {status && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                status.type === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-green-50 text-green-800"
              }`}
            >
              {status.type === "error" ? (
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
              )}
              <span className="text-sm">{status.message}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || submitting}
            className="w-full text-white py-3 rounded-lg font-semibold transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              backgroundColor: loading ? "#9ca3af" : "#00008b",
              border: "2px solid transparent",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#0000cd";
                e.target.style.borderColor = "#FFD700";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#00008b";
                e.target.style.borderColor = "transparent";
              }
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Checking Out...
              </>
            ) : (
              "Check Out"
            )}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Having trouble? Contact your teacher.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentCheckOut;
