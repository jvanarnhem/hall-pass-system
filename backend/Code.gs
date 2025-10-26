// ============================================
// HALL PASS TRACKING SYSTEM - BACKEND
// Google Apps Script Web App
// ============================================

// Configuration - Update these with your Sheet ID
const SPREADSHEET_ID = "1ihOKAMKoYFKD-_xbWFHIun46YN0KEO5Ox0oeMSmdmhU"; // Get from URL
const SHEET_NAMES = {
  ROSTER: "StudentRoster",
  ACTIVE: "ActivePasses",
  ARCHIVE: "Archive",
  CONFIG: "Config",
};

// ============================================
// WEB APP ENTRY POINTS
// ============================================

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  try {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    const params =
      method === "POST" ? JSON.parse(e.postData.contents) : e.parameter;
    const action = params.action || e.parameter.action;

    let result;
    switch (action) {
      case "checkout":
        result = handleCheckOut(params);
        break;
      case "checkin":
        result = handleCheckIn(params);
        break;
      case "getActivePasses":
        result = getActivePasses(params);
        break;
      case "getTodayPasses":
        result = getTodayPasses(params);
        break;
      case "getStudentName":
        result = getStudentName(params.studentId);
        break;
      case "getAnalytics":
        result = getAnalytics(params.days || 30);
        break;
      case "getSystemSettings":
        result = getSystemSettings();
        break;
      case "autoCheckInExpiredPasses":
        result = autoCheckInExpiredPasses();
        break;
      case "getStaffDropdownList":
        result = getStaffDropdownList();
        break;
      case "updateArchivedPass":
        result = updateArchivedPass(params);
        break;
      case "authenticate":
        result = authenticateUser(params.pin);
        break;
      case "verifyStaffEmail": // ← ADD THIS
        result = verifyStaffEmail(params.email); // ← ADD THIS
        break; // ← ADD THIS
      case "getRoomList": // ← ADD THIS
        result = getRoomList(); // ← ADD THIS
        break; // ← ADD THIS
      case "getDestinationList":
        result = getDestinationList();
        break;
      case "importRoster":
        result = importRosterCSV(params.csvData);
        break;
      case "exportArchive":
        result = exportArchiveData(params.startDate, params.endDate);
        break;
      default:
        result = { success: false, error: "Invalid action" };
    }

    output.setContent(JSON.stringify(result));
    return output;
  } catch (error) {
    Logger.log("Error: " + error.toString());
    const errorOutput = ContentService.createTextOutput();
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    errorOutput.setContent(
      JSON.stringify({
        success: false,
        error: error.toString(),
      })
    );
    return errorOutput;
  }
}

// ============================================
// AUTHENTICATION & AUTHORIZATION
// ============================================

function authenticateUser() {
  // Simple password-based authentication for "Anyone" access
  // In production, this should check against a secure password

  return {
    success: true,
    user: {
      email: "staff@ofcs.net",
      role: "admin",
      room: null,
    },
  };
}

