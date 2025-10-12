// ============================================
// EMAIL ROOM LINKS TO STAFF
// ============================================

function showEmailLinksDialog() {
  const html = HtmlService.createHtmlOutputFromFile('EmailLinksDialog')
    .setWidth(600)
    .setHeight(700);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Email Room Links to Staff');
}

function getStaffEmailList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const configData = configSheet.getDataRange().getValues();
    
    const staffList = [];
    
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === 'STAFF' && configData[i][1]) {
        staffList.push({
          email: configData[i][1],
          role: configData[i][2],
          room: configData[i][3] || 'No Room'
        });
      }
    }
    
    return {
      success: true,
      staff: staffList
    };
    
  } catch (error) {
    Logger.log('Error getting staff list: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

function sendRoomLinks(selectedEmails) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
    const configData = configSheet.getDataRange().getValues();
    
    const results = {
      success: [],
      failed: []
    };
    
    // Create a map of emails to rooms
    const emailToRoom = {};
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === 'STAFF' && configData[i][1]) {
        emailToRoom[configData[i][1]] = configData[i][3] || 'No Room';
      }
    }
    
    // Send emails to selected staff
    selectedEmails.forEach(email => {
      try {
        const room = emailToRoom[email];
        
        if (!room || room === 'No Room') {
          results.failed.push({
            email: email,
            error: 'No room assigned'
          });
          return;
        }
        
        // Create personalized URL
        const personalizedUrl = `https://hallpass-olmsted-falls-high.web.app/?room=${encodeURIComponent(room)}`;
        
        // Create QR code URL using QR Server API (more reliable)
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(personalizedUrl)}`;
        
        // Fetch the QR code image as a blob
        const qrCodeResponse = UrlFetchApp.fetch(qrCodeUrl);
        const qrCodeBlob = qrCodeResponse.getBlob().setName('qrcode_room_' + room + '.png');
        
        // Create HTML email body with inline image reference
        const htmlBody = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #00008b;">OFHS Hall Pass System</h2>
              
              <p>Here is your personalized hall pass link:</p>
              
              <p style="margin: 20px 0;">
                <a href="${personalizedUrl}" style="color: #00008b; font-size: 16px; text-decoration: none; background-color: #f0f4ff; padding: 10px 15px; border-radius: 5px; display: inline-block;">
                  ${personalizedUrl}
                </a>
              </p>
              
              <p>This link would be great to post in your <strong>Google Classroom</strong>. It would also be a great link if you have a dedicated Chromebook that you leave for kids to sign out.</p>
              
              <p>The following QR code also takes them to your personalized link:</p>
              
              <div style="margin: 20px 0; text-align: center;">
                <img src="cid:qrcode" alt="QR Code for Room ${room}" style="border: 2px solid #00008b; padding: 10px; background-color: white;" />
                <p style="margin-top: 10px; font-size: 14px; color: #666;">Room ${room} - Scan to access Hall Pass</p>
              </div>
              
              <p>If you have questions, please see or email <a href="mailto:jvanarnhem@ofcs.net" style="color: #00008b;">Jeff VanArnhem</a>.</p>
              
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                <em>Note: You can change the current room in the URL if needed.</em>
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
              
              <p style="font-size: 11px; color: #999;">
                This is an automated message from the OFHS Hall Pass System.
              </p>
            </body>
          </html>
        `;
        
        // Send email with inline QR code image
        MailApp.sendEmail({
          to: email,
          subject: 'OFHS Personalized Hall Pass Room Link',
          htmlBody: htmlBody,
          inlineImages: {
            qrcode: qrCodeBlob
          }
        });
        
        results.success.push(email);
        Logger.log('Email sent successfully to: ' + email);
        
      } catch (error) {
        results.failed.push({
          email: email,
          error: error.toString()
        });
        Logger.log('Failed to send email to ' + email + ': ' + error.toString());
      }
    });
    
    return {
      success: true,
      successCount: results.success.length,
      failedCount: results.failed.length,
      successEmails: results.success,
      failedEmails: results.failed
    };
    
  } catch (error) {
    Logger.log('Error in sendRoomLinks: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}
