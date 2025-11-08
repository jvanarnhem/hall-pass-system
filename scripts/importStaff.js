// scripts/importStaff.js
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const staff = [];
  
  const hasHeader = lines[0].toLowerCase().includes('email') || 
                    lines[0].toLowerCase().includes('name');
  const startIndex = hasHeader ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
    
    if (cleanParts.length < 2) continue;
    
    const email = cleanParts[0];
    const name = cleanParts[1];
    const role = cleanParts[2] || 'teacher';
    const room = cleanParts[3] || '';
    
    if (!email.includes('@')) {
      console.log(`⚠️ Skipping invalid email: ${email}`);
      continue;
    }
    
    staff.push({
      email,
      name,
      role,
      room,
      active: true,
      dropdownText: room ? `${name} (${room})` : name
    });
  }
  
  return staff;
}

async function importStaff(csvPath) {
  try {
    console.log('📖 Reading CSV file...');
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('🔍 Parsing staff...');
    const staff = parseCSV(csvText);
    
    console.log(`✅ Found ${staff.length} valid staff members`);
    
    let imported = 0;
    
    for (const person of staff) {
      await db.collection('staff').doc(person.email).set(person);
      imported++;
      console.log(`📝 Imported ${imported}/${staff.length}: ${person.name}`);
    }
    
    console.log('🎉 Import complete!');
    console.log(`✅ Total staff imported: ${imported}`);
    
  } catch (error) {
    console.error('❌ Error importing staff:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

const csvPath = process.argv[2];

if (!csvPath) {
  console.error('❌ Please provide path to CSV file');
  console.log('Usage: node scripts/importStaff.js path/to/staff.csv');
  process.exit(1);
}

importStaff(csvPath);