function verifyStaffEmail(email) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const configData = configSheet.getDataRange().getValues();

    Logger.log("Verifying email: " + email);

    // Look for user in authorization list
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === "STAFF" && configData[i][1] === email) {
        return {
          success: true,
          role: configData[i][2],
          room: configData[i][3] || null,
        };
      }
    }

    Logger.log("Email not found in Config");
    return {
      success: false,
      error: "Email not authorized",
    };
  } catch (error) {
    Logger.log("Error verifying email: " + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}

function getUserRole(email) {
  // Check if user is authorized
  // This should be configured in your Config sheet
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  const configData = configSheet.getDataRange().getValues();

  // Look for user in authorization list
  for (let i = 1; i < configData.length; i++) {
    if (configData[i][0] === "STAFF" && configData[i][1] === email) {
      return {
        role: configData[i][2], // 'admin' or 'teacher'
        room: configData[i][3] || null,
      };
    }
  }

  return null;
}

function checkPermission(email, roomFrom) {
  const userRole = getUserRole(email);
  if (!userRole) return false;
  if (userRole.role === "admin") return true;
  return userRole.room === roomFrom;
}

// ============================================
// STUDENT CHECK-OUT
// ============================================

function handleCheckOut(params) {
  const { studentId, destination, roomFrom, customDestination } = params;

  // Validate inputs
  if (!studentId || studentId.length !== 6) {
    return { success: false, error: "Invalid student ID" };
  }

  if (!destination) {
    return { success: false, error: "Destination is required" };
  }

  if (!roomFrom) {
    return { success: false, error: "Room number is required" };
  }

  // Get student name from roster
  const studentName = getStudentNameFromRoster(studentId);
  if (!studentName) {
    return { success: false, error: "Student ID not found in roster" };
  }

  // Check if student is already checked out
  const existingPass = findActivePassByStudentId(studentId);
  if (existingPass) {
    return {
      success: false,
      error: `${studentName} is already checked out to ${existingPass.destination}`,
      isDuplicate: true,
    };
  }

  // Create new pass record
  const passId = generatePassId();
  const checkOutTime = new Date();
  const finalDestination =
    destination === "other" ? customDestination : destination;

  // Format date for column A
  const dateOnly = Utilities.formatDate(
    checkOutTime,
    Session.getScriptTimeZone(),
    "M/d/yyyy"
  );

  // For the time column (H), we'll store just the time portion as a decimal
  // This is how Google Sheets stores time values (fraction of a day)
  const timeValue =
    (checkOutTime.getHours() +
      checkOutTime.getMinutes() / 60 +
      checkOutTime.getSeconds() / 3600) /
    24;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const activeSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE);

  // Append the row
  activeSheet.appendRow([
    dateOnly, // Date (column A) - formatted string
    passId, // passId
    studentId, // studentId
    studentName, // studentName
    roomFrom, // roomFrom
    finalDestination, // destination
    customDestination || "", // customDestination
    timeValue, // checkOutTime (column H) - time as decimal
    "OUT", // status
  ]);

  // Now format column H as time
  const lastRow = activeSheet.getLastRow();
  activeSheet.getRange(lastRow, 8).setNumberFormat("h:mm:ss AM/PM"); // Column H is index 8

  // Log the checkout
  logActivity("CHECKOUT", studentId, studentName, roomFrom, finalDestination);

  return {
    success: true,
    passId: passId,
    studentName: studentName,
    checkOutTime: checkOutTime.toISOString(),
  };
}

// ============================================
// STUDENT CHECK-IN
// ============================================

