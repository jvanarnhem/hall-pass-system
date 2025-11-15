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

// Helper to get period start
const getPeriodStart = (days) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
};

// ===== TODAY PASSES QUERY (OPTIMIZED) =====
export const useTodayPasses = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.todayPasses],
    queryFn: async () => {
      console.log("🔄 React Query: Fetching today passes (optimized)");
      const todayStart = getTodayStart();

      // ✅ OPTIMIZATION: Reduced from 3 queries to 2 queries
      // - Active passes (all active, regardless of time - they're always relevant)
      // - History created today (catches all passes that started today)
      const qActive = query(
        collection(db, COLLECTIONS.ACTIVE_PASSES),
        where("status", "==", "OUT"),
        orderBy("checkOutTime", "desc")
      );

      const qHistToday = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where("createdAt", ">=", Timestamp.fromDate(todayStart)),
        orderBy("createdAt", "desc")
      );

      const [snapA, snapH] = await Promise.all([
        getDocs(qActive),
        getDocs(qHistToday),
      ]);

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

      // Only include history passes from today
      snapH.docs.forEach((d) => {
        const row = toRow(d, "history");
        // Filter: only include if it was created today
        if (row._createdISO && new Date(row._createdISO) >= todayStart) {
          rows.push(row);
        }
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

      console.log(`💾 React Query: Today passes cached (${snapA.size} active + ${snapH.size} history = ${merged.length} total)`);
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
      console.log(`🔄 React Query: Fetching analytics for ${days} days (optimized)`);
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

      console.log(
        `💾 React Query: Analytics cached for ${days} days (${rowsPeriod.length} period, ${todayRows.length} today)`
      );
      return { frequentUsers, dailyMultiple, periodDays: days };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (analytics changes less frequently)
  });
};

// ===== ADMIN QUERIES =====

export const useStaffList = () => {
  return useQuery({
    queryKey: ["staffList"],
    queryFn: async () => {
      console.log("🔄 React Query: Fetching staff list");
      const snapshot = await getDocs(collection(db, COLLECTIONS.STAFF));
      const staffData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      staffData.sort((a, b) => a.name.localeCompare(b.name));
      console.log("💾 React Query: Staff list cached");
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
      console.log("🔄 React Query: Fetching destinations");
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
      console.log("💾 React Query: Destinations cached");
      return destinations;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (destinations change rarely)
  });
};

export const useStudentCount = () => {
  return useQuery({
    queryKey: ["studentCount"],
    queryFn: async () => {
      console.log("🔄 React Query: Fetching student count");
      const snapshot = await getDocs(collection(db, COLLECTIONS.STUDENTS));
      console.log("💾 React Query: Student count cached");
      return snapshot.size;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (changes less frequently)
  });
};

export const useExportCount = (exportDays) => {
  return useQuery({
    queryKey: ["exportCount", exportDays],
    queryFn: async () => {
      console.log(
        `🔄 React Query: Calculating export count for ${exportDays} days`
      );
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
      console.log(
        `💾 React Query: Export count cached (${snapshot.size} passes)`
      );
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
      console.log("🗑️ React Query: Invalidating today passes cache");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.todayPasses] });
    },
    invalidateAnalytics: () => {
      console.log("🗑️ React Query: Invalidating analytics cache");
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    invalidateAll: () => {
      console.log("🗑️ React Query: Invalidating all caches");
      queryClient.invalidateQueries();
    },
    // Add these inside useInvalidateQueries hook:
    invalidateStaff: () => {
      console.log("🗑️ React Query: Invalidating staff cache");
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
    },
    invalidateStudents: () => {
      console.log("🗑️ React Query: Invalidating student cache");
      queryClient.invalidateQueries({ queryKey: ["studentCount"] });
    },
    invalidateExport: () => {
      console.log("🗑️ React Query: Invalidating export count cache");
      queryClient.invalidateQueries({ queryKey: ["exportCount"] });
    },
  };
};
