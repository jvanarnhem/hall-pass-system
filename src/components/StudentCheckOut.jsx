// src/components/StudentCheckOut.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { TIMEOUTS } from "../constants";
import {
  getStudent,
  getDestinations,
  getSystemSettings,
  createCheckout,
} from "../firebase/db";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const StudentCheckOut = ({ roomNumber }) => {
  // State variables
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

  // Helper Function
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

  // Load data on mount - NO AUTH REQUIRED
  useEffect(() => {
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

        // Load staff - NO orderBy to avoid composite index requirement
        const staffQuery = query(
          collection(db, "staff"),
          where("active", "==", true)
        );
        const staffSnapshot = await getDocs(staffQuery);
        const staffData = staffSnapshot.docs.map((doc) => doc.data());

        // Sort in JavaScript instead of Firestore
        staffData.sort((a, b) => a.name.localeCompare(b.name));

        const staff = staffData.map((s) => s.dropdownText || s.name);
        setStaffList(staff);
        setFilteredStaff(staff);

        // Load system settings
        const settingsResult = await getSystemSettings();
        if (settingsResult.success) {
          setSystemSettings(settingsResult.settings);
          checkIfCheckoutAllowed(settingsResult.settings);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

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
    // ✅ Prevent double submission at the very start
    if (submitting || loading) {
      console.log("⚠️ Already submitting, ignoring duplicate click");
      return;
    }

    if (checkoutBlocked) {
      setStatus({
        type: "error",
        message: blockReason,
      });
      return;
    }

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

    // ✅ Set both states immediately to block any further clicks
    setLoading(true);
    setSubmitting(true);
    setStatus(null);

    try {
      // ✅ Add server-side duplicate check
      /*
      const activePassesQuery = query(
        collection(db, "activePasses"),
        where("studentId", "==", studentId),
        where("status", "==", "OUT")
      );
      const activePassesSnapshot = await getDocs(activePassesQuery);

      if (!activePassesSnapshot.empty) {
        setStatus({
          type: "error",
          message: "You already have an active pass. Please check in first.",
        });
        setLoading(false);
        setSubmitting(false);
        return;
      }
      */
      // Verify student exists
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

      // Create checkout
      const result = await createCheckout(
        studentId,
        studentCheck.student.name,
        destination,
        roomNumber,
        destination === "other" ? customDestination : null
      );

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

      // Clear form
      setStudentId("");
      setDestination("");
      setCustomDestination("");

      setTimeout(() => {
        setStatus(null);
      }, TIMEOUTS.SUCCESS_MESSAGE);
    } catch (error) {
      console.error("Checkout error:", error);
      setStatus({
        type: "error",
        message: "System error. Please contact your teacher.",
      });
    } finally {
      // ✅ Always reset states in finally block
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom right, #f0f4ff, #d9e5ff)",
      }}
    >
      {/* Staff Login Link - Always visible */}
      <Link
        to="/login"
        className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 shadow-lg z-50"
      >
        Staff Login →
      </Link>

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
