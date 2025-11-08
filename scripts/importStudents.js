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
  // FIX 1: Split on newlines correctly (handles \r\n and \n)
  const lines = csvText.trim().split(/\r?\n/);
  const students = [];
  
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('studentid') || 
                    firstLine.includes('name') || 
                    firstLine.includes('id');
  
  const startIndex = hasHeader ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // FIX 2: Use simple split, the regex was splitting names
    const parts = line.split(',');
    
    // Trim each part
    const cleanParts = parts.map(p => p.trim());
    
    if (cleanParts.length < 2) continue;
    
    const studentId = cleanParts[0];
    const studentNameFromCsv = cleanParts[1]; // This is "Emma Johnson"
    const grade = cleanParts[2] || '';
    const email = cleanParts[3] || '';
    
    if (!/^\d{6}$/.test(studentId)) {
      console.warn(`Skipping invalid Student ID: ${studentId} (Line: ${line})`);
      continue;
    }
    
    // FIX 3: Save to 'name' field
    students.push({ 
      studentId, 
      name: studentNameFromCsv, 
      grade, 
      email 
    });
  }
  
  return students;
}
// --- END OF FIXES ---

async function importStudents(csvPath) {
  try {
    console.log('📖 Reading CSV file...');
    const csvText = fs.readFileSync(path.resolve(csvPath), 'utf-8');
    
    console.log('🔍 Parsing students...');
    const students = parseCSV(csvText);
    
    if (students.length === 0) {
      console.error('❌ No valid students found in CSV. Check file format.');
      process.exit(1);
    }
    
    console.log(`✅ Found ${students.length} valid students`);
    
    try {
      await db.collection('students').doc('placeholder').delete();
      console.log('🗑️ Deleted placeholder document');
    } catch (e) {
      // Placeholder might not exist, that's fine
    }
    
    const batchSize = 500;
    let imported = 0;
    
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = db.batch();
      const chunk = students.slice(i, i + batchSize);
      
      chunk.forEach(student => {
        const docRef = db.collection('students').doc(student.studentId);
        // This will OVERWRITE existing students with the correct data
        batch.set(docRef, student); 
      });
      
      await batch.commit();
      imported += chunk.length;
      console.log(`📝 Imported ${imported}/${students.length} students...`);
    }
    
    console.log('🎉 Import complete!');
    
  } catch (error) {
    console.error('❌ Error importing students:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

const csvPath = process.argv[2];

if (!csvPath) {
  console.error('❌ Please provide path to CSV file');
  console.log('Usage: node scripts/importStudents.js path/to/your/students.csv');
  process.exit(1);
}

importStudents(csvPath);