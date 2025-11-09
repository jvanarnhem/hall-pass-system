// src/components/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { signOut } from "../firebase/auth";
import {
  Search,
  BarChart3,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Home,
  Edit, // Added Edit
  Trash, // Added Trash
} from "lucide-react";
import { getTimeSince, formatTime, getTimeColor } from "../utils/timeHelpers";
import { REFRESH_INTERVALS } from "../constants";
import {
  subscribeToActivePasses,
  checkInPass,
  getSystemSettings,
  COLLECTIONS,
} from "../firebase/db";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  getDoc,
  doc,
  writeBatch,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

// --- EditPassDialog Component (from your file) ---
const EditPassDialog = ({ pass, onClose, onSave }) => {
  //
  const [formData, setFormData] = useState({
    studentId: String(pass.studentId || ""),
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const [outHours, outMinutes] = formData.checkOutTime.split(":").map(Number);
    const checkOutDate = new Date(pass.checkOutTime);
    checkOutDate.setHours(outHours, outMinutes);

    let checkInDate = null;
    if (formData.checkInTime) {
      const [inHours, inMinutes] = formData.checkInTime.split(":").map(Number);
      checkInDate = new Date(pass.checkInTime || pass.checkOutTime);
      checkInDate.setHours(inHours, inMinutes);
    }

    onSave({
      ...pass,
      ...formData,
      studentId: String(formData.studentId),
      checkOutTime: checkOutDate.toISOString(),
      checkInTime: checkInDate ? checkInDate.toISOString() : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Pass</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Student ID</label>
            <input
              type="text"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Student Name</label>
            <input
              type="text"
              name="studentName"
              value={formData.studentName}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Room</label>
            <input
              type="text"
              name="roomFrom"
              value={formData.roomFrom}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Destination</label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Time Out</label>
            <input
              type="time"
              name="checkOutTime"
              value={formData.checkOutTime}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Time In</label>
            <input
              type="time"
              name="checkInTime"
              value={formData.checkInTime}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- TODAY VIEW (all-inclusive, drop-in) ---
const TodayView = ({ userRole, userRoom }) => {
  // UI state
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState([]);
  const [search, setSearch] = useState("");
  const [filterRoom, setFilterRoom] = useState(
    userRole === "teacher" && userRoom ? String(userRoom) : ""
  );
  const [filterDestination, setFilterDestination] = useState("");
  const [allRooms, setAllRooms] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);

  // Edit modal
  const [editingPass, setEditingPass] = useState(null);

  // ===== helpers =====
  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const fmtTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const fmtDuration = (startIso, endIso) => {
    if (!startIso || !endIso) return "—";
    const ms = new Date(endIso) - new Date(startIso);
    if (isNaN(ms) || ms < 0) return "—";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const StatusPill = ({ isOut }) => (
    <span
      className={
        "inline-flex items-center gap-2 rounded-xl px-3 py-1 text-sm font-medium " +
        (isOut ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")
      }
      title={isOut ? "Currently out" : "Checked in"}
    >
      {isOut ? <Clock size={16} /> : <CheckCircle size={16} />}
      {isOut ? "Out" : "Checked in"}
    </span>
  );

  // ===== preload filter sources (rooms + destinations) =====
  useEffect(() => {
    (async () => {
      try {
        // Rooms from staff
        const staffSnapshot = await getDocs(collection(db, COLLECTIONS.STAFF));
        const rooms = staffSnapshot.docs
          .map((d) => d.data()?.room)
          .filter(Boolean)
          .map((r) => String(r));
        setAllRooms(
          [...new Set(rooms)].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
          )
        );

        // Destinations
        const destSnap = await getDocs(
          query(
            collection(db, COLLECTIONS.DESTINATIONS),
            where("active", "==", true),
            orderBy("order")
          )
        );
        setAllDestinations(
          destSnap.docs.map((d) => d.data()?.name || d.id).filter(Boolean)
        );
      } catch (err) {
        console.error("Filter preload error:", err);
      }
    })();
  }, []);

  // ===== fetch: OUT today (active) + IN today (history) + OUT today (history created today) =====
  const fetchTodayPasses = async () => {
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Date-only constraints; room/destination filters happen client-side
    const qActive = query(
      collection(db, COLLECTIONS.ACTIVE_PASSES),
      where("status", "==", "OUT"),
      where("checkOutTime", ">=", Timestamp.fromDate(todayStart)),
      orderBy("checkOutTime", "desc")
    );

    const qHistIn = query(
      collection(db, COLLECTIONS.PASS_HISTORY),
      where("checkInTime", ">=", Timestamp.fromDate(todayStart)),
      orderBy("checkInTime", "desc")
    );

    const qHistOutToday = query(
      collection(db, COLLECTIONS.PASS_HISTORY),
      where("createdAt", ">=", Timestamp.fromDate(todayStart)),
      orderBy("createdAt", "desc")
    );

    try {
      const [snapA, snapHIn, snapHOutToday] = await Promise.all([
        getDocs(qActive),
        getDocs(qHistIn),
        getDocs(qHistOutToday),
      ]);

      const rows = [];
      const toRow = (d, source) => {
        const x = d.data();
        return {
          id: d.id,
          source, // "active" | "history"
          ...x,
          _checkOutISO: x.checkOutTime?.toDate()?.toISOString() || null,
          _checkInISO: x.checkInTime?.toDate()?.toISOString() || null,
          _createdISO: x.createdAt?.toDate()?.toISOString() || null,
        };
      };

      // Build rows
      snapA.docs.forEach((d) => rows.push(toRow(d, "active")));
      snapHIn.docs.forEach((d) => rows.push(toRow(d, "history"))); // ← unify as "history"
      snapHOutToday.docs.forEach((d) => rows.push(toRow(d, "history"))); // ← unify as "history"

      // De-dupe by collection + id (so the same history doc from two queries keeps only one)
      const byKey = new Map();
      for (const r of rows) {
        const key = `${r.source}:${r.id}`; // "active:docId" or "history:docId"
        if (!byKey.has(key)) byKey.set(key, r);
      }

      const merged = Array.from(byKey.values()).sort((a, b) => {
        const ta = new Date(
          a._checkInISO || a._createdISO || a._checkOutISO || 0
        ).getTime();
        const tb = new Date(
          b._checkInISO || b._createdISO || b._checkOutISO || 0
        ).getTime();
        return tb - ta;
      });

      setPasses(merged);
    } catch (e) {
      console.error("fetchTodayPasses error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayPasses();
  }, []); // initial load

  // ===== client-side filters: search + room + destination =====
  const filtered = useMemo(() => {
    const q = norm(search);
    const r = norm(filterRoom);
    const d = norm(filterDestination);

    return passes.filter((p) => {
      const matchesSearch =
        !q ||
        norm(p.studentName).includes(q) ||
        norm(p.studentId).includes(q) ||
        norm(p.destination).includes(q);

      const matchesRoom = !r || norm(p.roomFrom) === r;
      const matchesDest = !d || norm(p.destination) === d;

      return matchesSearch && matchesRoom && matchesDest;
    });
  }, [search, filterRoom, filterDestination, passes]);

  // ===== save edits to correct collection =====
  const handleSaveEdit = async (edited) => {
    try {
      const {
        id,
        source, // 'active' or 'history'
        studentName,
        studentId,
        destination,
        roomFrom,
        checkOutTime,
        checkInTime,
      } = edited;

      const col =
        source === "active"
          ? COLLECTIONS.ACTIVE_PASSES
          : COLLECTIONS.PASS_HISTORY;
      const ref = doc(db, col, id);

      const toTimestamp = (v) => {
        if (!v) return null;
        const d = typeof v === "string" ? new Date(v) : v;
        return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
      };

      const patch = {
        studentName: studentName ?? null,
        studentId: studentId ?? null,
        destination: destination ?? null,
        roomFrom: roomFrom != null ? String(roomFrom) : null,
      };

      const co = toTimestamp(checkOutTime);
      const ci = toTimestamp(checkInTime);
      if (co) patch.checkOutTime = co;
      if (ci) patch.checkInTime = ci;

      await updateDoc(ref, patch);
      setEditingPass(null);
      fetchTodayPasses();
    } catch (err) {
      console.error("Edit save error:", err);
      alert("Unable to save edits. Check console for details.");
    }
  };

  // ===== check-in handler for OUT rows (same as Active behavior) =====
  const handleCheckIn = async (row) => {
    try {
      await checkInPass(row.id);
      fetchTodayPasses();
    } catch (err) {
      console.error("Check-in error:", err);
      alert("Unable to check in. Check console for details.");
    }
  };

  // ===== UI (Active-style controls & compact cards) =====
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* FILTERS — Active-style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className="w-full h-12 rounded-2xl border border-gray-200 bg-white pl-11 pr-4 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Room */}
        <div className="relative">
          <select
            className="w-full h-12 appearance-none rounded-2xl border border-gray-200 bg-white px-4 pr-10 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
          >
            <option value="">All Rooms</option>
            {allRooms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
          </svg>
        </div>

        {/* Destination */}
        <div className="relative">
          <MapPin
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className="w-full h-12 rounded-2xl border border-gray-200 bg-white pl-11 pr-4 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
            placeholder="Filter by destination..."
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            list="destinations-today"
          />
          <datalist id="destinations-today">
            {allDestinations.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
      </div>

      {loading && <p className="p-8 text-center">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="p-8 text-center">No passes found for today.</p>
      )}

      {/* CARDS — compact: left (name/ID) | middle (from-to + Out/In/Duration) | right (Edit then action) */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((p) => {
            const isOut = p.source === "active";
            const outIso = p._checkOutISO;
            const inIso = p._checkInISO;
            const duration = fmtDuration(outIso, inIso);

            return (
              <div
                key={`${p.source}:${p.id}`}
                className="bg-white border border-gray-200 rounded-2xl px-4 py-4 md:px-5 md:py-5 hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* LEFT: avatar + name/ID */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <User size={22} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-gray-800 truncate">
                        {p.studentName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        ID: {p.studentId}
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE: From/To + one-line Out/In/Duration */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-gray-700 truncate">
                      <MapPin size={16} className="text-blue-500 shrink-0" />
                      <span className="truncate">
                        From{" "}
                        <span className="font-semibold">Room {p.roomFrom}</span>{" "}
                        to{" "}
                        <span className="font-semibold capitalize">
                          {p.destination === "other" && p.customDestination
                            ? p.customDestination
                            : p.destination}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        <span className="text-gray-500">Out:</span>{" "}
                        {fmtTime(outIso)}
                      </span>
                      <span>
                        <span className="text-gray-500">In:</span>{" "}
                        {fmtTime(inIso)}
                      </span>
                      <span>
                        <span className="text-gray-500">Duration:</span>{" "}
                        {duration}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT: Edit then Check In / Checked in */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 text-white text-sm shadow-sm hover:bg-blue-700"
                      onClick={() =>
                        setEditingPass({
                          id: p.id,
                          source: isOut ? "active" : "history",
                          studentName: p.studentName || "",
                          studentId: p.studentId || "",
                          destination: p.destination || "",
                          roomFrom: p.roomFrom || "",
                          checkOutTime: p._checkOutISO || "",
                          checkInTime: p._checkInISO || "",
                        })
                      }
                    >
                      <Edit size={16} />
                      Edit
                    </button>

                    {isOut ? (
                      <button
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-green-600 text-white shadow-sm hover:bg-green-700"
                        onClick={() => handleCheckIn(p)}
                      >
                        <CheckCircle size={18} />
                        Check In
                      </button>
                    ) : (
                      <StatusPill isOut={false} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingPass && (
        <EditPassDialog
          pass={editingPass}
          onClose={() => setEditingPass(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

// --- AnalyticsView (Firestore-driven) ---
const AnalyticsView = () => {
  const [analytics, setAnalytics] = useState(null);
  const [monthlyThreshold, setMonthlyThreshold] = useState(10);
  const [dailyThreshold, setDailyThreshold] = useState(3);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  // Student Lookup
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResult, setStudentResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  // Helpers
  const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const periodStart = (nDays) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (nDays - 1)); // inclusive of today
    return d;
  };
  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const asRow = (docSnap, source) => {
    const x = docSnap.data();
    const outISO = x.checkOutTime?.toDate()?.toISOString() || null;
    const inISO = x.checkInTime?.toDate()?.toISOString() || null;
    const createdISO = x.createdAt?.toDate()?.toISOString() || null;

    let duration = null;
    if (outISO && inISO) {
      const mins = Math.round((new Date(inISO) - new Date(outISO)) / 60000);
      duration = mins >= 0 ? mins : null;
    }

    return {
      id: docSnap.id,
      source, // 'active' | 'history'
      studentId: x.studentId != null ? String(x.studentId) : "",
      name: x.studentName || "",
      roomFrom: x.roomFrom != null ? String(x.roomFrom) : "",
      destination: x.destination || "",
      customDestination: x.customDestination || null, // ← ADD THIS LINE
      createdAtISO: createdISO,
      checkOutISO: outISO,
      checkInISO: inISO,
      duration, // minutes
      status: source === "active" ? "OUT" : (x.status || "IN").toUpperCase(),
    };
  };

  // Load all analytics for period + today
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const since = periodStart(days);
      const todayStart = startOfToday();

      const qActivePeriod = query(
        collection(db, COLLECTIONS.ACTIVE_PASSES),
        where("status", "==", "OUT"),
        where("checkOutTime", ">=", Timestamp.fromDate(since)),
        orderBy("checkOutTime", "desc")
      );

      const qHistInPeriod = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where("checkInTime", ">=", Timestamp.fromDate(since)),
        orderBy("checkInTime", "desc")
      );

      const qHistOutPeriod = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where("createdAt", ">=", Timestamp.fromDate(since)),
        orderBy("createdAt", "desc")
      );

      const qActiveToday = query(
        collection(db, COLLECTIONS.ACTIVE_PASSES),
        where("status", "==", "OUT"),
        where("checkOutTime", ">=", Timestamp.fromDate(todayStart)),
        orderBy("checkOutTime", "desc")
      );

      const qHistOutToday = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where("createdAt", ">=", Timestamp.fromDate(todayStart)),
        orderBy("createdAt", "desc")
      );

      const [
        snapActivePeriod,
        snapHistInPeriod,
        snapHistOutPeriod,
        snapActiveToday,
        snapHistOutToday,
      ] = await Promise.all([
        getDocs(qActivePeriod),
        getDocs(qHistInPeriod),
        getDocs(qHistOutPeriod),
        getDocs(qActiveToday),
        getDocs(qHistOutToday),
      ]);

      // Period rows
      const rowsPeriod = [];
      snapActivePeriod.docs.forEach((d) => rowsPeriod.push(asRow(d, "active")));
      const histMap = new Map();
      snapHistInPeriod.docs.forEach((d) =>
        histMap.set(d.id, asRow(d, "history"))
      );
      snapHistOutPeriod.docs.forEach((d) => {
        if (!histMap.has(d.id)) histMap.set(d.id, asRow(d, "history"));
      });
      rowsPeriod.push(...histMap.values());

      // Frequent users (count passes STARTED in period)
      const startedInPeriod = rowsPeriod.filter(
        (r) => r.checkOutISO || r.createdAtISO
      );
      const byStudent = new Map();
      for (const r of startedInPeriod) {
        const key = r.studentId || r.name;
        if (!key) continue;
        const prev = byStudent.get(key) || {
          studentId: r.studentId,
          name: r.name,
          count: 0,
        };
        prev.count += 1;
        byStudent.set(key, prev);
      }
      const frequentUsers = Array.from(byStudent.values()).sort(
        (a, b) => b.count - a.count
      );

      // Daily multiple (count passes STARTED today)
      const todayRows = [];
      snapActiveToday.docs.forEach((d) => todayRows.push(asRow(d, "active")));
      snapHistOutToday.docs.forEach((d) => todayRows.push(asRow(d, "history")));
      const byStudentToday = new Map();
      for (const r of todayRows) {
        const key = r.studentId || r.name;
        if (!key) continue;
        const prev = byStudentToday.get(key) || {
          studentId: r.studentId,
          name: r.name,
          count: 0,
        };
        prev.count += 1;
        byStudentToday.set(key, prev);
      }
      const dailyMultiple = Array.from(byStudentToday.values()).sort(
        (a, b) => b.count - a.count
      );

      setAnalytics({ frequentUsers, dailyMultiple, periodDays: days });
    } catch (err) {
      console.error("Error loading analytics:", err);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  // Student lookup
  const handleStudentSearch = async () => {
    if (!studentSearch.trim()) {
      setStudentResult(null);
      return;
    }
    setSearchLoading(true);
    setStudentResult(null);

    try {
      if (!analytics) {
        setSearchLoading(false);
        return;
      }
      const term = norm(studentSearch);
      const frequent = analytics.frequentUsers || [];
      const found =
        frequent.find((u) =>
          String(u.studentId).toLowerCase().includes(term)
        ) || frequent.find((u) => norm(u.name).includes(term));

      let todayCount = 0;
      if (found && analytics.dailyMultiple) {
        const d = analytics.dailyMultiple.find(
          (u) => u.studentId === found.studentId
        );
        todayCount = d ? d.count : 0;
      }

      setStudentResult(
        found
          ? {
              found: true,
              studentId: found.studentId,
              name: found.name,
              totalPasses: found.count,
              todayPasses: todayCount,
              period: days,
            }
          : { found: false, searchTerm: studentSearch }
      );
    } catch (err) {
      console.error("Error searching student:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadStudentDetails = async (studentId) => {
    if (!studentId) return;

    if (studentResult?.detailsVisible) {
      setStudentResult((prev) => ({ ...prev, detailsVisible: false }));
      return;
    }

    setStudentResult((prev) => ({ ...prev, loadingDetails: true }));

    try {
      const since = periodStart(days);

      const qActive = query(
        collection(db, COLLECTIONS.ACTIVE_PASSES),
        where("studentId", "==", studentId),
        where("checkOutTime", ">=", Timestamp.fromDate(since)),
        orderBy("checkOutTime", "desc")
      );
      const qHistCreated = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where("studentId", "==", studentId),
        where("createdAt", ">=", Timestamp.fromDate(since)),
        orderBy("createdAt", "desc")
      );

      const [snapA, snapH] = await Promise.all([
        getDocs(qActive),
        getDocs(qHistCreated),
      ]);
      const rows = [];
      snapA.docs.forEach((d) => rows.push(asRow(d, "active")));
      snapH.docs.forEach((d) => rows.push(asRow(d, "history")));

      rows.sort((a, b) => {
        const ta = new Date(
          a.checkInISO || a.createdAtISO || a.checkOutISO || 0
        ).getTime();
        const tb = new Date(
          b.checkInISO || b.createdAtISO || b.checkOutISO || 0
        ).getTime();
        return tb - ta;
      });

      const passHistory = rows.map((r) => {
        // Get the display destination
        const displayDestination =
          r.destination === "other" && r.customDestination
            ? r.customDestination
            : r.destination;

        return {
          date: r.createdAtISO || r.checkOutISO || r.checkInISO,
          roomFrom: r.roomFrom,
          destination: displayDestination, // ← Use calculated display destination
          checkOutTime: r.checkOutISO
            ? new Date(r.checkOutISO).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })
            : "—",
          checkInTime: r.checkInISO
            ? new Date(r.checkInISO).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })
            : null,
          duration: r.duration,
          status: r.status,
        };
      });

      setStudentResult((prev) => ({
        ...prev,
        loadingDetails: false,
        detailsVisible: true,
        passHistory,
      }));
    } catch (err) {
      console.error("Error loading student details:", err);
      setStudentResult((prev) => ({ ...prev, loadingDetails: false }));
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") handleStudentSearch();
  };
  const clearSearch = () => {
    setStudentSearch("");
    setStudentResult(null);
  };

  // UI
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
      {/* STUDENT LOOKUP */}
      <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-indigo-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Student Lookup
        </h2>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              placeholder="Search by student name or ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleStudentSearch}
            disabled={searchLoading || !studentSearch.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {searchLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={18} />
                Search
              </>
            )}
          </button>

          {studentSearch && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Results */}
        {studentResult && (
          <div
            className={`p-4 rounded-lg border-2 ${
              studentResult.found
                ? "bg-blue-50 border-blue-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            {studentResult.found ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <User size={24} className="text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {studentResult.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      ID: {studentResult.studentId}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">
                      Last {studentResult.period} Days
                    </p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {studentResult.totalPasses}
                    </p>
                    <p className="text-xs text-gray-600">total passes</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Today</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {studentResult.todayPasses}
                    </p>
                    <p className="text-xs text-gray-600">passes</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Daily Avg</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(
                        studentResult.totalPasses / studentResult.period
                      ).toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600">per day</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => loadStudentDetails(studentResult.studentId)}
                    disabled={studentResult.loadingDetails}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {studentResult.loadingDetails ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Loading...
                      </>
                    ) : studentResult.detailsVisible ? (
                      <>
                        <User size={16} />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <User size={16} />
                        View All {studentResult.totalPasses} Passes
                      </>
                    )}
                  </button>
                </div>

                {studentResult.detailsVisible && studentResult.passHistory && (
                  <div className="mt-4 border-t-2 border-indigo-200 pt-4">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Pass History ({studentResult.passHistory.length} passes)
                    </h4>

                    {studentResult.passHistory.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">
                        No pass history found
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {studentResult.passHistory.map((pass, index) => {
                          const isOut = pass.status === "OUT";

                          return (
                            <div
                              key={index}
                              className="bg-white border border-gray-200 rounded-2xl px-4 py-4 md:px-5 md:py-5 hover:shadow-sm"
                            >
                              <div className="flex items-center gap-4">
                                {/* LEFT: avatar + name/ID */}
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                    <User
                                      size={22}
                                      className="text-indigo-600"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-lg font-semibold text-gray-800 truncate">
                                      {studentResult.name}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">
                                      ID: {studentResult.studentId}
                                    </div>
                                  </div>
                                </div>

                                {/* MIDDLE: Date + From/To + Times */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-500 mb-1">
                                    {new Date(pass.date).toLocaleDateString(
                                      "en-US",
                                      {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      }
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-700 truncate">
                                    <MapPin
                                      size={16}
                                      className="text-blue-500 shrink-0"
                                    />
                                    <span className="truncate">
                                      From{" "}
                                      <span className="font-semibold">
                                        Room {pass.roomFrom}
                                      </span>{" "}
                                      to{" "}
                                      <span className="font-semibold capitalize">
                                        {pass.destination}
                                      </span>
                                    </span>
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <span>
                                      <span className="text-gray-500">
                                        Out:
                                      </span>{" "}
                                      {pass.checkOutTime}
                                    </span>
                                    <span>
                                      <span className="text-gray-500">In:</span>{" "}
                                      {pass.checkInTime || "—"}
                                    </span>
                                    {pass.duration != null && (
                                      <span>
                                        <span className="text-gray-500">
                                          Duration:
                                        </span>{" "}
                                        {pass.duration < 60
                                          ? `${pass.duration} min`
                                          : `${Math.floor(
                                              pass.duration / 60
                                            )}h ${pass.duration % 60}m`}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* RIGHT: Status pill */}
                                <div className="flex items-center gap-3 shrink-0">
                                  <span
                                    className={
                                      "inline-flex items-center gap-2 rounded-xl px-3 py-1 text-sm font-medium " +
                                      (isOut
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-green-100 text-green-700")
                                    }
                                  >
                                    {isOut ? (
                                      <Clock size={16} />
                                    ) : (
                                      <CheckCircle size={16} />
                                    )}
                                    {isOut ? "Out" : "Checked in"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-yellow-600" />
                <p className="text-sm text-gray-700">
                  No student found matching "{studentResult.searchTerm}" in the
                  last {days} days.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PERIOD PICKER */}
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

      {/* THRESHOLDS */}
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

      {/* FREQUENT USERS */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Students with {monthlyThreshold}+ Passes (Last {analytics.periodDays}{" "}
          Days)
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
                    {user.count} {user.count === 1 ? "pass" : "passes"}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* DAILY MULTIPLE */}
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
                    {user.count} {user.count === 1 ? "pass" : "passes"} today
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
const Dashboard = () => {
  // Helper to get display destination
  const getDisplayDestination = (pass) => {
    if (pass.destination === "other" && pass.customDestination) {
      return pass.customDestination;
    }
    return pass.destination;
  };

  const { user } = useAuth();
  const userRole = user?.role;
  const userRoom = user?.room;

  const [activePasses, setActivePasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("active");
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [allRooms, setAllRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const staffSnapshot = await getDocs(collection(db, COLLECTIONS.STAFF));
        const rooms = staffSnapshot.docs
          .map((doc) => doc.data().room)
          .filter(Boolean);
        const uniqueRooms = [...new Set(rooms)].sort((a, b) =>
          a.toString().localeCompare(b.toString(), undefined, { numeric: true })
        );
        setAllRooms(uniqueRooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    // Load for everyone (both admin and teacher)
    fetchRooms();
  }, []);

  useEffect(() => {

    if (!isTabVisible) {
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToActivePasses(
      ({ success, passes, error }) => {

        if (success) {
          setActivePasses(passes);
        } else {
          console.error("❌ Subscription error:", error);
        }
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isTabVisible]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleCheckIn = async (passId, studentName) => {
    // Optimistically remove from UI
    setActivePasses((prev) => prev.filter((p) => p.id !== passId));

    // Check in the pass
    const result = await checkInPass(passId);

    // If it failed, show error and reload
    if (!result.success) {
      console.error("Check-in failed:", result.error);
      alert(`Failed to check in ${studentName}. ${result.error}`);
      // Optionally reload to get current state - or you could re-add the pass
    }
  };

  const handleLogout = async () => {
    await signOut(); //
  };

  const filteredPasses = useMemo(() => {

    const lowerSearchTerm = searchTerm.toLowerCase();

    // Split into FROM and TO when a specific room is selected
    let fromPasses = [];
    let toPasses = [];

    activePasses.forEach((pass) => {
      // Filter 1: Search Term (Name or ID)
      if (searchTerm) {
        const nameMatch = pass.studentName
          ?.toLowerCase()
          .includes(lowerSearchTerm);
        const idMatch = pass.studentId?.includes(lowerSearchTerm);
        if (!nameMatch && !idMatch) {
          return; // Skip this pass
        }
      }

      // Filter 3: Destination filter (applies to all)
      if (filterDestination) {
        const lowerDest = filterDestination.toLowerCase();
        const actualDest =
          pass.destination === "other" && pass.customDestination
            ? pass.customDestination
            : pass.destination;

        if (!actualDest?.toLowerCase().includes(lowerDest)) {
          return; // Skip this pass
        }
      }

      // Filter 2: Room filter - split into FROM and TO
      if (filterRoom) {
        // Check if FROM this room
        if (pass.roomFrom === filterRoom) {
          fromPasses.push(pass);
        }

        // Check if TO this room (destination matches room or staff name)
        const actualDest =
          pass.destination === "other" && pass.customDestination
            ? pass.customDestination
            : pass.destination;

        // Check if destination contains the room number or staff name
        if (actualDest?.toLowerCase().includes(filterRoom.toLowerCase())) {
          toPasses.push(pass);
        }
      } else {
        // No room filter - show all in one list
        fromPasses.push(pass);
      }
    });

    return { fromPasses, toPasses, hasRoomFilter: !!filterRoom };
  }, [activePasses, searchTerm, filterRoom, filterDestination]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
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
            </div>
            <div className="flex items-center gap-4">
              {/* View Toggles */}
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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === "today"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setView("analytics")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === "analytics"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Analytics
                </button>
              </div>
              {/* Nav Links */}
              <div className="flex items-center gap-2 border-l pl-4">
                <Link
                  to="/"
                  className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                >
                  <Home size={18} />
                  Student View
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2"
                >
                  <User size={18} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter Bar */}
        {view === "active" && (
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
            <div>
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white"
              >
                <option value="">All Rooms</option>
                {allRooms.map((room) => (
                  <option key={room} value={room}>
                    Room {room}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by destination..."
                value={filterDestination}
                onChange={(e) => setFilterDestination(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
              <MapPin
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        )}

        {/* --- Content based on view --- */}
        {view === "active" ? (
          <div className="space-y-6">
            {/* FROM Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b flex items-center justify-between bg-blue-50">
                <h2 className="text-lg font-semibold text-gray-800">
                  {filteredPasses.hasRoomFilter
                    ? `FROM Room ${filterRoom} (${filteredPasses.fromPasses.length})`
                    : `Currently Out of Class (${filteredPasses.fromPasses.length})`}
                </h2>
              </div>

              {loading && filteredPasses.fromPasses.length === 0 && (
                <p className="text-center p-12">Loading...</p>
              )}
              {!loading && filteredPasses.fromPasses.length === 0 && (
                <p className="text-center p-12">
                  {filteredPasses.hasRoomFilter
                    ? `No students currently out from Room ${filterRoom}`
                    : "No active passes found"}
                </p>
              )}
              {filteredPasses.fromPasses.length > 0 && (
                <div className="divide-y">
                  {filteredPasses.fromPasses.map((pass) => (
                    <div
                      key={pass.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 text-indigo-700 p-3 rounded-full">
                          <User size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            {pass.studentName || "Name Missing"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ID: {pass.studentId || "ID Missing"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-blue-500" />
                            <span>
                              From <strong>Room {pass.roomFrom}</strong> to{" "}
                              <strong className="capitalize">
                                {getDisplayDestination(pass)}
                              </strong>
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${getTimeColor(
                              pass.checkOutTime
                            )}`}
                          >
                            <Clock size={16} />
                            <span>{getTimeSince(pass.checkOutTime)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckIn(pass.id, pass.studentName)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Check In
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TO Section - Only show if room filter is active */}
            {filteredPasses.hasRoomFilter &&
              filteredPasses.toPasses.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b flex items-center justify-between bg-green-50">
                    <h2 className="text-lg font-semibold text-gray-800">
                      TO Room {filterRoom} ({filteredPasses.toPasses.length})
                    </h2>
                  </div>

                  <div className="divide-y">
                    {filteredPasses.toPasses.map((pass) => (
                      <div
                        key={pass.id}
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-green-100 text-green-700 p-3 rounded-full">
                            <User size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">
                              {pass.studentName || "Name Missing"}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {pass.studentId || "ID Missing"}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-green-500" />
                              <span>
                                From <strong>Room {pass.roomFrom}</strong>{" "}
                                coming here
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-1 ${getTimeColor(
                                pass.checkOutTime
                              )}`}
                            >
                              <Clock size={16} />
                              <span>{getTimeSince(pass.checkOutTime)}</span>
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
                    ))}
                  </div>
                </div>
              )}
          </div>
        ) : view === "today" ? (
          <TodayView userRole={userRole} userRoom={userRoom} />
        ) : (
          <AnalyticsView />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
