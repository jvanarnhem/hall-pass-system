# Firebase Cloud Functions - OFHS Hall Pass System

## Functions

### `autoCheckInExpiredPasses`
Scheduled function that runs every 5 minutes to automatically check in passes that have exceeded the maximum checkout time.

**Schedule:** Every 5 minutes
**Memory:** 256 MiB
**Timezone:** America/New_York

**How it works:**
1. Fetches `maxCheckoutMinutes` from `settings/system` (default: 46 minutes)
2. Queries `activePasses` for passes checked out more than `maxCheckoutMinutes` ago
3. Moves expired passes to `passHistory` with exact check-in time = `checkOutTime + maxCheckoutMinutes`
4. Processes in batches of 500 (Firestore limit)

**Cost Efficiency:**
- Only queries passes that are actually expired (not all active passes)
- Runs every 5 minutes = 288 executions/day
- Estimated cost: <$0.01/month for typical usage

## Deployment

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project on **Blaze Plan** (pay-as-you-go) - required for Cloud Functions

### First-Time Setup

1. **Login to Firebase:**
   ```bash
   firebase login
   ```

2. **Deploy the function:**
   ```bash
   firebase deploy --only functions
   ```

### Monitoring

View function logs:
```bash
firebase functions:log
```

Or view in Firebase Console:
https://console.firebase.google.com/project/ofhs-hall-pass/functions

### Required Firestore Index

The function requires a compound index on `activePasses`:
- Collection: `activePasses`
- Fields:
  - `status` (Ascending)
  - `checkOutTime` (Ascending)

**Firebase will automatically prompt you to create this index** when you first deploy. Click the link in the error message to create it.

## Testing Locally

Run the emulator:
```bash
npm run serve
```

## Updating the Schedule

To change the auto check-in frequency, edit `functions/index.js`:

```javascript
schedule: "every 5 minutes",  // Change to "every 10 minutes", etc.
```

Then redeploy:
```bash
firebase deploy --only functions
```

## Troubleshooting

**Error: "Function deployment requires the Firebase Blaze plan"**
- Upgrade your Firebase project at: https://console.firebase.google.com/project/ofhs-hall-pass/usage

**Function not running?**
- Check Firebase Console > Functions for errors
- Verify the index was created
- Check function logs: `firebase functions:log`
