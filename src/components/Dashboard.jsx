// src/components/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  BarChart3,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { getTimeSince, formatTime, getTimeColor } from "../utils/timeHelpers";
import { REFRESH_INTERVALS } from "../constants";

// Edit Pass Dialog Component
const EditPassDialog = ({ pass, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    studentId: String(pass.studentId || ""), // ← Ensure it's a string from the start
    studentName: pass.studentName || "",
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
    // Basic validation
    if (String(formData.studentId).length !== 6) {
      alert("Student ID must be 6 digits");
      return;
    }

    if (!formData.studentName.trim()) {
      alert("Student name is required");
      return;
    }

    setSaving(true);

    // Parse original checkout time to get the correct date
    const originalDate = new Date(pass.checkOutTime);

    // Create new times on the SAME date as original
    const [checkOutHours, checkOutMinutes] = formData.checkOutTime.split(":");
    const checkOutDateTime = new Date(
      originalDate.getFullYear(),
      originalDate.getMonth(),
      originalDate.getDate(),
      parseInt(checkOutHours),
      parseInt(checkOutMinutes),
      0
    );

    let checkInDateTime = null;
    if (formData.checkInTime) {
      const [checkInHours, checkInMinutes] = formData.checkInTime.split(":");
      checkInDateTime = new Date(
        originalDate.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate(),
        parseInt(checkInHours),
        parseInt(checkInMinutes),
        0
      );
    }

    await onSave({
      passId: pass.id,
      studentId: String(formData.studentId),
      studentName: formData.studentName,
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
          {/* Student ID - Now Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student ID
            </label>
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  studentId: e.target.value.replace(/\D/g, "").slice(0, 6),
                })
              }
              placeholder="6-digit ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Student Name - Now Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Name
            </label>
            <input
              type="text"
              value={formData.studentName}
              onChange={(e) =>
                setFormData({ ...formData, studentName: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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

// TodayView Component
const TodayView = ({ userRole, userRoom, api }) => {
  const [todayPasses, setTodayPasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPass, setEditingPass] = useState(null);
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    if (userRole === "teacher" && userRoom) {
      setFilterRoom(String(userRoom));
    } else {
      setFilterRoom("");
    }
  }, [userRole, userRoom]);

  // Load data on filter changes
  useEffect(() => {
    loadTodayPasses();
  }, [filterRoom, filterDestination, searchTerm]);

  // Load rooms and destinations once
  useEffect(() => {
    loadRooms();
    loadDestinations();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(
      loadTodayPasses,
      REFRESH_INTERVALS.TODAY_PASSES
    );
    return () => clearInterval(interval);
  }, []);

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
        updatedData.studentId,
        updatedData.studentName,
        updatedData.roomFrom,
        updatedData.destination,
        updatedData.checkOutTime,
        updatedData.checkInTime
      );

      if (result.success) {
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

  // Memoized filtered passes for performance
  const filteredPasses = useMemo(() => {
    return todayPasses.filter((pass) => {
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
  }, [todayPasses, searchTerm, filterRoom, filterDestination]);

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
                    <button
                      onClick={() => setEditingPass(pass)}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                    >
                      <User size={16} />
                      Edit
                    </button>

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

// Analytics Component
const AnalyticsView = ({ api }) => {
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

// Main Dashboard Component
const Dashboard = ({ userRole, userRoom, userEmail, api }) => {
  const [activePasses, setActivePasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("active");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    if (userRole === "teacher" && userRoom) {
      setFilterRoom(String(userRoom));
    } else {
      setFilterRoom("");
    }
  }, [userRole, userRoom]);

  // Load data when filters change
  useEffect(() => {
    loadActivePasses();
  }, [filterRoom, filterDestination, searchTerm]);

  // Load rooms and destinations once
  useEffect(() => {
    loadRooms();
    loadDestinations();
  }, []);

  // Auto-refresh interval (independent of filters)
  useEffect(() => {
    const interval = setInterval(
      loadActivePasses,
      REFRESH_INTERVALS.ACTIVE_PASSES
    );
    return () => clearInterval(interval);
  }, []);

  const loadActivePasses = async () => {
    setLoading(true);
    try {
      await api.autoCheckInExpiredPasses();
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
      const result = await api.getRoomList();

      if (result.success) {
        setRooms(result.rooms || []);
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
    setActivePasses((prev) => prev.filter((p) => p.id !== passId));

    try {
      await api.checkIn(passId);
    } catch (error) {
      console.error("Error checking in:", error);
      alert("Error checking in student. Please try again.");
      await loadActivePasses();
    }
  };

  // Memoized filtered passes for performance
  const filteredPasses = useMemo(() => {
    return activePasses.filter((pass) => {
      const matchesSearch =
        searchTerm === "" ||
        pass.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(pass.studentId).includes(searchTerm);

      let matchesRoom = filterRoom === "";
      if (!matchesRoom && filterRoom !== "") {
        const matchesOrigin = String(pass.roomFrom) === filterRoom;
        const destinationMatch = pass.destination.match(/\(([^)]+)\)/);
        const destinationRoom = destinationMatch
          ? destinationMatch[1]
          : pass.destination;
        const matchesDestination = destinationRoom === filterRoom;
        matchesRoom = matchesOrigin || matchesDestination;
      }

      const matchesDestination =
        filterDestination === "" ||
        pass.destination
          .toLowerCase()
          .includes(filterDestination.toLowerCase());

      return matchesSearch && matchesRoom && matchesDestination;
    });
  }, [activePasses, searchTerm, filterRoom, filterDestination]);

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

                    return (
                      <>
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
          <TodayView userRole={userRole} userRoom={userRoom} api={api} />
        ) : (
          <AnalyticsView api={api} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
