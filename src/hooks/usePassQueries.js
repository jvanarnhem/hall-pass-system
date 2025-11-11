// src/hooks/usePassQueries.js
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/db';

// Query keys (for cache management)
export const QUERY_KEYS = {
  todayPasses: 'todayPasses',
  analytics: (days) => ['analytics', days],
  studentDetails: (studentId, days) => ['studentDetails', studentId, days],
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

// ===== TODAY PASSES QUERY =====
export const useTodayPasses = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.todayPasses],
    queryFn: async () => {
      console.log('🔄 React Query: Fetching today passes');
      const todayStart = getTodayStart();

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
          source,
          ...x,
          _checkOutISO: x.checkOutTime?.toDate()?.toISOString() || null,
          _checkInISO: x.checkInTime?.toDate()?.toISOString() || null,
          _createdISO: x.createdAt?.toDate()?.toISOString() || null,
        };
      };

      snapA.docs.forEach((d) => rows.push(toRow(d, "active")));
      snapHIn.docs.forEach((d) => rows.push(toRow(d, "history")));
      snapHOutToday.docs.forEach((d) => rows.push(toRow(d, "history")));

      // De-dupe
      const byKey = new Map();
      for (const r of rows) {
        const key = `${r.source}:${r.id}`;
        if (!byKey.has(key)) byKey.set(key, r);
      }

      const merged = Array.from(byKey.values()).sort((a, b) => {
        const ta = new Date(a._checkInISO || a._createdISO || a._checkOutISO || 0).getTime();
        const tb = new Date(b._checkInISO || b._createdISO || b._checkOutISO || 0).getTime();
        return tb - ta;
      });

      console.log('💾 React Query: Today passes cached');
      return merged;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// ===== ANALYTICS QUERY =====
export const useAnalytics = (days = 30) => {
  return useQuery({
    queryKey: QUERY_KEYS.analytics(days),
    queryFn: async () => {
      console.log(`🔄 React Query: Fetching analytics for ${days} days`);
      const since = getPeriodStart(days);
      const todayStart = getTodayStart();

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

      const [snapActivePeriod, snapHistInPeriod, snapHistOutPeriod, snapActiveToday, snapHistOutToday] =
        await Promise.all([
          getDocs(qActivePeriod),
          getDocs(qHistInPeriod),
          getDocs(qHistOutPeriod),
          getDocs(qActiveToday),
          getDocs(qHistOutToday),
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
          status: source === "active" ? "OUT" : (x.status || "IN").toUpperCase(),
        };
      };

      // Period rows
      const rowsPeriod = [];
      snapActivePeriod.docs.forEach((d) => rowsPeriod.push(asRow(d, "active")));
      const histMap = new Map();
      snapHistInPeriod.docs.forEach((d) => histMap.set(d.id, asRow(d, "history")));
      snapHistOutPeriod.docs.forEach((d) => {
        if (!histMap.has(d.id)) histMap.set(d.id, asRow(d, "history"));
      });
      rowsPeriod.push(...histMap.values());

      // Frequent users
      const startedInPeriod = rowsPeriod.filter((r) => r.checkOutISO || r.createdAtISO);
      const byStudent = new Map();
      for (const r of startedInPeriod) {
        const key = r.studentId || r.name;
        if (!key) continue;
        const prev = byStudent.get(key) || { studentId: r.studentId, name: r.name, count: 0 };
        prev.count += 1;
        byStudent.set(key, prev);
      }
      const frequentUsers = Array.from(byStudent.values()).sort((a, b) => b.count - a.count);

      // Daily multiple
      const todayRows = [];
      snapActiveToday.docs.forEach((d) => todayRows.push(asRow(d, "active")));
      snapHistOutToday.docs.forEach((d) => todayRows.push(asRow(d, "history")));
      const byStudentToday = new Map();
      for (const r of todayRows) {
        const key = r.studentId || r.name;
        if (!key) continue;
        const prev = byStudentToday.get(key) || { studentId: r.studentId, name: r.name, count: 0 };
        prev.count += 1;
        byStudentToday.set(key, prev);
      }
      const dailyMultiple = Array.from(byStudentToday.values()).sort((a, b) => b.count - a.count);

      console.log(`💾 React Query: Analytics cached for ${days} days`);
      return { frequentUsers, dailyMultiple, periodDays: days };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (analytics changes less frequently)
  });
};

// ===== HOOK TO INVALIDATE CACHES (use after check-in or edit) =====
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateTodayPasses: () => {
      console.log('🗑️ React Query: Invalidating today passes cache');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.todayPasses] });
    },
    invalidateAnalytics: () => {
      console.log('🗑️ React Query: Invalidating analytics cache');
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    invalidateAll: () => {
      console.log('🗑️ React Query: Invalidating all caches');
      queryClient.invalidateQueries();
    },
  };
};