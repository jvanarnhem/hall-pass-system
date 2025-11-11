// scripts/exportPassHistory.js
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Format date to YYYY-MM-DD HH:MM:SS
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Escape CSV field
function escapeCSV(field) {
  if (!field) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportPassHistory(outputPath, days = null) {
  try {
    console.log('📖 Reading pass history from Firestore...');
    
    let query = db.collection('passHistory');
    
    // Optional: filter by days
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate));
      console.log(`   Filtering last ${days} days...`);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    if (snapshot.empty) {
      console.log('❌ No passes found to export');
      process.exit(1);
    }
    
    console.log(`✅ Found ${snapshot.size} passes`);
    
    // CSV header
    const header = 'studentId,studentName,roomFrom,destination,customDestination,checkOutTime,checkInTime,duration,status\n';
    let csv = header;
    
    // Add rows
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      const row = [
        escapeCSV(data.studentId),
        escapeCSV(data.studentName),
        escapeCSV(data.roomFrom),
        escapeCSV(data.destination),
        escapeCSV(data.customDestination),
        escapeCSV(formatDate(data.checkOutTime)),
        escapeCSV(formatDate(data.checkInTime)),
        escapeCSV(data.duration),
        escapeCSV(data.status)
      ].join(',');
      
      csv += row + '\n';
    });
    
    // Write to file
    fs.writeFileSync(outputPath, csv, 'utf-8');
    
    console.log(`\n🎉 Export complete!`);
    console.log(`✅ Exported ${snapshot.size} passes to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error exporting pass history:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Get parameters from command line
const outputPath = process.argv[2] || 'passHistory_export.csv';
const days = process.argv[3] ? parseInt(process.argv[3]) : null;

exportPassHistory(outputPath, days);