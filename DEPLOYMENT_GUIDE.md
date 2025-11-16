# Deployment Guide - OFHS Hall Pass System

## New Features Added

### 1. Automatic Check-In (Cloud Function)
- Passes are now automatically checked in after the maximum checkout time (default: 46 minutes)
- Runs every 5 minutes via Firebase Cloud Scheduler
- No longer requires admin login to trigger auto check-in
- Check-in time is set exactly to `checkOutTime + maxCheckoutMinutes`

### 2. Notes Feature
- Staff can add notes to any pass (active or history)
- Notes are visible with a message icon (💬) next to student names
- Hover over the icon to see the note in a tooltip
- Edit a pass to add/edit/remove notes
- Notes include metadata: who added it and when

---

## Deployment Instructions

### Prerequisites

1. **Firebase Blaze Plan Required**
   - Cloud Functions require the pay-as-you-go Blaze plan
   - Upgrade at: https://console.firebase.google.com/project/ofhs-hall-pass/usage
   - Estimated monthly cost: <$0.50 for typical school usage

2. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

### Step 1: Build the React App

```bash
npm run build
```

This creates the production build in the `build/` directory.

### Step 2: Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

This deploys the security rules that protect your database. **This is critical for security!**

### Step 3: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

**Important:** On first deployment, you'll see an error about a missing Firestore index. Click the link in the error message to create the required compound index:

```
Collection: activePasses
Fields:
  - status (Ascending)
  - checkOutTime (Ascending)
```

After creating the index (takes 1-2 minutes), redeploy:

```bash
firebase deploy --only functions
```

### Step 4: Deploy Hosting

```bash
firebase deploy --only hosting
```

### Step 5: Full Deployment (All at Once)

Or deploy everything in one command:

```bash
firebase deploy
```

This will deploy security rules, functions, and hosting all at once.

---

## Verification

### Verify Cloud Function is Running

1. Go to Firebase Console → Functions
2. You should see `autoCheckInExpiredPasses` listed
3. Click on it to view logs and execution history

### Test Auto Check-In

1. Create a test pass with student ID `123456` or `987654`
2. In Firestore, manually set the `checkOutTime` to 50 minutes ago
3. Wait up to 5 minutes
4. The pass should automatically move to `passHistory`

### Test Notes Feature

1. Login as a staff member
2. Go to "Today" or "Active" view
3. Click the edit icon on any pass
4. Add a note in the "Note (Optional)" field
5. Save the pass
6. You should see a 💬 icon next to the student name
7. Hover over the icon to see the note

---

## Monitoring

### View Function Logs

```bash
firebase functions:log
```

Or in Firebase Console:
https://console.firebase.google.com/project/ofhs-hall-pass/functions

### Check Function Execution

- Go to Functions → `autoCheckInExpiredPasses` → Logs
- You should see entries every 5 minutes
- Successful runs will show: "✅ Auto check-in complete: X passes checked in"

---

## Cost Optimization

The auto check-in function is optimized for minimal reads:

- **Scheduled runs:** 288 times per day (every 5 minutes)
- **Queries per run:** 1 query that only returns expired passes
- **Estimated reads per day:** 50-150 (only passes that need check-in)
- **Estimated monthly cost:** $0.10 - $0.50

Compare this to the old system which could trigger hundreds of reads on every admin login.

---

## Troubleshooting

### Function Not Running

1. Check Firebase Console → Functions for errors
2. Verify you're on the Blaze plan
3. Check that the Firestore index was created
4. View logs: `firebase functions:log`

### Notes Not Saving

1. Check browser console for errors
2. Verify the user is logged in
3. Check that the pass has the note fields in Firestore

### Deployment Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear functions node_modules
rm -rf functions/node_modules functions/package-lock.json
npm install --prefix functions

# Try deploying again
firebase deploy
```

---

## Rollback Plan

If you need to rollback to the previous version:

### Rollback Hosting Only

```bash
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live
```

### Rollback Functions

Redeploy the previous version from git:

```bash
git checkout <previous-commit-hash>
firebase deploy --only functions
git checkout master
```

---

## Database Schema Changes

### New Fields Added to Passes

Both `activePasses` and `passHistory` collections now include:

```javascript
{
  note: string | null,           // The note text
  noteAddedBy: string | null,    // Email of who added the note
  noteAddedAt: string | null,    // ISO timestamp when note was added
  autoCheckedIn: boolean          // true if checked in by Cloud Function
}
```

**Note:** Existing passes will work fine. The new fields will be `null` for passes created before this deployment.

---

## Security

### Firestore Security Rules

The system includes comprehensive Firestore security rules (`firestore.rules`) that protect your data:

**Access Levels:**
- **Public (No Auth Required):**
  - Students collection (read only) - needed for student check-out
  - Destinations collection (read only) - needed for student check-out
  - Settings collection (read only) - needed for max checkout time
  - Active passes (create only) - students can create passes

- **Staff Only (@ofcs.net authenticated):**
  - Active passes (read, update, delete)
  - Pass history (read, create, update)
  - Staff collection (read own or any if staff)

- **Admin Only:**
  - Students (create, update, delete)
  - Staff (create, update, delete)
  - Destinations (create, update, delete)
  - Settings (create, update)
  - Pass history (delete)

**Security Features:**
- Email domain restriction (@ofcs.net only)
- Staff verification against staff collection
- Role-based access control (admin vs regular staff)
- Protected collections with explicit allow/deny rules

**Deploy Security Rules:**
```bash
firebase deploy --only firestore:rules
```

**Test Security Rules:**
Use the Firebase Console Rules Playground:
1. Go to Firestore → Rules
2. Click "Rules Playground"
3. Test different scenarios with different user emails

---

## Support

If you encounter issues:

1. Check the Firebase Console for errors
2. Review function logs: `firebase functions:log`
3. Check browser console for client-side errors
4. Contact the developer with error messages and logs
