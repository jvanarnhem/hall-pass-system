// ============================================
// SETUP SCRIPT - RUN ONCE TO INITIALIZE
// ============================================

/**
 * Run this function ONCE to set up your spreadsheet
 * with the correct structure and initial data
 */
function initialSetup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log('Checking if setup has already been run...');

  // Check if sheets already exist
  const requiredSheets = ['StudentRoster', 'ActivePasses', 'Archive', 'Config'];
  const existingSheets = [];

  requiredSheets.forEach(sheetName => {
    if (ss.getSheetByName(sheetName)) {
      existingSheets.push(sheetName);
    }
  });

  // If any sheets exist, warn the user
  if (existingSheets.length > 0) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '⚠️ Setup Already Complete',
      'The following sheets already exist:\n\n' + existingSheets.join(', ') + '\n\n' +
      'Running setup again will DELETE ALL DATA in these sheets!\n\n' +
      'Are you ABSOLUTELY SURE you want to continue?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      ui.alert('Setup Cancelled', 'No changes were made.', ui.ButtonSet.OK);
      return;
    }

    // Double confirmation for safety
    const finalResponse = ui.alert(
      '⚠️ FINAL WARNING',
      'This will permanently delete:\n' +
      '- All student records\n' +
      '- All active passes\n' +
      '- All historical data\n' +
      '- All staff configurations\n\n' +
      'This CANNOT be undone!\n\n' +
      'Type YES in the next dialog to proceed.',
      ui.ButtonSet.OK_CANCEL
    );

    if (finalResponse !== ui.Button.OK) {
      ui.alert('Setup Cancelled', 'No changes were made.', ui.ButtonSet.OK);
      return;
    }
  }

  Logger.log('Starting initial setup...');

  // Create all required sheets
  createStudentRosterSheet(ss);
  createActivePassesSheet(ss);
  createArchiveSheet(ss);
  createConfigSheet(ss);

  Logger.log('Setup complete!');

  // Show completion message
  SpreadsheetApp.getUi().alert(
    'Setup Complete!',
    'All sheets have been created.\n\n' +
    'Next steps:\n' +
    '1. Add staff emails in the Config sheet\n' +
    '2. Import your student roster CSV\n' +
    '3. Update frontend with your web app URL (if needed)\n\n' +
    '✅ Your system is ready to use!',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function createActivePassesSheet(ss) {
  let sheet = ss.getSheetByName('ActivePasses');

  if (sheet) {
    ss.deleteSheet(sheet);
  }

  sheet = ss.insertSheet('ActivePasses');

  const headers = [
    ['Date', 'PassID', 'StudentID', 'StudentName', 'RoomFrom', 'Destination', 'CustomDestination', 'CheckOutTime', 'Status']
  ];

  sheet.getRange(1, 1, 1, 9).setValues(headers);

  sheet.getRange(1, 1, 1, 9)
    .setBackground('#34a853')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Set column widths
  sheet.setColumnWidth(1, 100);  // Date
  sheet.setColumnWidth(2, 150);  // PassID
  sheet.setColumnWidth(3, 100);  // StudentID
  sheet.setColumnWidth(4, 180);  // StudentName
  sheet.setColumnWidth(5, 100);  // RoomFrom
  sheet.setColumnWidth(6, 120);  // Destination
  sheet.setColumnWidth(7, 150);  // CustomDestination
  sheet.setColumnWidth(8, 120);  // CheckOutTime
  sheet.setColumnWidth(9, 80);   // Status

  sheet.setFrozenRows(1);

  Logger.log('Created ActivePasses sheet');
}

function createArchiveSheet(ss) {
  let sheet = ss.getSheetByName('Archive');

  if (sheet) {
    ss.deleteSheet(sheet);
  }

  sheet = ss.insertSheet('Archive');

  const headers = [
    ['Date', 'PassID', 'StudentID', 'StudentName', 'RoomFrom', 'Destination', 'CustomDestination',
      'CheckOutTime', 'Status', 'CheckInTime', 'DurationMinutes', 'CheckInBy']
  ];

  sheet.getRange(1, 1, 1, 12).setValues(headers);

  sheet.getRange(1, 1, 1, 12)
    .setBackground('#fbbc04')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Set column widths
  sheet.setColumnWidth(1, 100);  // Date
  sheet.setColumnWidth(2, 150);  // PassID
  sheet.setColumnWidth(3, 100);  // StudentID
  sheet.setColumnWidth(4, 180);  // StudentName
  sheet.setColumnWidth(5, 100);  // RoomFrom
  sheet.setColumnWidth(6, 120);  // Destination
  sheet.setColumnWidth(7, 150);  // CustomDestination
  sheet.setColumnWidth(8, 120);  // CheckOutTime
  sheet.setColumnWidth(9, 80);   // Status
  sheet.setColumnWidth(10, 120); // CheckInTime
  sheet.setColumnWidth(11, 120); // DurationMinutes
  sheet.setColumnWidth(12, 200); // CheckInBy

  sheet.setFrozenRows(1);

  Logger.log('Created Archive sheet');
}

function createConfigSheet(ss) {
  let sheet = ss.getSheetByName('Config');

  if (sheet) {
    ss.deleteSheet(sheet);
  }

  sheet = ss.insertSheet('Config');

  const headers = [
    ['Type', 'Email/Setting', 'Role/Value', 'Room/Extra', 'Dropdown']
  ];

  sheet.getRange(1, 1, 1, 5).setValues(headers);  // Change to 5 columns

  sheet.getRange(1, 1, 1, 5)  // Change to 5
    .setBackground('#ea4335')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Add sample configuration
  const sampleConfig = [
    ['STAFF', 'admin@ofcs.net', 'admin', '', 'Admin'],
    ['STAFF', 'teacher1@ofcs.net', 'teacher', '101', 'Teacher1 (101)'],
    ['STAFF', 'teacher2@ofcs.net', 'teacher', '102', 'Teacher2 (102)'],
    ['', '', '', ''],
    ['SETTING', 'SCHOOL_NAME', 'Olmsted Falls High School', ''],
    ['SETTING', 'SCHOOL_YEAR', '2024-2025', ''],
    ['SETTING', 'MAX_CHECKOUT_MINUTES', '46', ''],
    ['SETTING', 'CHECKOUT_ENABLED', 'TRUE', ''],
    ['SETTING', 'DAY_END', '2:46 PM (EST)', ''],
    ['SETTING', 'SETTINGS_VERSION', '1', ''],
    ['DESTINATION', 'Restroom', '', ''],
    ['DESTINATION', 'Nurse', '', ''],
    ['DESTINATION', 'Guidance', '', ''],
    ['DESTINATION', 'Other', '', ''],
  ];

  sheet.getRange(2, 1, sampleConfig.length, 5).setValues(sampleConfig);

  // Set column widths
  sheet.setColumnWidth(1, 100);  // Type
  sheet.setColumnWidth(2, 250);  // Email/Setting
  sheet.setColumnWidth(3, 150);  // Role/Value
  sheet.setColumnWidth(4, 100);  // Room/Extra
  sheet.setColumnWidth(5, 200);  // Dropdown (ADD THIS)

  sheet.setFrozenRows(1);

  // Add instructions
  const instructions = [
    [''],
    ['INSTRUCTIONS:'],
    ['1. Add staff emails with Type=STAFF'],
    ['2. Role should be "admin" or "teacher"'],
    ['3. For teachers, specify their room number'],
    ['4. Add settings with Type=SETTING as needed'],
  ];

  sheet.getRange(sampleConfig.length + 3, 1, instructions.length, 1).setValues(instructions);

  Logger.log('Created Config sheet');
}

function createStudentRosterSheet(ss) {
  let sheet = ss.getSheetByName('StudentRoster');

  if (sheet) {
    ss.deleteSheet(sheet);
  }

  sheet = ss.insertSheet('StudentRoster');

  const headers = [
    ['StudentID', 'StudentName', 'Grade', 'Active', 'Email (Optional)']
  ];

  sheet.getRange(1, 1, 1, 5).setValues(headers);

  sheet.getRange(1, 1, 1, 5)
    .setBackground('#4285f4')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Set column widths
  sheet.setColumnWidth(1, 100);  // StudentID
  sheet.setColumnWidth(2, 200);  // StudentName
  sheet.setColumnWidth(3, 80);   // Grade
  sheet.setColumnWidth(4, 80);   // Active
  sheet.setColumnWidth(5, 200);  // Email

  sheet.setFrozenRows(1);

  // Add sample data
  const sampleData = [
    ['123456', 'Sample Student', '9', 'TRUE', 'student@ofcs.net'],
    ['234567', 'Another Student', '10', 'TRUE', ''],
  ];

  sheet.getRange(2, 1, sampleData.length, 5).setValues(sampleData);

  Logger.log('Created StudentRoster sheet');
}

// ============================================
// CSV IMPORT HELPER
// ============================================

/**
 * Create a menu in the spreadsheet for easy access
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Hall Pass System')
    .addItem('📥 Import Student Roster CSV', 'showImportDialog')
    .addItem('📤 Export Archive Data', 'showExportDialog')
    .addSeparator()
    .addItem('👥 View Active Passes', 'showActivePasses')
    .addItem('📊 Generate Analytics Report', 'generateAnalyticsReport')
    .addSeparator()
    .addItem('📧 Email Room Links', 'showEmailLinksDialog')
    .addItem('🔄 Refresh Staff Dropdown Cache', 'refreshStaffDropdownCache')
    .addSeparator()
    .addItem('✅ Enable Checkouts', 'enableCheckouts')
    .addItem('⛔ Disable Checkouts', 'disableCheckouts')
    .addSeparator()
    .addItem('💾 Create Backup', 'createBackup')
    .addItem('🔍 System Health Check', 'showHealthCheck')
    .addToUi();
}

function showImportDialog() {
  const html = HtmlService.createHtmlOutput(
    '<h3>Import Student Roster</h3>' +
    '<p>Upload a CSV file with columns:</p>' +
    '<p><strong>StudentID, StudentName, Grade, Email (optional)</strong></p>' +
    '<p style="font-size: 12px; color: #666;">The Active column will be automatically set to TRUE for all imported students.</p>' +
    '<input type="file" id="csvFile" accept=".csv">' +
    '<br><br>' +
    '<button onclick="importFile()">Import</button>' +
    '<script>' +
    'function importFile() {' +
    '  var file = document.getElementById("csvFile").files[0];' +
    '  var reader = new FileReader();' +
    '  reader.onload = function(e) {' +
    '    google.script.run.processCSVImport(e.target.result);' +
    '    google.script.host.close();' +
    '  };' +
    '  reader.readAsText(file);' +
    '}' +
    '</script>'
  ).setWidth(400).setHeight(250);

  SpreadsheetApp.getUi().showModalDialog(html, 'Import CSV');
}

function processCSVImport(csvContent) {
  const result = importRosterCSV(csvContent);

  if (result.success) {
    SpreadsheetApp.getUi().alert('Success', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('Error', result.error, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showExportDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
      }
      label {
        display: block;
        margin-top: 10px;
        font-weight: bold;
      }
      input {
        width: 100%;
        padding: 8px;
        margin-top: 5px;
        box-sizing: border-box;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      button {
        margin-top: 20px;
        padding: 10px 20px;
        background-color: #00008b;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
      }
      button:hover {
        background-color: #0000cd;
      }
      button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
      .example {
        font-size: 11px;
        color: #666;
        margin-top: 3px;
      }
      .status {
        margin-top: 10px;
        padding: 10px;
        border-radius: 4px;
        display: none;
      }
      .status.success {
        background-color: #d4edda;
        color: #155724;
        display: block;
      }
      .status.error {
        background-color: #f8d7da;
        color: #721c24;
        display: block;
      }
    </style>
    
    <h3>Export Archive Data</h3>
    <p>Export historical hall pass data as a PDF file.</p>
    
    <label>Start Date</label>
    <input type="text" id="startDate" placeholder="MM-DD-YYYY" />
    <div class="example">Example: 10-09-2025</div>
    
    <label>End Date</label>
    <input type="text" id="endDate" placeholder="MM-DD-YYYY" />
    <div class="example">Example: 10-10-2025 (dates are inclusive)</div>
    
    <button id="exportBtn" onclick="exportData()">Export to PDF</button>
    
    <div id="status" class="status"></div>
    
    <script>
      function exportData() {
        var startDate = document.getElementById('startDate').value;
        var endDate = document.getElementById('endDate').value;
        var statusDiv = document.getElementById('status');
        var exportBtn = document.getElementById('exportBtn');
        
        if (!startDate || !endDate) {
          showStatus('Please enter both start and end dates', 'error');
          return;
        }
        
        // Validate date format
        var dateRegex = /^\\d{2}-\\d{2}-\\d{4}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
          showStatus('Please use MM-DD-YYYY format', 'error');
          return;
        }
        
        // Disable button and show loading
        exportBtn.disabled = true;
        exportBtn.textContent = 'Generating PDF...';
        showStatus('Generating PDF, please wait...', 'success');
        
        google.script.run
          .withSuccessHandler(function(result) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export to PDF';
            
            if (result.success) {
              showStatus('PDF generated! Downloading...', 'success');
              
              // Convert base64 to blob and trigger download
              var byteCharacters = atob(result.pdfData);
              var byteNumbers = new Array(byteCharacters.length);
              for (var i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              var byteArray = new Uint8Array(byteNumbers);
              var blob = new Blob([byteArray], {type: 'application/pdf'});
              
              // Create download link
              var link = document.createElement('a');
              link.href = window.URL.createObjectURL(blob);
              link.download = result.fileName;
              link.click();
              
              setTimeout(function() {
                showStatus('PDF downloaded successfully! (' + result.recordCount + ' records)', 'success');
              }, 500);
            } else {
              showStatus('Error: ' + result.error, 'error');
            }
          })
          .withFailureHandler(function(error) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export to PDF';
            showStatus('Error: ' + error.message, 'error');
          })
          .exportArchiveToPDF(startDate, endDate);
      }
      
      function showStatus(message, type) {
        var statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
      }
    </script>
  `).setWidth(400).setHeight(400);

  SpreadsheetApp.getUi().showModalDialog(html, 'Export Archive Data');
}

function exportToNewSheet(dateRange) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dates = dateRange ? dateRange.split(' to ') : [null, null];
  const data = exportArchiveData(dates[0], dates[1]);

  if (data.success) {
    const newSheet = ss.insertSheet('Export_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss'));

    newSheet.getRange(1, 1, data.data.length, data.data[0].length).setValues(data.data);

    // Format header
    newSheet.getRange(1, 1, 1, data.data[0].length)
      .setBackground('#4285f4')
      .setFontColor('#ffffff')
      .setFontWeight('bold');

    SpreadsheetApp.getUi().alert(
      'Export Complete',
      `Exported ${data.count} records to sheet: ${newSheet.getName()}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function showActivePasses() {
  const passes = getActivePasses({});

  if (passes.success) {
    let message = `Currently ${passes.count} students out of class:\n\n`;

    passes.passes.slice(0, 10).forEach(pass => {
      const time = new Date(pass.checkOutTime);
      const minutes = Math.floor((new Date() - time) / 60000);
      message += `${pass.studentName} - ${pass.destination} (${minutes} min ago)\n`;
    });

    if (passes.count > 10) {
      message += `\n... and ${passes.count - 10} more`;
    }

    SpreadsheetApp.getUi().alert('Active Passes', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function generateAnalyticsReport() {
  const analytics = getAnalytics(30);

  if (analytics.success) {
    let message = `Analytics Report (Last 30 Days)\n\n`;
    message += `Total Passes: ${analytics.totalPasses}\n\n`;
    message += `Top 5 Frequent Users:\n`;

    analytics.frequentUsers.slice(0, 5).forEach((user, index) => {
      message += `${index + 1}. ${user.name} - ${user.count} passes\n`;
    });

    if (analytics.dailyMultiple.length > 0) {
      message += `\n${analytics.dailyMultiple.length} students with multiple passes today`;
    }

    SpreadsheetApp.getUi().alert('Analytics Report', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showDeploymentInstructions() {
  const message =
    'DEPLOYMENT STEPS:\n\n' +
    '1. Click "Deploy" > "New deployment"\n' +
    '2. Select type: "Web app"\n' +
    '3. Description: "Hall Pass System v1"\n' +
    '4. Execute as: "Me"\n' +
    '5. Who has access: "Anyone"\n' +
    '6. Click "Deploy"\n' +
    '7. Copy the Web App URL\n' +
    '8. Update your React frontend with this URL\n\n' +
    'For updates: Deploy > Manage deployments > Edit';

  SpreadsheetApp.getUi().alert('Deployment Instructions', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Quick test to verify setup
 */
function testSetup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const requiredSheets = ['StudentRoster', 'ActivePasses', 'Archive', 'Config'];
  let allPresent = true;

  requiredSheets.forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      Logger.log(`Missing sheet: ${sheetName}`);
      allPresent = false;
    }
  });

  if (allPresent) {
    Logger.log('All required sheets are present!');
    return true;
  } else {
    Logger.log('Some sheets are missing. Run initialSetup()');
    return false;
  }
}

