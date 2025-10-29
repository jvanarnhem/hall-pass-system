// src/components/StudentCheckOut.jsx
import React, { useState, useEffect } from "react";
import {
  LogOut,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { swr } from "../lib/swrCache";
import {
  TIMEOUTS,
  CACHE_TTL,
  DESTINATIONS_SNAPSHOT,
  CACHE_VERSIONS,
} from "../constants";

const StudentCheckOut = ({ roomNumber, api }) => {
  const [systemSettings, setSystemSettings] = useState(null);
  const [checkoutBlocked, setCheckoutBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [studentId, setStudentId] = useState("");
  const [destination, setDestination] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [destinations, setDestinations] = useState(DESTINATIONS_SNAPSHOT);
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  const checkIfCheckoutAllowed = (settings) => {
    const now = new Date();

    if (!settings.CHECKOUT_ENABLED) {
      setCheckoutBlocked(true);
      setBlockReason(
        "Hall passes are currently disabled. Please check with the office."
      );
      return false;
    }

    // Check if weekend
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setCheckoutBlocked(true);
      setBlockReason("Hall passes are only available during school days.");
      return false;
    }

    // Check if after day end time
    const dayEndStr = settings.DAY_END || "2:46 PM";
    const timeMatch = dayEndStr.match(/(\d+):(\d+)\s*(AM|PM)/i);

    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const isPM = timeMatch[3].toUpperCase() === "PM";

      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;

      const dayEnd = new Date(now);
      dayEnd.setHours(hours, minutes, 0, 0);

      if (now >= dayEnd) {
        setCheckoutBlocked(true);
        setBlockReason(
          "Hall passes are only available during school hours (until " +
            dayEndStr +
            ")."
        );
        return false;
      }
    }

    setCheckoutBlocked(false);
    setBlockReason("");
    return true;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Destinations
      await swr({
        key: "destinations",
        version: CACHE_VERSIONS.DESTINATIONS,
        ttlMs: CACHE_TTL.DESTINATIONS,
        fetcher: async () => {
          const res = await api.getDestinationList();
          return res?.success ? res.destinations || [] : DESTINATIONS_SNAPSHOT;
        },
        onUpdate: (fresh) => {
          if (!mounted) return;
          setDestinations(fresh?.length ? fresh : DESTINATIONS_SNAPSHOT);
        },
      });

      // Staff list
      await swr({
        key: "staffList",
        version: CACHE_VERSIONS.STAFF,
        ttlMs: CACHE_TTL.STAFF,
        fetcher: async () => {
          const res = await api.getStaffDropdownList();
          return res?.success ? res.staffList || [] : [];
        },
        onUpdate: (fresh) => {
          if (!mounted) return;
          setStaffList(fresh);
          setFilteredStaff(fresh);
        },
      });

      // System settings
      await swr({
        key: "systemSettings",
        version: async () => {
          try {
            const params = new URLSearchParams({
              action: "getSystemSettings",
              _check: "version",
            });
            const API_BASE = process.env.REACT_APP_API_BASE;
            const response = await fetch(`${API_BASE}?${params}`);
            const data = await response.json();
            return data?.settings?.SETTINGS_VERSION || 1;
          } catch {
            return 1;
          }
        },
        ttlMs: CACHE_TTL.SETTINGS,
        fetcher: async () => {
          try {
            const res = await api.getSystemSettings();
            return res?.success
              ? res.settings
              : {
                  CHECKOUT_ENABLED: true,
                  MAX_CHECKOUT_MINUTES: 46,
                  DAY_END: "2:46 PM",
                };
          } catch (error) {
            console.error("Error fetching settings:", error);
            return {
              CHECKOUT_ENABLED: true,
              MAX_CHECKOUT_MINUTES: 46,
              DAY_END: "2:46 PM",
            };
          }
        },
        onUpdate: (fresh) => {
          if (!mounted) return;
          setSystemSettings(fresh);
          checkIfCheckoutAllowed(fresh);
        },
      });
    })().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [api]);

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
    if (submitting) return;

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

    setLoading(true);
    setSubmitting(true);
    setStatus(null);

    try {
      const studentCheck = await api.getStudentName(studentId);

      if (!studentCheck.success || !studentCheck.studentName) {
        setStatus({
          type: "error",
          message: "Student ID not found. Please check and try again.",
        });
        setLoading(false);
        setSubmitting(false);
        return;
      }

      const finalDestination =
        destination === "other" ? customDestination : destination;

      setStatus({
        type: "success",
        message: `${studentCheck.studentName} checked out successfully. Please proceed to ${finalDestination}.`,
      });

      const savedStudentId = studentId;
      const savedDestination = destination;
      const savedCustomDestination = customDestination;

      setStudentId("");
      setDestination("");
      setCustomDestination("");
      setLoading(false);

      setTimeout(async () => {
        try {
          await api.autoCheckInExpiredPasses();
          const result = await api.checkOut(
            savedStudentId,
            savedDestination,
            roomNumber,
            savedDestination === "other" ? savedCustomDestination : null
          );

          if (!result.success) {
            setStatus({
              type: "error",
              message: result.error || "Checkout failed. Please try again.",
            });
          } else {
            setTimeout(() => {
              setStatus(null);
            }, TIMEOUTS.SUCCESS_MESSAGE);
          }
        } catch (error) {
          console.error("Background checkout error:", error);
        } finally {
          setSubmitting(false);
        }
      }, TIMEOUTS.BACKGROUND_SUBMIT);
    } catch (error) {
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom right, #f0f4ff, #d9e5ff)",
      }}
    >
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
                Select Staff Member
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