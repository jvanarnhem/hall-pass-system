// scripts/deleteTestPasses.js
const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin SDK
// Make sure you have your service account key
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Test student IDs to delete
const TEST_STUDENT_IDS = ['123456', '987654'];

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function deleteTestPasses() {
  try {
    console.log('🔍 Searching for test passes...\n');

    // Query for test passes in passHistory
    const historyQuery = db.collection('passHistory')
      .where('studentId', 'in', TEST_STUDENT_IDS);

    const historySnapshot = await historyQuery.get();

    console.log(`Found ${historySnapshot.size} test passes in passHistory\n`);

    if (historySnapshot.empty) {
      console.log('✅ No test passes found. Nothing to delete.');
      rl.close();
      return;
    }

    // Show preview of what will be deleted
    console.log('Preview of passes to be deleted:');
    console.log('─────────────────────────────────────────────────');
    historySnapshot.docs.slice(0, 5).forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Student: ${data.studentName} (${data.studentId})`);
      console.log(`  From: ${data.roomFrom} → ${data.destination}`);
      console.log(`  Time: ${data.checkOutTime?.toDate().toLocaleString()}`);
      console.log('');
    });

    if (historySnapshot.size > 5) {
      console.log(`... and ${historySnapshot.size - 5} more\n`);
    }

    // Confirm deletion
    const answer = await question(`⚠️  DELETE ${historySnapshot.size} test passes? (yes/no): `);

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Deletion cancelled.');
      rl.close();
      return;
    }

    console.log('\n🗑️  Deleting test passes...');

    // Delete in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < historySnapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = historySnapshot.docs.slice(i, i + batchSize);

      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`   Deleted ${deletedCount}/${historySnapshot.size} passes...`);
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} test passes!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    process.exit();
  }
}

// Also check activePasses collection
async function deleteActiveTestPasses() {
  try {
    console.log('\n🔍 Checking for test passes in activePasses...\n');

    const activeQuery = db.collection('activePasses')
      .where('studentId', 'in', TEST_STUDENT_IDS);

    const activeSnapshot = await activeQuery.get();

    if (activeSnapshot.empty) {
      console.log('✅ No active test passes found.\n');
      return 0;
    }

    console.log(`Found ${activeSnapshot.size} active test passes\n`);

    // Show preview
    activeSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.studentName} (${data.studentId}) - Currently out`);
    });

    const answer = await question(`\n⚠️  DELETE ${activeSnapshot.size} active test passes? (yes/no): `);

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Active passes deletion cancelled.');
      return 0;
    }

    // Delete active passes
    const batch = db.batch();
    activeSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Deleted ${activeSnapshot.size} active test passes`);
    return activeSnapshot.size;

  } catch (error) {
    console.error('❌ Error deleting active passes:', error.message);
    return 0;
  }
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🧹 Test Pass Cleanup Script');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Target Student IDs: ${TEST_STUDENT_IDS.join(', ')}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Delete from both collections
  await deleteActiveTestPasses();
  await deleteTestPasses();

  console.log('\n✨ Cleanup complete!\n');
}

main();