function handleCheckIn(params) {
  const { passId } = params;

  Logger.log("Check-in request for passId: " + passId);

  if (!passId) {
    return { success: false, error: "Pass ID is required" };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const activeSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE);
  const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARCHIVE);

  // Find the pass
  const activeData = activeSheet.getDataRange().getValues();
  let passRow = -1;
  let passData = null;

  Logger.log("Searching through " + activeData.length + " rows");

  for (let i = 1; i < activeData.length; i++) {
    Logger.log("Checking row " + i + ": PassID=" + activeData[i][1]); // PassID is now column B (index 1)
    if (String(activeData[i][1]) === String(passId)) {
      // Column B = PassID
      passRow = i + 1;
      passData = activeData[i];
      Logger.log("Found pass at row " + passRow);
      break;
    }
  }

  if (passRow === -1) {
    Logger.log("Pass not found: " + passId);
    return { success: false, error: "Pass not found" };
  }

  const checkInTime = new Date();

  // Extract checkout time from Date objects (not strings)
  const dateObj = passData[0]; // Date object with the date (column A)
  const timeObj = passData[7]; // Date object with the time (column H)

  // Combine date from column A with time from column H
  const checkOutTime = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    timeObj.getHours(),
    timeObj.getMinutes(),
    timeObj.getSeconds()
  );

  const durationMinutes = Math.round((checkInTime - checkOutTime) / 60000);

  // Format times as time-only strings for display
  const checkOutTimeFormatted = Utilities.formatDate(
    checkOutTime,
    Session.getScriptTimeZone(),
    "h:mm:ss a"
  );
  const checkInTimeFormatted = Utilities.formatDate(
    checkInTime,
    Session.getScriptTimeZone(),
    "h:mm:ss a"
  );
  const dateOnly = Utilities.formatDate(
    checkInTime,
    Session.getScriptTimeZone(),
    "M/d/yyyy"
  );

  Logger.log("Archiving pass...");
  Logger.log("Date: " + dateOnly);
  Logger.log("CheckOut: " + checkOutTimeFormatted);
  Logger.log("CheckIn: " + checkInTimeFormatted);
  Logger.log("Duration: " + durationMinutes + " minutes");

  // Archive the pass - Column order matches Archive sheet
  // Date | PassID | StudentID | StudentName | RoomFrom | Destination | CustomDestination | CheckOutTime | Status | CheckInTime | DurationMinutes | CheckInBy
  archiveSheet.appendRow([
    dateOnly, // Date (column A)
    passData[1], // PassID (from column B)
    passData[2], // StudentID (from column C)
    passData[3], // StudentName (from column D)
    passData[4], // RoomFrom (from column E)
    passData[5], // Destination (from column F)
    passData[6], // CustomDestination (from column G)
    checkOutTimeFormatted, // CheckOutTime (time only)
    "IN", // Status
    checkInTimeFormatted, // CheckInTime (time only)
    durationMinutes, // DurationMinutes (as a number)
    "system", // CheckInBy
  ]);

  Logger.log("Deleting from ActivePasses row: " + passRow);

  // Remove from active passes
  activeSheet.deleteRow(passRow);

  Logger.log("Check-in complete");

  return {
    success: true,
    checkInTime: checkInTime.toISOString(),
    duration: durationMinutes,
  };
}

// ============================================
// GET ACTIVE PASSES
// ============================================

function getActivePasses(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const activeSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE);
    const data = activeSheet.getDataRange().getValues();

    Logger.log("Total rows in ActivePasses: " + data.length);

    const passes = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows - PassID is now column B (index 1)
      if (!row[1]) continue;

      Logger.log("Processing pass: " + row[1]);

      // Extract date and time from Date objects
      const dateObj = row[0]; // Date object with the date
      const timeObj = row[7]; // Date object with the time (from 1899)

      // Combine date from column A with time from column H
      const fullDateTime = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        timeObj.getHours(),
        timeObj.getMinutes(),
        timeObj.getSeconds()
      );

      passes.push({
        id: row[1], // PassID (column B)
        studentId: row[2], // StudentID (column C)
        studentName: row[3], // StudentName (column D)
        roomFrom: row[4], // RoomFrom (column E)
        destination: row[5], // Destination (column F)
        customDestination: row[6], // CustomDestination (column G)
        checkOutTime: fullDateTime.toISOString(), // Convert to ISO format for frontend
        status: row[8], // Status (column I)
      });
    }

    Logger.log("Returning " + passes.length + " passes");

    return {
      success: true,
      passes: passes,
      count: passes.length,
    };
  } catch (error) {
    Logger.log("Error in getActivePasses: " + error.toString());
    return {
      success: false,
      error: error.toString(),
      passes: [],
    };
  }
}

// ============================================
// ANALYTICS
// ============================================

