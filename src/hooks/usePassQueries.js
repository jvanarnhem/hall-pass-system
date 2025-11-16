// src/hooks/usePassQueries.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/db";

// Query keys (for cache management)
export const QUERY_KEYS = {
  todayPasses: "todayPasses",
  analytics: (days) => ["analytics", days],
  studentDetails: (studentId, days) => ["studentDetails", studentId, days],
};

// Helper to get today's start
const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper to get start of a specific date (YYYY-MM-DD string)
const getDateStart = (dateString) => {
  const d = new Date(dateString + 'T00:00:00'); // Parse as local time
  return d;
};

// Helper to get period start
const getPeriodStart = (days) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
};

// ===== HISTORY PASSES QUERY (OPTIMIZED - accepts date parameter) =====
export const useTodayPasses = (selectedDate = null) => {
  // Helper to get today's date string in local timezone
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // If no date provided, use today (in local timezone)
  const dateToUse = selectedDate || getTodayDateString();

  return useQuery({
    queryKey: [QUERY_KEYS.todayPasses, dateToUse],
    queryFn: async () => {
      const dayStart = selectedDate ? getDateStart(selectedDate) : getTodayStart();

      // Get end of day (23:59:59.999)
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // ✅ Query logic:
      // - For today: fetch active passes + history from today
      // - For past dates: only fetch history from that date
      const isToday = dateToUse === getTodayDateString();

      let snapA = { docs: [] }; // Empty by default for past dates

      // Only query active passes if viewing today
      if (isToday) {
        const qActive = query(
          collection(db, COLLECTIONS.ACTIVE_PASSES),
          where("status", "==", "OUT"),
          orderBy("checkOutTime", "desc")
        );
        snapA = await getDocs(qActive);
      }

      // Query history for the selected date range (start to end of day)
      const qHistDay = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where("createdAt", ">=", Timestamp.fromDate(dayStart)),
        where("createdAt", "<=", Timestamp.fromDate(dayEnd)),
        orderBy("createdAt", "desc")
      );

      const snapH = await getDocs(qHistDay);

      const rows = [];
      const toRow = (d, source) => {
        const x = d.data();
        return {
          id: d.id,
          source,
          ...x,
          _checkOutISO: x.checkOutTime?.toDate()?.toISOString() || null,
          _checkInISO: x.checkInTime?.toDate()?.toISOString() || null,
          _createdISO: x.createdAt?.toDate()?.toISOString() || null,
        };
      };

      snapA.docs.forEach((d) => rows.push(toRow(d, "active")));

      // Add all history passes from the query (already filtered by date range)
      snapH.docs.forEach((d) => {
        rows.push(toRow(d, "history"));
      });

      // Sort by most recent activity
      const merged = rows.sort((a, b) => {
        const ta = new Date(
          a._checkInISO || a._createdISO || a._checkOutISO || 0
        ).getTime();
        const tb = new Date(
          b._checkInISO || b._createdISO || b._checkOutISO || 0
        ).getTime();
        return tb - ta;
      });

      return merged;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// ===== ANALYTICS QUERY (OPTIMIZED) =====
export const useAnalytics = (days = 30) => {
  return useQuery({
    queryKey: QUERY_KEYS.analytics(days),
    queryFn: async () => {
      const since = getPeriodStart(days);
      const todayStart = getTodayStart();

      // ✅ OPTIMIZATION: Reduced from 5 queries to 3 queries
      // We fetch period data once, then derive "today" data client-side
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

      const [snapActivePeriod, snapHistInPeriod, snapHistOutPeriod] =
        await Promise.all([
          getDocs(qActivePeriod),
          getDocs(qHistInPeriod),
          getDocs(qHistOutPeriod),
        ]);

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
          source,
          studentId: x.studentId != null ? String(x.studentId) : "",
          name: x.studentName || "",
          roomFrom: x.roomFrom != null ? String(x.roomFrom) : "",
          destination: x.destination || "",
          customDestination: x.customDestination || null,
          createdAtISO: createdISO,
          checkOutISO: outISO,
          checkInISO: inISO,
          duration,
          status:
            source === "active" ? "OUT" : (x.status || "IN").toUpperCase(),
        };
      };

      // Period rows (de-duped)
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

      // Frequent users (period)
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

      // ✅ OPTIMIZATION: Derive today data from period data (no extra queries)
      const todayRows = rowsPeriod.filter((r) => {
        const createdDate = r.createdAtISO ? new Date(r.createdAtISO) : null;
        return createdDate && createdDate >= todayStart;
      });

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

      // ===== TIME OF DAY ANALYSIS (8am-3pm hourly buckets) =====
      const timeOfDayData = Array.from({ length: 8 }, (_, i) => ({
        hour: 8 + i,
        label: `${8 + i}:00`,
        count: 0,
      }));

      for (const r of rowsPeriod) {
        const checkOutDate = r.checkOutISO ? new Date(r.checkOutISO) : null;
        if (checkOutDate) {
          const hour = checkOutDate.getHours();
          if (hour >= 8 && hour <= 15) {
            timeOfDayData[hour - 8].count++;
          }
        }
      }

      // ===== DESTINATION FREQUENCY ANALYSIS =====
      const destinationCounts = new Map();
      for (const r of rowsPeriod) {
        let dest = r.destination || "";
        const destLower = dest.toLowerCase();

        // Group destinations: Keep Restroom, Nurse, Guidance separate; everything else goes to "Other"
        if (destLower === "restroom") {
          dest = "Restroom";
        } else if (destLower === "nurse") {
          dest = "Nurse";
        } else if (destLower === "guidance") {
          dest = "Guidance";
        } else {
          dest = "Other";
        }

        if (dest) {
          const current = destinationCounts.get(dest) || 0;
          destinationCounts.set(dest, current + 1);
        }
      }

      const destinationData = Array.from(destinationCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return {
        frequentUsers,
        dailyMultiple,
        periodDays: days,
        timeOfDayData,
        destinationData,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (analytics changes less frequently)
  });
};

// ===== ADMIN QUERIES =====

export const useStaffList = () => {
  return useQuery({
    queryKey: ["staffList"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, COLLECTIONS.STAFF));
      const staffData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      staffData.sort((a, b) => a.name.localeCompare(b.name));
      return staffData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ===== DESTINATIONS QUERY (NEW - for global caching) =====
export const useDestinations = () => {
  return useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const q = query(
        collection(db, COLLECTIONS.DESTINATIONS),
        where("active", "==", true),
        orderBy("order")
      );
      const snapshot = await getDocs(q);
      const destinations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return destinations;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (destinations change rarely)
  });
};

export const useStudentCount = () => {
  return useQuery({
    queryKey: ["studentCount"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, COLLECTIONS.STUDENTS));
      return snapshot.size;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (changes less frequently)
  });
};

export const useExportCount = (exportDays) => {
  return useQuery({
    queryKey: ["exportCount", exportDays],
    queryFn: async () => {
      let q;

      if (exportDays === "all") {
        q = collection(db, COLLECTIONS.PASS_HISTORY);
      } else {
        const since = new Date();
        since.setDate(since.getDate() - exportDays);
        since.setHours(0, 0, 0, 0);

        q = query(
          collection(db, COLLECTIONS.PASS_HISTORY),
          where("createdAt", ">=", Timestamp.fromDate(since))
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.size;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: exportDays !== null, // Only run if exportDays is set
  });
};

// ===== HOOK TO INVALIDATE CACHES (use after check-in or edit) =====
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateTodayPasses: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.todayPasses] });
    },
    invalidateAnalytics: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
    invalidateStaff: () => {
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
    },
    invalidateStudents: () => {
      queryClient.invalidateQueries({ queryKey: ["studentCount"] });
    },
    invalidateExport: () => {
      queryClient.invalidateQueries({ queryKey: ["exportCount"] });
    },
  };
};
