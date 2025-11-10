// scripts/importPassHistory.js
const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Parse CSV
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const passes = [];

  if (lines.length < 2) {
    console.log("❌ CSV file is empty or has no data rows");
    return [];
  }

  // Parse header
  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim());
  console.log("📋 CSV Headers:", header);

  // Check required columns
  const required = [
    "studentid",
    "studentname",
    "roomfrom",
    "destination",
    "checkouttime",
    "status",
  ];
  const missing = required.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    console.error("❌ Missing required columns:", missing);
    return [];
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, handling quoted fields
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const cleanParts = parts.map((p) => p.replace(/^"|"$/g, "").trim());

    if (cleanParts.length < required.length) {
      console.log(`⚠️ Skipping line ${i + 1}: not enough columns`);
      continue;
    }

    // Build object using header
    const row = {};
    header.forEach((col, idx) => {
      row[col] = cleanParts[idx] || "";
    });

    // Validate student ID
    if (!/^\d{6}$/.test(row.studentid)) {
      console.log(
        `⚠️ Skipping line ${i + 1}: invalid student ID "${row.studentid}"`
      );
      continue;
    }

    // Parse dates
    // === NEW, REVISED CODE ===
    // This new parseDate function will correctly read "MM/DD/YY HH:MM"
    const parseDate = (dateStr) => {
      if (!dateStr) return null;

      // Regex to match "MM/DD/YY HH:MM"
      const match = dateStr.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s(\d{1,2}):(\d{2})$/
      );

      if (match) {
        // We have a match! Build the date manually.
        // match[1] = MM, match[2] = DD, match[3] = YY, match[4] = HH, match[5] = MM

        const month = parseInt(match[1], 10) - 1; // 0-indexed month
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10) + 2000; // '25' -> 2025
        const hour = parseInt(match[4], 10);
        const minute = parseInt(match[5], 10);

        const d = new Date(year, month, day, hour, minute);
        return isNaN(d.getTime()) ? null : d; // Check if it's a valid date
      }

      // Fallback for other formats (like just "15:20", which will fail)
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const checkOutTime = parseDate(row.checkouttime);
    if (!checkOutTime) {
      console.log(
        `⚠️ Skipping line ${i + 1}: invalid checkOutTime "${row.checkouttime}"`
      );
      continue;
    }

    const checkInTime = parseDate(row.checkintime);

    // Calculate duration if not provided
    let duration = parseInt(row.duration) || null;
    if (!duration && checkOutTime && checkInTime) {
      duration = Math.round((checkInTime - checkOutTime) / 60000);
    }

    passes.push({
      studentId: row.studentid,
      studentName: row.studentname,
      roomFrom: row.roomfrom,
      destination: row.destination.toLowerCase(),
      customDestination: row.customdestination || null,
      checkOutTime: admin.firestore.Timestamp.fromDate(checkOutTime),
      checkInTime: checkInTime
        ? admin.firestore.Timestamp.fromDate(checkInTime)
        : null,
      createdAt: admin.firestore.Timestamp.fromDate(checkOutTime),
      duration: duration,
      status: (row.status || "IN").toUpperCase(),
    });
  }

  return passes;
}

// Remove test data (studentId 123456)
async function removeTestData() {
  console.log("\n🗑️ Removing test data (studentId: 123456)...");

  try {
    // Remove from passHistory
    const historyQuery = db
      .collection("passHistory")
      .where("studentId", "==", "123456");
    const historySnapshot = await historyQuery.get();

    if (historySnapshot.empty) {
      console.log("   No test data found in passHistory");
    } else {
      const batch = db.batch();
      historySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(
        `   ✅ Deleted ${historySnapshot.size} test passes from passHistory`
      );
    }

    // Remove from activePasses
    const activeQuery = db
      .collection("activePasses")
      .where("studentId", "==", "123456");
    const activeSnapshot = await activeQuery.get();

    if (activeSnapshot.empty) {
      console.log("   No test data found in activePasses");
    } else {
      const batch = db.batch();
      activeSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(
        `   ✅ Deleted ${activeSnapshot.size} test passes from activePasses`
      );
    }

    console.log("✅ Test data removal complete\n");
  } catch (error) {
    console.error("❌ Error removing test data:", error);
  }
}

// Clear all existing passHistory
async function clearPassHistory() {
  console.log("🗑️ Clearing existing passHistory...");

  try {
    const snapshot = await db.collection("passHistory").get();

    if (snapshot.empty) {
      console.log("   passHistory is already empty");
      return;
    }

    console.log(`   Found ${snapshot.size} existing passes`);

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deleted = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);

      chunk.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deleted += chunk.length;
      console.log(`   Deleted ${deleted}/${snapshot.size}...`);
    }

    console.log("✅ passHistory cleared\n");
  } catch (error) {
    console.error("❌ Error clearing passHistory:", error);
    throw error;
  }
}

// Import passes to Firestore
async function importPassHistory(csvPath) {
  try {
    console.log("📖 Reading CSV file...");
    const csvText = fs.readFileSync(csvPath, "utf-8");

    console.log("🔍 Parsing pass history...");
    const passes = parseCSV(csvText);

    if (passes.length === 0) {
      console.log("❌ No valid passes to import");
      process.exit(1);
    }

    console.log(`✅ Parsed ${passes.length} valid passes\n`);

    // Step 1: Remove test data
    await removeTestData();

    // Step 2: Clear existing passHistory
    await clearPassHistory();

    // Step 3: Import new data
    console.log("📝 Importing pass history...");

    const batchSize = 500;
    let imported = 0;

    for (let i = 0; i < passes.length; i += batchSize) {
      const batch = db.batch();
      const chunk = passes.slice(i, i + batchSize);

      chunk.forEach((pass) => {
        const docRef = db.collection("passHistory").doc();
        batch.set(docRef, pass);
      });

      await batch.commit();
      imported += chunk.length;
      console.log(`   Imported ${imported}/${passes.length}...`);
    }

    console.log("\n🎉 Import complete!");
    console.log(`✅ Total passes imported: ${imported}`);
    console.log(`✅ Test data (123456) removed from all collections`);
  } catch (error) {
    console.error("❌ Error importing pass history:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Get CSV path from command line
const csvPath = process.argv[2];

if (!csvPath) {
  console.error("❌ Please provide path to CSV file");
  console.log(
    "Usage: node scripts/importPassHistory.js path/to/passHistory.csv"
  );
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error("❌ CSV file not found:", csvPath);
  process.exit(1);
}

importPassHistory(csvPath);