function getAnalytics(days) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARCHIVE);
  const data = archiveSheet.getDataRange().getValues();

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Count passes per student
  const monthlyCount = {};
  const dailyCount = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Date is now in column A (index 0), CheckOutTime in column H (index 7)
    // Both are Date objects, so we need to combine them properly
    const dateObj = row[0]; // Date object with the date
    const timeObj = row[7]; // Date object with the time (from 1899)

    // Combine date from column A with time from column H
    const checkOutTime = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      timeObj.getHours(),
      timeObj.getMinutes(),
      timeObj.getSeconds()
    );

    const studentId = row[2]; // StudentID from column C
    const studentName = row[3]; // StudentName from column D

    // Monthly analytics
    if (checkOutTime >= startDate) {
      if (!monthlyCount[studentId]) {
        monthlyCount[studentId] = { name: studentName, count: 0 };
      }
      monthlyCount[studentId].count++;
    }

    // Daily analytics
    if (checkOutTime >= todayStart) {
      if (!dailyCount[studentId]) {
        dailyCount[studentId] = { name: studentName, count: 0 };
      }
      dailyCount[studentId].count++;
    }
  }

  // Convert to arrays and sort
  const frequentUsers = Object.keys(monthlyCount)
    .map((id) => ({
      studentId: id,
      name: monthlyCount[id].name,
      count: monthlyCount[id].count,
    }))
    .sort((a, b) => b.count - a.count);

  const dailyMultiple = Object.keys(dailyCount)
    .map((id) => ({
      studentId: id,
      name: dailyCount[id].name,
      count: dailyCount[id].count,
      date: now.toISOString(),
    }))
    .filter((u) => u.count >= 3)
    .sort((a, b) => b.count - a.count);

  return {
    success: true,
    frequentUsers: frequentUsers,
    dailyMultiple: dailyMultiple,
    totalPasses: data.length - 1,
    dateRange: {
      start: startDate.toISOString(),
      end: now.toISOString(),
    },
  };
}

// ============================================
// GET SYSTEM SETTINGS
// ============================================

function getSystemSettings() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const configData = configSheet.getDataRange().getValues();

    const settings = {
      checkoutEnabled: true,
      maxCheckoutMinutes: 30,
      dayEnd: "2:46 PM",
    };

    // Read settings from Config sheet
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === "SETTING") {
        const settingName = configData[i][1];
        const settingValue = configData[i][2];

        if (settingName === "CHECKOUT_ENABLED") {
          settings.checkoutEnabled =
            settingValue.toString().toUpperCase() === "TRUE";
        } else if (settingName === "MAX_CHECKOUT_MINUTES") {
          settings.maxCheckoutMinutes = parseInt(settingValue) || 30;
        } else if (settingName === "DAY_END") {
          settings.dayEnd = settingValue.toString();
        }
      }
    }

    return {
      success: true,
      settings: settings,
    };
  } catch (error) {
    Logger.log("Error getting system settings: " + error.toString());
    return {
      success: false,
      error: error.toString(),
      settings: {
        checkoutEnabled: true,
        maxCheckoutMinutes: 30,
        dayEnd: "2:46 PM",
      },
    };
  }
}

// ============================================
// AUTO CHECK-IN EXPIRED PASSES
// ============================================

