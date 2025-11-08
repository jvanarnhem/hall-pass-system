// scripts/importStudents.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Parse CSV
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const students = [];
  
  // Check if first line is header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('studentid') || 
                    firstLine.includes('name') || 
                    firstLine.includes('id');
  
  const startIndex = hasHeader ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma, handling quoted fields
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
    
    if (cleanParts.length < 2) continue;
    
    const studentId = cleanParts[0];
    const studentName = cleanParts[1];
    const grade = cleanParts[2] || '';
    const email = cleanParts[3] || '';
    
    // Validate student ID (6 digits)
    if (!/^\d{6}$/.test(studentId)) {
      console.log(`⚠️ Skipping invalid ID: ${studentId}`);
      continue;
    }
    
    // Validate name
    if (!studentName || studentName.length < 2) {
      console.log(`⚠️ Skipping student with invalid name: ${studentId}`);
      continue;
    }
    
    students.push({
      studentId,
      name: studentName,
      grade,
      email,
      active: true
    });
  }
  
  return students;
}

// Import students to Firestore
async function importStudents(csvPath) {
  try {
    console.log('📖 Reading CSV file...');
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('🔍 Parsing students...');
    const students = parseCSV(csvText);
    
    console.log(`✅ Found ${students.length} valid students`);
    
    // First, delete the placeholder
    try {
      await db.collection('students').doc('placeholder').delete();
      console.log('🗑️ Deleted placeholder document');
    } catch (e) {
      // Placeholder might not exist, that's fine
    }
    
    // Import in batches of 500 (Firestore limit)
    const batchSize = 500;
    let imported = 0;
    
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = db.batch();
      const chunk = students.slice(i, i + batchSize);
      
      chunk.forEach(student => {
        const docRef = db.collection('students').doc(student.studentId);
        batch.set(docRef, student);
      });
      
      await batch.commit();
      imported += chunk.length;
      console.log(`📝 Imported ${imported}/${students.length} students...`);
    }
    
    console.log('🎉 Import complete!');
    console.log(`✅ Total students imported: ${imported}`);
    
  } catch (error) {
    console.error('❌ Error importing students:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Get CSV path from command line argument
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('❌ Please provide path to CSV file');
  console.log('Usage: node scripts/importStudents.js path/to/students.csv');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error('❌ CSV file not found:', csvPath);
  process.exit(1);
}

importStudents(csvPath);