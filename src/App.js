import React, { useState, useEffect } from "react";
import {
  LogOut,
  Search,
  BarChart3,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

// Add Google Client ID here
const GOOGLE_CLIENT_ID =
  "128297272141-pgk7p2pjj1joe9kdi19odeldlv8f26as.apps.googleusercontent.com";
// ====================
// API CONFIGURATION
// ====================
// IMPORTANT: Replace YOUR_DEPLOYMENT_ID with your actual Google Apps Script deployment ID
const API_BASE =
  "https://script.google.com/a/macros/ofcs.net/s/AKfycbzX57vRTaPDzlTEAtnvcZ0ujD9lCv_lenwGEZeErxeMsh130Ze0wbNt0_2nqTjOcxs1/exec";

// API Service
const api = {
  async checkOut(studentId, destination, roomFrom, customDestination = null) {
    try {
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

      return { success: true };
    } catch (error) {
      console.error("Checkout error:", error);
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

      //console.log("Calling API:", `${API_BASE}?${params}`);

      const response = await fetch(`${API_BASE}?${params}`);
      //console.log("Response status:", response.status);

      const data = await response.json();
      //console.log("Response data:", data);

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

  async authenticate() {
    try {
      const params = new URLSearchParams({
        action: "authenticate",
      });

      const response = await fetch(`${API_BASE}?${params}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Authentication error:", error);
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
};

// Student Check-Out Component
const StudentCheckOut = ({ roomNumber }) => {
  const [studentId, setStudentId] = useState("");
  const [destination, setDestination] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState([]); // Add this
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // Load destinations on mount
  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    try {
      const result = await api.getDestinationList();
      if (result.success) {
        setDestinations(result.destinations || []);
      }

      // Also load staff list
      const staffResult = await api.getStaffDropdownList();
      if (staffResult.success) {
        setStaffList(staffResult.staffList || []);
        setFilteredStaff(staffResult.staffList || []);
      }
    } catch (error) {
      console.error("Error loading destinations:", error);
      // Fallback to defaults if load fails
      setDestinations([
        "Restroom",
        "Office",
        "Guidance",
        "Nurse",
        "Administrator",
        "Teacher",
        "Other",
      ]);
    }
  };

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
    setStatus(null);

    try {
      const studentCheck = await api.getStudentName(studentId);

      if (!studentCheck.success || !studentCheck.studentName) {
        setStatus({
          type: "error",
          message: "Student ID not found. Please check and try again.",
        });
        setLoading(false);
        return;
      }

      const result = await api.checkOut(
        studentId,
        destination,
        roomNumber,
        destination === "other" ? customDestination : null
      );

      if (result.success) {
        setStatus({
          type: "success",
          message: `${
            studentCheck.studentName
          } checked out successfully. Please proceed to ${
            destination === "other" ? customDestination : destination
          }.`,
        });

        setTimeout(() => {
          setStudentId("");
          setDestination("");
          setCustomDestination("");
          setStatus(null);
        }, 3000);
      } else if (result.isDuplicate) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({
          type: "error",
          message: result.error || "An error occurred. Please try again.",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "System error. Please contact your teacher.",
      });
    } finally {
      setLoading(false);
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
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#00008b" }}
          >
            <LogOut size={32} style={{ color: "#FFD700" }} />
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "#00008b" }}
          >
            Olmsted Falls High School
          </h2>
          <h1
            className="text-3xl font-bold mb-2 flex items-center justify-center gap-2"
            style={{ color: "#00008b" }}
          >
            🐾 Hall Pass 🐾
          </h1>
          <p className="text-gray-600">Room {roomNumber}</p>
        </div>

        <div className="space-y-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 capitalize"
              disabled={loading}
            >
              <option value="">Select destination...</option>
              {destinations.map((dest) => (
                <option
                  key={dest}
                  value={dest.toLowerCase()}
                  className="capitalize"
                >
                  {dest}
                </option>
              ))}
            </select>
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

              {/* Dropdown list */}
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

              {/* Close dropdown when clicking outside */}
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
            disabled={loading}
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
// Edit Pass Dialog Component
const EditPassDialog = ({ pass, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    roomFrom: pass.roomFrom || "",
    destination: pass.destination || "",
    checkOutTime: pass.checkOutTime
      ? new Date(pass.checkOutTime).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    checkInTime: pass.checkInTime
      ? new Date(pass.checkInTime).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);

    // Parse times and combine with today's date
    const today = new Date(pass.checkOutTime);
    const dateStr = today.toISOString().split("T")[0];

    const checkOutDateTime = new Date(`${dateStr}T${formData.checkOutTime}:00`);
    const checkInDateTime = formData.checkInTime
      ? new Date(`${dateStr}T${formData.checkInTime}:00`)
      : null;

    await onSave({
      passId: pass.id,
      roomFrom: formData.roomFrom,
      destination: formData.destination,
      checkOutTime: checkOutDateTime.toISOString(),
      checkInTime: checkInDateTime ? checkInDateTime.toISOString() : null,
    });

    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Pass</h2>

        <div className="space-y-4">
          {/* Student Name - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Name
            </label>
            <input
              type="text"
              value={pass.studentName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
          </div>

          {/* Room From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Room
            </label>
            <input
              type="text"
              value={formData.roomFrom}
              onChange={(e) =>
                setFormData({ ...formData, roomFrom: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Destination
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) =>
                setFormData({ ...formData, destination: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Check Out Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check Out Time
            </label>
            <input
              type="time"
              value={formData.checkOutTime}
              onChange={(e) =>
                setFormData({ ...formData, checkOutTime: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Check In Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check In Time{" "}
              {pass.status === "OUT" && (
                <span className="text-xs text-gray-500">(optional)</span>
              )}
            </label>
            <input
              type="time"
              value={formData.checkInTime}
              onChange={(e) =>
                setFormData({ ...formData, checkInTime: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
// Today View Component
const TodayView = ({ userRole, userRoom }) => {
  const [todayPasses, setTodayPasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPass, setEditingPass] = useState(null);
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [destinations, setDestinations] = useState([]);

  // Set default room filter based on user role
  useEffect(() => {
    if (userRole === "teacher" && userRoom) {
      setFilterRoom(String(userRoom));
    } else {
      setFilterRoom("");
    }
  }, [userRole, userRoom]);

  useEffect(() => {
    loadTodayPasses();
    loadRooms();
    loadDestinations();
    const interval = setInterval(loadTodayPasses, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filterRoom, filterDestination, searchTerm]);

  const loadTodayPasses = async () => {
    setLoading(true);
    try {
      const result = await api.getTodayPasses({
        roomFrom: filterRoom,
        destination: filterDestination,
        searchTerm: searchTerm,
      });

      if (result.success) {
        setTodayPasses(result.passes || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error loading today's passes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      const result = await api.getRoomList();
      if (result.success) {
        setRooms(result.rooms || []);
      }
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  const loadDestinations = async () => {
    try {
      const result = await api.getDestinationList();
      if (result.success) {
        setDestinations(result.destinations || []);
      }
    } catch (error) {
      console.error("Error loading destinations:", error);
    }
  };

  const handleEditPass = async (updatedData) => {
    try {
      const result = await api.updateArchivedPass(
        updatedData.passId,
        updatedData.roomFrom,
        updatedData.destination,
        updatedData.checkOutTime,
        updatedData.checkInTime
      );

      if (result.success) {
        // Reload today's passes to show updated data
        await loadTodayPasses();
        setEditingPass(null);
      } else {
        alert("Error updating pass: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating pass:", error);
      alert("Error updating pass. Please try again.");
    }
  };

  const filteredPasses = todayPasses.filter((pass) => {
    const matchesSearch =
      searchTerm === "" ||
      pass.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(pass.studentId).includes(searchTerm);

    const matchesRoom =
      filterRoom === "" || String(pass.roomFrom) === filterRoom;

    const matchesDestination =
      filterDestination === "" || pass.destination === filterDestination;

    return matchesSearch && matchesRoom && matchesDestination;
  });

  const getTimeSince = (isoString) => {
    const minutes = Math.floor((Date.now() - new Date(isoString)) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 minute ago";
    return `${minutes} minutes ago`;
  };

  const formatTime = (isoString) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const activePasses = filteredPasses.filter((p) => p.status === "OUT");
  const checkedInPasses = filteredPasses.filter((p) => p.status === "IN");

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Rooms</option>
            {rooms.map((room) => (
              <option key={room} value={room}>
                {/^\d+$/.test(room) ? `Room ${room}` : room}
              </option>
            ))}
          </select>

          <select
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 capitalize"
          >
            <option value="">All Destinations</option>
            {destinations.map((dest) => (
              <option
                key={dest}
                value={dest.toLowerCase()}
                className="capitalize"
              >
                {dest}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Today</p>
              <p className="text-3xl font-bold text-gray-900">
                {filteredPasses.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Clock size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Currently Out</p>
              <p className="text-3xl font-bold text-orange-600">
                {activePasses.length}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <User size={24} className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Checked In</p>
              <p className="text-3xl font-bold text-green-600">
                {checkedInPasses.length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            All Passes Today ({filteredPasses.length})
          </h2>
          {lastUpdate && (
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {loading && todayPasses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
            Loading today's passes...
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="mx-auto mb-2 text-gray-400" size={48} />
            <p className="font-medium">No passes found for today</p>
            <p className="text-sm mt-1">No students have checked out yet</p>
          </div>
        ) : (
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredPasses.map((pass) => (
              <div
                key={pass.id}
                className={`p-4 transition-colors ${
                  pass.status === "OUT" ? "bg-orange-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                          pass.status === "OUT"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {pass.studentName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {pass.studentName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          ID: {pass.studentId}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm ml-13">
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin size={16} className="text-gray-400" />
                        <span>From Room {pass.roomFrom}</span>
                      </div>
                      <div className="flex items-center gap-1 text-indigo-600">
                        <MapPin size={16} className="text-indigo-500" />
                        <span className="capitalize">
                          To {pass.destination}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock size={16} />
                        <span>Out: {formatTime(pass.checkOutTime)}</span>
                      </div>
                      {pass.checkInTime && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} />
                          <span>
                            In: {formatTime(pass.checkInTime)} ({pass.duration}{" "}
                            min)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Edit Button */}
                    <button
                      onClick={() => setEditingPass(pass)}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                    >
                      <User size={16} />
                      Edit
                    </button>

                    {/* Status Badge */}
                    <div
                      className={`px-4 py-2 rounded-lg font-medium ${
                        pass.status === "OUT"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {pass.status === "OUT" ? "Currently Out" : "Checked In"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Edit Pass Dialog */}
      {editingPass && (
        <EditPassDialog
          pass={editingPass}
          onClose={() => setEditingPass(null)}
          onSave={handleEditPass}
        />
      )}
    </>
  );
};

// Dashboard Component
const Dashboard = ({ userRole, userRoom, userEmail }) => {
  const [activePasses, setActivePasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("active");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [destinations, setDestinations] = useState([]); // Add this

  // Set default room filter based on user role
  useEffect(() => {
    if (userRole === "teacher" && userRoom) {
      setFilterRoom(String(userRoom)); // Teachers default to their room
    } else {
      setFilterRoom(""); // Admins default to "All Rooms"
    }
  }, [userRole, userRoom]);

  useEffect(() => {
    loadActivePasses();
    loadRooms();
    loadDestinations(); // Add this
    const interval = setInterval(loadActivePasses, 10000);
    return () => clearInterval(interval);
  }, [filterRoom, filterDestination, searchTerm]);

  const loadActivePasses = async () => {
    setLoading(true);
    try {
      const result = await api.getActivePasses({
        roomFrom: filterRoom,
        destination: filterDestination,
        searchTerm: searchTerm,
      });

      if (result.success) {
        setActivePasses(result.passes || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error loading passes:", error);
    } finally {
      setLoading(false);
    }
  };
  const loadRooms = async () => {
    try {
      //console.log('Loading rooms...');
      const result = await api.getRoomList();
      //console.log('getRoomList result:', result);

      if (result.success) {
        //console.log('Rooms received:', result.rooms);
        setRooms(result.rooms || []);
        //console.log('Rooms state updated');
      } else {
        console.log("getRoomList failed:", result.error);
      }
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };
  const loadDestinations = async () => {
    try {
      const result = await api.getDestinationList();
      if (result.success) {
        setDestinations(result.destinations || []);
      }
    } catch (error) {
      console.error("Error loading destinations:", error);
    }
  };

  const handleCheckIn = async (passId, studentName) => {
    //console.log("Attempting to check in pass:", passId);

    // Optimistic update - remove from list immediately
    setActivePasses((prev) => prev.filter((p) => p.id !== passId));

    try {
      const result = await api.checkIn(passId);
      //console.log("Check-in result:", result);

      // Show success message
      //alert(`${studentName} checked in successfully!`);

      // Reload to confirm
      await loadActivePasses();
      //console.log("Reloaded active passes");
    } catch (error) {
      console.error("Error checking in:", error);
      alert("Error checking in student. Please try again.");
      // Reload to restore if failed
      await loadActivePasses();
    }
  };

  const filteredPasses = activePasses.filter((pass) => {
    const matchesSearch =
      searchTerm === "" ||
      pass.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(pass.studentId).includes(searchTerm);

    // Enhanced room matching: matches origin OR destination
    let matchesRoom = filterRoom === "";
    if (!matchesRoom && filterRoom !== "") {
      // Check if room FROM matches
      const matchesOrigin = String(pass.roomFrom) === filterRoom;

      // Check if destination contains the room number/name
      // Extract text from parentheses in destination (e.g., "VanArnhem (603)" -> "603")
      const destinationMatch = pass.destination.match(/\(([^)]+)\)/);
      const destinationRoom = destinationMatch
        ? destinationMatch[1]
        : pass.destination;
      const matchesDestination = destinationRoom === filterRoom;

      matchesRoom = matchesOrigin || matchesDestination;
    }

    const matchesDestination =
      filterDestination === "" ||
      pass.destination.toLowerCase().includes(filterDestination.toLowerCase());

    return matchesSearch && matchesRoom && matchesDestination;
  });

  const getTimeSince = (isoString) => {
    const minutes = Math.floor((Date.now() - new Date(isoString)) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 minute ago";
    return `${minutes} minutes ago`;
  };

  const getTimeColor = (isoString) => {
    const minutes = Math.floor((Date.now() - new Date(isoString)) / 60000);
    if (minutes > 30) return "text-red-600";
    if (minutes > 15) return "text-yellow-600";
    return "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Hall Pass Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                {userRole === "admin"
                  ? "Administrator View"
                  : `Room ${userRoom} - Teacher View`}
              </p>
              {lastUpdate && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView("active")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === "active"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Active Passes
              </button>
              <button
                onClick={() => setView("today")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  view === "today"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Clock size={18} />
                Today
              </button>
              <button
                onClick={() => setView("analytics")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  view === "analytics"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <BarChart3 size={18} />
                Analytics
              </button>
              <button
                onClick={loadActivePasses}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {view === "active" ? (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Room filter - visible to everyone */}
                <select
                  value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Rooms</option>
                  {rooms.map((room) => (
                    <option key={room} value={room}>
                      {/^\d+$/.test(room) ? `Room ${room}` : room}
                    </option>
                  ))}
                </select>

                <select
                  value={filterDestination}
                  onChange={(e) => setFilterDestination(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 capitalize"
                >
                  <option value="">All Destinations</option>
                  {destinations.map((dest) => (
                    <option
                      key={dest}
                      value={dest.toLowerCase()}
                      className="capitalize"
                    >
                      {dest}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  Currently Out of Class ({filteredPasses.length})
                </h2>
                {filteredPasses.length > 0 && (
                  <span className="text-sm text-gray-600">
                    Showing {filteredPasses.length}{" "}
                    {filteredPasses.length === 1 ? "student" : "students"}
                  </span>
                )}
              </div>

              {loading && activePasses.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  Loading passes...
                </div>
              ) : filteredPasses.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle
                    className="mx-auto mb-2 text-green-500"
                    size={48}
                  />
                  <p className="font-medium">
                    No students currently out of class
                  </p>
                  <p className="text-sm mt-1">
                    All students are in their classrooms
                  </p>
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {/* Students FROM the filtered room */}
                  {(() => {
                    const fromRoomPasses = filteredPasses.filter(
                      (pass) =>
                        String(pass.roomFrom) === filterRoom &&
                        filterRoom !== ""
                    );

                    const toRoomPasses = filteredPasses.filter((pass) => {
                      if (filterRoom === "") return false;
                      const destinationMatch =
                        pass.destination.match(/\(([^)]+)\)/);
                      const destinationRoom = destinationMatch
                        ? destinationMatch[1]
                        : pass.destination;
                      return (
                        destinationRoom === filterRoom &&
                        String(pass.roomFrom) !== filterRoom
                      );
                    });

                    const otherPasses = filteredPasses.filter((pass) => {
                      if (filterRoom === "") return true;
                      const destinationMatch =
                        pass.destination.match(/\(([^)]+)\)/);
                      const destinationRoom = destinationMatch
                        ? destinationMatch[1]
                        : pass.destination;
                      const isFromRoom = String(pass.roomFrom) === filterRoom;
                      const isToRoom = destinationRoom === filterRoom;
                      return !isFromRoom && !isToRoom;
                    });

                    return (
                      <>
                        {/* Section 1: From filtered room (or all if no filter) */}
                        {(filterRoom === "" ? filteredPasses : fromRoomPasses)
                          .length > 0 && (
                          <>
                            {filterRoom !== "" && (
                              <div className="p-3 bg-orange-100 border-b-2 border-orange-300 font-semibold text-orange-800 flex items-center gap-2">
                                <MapPin size={18} />
                                From Room {filterRoom} ({fromRoomPasses.length})
                              </div>
                            )}
                            {(filterRoom === ""
                              ? filteredPasses
                              : fromRoomPasses
                            ).map((pass) => (
                              <div
                                key={pass.id}
                                className="p-4 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm">
                                        {pass.studentName
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-800">
                                          {pass.studentName}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                          ID: {pass.studentId}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm ml-13">
                                      <div className="flex items-center gap-1 text-gray-600">
                                        <MapPin
                                          size={16}
                                          className="text-gray-400"
                                        />
                                        <span>From Room {pass.roomFrom}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-indigo-600">
                                        <MapPin
                                          size={16}
                                          className="text-indigo-500"
                                        />
                                        <span className="capitalize">
                                          To {pass.destination}
                                        </span>
                                      </div>
                                      <div
                                        className={`flex items-center gap-1 ${getTimeColor(
                                          pass.checkOutTime
                                        )}`}
                                      >
                                        <Clock size={16} />
                                        <span>
                                          {getTimeSince(pass.checkOutTime)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleCheckIn(pass.id, pass.studentName)
                                    }
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                                  >
                                    <CheckCircle size={18} />
                                    Check In
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Section 2: Coming TO filtered room */}
                        {toRoomPasses.length > 0 && (
                          <>
                            <div className="p-3 bg-blue-100 border-b-2 border-blue-300 font-semibold text-blue-800 flex items-center gap-2">
                              <MapPin size={18} />
                              Coming to Room {filterRoom} ({toRoomPasses.length}
                              )
                            </div>
                            {toRoomPasses.map((pass) => (
                              <div
                                key={pass.id}
                                className="p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm">
                                        {pass.studentName
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-800">
                                          {pass.studentName}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                          ID: {pass.studentId}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm ml-13">
                                      <div className="flex items-center gap-1 text-gray-600">
                                        <MapPin
                                          size={16}
                                          className="text-gray-400"
                                        />
                                        <span>From Room {pass.roomFrom}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-blue-600">
                                        <MapPin
                                          size={16}
                                          className="text-blue-500"
                                        />
                                        <span className="capitalize">
                                          To {pass.destination}
                                        </span>
                                      </div>
                                      <div
                                        className={`flex items-center gap-1 ${getTimeColor(
                                          pass.checkOutTime
                                        )}`}
                                      >
                                        <Clock size={16} />
                                        <span>
                                          {getTimeSince(pass.checkOutTime)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleCheckIn(pass.id, pass.studentName)
                                    }
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                                  >
                                    <CheckCircle size={18} />
                                    Check In
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        ) : view === "today" ? (
          <TodayView userRole={userRole} userRoom={userRoom} />
        ) : (
          <AnalyticsView />
        )}
      </div>
    </div>
  );
};

// Analytics Component
const AnalyticsView = () => {
  const [analytics, setAnalytics] = useState(null);
  const [monthlyThreshold, setMonthlyThreshold] = useState(10);
  const [dailyThreshold, setDailyThreshold] = useState(3);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics(days);
      if (data.success) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Time Period
        </h2>
        <div className="flex gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                days === d
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Filter Thresholds
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Pass Threshold: {monthlyThreshold}+
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={monthlyThreshold}
              onChange={(e) => setMonthlyThreshold(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Pass Threshold: {dailyThreshold}+
            </label>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={dailyThreshold}
              onChange={(e) => setDailyThreshold(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Students with {monthlyThreshold}+ Passes (Last {days} Days)
        </h2>
        {analytics.frequentUsers.filter((u) => u.count >= monthlyThreshold)
          .length === 0 ? (
          <p className="text-gray-500">No students meet this threshold</p>
        ) : (
          <div className="space-y-3">
            {analytics.frequentUsers
              .filter((u) => u.count >= monthlyThreshold)
              .map((user) => (
                <div
                  key={user.studentId}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <User size={20} className="text-yellow-600" />
                    <div>
                      <p className="font-medium text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-600">
                        ID: {user.studentId}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-yellow-700">
                    {user.count} passes
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Students with {dailyThreshold}+ Passes Today
        </h2>
        {analytics.dailyMultiple.filter((u) => u.count >= dailyThreshold)
          .length === 0 ? (
          <p className="text-gray-500">No students meet this threshold today</p>
        ) : (
          <div className="space-y-3">
            {analytics.dailyMultiple
              .filter((u) => u.count >= dailyThreshold)
              .map((user) => (
                <div
                  key={user.studentId}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-red-600" />
                    <div>
                      <p className="font-medium text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-600">
                        ID: {user.studentId}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-red-700">
                    {user.count} passes today
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

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

    // Initialize Google Sign-In
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
      //console.log('1. Starting handleGoogleResponse');

      const userInfo = parseJwt(response.credential);
      //console.log("2. User info:", userInfo);
      //console.log("3. User email:", userInfo.email);

      if (!userInfo.email.endsWith("@ofcs.net")) {
        console.log("4. Email not @ofcs.net");
        setAuthError("Only @ofcs.net accounts are allowed");
        return;
      }

      //console.log("5. Verifying email with backend...");
      const authResult = await api.verifyStaffEmail(userInfo.email);
      //console.log("6. Auth result:", authResult);

      if (authResult.success) {
        //console.log('7. Auth successful, setting user');
        setUser({
          email: userInfo.email,
          name: userInfo.name,
          role: authResult.role,
          room: authResult.room,
        });
        //console.log('8. Switching to dashboard mode');
        setMode("dashboard");
        setAuthError("");
      } else {
        //console.log("9. Authorization failed:", authResult.error);
        setAuthError(
          "Your email is not authorized. Please contact the administrator."
        );
      }
    } catch (error) {
      //console.error("10. CAUGHT ERROR:", error);
      console.error("Error stack:", error.stack);
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
        <StudentCheckOut roomNumber={roomNumber} />
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