function autoCheckInExpiredPasses() {
  try {
    const settings = getSystemSettings();
    if (!settings.success) {
      return {
        success: false,
        error: "Failed to load settings",
      };
    }

    const maxMinutes = settings.settings.maxCheckoutMinutes;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const activeSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE);
    const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARCHIVE);

    const activeData = activeSheet.getDataRange().getValues();
    const now = new Date();
    let checkedInCount = 0;

    // Process from bottom to top (so row numbers don't shift)
    for (let i = activeData.length - 1; i >= 1; i--) {
      const row = activeData[i];

      if (!row[1]) continue; // Skip if no PassID

      // Combine Date (column A) and Time (column H)
      const dateObj = row[0];
      const timeObj = row[7];

      const checkOutTime = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        timeObj.getHours(),
        timeObj.getMinutes(),
        timeObj.getSeconds()
      );

      const minutesOut = Math.floor((now - checkOutTime) / 60000);

      // If over max time, auto check-in
      if (minutesOut >= maxMinutes) {
        Logger.log(
          "Auto checking in pass: " + row[1] + " (" + minutesOut + " minutes)"
        );

        const checkInTime = now;
        const durationMinutes = maxMinutes; // Cap at max minutes

        const checkOutTimeFormatted = Utilities.formatDate(
          checkOutTime,
          Session.getScriptTimeZone(),
          "h:mm:ss a"
        );
        const checkInTimeFormatted = Utilities.formatDate(
          checkInTime,
          Session.getScriptTimeZone(),
          "h:mm:ss a"
        );
        const dateOnly = Utilities.formatDate(
          checkInTime,
          Session.getScriptTimeZone(),
          "M/d/yyyy"
        );

        // Archive with auto check-in note
        archiveSheet.appendRow([
          dateOnly, // Date
          row[1], // PassID
          row[2], // StudentID
          row[3], // StudentName
          row[4], // RoomFrom
          row[5], // Destination
          row[6], // CustomDestination
          checkOutTimeFormatted, // CheckOutTime
          "IN", // Status
          checkInTimeFormatted, // CheckInTime
          durationMinutes, // DurationMinutes (capped)
          "auto", // CheckInBy
        ]);

        // Remove from active passes
        activeSheet.deleteRow(i + 1);
        checkedInCount++;
      }
    }

    Logger.log("Auto checked in " + checkedInCount + " passes");

    return {
      success: true,
      checkedInCount: checkedInCount,
      maxMinutes: maxMinutes,
    };
  } catch (error) {
    Logger.log("Error in autoCheckInExpiredPasses: " + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}

// ============================================
// GET ROOM LIST
// ============================================

function getRoomList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const configData = configSheet.getDataRange().getValues();

    const roomSet = new Set(); // Use Set to automatically handle duplicates

    // Get all rooms from STAFF entries (column D - index 3)
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === "STAFF" && configData[i][3]) {
        const room = configData[i][3].toString().trim();
        if (room) {
          roomSet.add(room);
        }
      }
    }

    // Convert Set to Array
    const roomsArray = Array.from(roomSet);

    // Separate numeric and non-numeric rooms
    const numericRooms = [];
    const textRooms = [];

    roomsArray.forEach((room) => {
      // Check if room is purely numeric
      if (/^\d+$/.test(room)) {
        numericRooms.push(parseInt(room));
      } else {
        textRooms.push(room);
      }
    });

    // Sort numeric rooms numerically
    numericRooms.sort((a, b) => a - b);

    // Sort text rooms alphabetically
    textRooms.sort();

    // Combine: numeric first, then text
    const sortedRooms = [
      ...numericRooms.map((r) => r.toString()),
      ...textRooms,
    ];

    Logger.log(
      "Found " + sortedRooms.length + " unique rooms: " + sortedRooms.join(", ")
    );

    return {
      success: true,
      rooms: sortedRooms,
    };
  } catch (error) {
    Logger.log("Error getting room list: " + error.toString());
    return {
      success: false,
      error: error.toString(),
      rooms: [],
    };
  }
}

// ============================================
// GET DESTINATION LIST
// ============================================

function getDestinationList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const configData = configSheet.getDataRange().getValues();

    const destinations = [];

    // Get all destinations from Config
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === "DESTINATION" && configData[i][1]) {
        const dest = configData[i][1].toString().trim();
        if (dest) {
          destinations.push(dest);
        }
      }
    }

    Logger.log(
      "Found " +
        destinations.length +
        " destinations: " +
        destinations.join(", ")
    );

    return {
      success: true,
      destinations: destinations,
    };
  } catch (error) {
    Logger.log("Error getting destination list: " + error.toString());
    return {
      success: false,
      error: error.toString(),
      destinations: [],
    };
  }
}

// ============================================
// ROSTER MANAGEMENT
// ============================================

function getStudentName(studentId) {
  const name = getStudentNameFromRoster(studentId);
  return {
    success: name !== null,
    studentName: name,
    studentId: studentId,
  };
}

function getStudentNameFromRoster(studentId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rosterSheet = ss.getSheetByName(SHEET_NAMES.ROSTER);
  const data = rosterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === studentId.toString()) {
      return data[i][1];
    }
  }

  return null;
}