/**
 * Clear all active passes (use cautiously!)
 */
function clearActivePasses() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Clear Active Passes',
    'This will remove all active passes. Are you sure?',
    ui.ButtonSet.YES_NO
  );

  if (response == ui.Button.YES) {
    const sheet = ss.getSheetByName('ActivePasses');
    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
      ui.alert('All active passes cleared');
    } else {
      ui.alert('No active passes to clear');
    }
  }
}

/**
 * Reset ActivePasses and Archive sheets only
 * Keeps StudentRoster and Config intact
 */
function resetPassSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ui = SpreadsheetApp.getUi();

  // Confirm with user
  const response = ui.alert(
    '⚠️ Reset Pass Sheets',
    'This will clear all data from:\n\n' +
    '• ActivePasses\n' +
    '• Archive\n\n' +
    'Your StudentRoster and Config sheets will NOT be affected.\n\n' +
    'Are you sure you want to continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Cancelled', 'No changes were made.', ui.ButtonSet.OK);
    return;
  }

  try {
    // Delete and recreate ActivePasses
    Logger.log('Resetting ActivePasses...');
    const activeSheet = ss.getSheetByName('ActivePasses');
    if (activeSheet) {
      ss.deleteSheet(activeSheet);
    }
    createActivePassesSheet(ss);

    // Delete and recreate Archive
    Logger.log('Resetting Archive...');
    const archiveSheet = ss.getSheetByName('Archive');
    if (archiveSheet) {
      ss.deleteSheet(archiveSheet);
    }
    createArchiveSheet(ss);

    Logger.log('Reset complete');

    ui.alert(
      '✅ Reset Complete',
      'ActivePasses and Archive sheets have been reset with new headers.\n\n' +
      'Your StudentRoster and Config sheets were not changed.\n\n' +
      'The system is ready to use!',
      ui.ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Error resetting sheets: ' + error.toString());
    ui.alert('Error', 'Failed to reset sheets: ' + error.toString(), ui.ButtonSet.OK);
  }
}

