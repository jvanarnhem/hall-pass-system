// functions/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ============================================
// AUTO CHECK-IN FUNCTION (Runs every 5 minutes)
// ============================================

exports.autoCheckInExpiredPasses = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "America/New_York", // Adjust to your timezone
    memory: "256MiB",
  },
  async (event) => {
    try {
      console.log("🔄 Auto check-in: Starting...");

      // 1. Fetch system settings to get maxCheckoutMinutes
      const settingsDoc = await db.collection("settings").doc("system").get();
      const maxCheckoutMinutes = settingsDoc.exists
        ? settingsDoc.data().maxCheckoutMinutes || 46
        : 46;

      console.log(`⏱️  Max checkout time: ${maxCheckoutMinutes} minutes`);

      // 2. Calculate cutoff time (current time - maxCheckoutMinutes)
      const now = admin.firestore.Timestamp.now();
      const cutoffTime = new Date(
        now.toMillis() - maxCheckoutMinutes * 60 * 1000
      );
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffTime);

      console.log(
        `🔍 Searching for passes checked out before: ${cutoffTime.toISOString()}`
      );

      // 3. Query for expired passes (checked out more than maxCheckoutMinutes ago)
      const expiredPassesSnapshot = await db
        .collection("activePasses")
        .where("status", "==", "OUT")
        .where("checkOutTime", "<=", cutoffTimestamp)
        .get();

      if (expiredPassesSnapshot.empty) {
        console.log("✅ No expired passes found");
        return null;
      }

      console.log(
        `📋 Found ${expiredPassesSnapshot.size} expired passes to check in`
      );

      // 4. Process expired passes in batches (Firestore limit: 500 operations per batch)
      const batchSize = 500;
      const passes = expiredPassesSnapshot.docs;
      let checkedInCount = 0;

      for (let i = 0; i < passes.length; i += batchSize) {
        const batch = db.batch();
        const batchPasses = passes.slice(i, i + batchSize);

        for (const passDoc of batchPasses) {
          const passData = passDoc.data();

          // Calculate exact check-in time (checkOutTime + maxCheckoutMinutes)
          const checkOutMillis = passData.checkOutTime.toMillis();
          const checkInMillis =
            checkOutMillis + maxCheckoutMinutes * 60 * 1000;
          const checkInTime =
            admin.firestore.Timestamp.fromMillis(checkInMillis);

          // Create history record (preserve all fields including notes)
          const historyRef = db.collection("passHistory").doc();
          batch.set(historyRef, {
            ...passData,
            checkInTime,
            status: "IN",
            autoCheckedIn: true, // Flag to indicate this was auto-checked in
            // Note fields are preserved from passData
          });

          // Delete from activePasses
          batch.delete(passDoc.ref);

          checkedInCount++;
        }

        await batch.commit();
        console.log(
          `   ✓ Processed batch ${Math.floor(i / batchSize) + 1}: ${checkedInCount}/${passes.length} passes`
        );
      }

      console.log(
        `✅ Auto check-in complete: ${checkedInCount} passes checked in`
      );
      return { success: true, checkedIn: checkedInCount };
    } catch (error) {
      console.error("❌ Auto check-in error:", error);
      throw error; // Re-throw to mark function as failed
    }
  }
);