function importRosterCSV(csvData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const rosterSheet = ss.getSheetByName(SHEET_NAMES.ROSTER);

    // Parse CSV
    const rows = Utilities.parseCsv(csvData);

    // Clear existing data (keep headers)
    const lastRow = rosterSheet.getLastRow();
    if (lastRow > 1) {
      rosterSheet.deleteRows(2, lastRow - 1);
    }

    // Check if first row is a header (contains "ID" or "Name")
    const startRow =
      rows[0][0].toLowerCase().includes("id") ||
      rows[0][0].toLowerCase().includes("student") ||
      rows[0][1].toLowerCase().includes("name")
        ? 1
        : 0;

    let importedCount = 0;

    // Import new data
    for (let i = startRow; i < rows.length; i++) {
      // Skip empty rows
      if (!rows[i][0] || rows[i][0].toString().trim() === "") {
        continue;
      }

      const studentId = rows[i][0].toString().trim();
      const studentName = rows[i][1] ? rows[i][1].toString().trim() : "";
      const grade = rows[i][2] ? rows[i][2].toString().trim() : "";
      const email = rows[i][3] ? rows[i][3].toString().trim() : ""; // Optional email

      // Validate student ID (should be 6 digits)
      if (studentId.length !== 6 || isNaN(studentId)) {
        Logger.log("Skipping invalid student ID: " + studentId);
        continue;
      }

      // Validate student name
      if (!studentName || studentName === "") {
        Logger.log("Skipping student with no name: ID " + studentId);
        continue;
      }

      // Append row with Active automatically set to TRUE
      // Format: StudentID, StudentName, Grade, Active, Email
      rosterSheet.appendRow([
        studentId,
        studentName,
        grade,
        "TRUE", // Active column automatically set to TRUE
        email,
      ]);

      importedCount++;
    }

    return {
      success: true,
      importedCount: importedCount,
      message: `Successfully imported ${importedCount} students.\nAll students set to Active.`,
    };
  } catch (error) {
    Logger.log("Import error: " + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}

// ============================================
// EXPORT & REPORTING
// ============================================

function exportArchiveData(startDate, endDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARCHIVE);
  const data = archiveSheet.getDataRange().getValues();

  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date();

  const filtered = [];
  filtered.push(data[0]); // Headers

  for (let i = 1; i < data.length; i++) {
    const checkOutTime = new Date(data[i][6]);
    if (checkOutTime >= start && checkOutTime <= end) {
      filtered.push(data[i]);
    }
  }

  return {
    success: true,
    data: filtered,
    count: filtered.length - 1,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generatePassId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `PASS-${timestamp}-${random}`;
}

function findActivePassByStudentId(studentId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const activeSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE);
  const data = activeSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    // StudentID is now column C (index 2), not column A
    if (data[i][2].toString() === studentId.toString()) {
      return {
        passId: data[i][1], // PassID from column B
        destination: data[i][5], // Destination from column F
        checkOutTime: data[i][0] + " " + data[i][7], // Date + Time
      };
    }
  }

  return null;
}

function logActivity(action, studentId, studentName, room, destination) {
  // Optional: Create a separate activity log sheet
  Logger.log(
    `${action}: ${studentName} (${studentId}) - ${room} to ${destination}`
  );
}

// ============================================
// GET TODAY'S PASSES (Active + Archived)
// ============================================