function debugActivePasses() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const activeSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE);
  const data = activeSheet.getDataRange().getValues();

  Logger.log('=== DEBUGGING ACTIVE PASSES ===');
  Logger.log('Total rows: ' + data.length);

  if (data.length > 1) {
    Logger.log('\nRow 2 data:');
    for (let j = 0; j < data[1].length; j++) {
      Logger.log('Column ' + String.fromCharCode(65 + j) + ' (index ' + j + '): "' + data[1][j] + '" (type: ' + typeof data[1][j] + ')');
    }
  }
}

function debugRoomFormats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  const configData = configSheet.getDataRange().getValues();

  Logger.log('=== STAFF ROOMS ===');
  for (let i = 1; i < configData.length; i++) {
    if (configData[i][0] === 'STAFF') {
      Logger.log('Email: ' + configData[i][1] + ' | Room: "' + configData[i][3] + '" (type: ' + typeof configData[i][3] + ')');
    }
  }

  // Also check an active pass
  const activeSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE);
  const activeData = activeSheet.getDataRange().getValues();

  Logger.log('\n=== ACTIVE PASS ROOMS ===');
  for (let i = 1; i < activeData.length; i++) {
    Logger.log('Pass ' + activeData[i][1] + ' | Room: "' + activeData[i][4] + '" (type: ' + typeof activeData[i][4] + ')');
  }
}

