// ============================================
// ADMIN INTERFACE HELPER FUNCTIONS
// Add this as a new file in Apps Script: AdminHelpers.gs
// ============================================

/**
 * Display the admin interface
 */
function showAdminInterface() {
  const html = HtmlService.createHtmlOutputFromFile('AdminInterface')
    .setTitle('Hall Pass Admin Panel')
    .setWidth(1200)
    .setHeight(800);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Hall Pass System - Admin Panel');
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

function getDashboardStats() {

  // Total students
  const rosterSheet = SS.getSheetByName(SHEET_NAMES.ROSTER);
  const rosterData = rosterSheet.getDataRange().getValues();
  const totalStudents = rosterData.length - 1; // Exclude header
  
  // Active passes
  const activeSheet = SS.getSheetByName(SHEET_NAMES.ACTIVE);
  const activeData = activeSheet.getDataRange().getValues();
  const activePasses = activeData.length - 1;
  
  // Today's passes (from archive)
  const archiveSheet = SS.getSheetByName(SHEET_NAMES.ARCHIVE);
  const archiveData = archiveSheet.getDataRange().getValues();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let todayPasses = 0;
  let monthPasses = 0;
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  for (let i = 1; i < archiveData.length; i++) {
    const passDate = new Date(archiveData[i][6]); // CheckOutTime column
    
    if (passDate >= today) {
      todayPasses++;
    }
    
    if (passDate >= monthStart) {
      monthPasses++;
    }
  }
  
  return {
    totalStudents: totalStudents,
    activePasses: activePasses,
    todayPasses: todayPasses,
    monthPasses: monthPasses,
    lastUpdated: new Date().toISOString()
  };
}

// ============================================
// STUDENT MANAGEMENT
// ============================================

function addNewStudent(studentId, studentName, grade) {
  try {
    const rosterSheet = SS.getSheetByName(SHEET_NAMES.ROSTER);
    
    // Check if student ID already exists
    const data = rosterSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === studentId.toString()) {
        return {
          success: false,
          error: 'Student ID already exists'
        };
      }
    }
    
    // Add new student
    rosterSheet.appendRow([studentId, studentName, grade, 'TRUE', '']);
    
    return {
      success: true,
      message: `Added ${studentName} (${studentId}) successfully`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function getRosterData() {
  const rosterSheet = SS.getSheetByName(SHEET_NAMES.ROSTER);
  const data = rosterSheet.getDataRange().getValues();
  
  const roster = [];
  for (let i = 1; i < data.length; i++) {
    roster.push({
      studentId: data[i][0],
      studentName: data[i][1],
      grade: data[i][2],
      active: data[i][3],
      email: data[i][4] || ''
    });
  }
  
  return {
    success: true,
    roster: roster,
    count: roster.length
  };
}

function updateStudent(studentId, updates) {
  try {
    const rosterSheet = SS.getSheetByName(SHEET_NAMES.ROSTER);
    const data = rosterSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === studentId.toString()) {
        if (updates.studentName) rosterSheet.getRange(i + 1, 2).setValue(updates.studentName);
        if (updates.grade) rosterSheet.getRange(i + 1, 3).setValue(updates.grade);
        if (updates.active !== undefined) rosterSheet.getRange(i + 1, 4).setValue(updates.active);
        if (updates.email) rosterSheet.getRange(i + 1, 5).setValue(updates.email);
        
        return {
          success: true,
          message: 'Student updated successfully'
        };
      }
    }
    
    return {
      success: false,
      error: 'Student not found'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function deleteStudent(studentId) {
  try {
    const rosterSheet = SS.getSheetByName(SHEET_NAMES.ROSTER);
    const data = rosterSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === studentId.toString()) {
        rosterSheet.deleteRow(i + 1);
        return {
          success: true,
          message: 'Student deleted successfully'
        };
      }
    }
    
    return {
      success: false,
      error: 'Student not found'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// STAFF MANAGEMENT
// ============================================

function addStaffMember(email, role, room = null) {
  try {
    const configSheet = SS.getSheetByName(SHEET_NAMES.CONFIG);
    
    // Check if staff member already exists
    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'STAFF' && data[i][1] === email) {
        return {
          success: false,
          error: 'Staff member already exists'
        };
      }
    }
    
    // Add new staff member
    configSheet.appendRow(['STAFF', email, role, room || '']);
    
    return {
      success: true,
      message: `Added ${email} as ${role}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function getStaffList() {
  const configSheet = SS.getSheetByName(SHEET_NAMES.CONFIG);
  const data = configSheet.getDataRange().getValues();
  
  const staff = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'STAFF') {
      staff.push({
        email: data[i][1],
        role: data[i][2],
        room: data[i][3] || null
      });
    }
  }
  
  return {
    success: true,
    staff: staff,
    count: staff.length
  };
}

function removeStaffMember(email) {
  try {
    const configSheet = SS.getSheetByName(SHEET_NAMES.CONFIG);
    const data = configSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'STAFF' && data[i][1] === email) {
        configSheet.deleteRow(i + 1);
        return {
          success: true,
          message: 'Staff member removed successfully'
        };
      }
    }
    
    return {
      success: false,
      error: 'Staff member not found'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

function generateCustomReport(reportType, startDate, endDate) {
  const archiveSheet = SS.getSheetByName(SHEET_NAMES.ARCHIVE);
  const data = archiveSheet.getDataRange().getValues();
  
  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date();
  
  const filtered = [];
  const stats = {
    totalPasses: 0,
    averageDuration: 0,
    destinations: {},
    rooms: {},
    students: {}
  };
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const checkOutTime = new Date(row[6]);
    
    if (checkOutTime >= start && checkOutTime <= end) {
      filtered.push(row);
      stats.totalPasses++;
      
      // Count destinations
      const dest = row[4];
      stats.destinations[dest] = (stats.destinations[dest] || 0) + 1;
      
      // Count rooms
      const room = row[3];
      stats.rooms[room] = (stats.rooms[room] || 0) + 1;
      
      // Count student passes
      const studentId = row[1];
      stats.students[studentId] = (stats.students[studentId] || 0) + 1;
      
      // Add to average duration
      stats.averageDuration += row[9] || 0;
    }
  }
  
  if (stats.totalPasses > 0) {
    stats.averageDuration = Math.round(stats.averageDuration / stats.totalPasses);
  }
  
  return {
    success: true,
    reportType: reportType,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString()
    },
    statistics: stats,
    data: filtered
  };
}

function getFrequentPassUsers(days = 30, threshold = 10) {
  const analytics = getAnalytics(days);
  
  if (!analytics.success) {
    return analytics;
  }
  
  const frequent = analytics.frequentUsers.filter(user => user.count >= threshold);
  
  return {
    success: true,
    users: frequent,
    threshold: threshold,
    days: days
  };
}

function getStudentDetailedReport(studentId, days = 30) {
  const archiveSheet = SS.getSheetByName(SHEET_NAMES.ARCHIVE);
  const data = archiveSheet.getDataRange().getValues();
  
  const now = new Date();
  const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const passes = [];
  const destinations = {};
  let totalDuration = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1].toString() === studentId.toString()) {
      const checkOutTime = new Date(row[6]);
      
      if (checkOutTime >= startDate) {
        passes.push({
          date: checkOutTime.toISOString(),
          roomFrom: row[3],
          destination: row[4],
          duration: row[9],
          checkInBy: row[10]
        });
        
        destinations[row[4]] = (destinations[row[4]] || 0) + 1;
        totalDuration += row[9] || 0;
      }
    }
  }
  
  return {
    success: true,
    studentId: studentId,
    studentName: getStudentNameFromRoster(studentId),
    totalPasses: passes.length,
    averageDuration: passes.length > 0 ? Math.round(totalDuration / passes.length) : 0,
    destinations: destinations,
    passes: passes
  };
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportTodayData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return exportArchiveData(today.toISOString(), tomorrow.toISOString());
}

function exportWeekData() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  return exportArchiveData(weekAgo.toISOString(), today.toISOString());
}

function exportMonthData() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  return exportArchiveData(monthStart.toISOString(), today.toISOString());
}

// ============================================
// SYSTEM SETTINGS
// ============================================

function getSystemSettings() {
  const configSheet = SS.getSheetByName(SHEET_NAMES.CONFIG);
  const data = configSheet.getDataRange().getValues();
  
  const settings = {};
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'SETTING') {
      settings[data[i][1]] = data[i][2];
    }
  }
  
  return {
    success: true,
    settings: settings
  };
}

function updateSystemSetting(settingName, value) {
  try {
    const configSheet = SS.getSheetByName(SHEET_NAMES.CONFIG);
    const data = configSheet.getDataRange().getValues();
    
    // Check if setting exists
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'SETTING' && data[i][1] === settingName) {
        configSheet.getRange(i + 1, 3).setValue(value);
        return {
          success: true,
          message: 'Setting updated successfully'
        };
      }
    }
    
    // If not found, add new setting
    configSheet.appendRow(['SETTING', settingName, value, '']);
    
    return {
      success: true,
      message: 'Setting added successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// MAINTENANCE FUNCTIONS
// ============================================

function archiveDataByDate(beforeDate) {
  try {
    const archiveSheet = SS.getSheetByName(SHEET_NAMES.ARCHIVE);
    
    // Create new archive sheet with timestamp
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const newSheetName = `Archive_${timestamp}`;
    
    const newSheet = SS.insertSheet(newSheetName);
    
    // Copy data older than specified date
    const data = archiveSheet.getDataRange().getValues();
    const cutoffDate = new Date(beforeDate);
    
    const archived = [data[0]]; // Headers
    const remaining = [data[0]]; // Headers
    
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][6]);
      if (rowDate < cutoffDate) {
        archived.push(data[i]);
      } else {
        remaining.push(data[i]);
      }
    }
    
    // Write archived data to new sheet
    if (archived.length > 1) {
      newSheet.getRange(1, 1, archived.length, archived[0].length).setValues(archived);
    }
    
    // Clear and rewrite remaining data
    archiveSheet.clear();
    if (remaining.length > 0) {
      archiveSheet.getRange(1, 1, remaining.length, remaining[0].length).setValues(remaining);
    }
    
    return {
      success: true,
      archivedCount: archived.length - 1,
      newSheetName: newSheetName,
      message: `Archived ${archived.length - 1} records to ${newSheetName}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function getSystemHealthCheck() {
  
  const health = {
    sheetsPresent: true,
    rosterCount: 0,
    activeCount: 0,
    archiveCount: 0,
    staffCount: 0,
    errors: []
  };
  
  try {
    // Check all sheets exist
    const requiredSheets = ['StudentRoster', 'ActivePasses', 'Archive', 'Config'];
    requiredSheets.forEach(sheetName => {
      if (!SS.getSheetByName(sheetName)) {
        health.sheetsPresent = false;
        health.errors.push(`Missing sheet: ${sheetName}`);
      }
    });
    
    // Count records
    if (health.sheetsPresent) {
      health.rosterCount = SS.getSheetByName('StudentRoster').getLastRow() - 1;
      health.activeCount = SS.getSheetByName('ActivePasses').getLastRow() - 1;
      health.archiveCount = SS.getSheetByName('Archive').getLastRow() - 1;
      
      const configData = SS.getSheetByName('Config').getDataRange().getValues();
      health.staffCount = configData.filter(row => row[0] === 'STAFF').length;
    }
    
    // Check for any passes that have been out too long
    const activeSheet = SS.getSheetByName('ActivePasses');
    const activeData = activeSheet.getDataRange().getValues();
    const now = new Date();
    
    for (let i = 1; i < activeData.length; i++) {
      const checkOutTime = new Date(activeData[i][6]);
      const minutes = Math.floor((now - checkOutTime) / 60000);
      
      if (minutes > 60) {
        health.errors.push(`${activeData[i][2]} has been out for ${minutes} minutes`);
      }
    }
    
    return {
      success: true,
      health: health,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function createBackup() {
  try {
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
    
    // Create a copy of the spreadsheet
    const backup = SS.copy(`Hall Pass Backup - ${timestamp}`);
    
    return {
      success: true,
      backupId: backup.getId(),
      backupUrl: backup.getUrl(),
      message: `Backup created: ${backup.getName()}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function showHealthCheck() {
  const health = getSystemHealthCheck();
  
  if (health.success) {
    let message = 'SYSTEM HEALTH CHECK\n\n';
    message += `✓ Sheets Present: ${health.health.sheetsPresent}\n`;
    message += `✓ Students in Roster: ${health.health.rosterCount}\n`;
    message += `✓ Active Passes: ${health.health.activeCount}\n`;
    message += `✓ Archived Passes: ${health.health.archiveCount}\n`;
    message += `✓ Staff Members: ${health.health.staffCount}\n\n`;
    
    if (health.health.errors.length > 0) {
      message += 'WARNINGS:\n';
      health.health.errors.forEach(err => {
        message += `⚠ ${err}\n`;
      });
    } else {
      message += '✓ No issues detected';
    }
    
    SpreadsheetApp.getUi().alert('System Health', message, SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('Error', health.error, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function exportArchiveToPDF(startDateStr, endDateStr) {
  try {
    // Parse MM-DD-YYYY format
    const parseDate = (dateStr) => {
      const parts = dateStr.split('-');
      return new Date(parts[2], parts[0] - 1, parts[1], 0, 0, 0); // year, month (0-indexed), day
    };
    
    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);
    
    // Make end date inclusive (end of day)
    endDate.setHours(23, 59, 59, 999);
    
    Logger.log('Exporting from ' + startDate + ' to ' + endDate);
    
    const archiveSheet = SS.getSheetByName(SHEET_NAMES.ARCHIVE);
    const data = archiveSheet.getDataRange().getValues();
    
    // Filter data by date range (inclusive)
    const filtered = [data[0]]; // Headers
    
    for (let i = 1; i < data.length; i++) {
      // Date is now in column A (index 0), CheckOutTime in column H (index 7)
      // Both are Date objects, so we need to combine them properly
      const dateObj = data[i][0];  // Date object with the date
      const timeObj = data[i][7];  // Date object with the time (from 1899)
      
      // Combine date from column A with time from column H
      const checkOutTime = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        timeObj.getHours(),
        timeObj.getMinutes(),
        timeObj.getSeconds()
      );
      
      Logger.log('Row ' + i + ': CheckOutTime = ' + checkOutTime);
      
      if (checkOutTime >= startDate && checkOutTime <= endDate) {
        filtered.push(data[i]);
        Logger.log('  ✓ Included');
      } else {
        Logger.log('  ✗ Excluded (outside date range)');
      }
    }
    
    if (filtered.length === 1) {
      return {
        success: false,
        error: 'No data found for the specified date range'
      };
    }
    
    // Create temporary sheet for export
    const tempSheetName = 'Export_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM-dd-yyyy_HHmmss');
    const tempSheet = SS.insertSheet(tempSheetName);
    
    // Write filtered data
    tempSheet.getRange(1, 1, filtered.length, filtered[0].length).setValues(filtered);
    
    // Format the CheckOutTime (column H = 8) and CheckInTime (column J = 10) columns as time-only
    if (filtered.length > 1) {
      // Format column H (CheckOutTime) - index 8
      tempSheet.getRange(2, 8, filtered.length - 1, 1).setNumberFormat('h:mm:ss AM/PM');
      
      // Format column J (CheckInTime) - index 10
      tempSheet.getRange(2, 10, filtered.length - 1, 1).setNumberFormat('h:mm:ss AM/PM');
    }
    
    // Format the sheet
    const headerRange = tempSheet.getRange(1, 1, 1, filtered[0].length);
    headerRange.setBackground('#00008b')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setWrap(true);
    
    // Auto-resize columns
    for (let i = 1; i <= filtered[0].length; i++) {
      tempSheet.autoResizeColumn(i);
    }
    
    // Freeze header row
    tempSheet.setFrozenRows(1);
    
    // Add title and date range
    tempSheet.insertRowBefore(1);
    tempSheet.getRange(1, 1, 1, filtered[0].length).merge();
    tempSheet.getRange(1, 1).setValue('Hall Pass Archive Export')
      .setFontSize(14)
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    
    tempSheet.insertRowBefore(2);
    tempSheet.getRange(2, 1, 1, filtered[0].length).merge();
    tempSheet.getRange(2, 1).setValue('Date Range: ' + startDateStr + ' to ' + endDateStr)
      .setFontSize(10)
      .setFontStyle('italic')
      .setHorizontalAlignment('center');
    
    tempSheet.insertRowBefore(3);
    tempSheet.getRange(3, 1, 1, filtered[0].length).merge();
    tempSheet.getRange(3, 1).setValue('Generated: ' + new Date().toLocaleString())
      .setFontSize(10)
      .setFontStyle('italic')
      .setHorizontalAlignment('center');
    
    tempSheet.insertRowBefore(4); // Blank row
    
    // Create PDF
    const url = 'https://docs.google.com/spreadsheets/d/' + SS.getId() + '/export?format=pdf&gid=' + tempSheet.getSheetId() +
      '&portrait=false' + // Landscape
      '&fitw=true' + // Fit to width
      '&gridlines=true' + // Show gridlines
      '&printtitle=false' +
      '&sheetnames=false' +
      '&pagenum=UNDEFINED' +
      '&attachment=true';
    
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    const pdfBlob = response.getBlob();
    const base64Data = Utilities.base64Encode(pdfBlob.getBytes());
    
    // Delete temporary sheet
    SS.deleteSheet(tempSheet);
    
    return {
      success: true,
      message: 'PDF generated successfully!',
      recordCount: filtered.length - 1,
      fileName: 'HallPass_Export_' + startDateStr + '_to_' + endDateStr + '.pdf',
      pdfData: base64Data
    };
    
  } catch (error) {
    Logger.log('Error exporting to PDF: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}