function getTodayPasses(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const activeSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE);
    const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARCHIVE);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const allPasses = [];

    // Get active passes
    const activeData = activeSheet.getDataRange().getValues();
    for (let i = 1; i < activeData.length; i++) {
      const row = activeData[i];
      if (!row[1]) continue; // Skip if no PassID

      const dateObj = row[0];
      const timeObj = row[7];

      const fullDateTime = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        timeObj.getHours(),
        timeObj.getMinutes(),
        timeObj.getSeconds()
      );

      if (fullDateTime >= todayStart && fullDateTime <= todayEnd) {
        allPasses.push({
          id: row[1],
          studentId: row[2],
          studentName: row[3],
          roomFrom: row[4],
          destination: row[5],
          customDestination: row[6],
          checkOutTime: fullDateTime.toISOString(),
          checkInTime: null,
          duration: null,
          status: "OUT",
        });
      }
    }

    // Get archived passes from today
    const archiveData = archiveSheet.getDataRange().getValues();
    for (let i = 1; i < archiveData.length; i++) {
      const row = archiveData[i];
      if (!row[1]) continue; // Skip if no PassID

      const dateObj = row[0];
      const timeObj = row[7];

      const checkOutTime = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        timeObj.getHours(),
        timeObj.getMinutes(),
        timeObj.getSeconds()
      );

      if (checkOutTime >= todayStart && checkOutTime <= todayEnd) {
        // Parse check-in time if available
        let checkInTime = null;
        if (row[9]) {
          // CheckInTime column
          // CheckInTime is stored as a time string, combine with today's date
          const checkInTimeStr = row[9];
          checkInTime = new Date(
            dateObj.getFullYear(),
            dateObj.getMonth(),
            dateObj.getDate()
          );

          // If row[9] is a Date object (time from 1899)
          if (row[9] instanceof Date) {
            checkInTime.setHours(
              row[9].getHours(),
              row[9].getMinutes(),
              row[9].getSeconds()
            );
          } else {
            // If it's a string, try to parse it
            const timeParts = checkInTimeStr.match(
              /(\d+):(\d+):(\d+)\s*(AM|PM)/i
            );
            if (timeParts) {
              let hours = parseInt(timeParts[1]);
              const minutes = parseInt(timeParts[2]);
              const seconds = parseInt(timeParts[3]);
              const isPM = timeParts[4].toUpperCase() === "PM";

              if (isPM && hours !== 12) hours += 12;
              if (!isPM && hours === 12) hours = 0;

              checkInTime.setHours(hours, minutes, seconds);
            }
          }
        }

        allPasses.push({
          id: row[1],
          studentId: row[2],
          studentName: row[3],
          roomFrom: row[4],
          destination: row[5],
          customDestination: row[6],
          checkOutTime: checkOutTime.toISOString(),
          checkInTime: checkInTime ? checkInTime.toISOString() : null,
          duration: row[10] || null, // DurationMinutes
          status: "IN",
        });
      }
    }

    // Sort by checkout time (most recent first)
    allPasses.sort(
      (a, b) => new Date(b.checkOutTime) - new Date(a.checkOutTime)
    );

    Logger.log("Returning " + allPasses.length + " passes for today");

    return {
      success: true,
      passes: allPasses,
      count: allPasses.length,
    };
  } catch (error) {
    Logger.log("Error in getTodayPasses: " + error.toString());
    return {
      success: false,
      error: error.toString(),
      passes: [],
    };
  }
}

// ============================================
// TESTING FUNCTIONS (Remove in production)
// ============================================

function testCheckOut() {
  const result = handleCheckOut({
    studentId: "123456",
    destination: "restroom",
    roomFrom: "101",
    customDestination: null,
  });
  Logger.log(result);
}

function testGetActivePasses() {
  const result = getActivePasses({});
  Logger.log(result);
}

function testAnalytics() {
  const result = getAnalytics(30);
  Logger.log(result);
}

// ============================================
// UPDATE ARCHIVED PASS
// ============================================