// ============================================
// ENABLE/DISABLE CHECKOUTS
// ============================================

function enableCheckouts() {
  updateCheckoutSetting(true);
}

function disableCheckouts() {
  updateCheckoutSetting(false);
}

function updateCheckoutSetting(enabled) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);  // ← ADD THIS
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const configData = configSheet.getDataRange().getValues();

    // Find CHECKOUT_ENABLED setting
    let found = false;
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === 'SETTING' && configData[i][1] === 'CHECKOUT_ENABLED') {
        configSheet.getRange(i + 1, 3).setValue(enabled ? 'TRUE' : 'FALSE');
        found = true;
        break;
      }
    }

    // If not found, add it
    if (!found) {
      configSheet.appendRow(['SETTING', 'CHECKOUT_ENABLED', enabled ? 'TRUE' : 'FALSE', '', '']);
    }

    // Increment settings version to bust cache
    let versionFound = false;
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === 'SETTING' && configData[i][1] === 'SETTINGS_VERSION') {
        const currentVersion = parseInt(configData[i][2]) || 0;
        configSheet.getRange(i + 1, 3).setValue(currentVersion + 1);
        Logger.log('Incremented SETTINGS_VERSION to ' + (currentVersion + 1));
        versionFound = true;
        break;
      }
    }

    // If SETTINGS_VERSION doesn't exist, create it
    if (!versionFound) {
      configSheet.appendRow(['SETTING', 'SETTINGS_VERSION', '1', '', '']);
      Logger.log('Created SETTINGS_VERSION = 1');
    }

    const ui = SpreadsheetApp.getUi();
    ui.alert(
      enabled ? 'Checkouts Enabled' : 'Checkouts Disabled',
      enabled
        ? '✅ Students can now check out.'
        : '⛔ Checkouts are now disabled.\n\nStudents will see a message that hall passes are not available.',
      ui.ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Error updating checkout setting: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error', 'Failed to update setting: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}