function updateArchivedPass(params) {
  const { passId, roomFrom, destination, checkOutTime, checkInTime } = params;

  Logger.log("Updating archived pass: " + passId);

  if (!passId) {
    return { success: false, error: "Pass ID is required" };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARCHIVE);

  // Find the pass in Archive
  const archiveData = archiveSheet.getDataRange().getValues();
  let passRow = -1;

  for (let i = 1; i < archiveData.length; i++) {
    if (String(archiveData[i][1]) === String(passId)) {
      // PassID is column B (index 1)
      passRow = i + 1; // Spreadsheet rows are 1-indexed
      break;
    }
  }

  if (passRow === -1) {
    Logger.log("Pass not found in Archive: " + passId);
    return { success: false, error: "Pass not found in archive" };
  }

  Logger.log("Found pass at row: " + passRow);

  // Parse the new times
  const newCheckOutTime = new Date(checkOutTime);
  const newCheckInTime = checkInTime ? new Date(checkInTime) : null;

  // Calculate new duration if both times provided
  let durationMinutes = null;
  if (newCheckInTime) {
    durationMinutes = Math.round((newCheckInTime - newCheckOutTime) / 60000);
  }

  // Format times for storage
  const checkOutTimeFormatted = Utilities.formatDate(
    newCheckOutTime,
    Session.getScriptTimeZone(),
    "h:mm:ss a"
  );
  const checkInTimeFormatted = newCheckInTime
    ? Utilities.formatDate(
        newCheckInTime,
        Session.getScriptTimeZone(),
        "h:mm:ss a"
      )
    : "";
  const dateOnly = Utilities.formatDate(
    newCheckOutTime,
    Session.getScriptTimeZone(),
    "M/d/yyyy"
  );

  // Update the row
  // Archive columns: Date | PassID | StudentID | StudentName | RoomFrom | Destination | CustomDestination | CheckOutTime | Status | CheckInTime | DurationMinutes | CheckInBy
  archiveSheet.getRange(passRow, 1).setValue(dateOnly); // Column A: Date
  archiveSheet.getRange(passRow, 5).setValue(roomFrom); // Column E: RoomFrom
  archiveSheet.getRange(passRow, 6).setValue(destination); // Column F: Destination
  archiveSheet.getRange(passRow, 8).setValue(checkOutTimeFormatted); // Column H: CheckOutTime

  if (newCheckInTime) {
    archiveSheet.getRange(passRow, 10).setValue(checkInTimeFormatted); // Column J: CheckInTime
    archiveSheet.getRange(passRow, 11).setValue(durationMinutes); // Column K: DurationMinutes
  }

  Logger.log("Pass updated successfully");

  return {
    success: true,
    message: "Pass updated successfully",
    passId: passId,
    checkOutTime: newCheckOutTime.toISOString(),
    checkInTime: newCheckInTime ? newCheckInTime.toISOString() : null,
    duration: durationMinutes,
  };
}

// ============================================
// GET STAFF DROPDOWN LIST (with caching)
// ============================================

function getStaffDropdownList() {
  try {
    const cache = CacheService.getScriptCache();

    // Try to get from cache first
    const cached = cache.get("staffDropdownList");
    if (cached) {
      Logger.log("Returning cached staff dropdown list");
      return JSON.parse(cached);
    }

    // If not in cache, get from sheet
    Logger.log("Cache miss - loading from sheet");
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const configData = configSheet.getDataRange().getValues();

    const staffList = [];

    // Get all staff from column E (Dropdown) where Type=STAFF
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === "STAFF" && configData[i][4]) {
        // Column E is index 4
        const dropdownValue = configData[i][4].toString().trim();
        if (dropdownValue) {
          staffList.push(dropdownValue);
        }
      }
    }

    // Sort alphabetically
    staffList.sort();

    Logger.log("Found " + staffList.length + " staff members");

    const result = {
      success: true,
      staffList: staffList,
      count: staffList.length,
      cached: false,
    };

    // Cache for 6 hours (21600 seconds)
    cache.put("staffDropdownList", JSON.stringify(result), 21600);

    return result;
  } catch (error) {
    Logger.log("Error getting staff dropdown list: " + error.toString());
    return {
      success: false,
      error: error.toString(),
      staffList: [],
    };
  }
}

// ============================================
// REFRESH STAFF DROPDOWN CACHE
// ============================================

function refreshStaffDropdownCache() {
  try {
    const cache = CacheService.getScriptCache();

    // Clear the cache
    cache.remove("staffDropdownList");
    Logger.log("Cache cleared");

    // Reload and cache
    const result = getStaffDropdownList();

    // Show success message in spreadsheet
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "Cache Refreshed",
      "Staff dropdown list updated successfully!\n\n" +
        "Found " +
        result.count +
        " staff members.",
      ui.ButtonSet.OK
    );

    return {
      success: true,
      message: "Cache refreshed successfully",
      count: result.count,
    };
  } catch (error) {
    Logger.log("Error refreshing cache: " + error.toString());

    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "Error",
      "Failed to refresh cache: " + error.toString(),
      ui.ButtonSet.OK
    );

    return {
      success: false,
      error: error.toString(),
    };
  }
}
