# Security Summary - OFHS Hall Pass System

## Overview

This document outlines the security measures implemented in the OFHS Hall Pass System.

---

## Authentication & Authorization

### Email Domain Restriction
- **Location:** [src/firebase/config.js:22](src/firebase/config.js#L22)
- Only `@ofcs.net` email addresses can authenticate
- Enforced at Google OAuth provider level with `hd: "ofcs.net"` parameter
- Double-checked in auth logic ([src/firebase/auth.js:18](src/firebase/auth.js#L18))

### Staff Verification
- **Location:** [src/firebase/auth.js:27-35](src/firebase/auth.js#L27-L35)
- After Google sign-in, user must exist in `staff` collection
- If not in staff collection, authentication is rejected and user is signed out
- Prevents unauthorized @ofcs.net users from accessing staff dashboard

### Protected Routes
- **Location:** [src/components/ProtectedRoute.jsx](src/components/ProtectedRoute.jsx)
- Dashboard routes require authentication
- Redirects to login page if not authenticated
- Maintains original destination for post-login redirect

---

## Firestore Security Rules

### Rules File
- **Location:** [firestore.rules](firestore.rules)
- **Deploy:** `firebase deploy --only firestore:rules`

### Collection Access Control

#### Students Collection
- **Read:** Public (anyone) - needed for student check-out page
- **Write:** Admin only - prevents unauthorized student data modification

#### Staff Collection
- **Read:** Staff only - staff can view their own and other staff data
- **Write:** Admin only - prevents privilege escalation

#### Active Passes Collection
- **Create:** Public (anyone) - students can create passes when checking out
- **Read:** Staff only - only staff can view active passes
- **Update:** Staff only - staff can edit passes (add notes, etc.)
- **Delete:** Staff only - staff can check in passes (moves to history)

#### Pass History Collection
- **Create:** Staff only - only staff can check in passes
- **Read:** Staff only - only staff can view history
- **Update:** Staff only - staff can add notes to historical passes
- **Delete:** Admin only - prevents accidental history deletion

#### Destinations Collection
- **Read:** Public (anyone) - needed for student check-out page
- **Write:** Admin only - prevents unauthorized destination changes

#### Settings Collection
- **Read:** Public (anyone) - needed for max checkout time enforcement
- **Write:** Admin only - prevents unauthorized settings changes
- **Delete:** Nobody - settings cannot be deleted

### Security Rule Functions

```javascript
// Check if user has @ofcs.net email
function isAuthenticated() {
  return request.auth != null &&
         request.auth.token.email.matches('.*@ofcs\\.net$');
}

// Check if user exists in staff collection
function isStaff() {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/staff/$(request.auth.token.email));
}

// Check if user has admin role
function isAdmin() {
  return isStaff() &&
         get(/databases/$(database)/documents/staff/$(request.auth.token.email))
           .data.role == 'admin';
}
```

---

## Security Best Practices Implemented

### 1. Principle of Least Privilege
- Users only have access to data they need
- Public endpoints limited to read-only for essential data
- Write access restricted to authenticated staff/admins

### 2. Defense in Depth
- Multiple layers of security:
  1. Client-side route protection
  2. Client-side auth verification
  3. Firebase Authentication
  4. Firestore security rules (server-side enforcement)

### 3. Input Validation
- Student IDs validated before lookup
- Email format validated at multiple levels
- Role-based access verified at rule level

### 4. Secure by Default
- Default rule denies all access to unknown collections
- Explicit allow rules required for each operation
- No wildcard permissions

---

## Known Security Considerations

### 1. Firebase API Key in Client Code
- **Status:** ✅ Normal and safe
- **Location:** [src/firebase/config.js:6](src/firebase/config.js#L6)
- **Reason:** Firebase API keys are designed to be public
- **Protection:** Security rules prevent unauthorized data access
- **Reference:** [Firebase API Key Security](https://firebase.google.com/docs/projects/api-keys)

### 2. Student Data Publicly Readable
- **Status:** ⚠️ Intentional design decision
- **Reason:** Student check-out page is public (no login required)
- **Mitigation:** Students collection only contains ID, name, grade - no sensitive data
- **Alternative:** Could require student login, but impacts usability

### 3. Console.error on Auth Failure
- **Status:** ⚠️ Minor information disclosure
- **Location:** [src/firebase/auth.js:49](src/firebase/auth.js#L49)
- **Impact:** Low - only logs to user's own browser console
- **Recommendation:** Keep for debugging, errors don't expose sensitive data

---

## Security Checklist for Deployment

Before deploying to production:

- [ ] Deploy Firestore security rules: `firebase deploy --only firestore:rules`
- [ ] Verify staff collection has all authorized users
- [ ] Test authentication with @ofcs.net account
- [ ] Test authentication with non-@ofcs.net account (should fail)
- [ ] Test staff access controls in Rules Playground
- [ ] Test admin access controls in Rules Playground
- [ ] Verify public student check-out page works without login
- [ ] Verify dashboard requires login
- [ ] Review Firebase Console for any security warnings

---

## Testing Security Rules

### Using Firebase Console Rules Playground

1. Go to Firebase Console → Firestore → Rules
2. Click "Rules Playground" tab
3. Test scenarios:

**Test 1: Student Check-out (Public)**
```
Operation: read
Collection: students
Document: 123456
Auth: Unauthenticated
Expected: Allow ✅
```

**Test 2: Create Pass (Public)**
```
Operation: create
Collection: activePasses
Auth: Unauthenticated
Expected: Allow ✅
```

**Test 3: View Active Passes (Requires Staff)**
```
Operation: read
Collection: activePasses
Auth: user@ofcs.net (in staff collection)
Expected: Allow ✅
```

**Test 4: View Active Passes (Non-Staff)**
```
Operation: read
Collection: activePasses
Auth: user@gmail.com
Expected: Deny ❌
```

**Test 5: Delete Student (Requires Admin)**
```
Operation: delete
Collection: students
Document: 123456
Auth: admin@ofcs.net (role: "admin")
Expected: Allow ✅
```

**Test 6: Delete Student (Regular Staff)**
```
Operation: delete
Collection: students
Document: 123456
Auth: teacher@ofcs.net (role: "staff")
Expected: Deny ❌
```

---

## Incident Response

If a security issue is discovered:

1. **Immediate Actions:**
   - Review Firebase Console logs for suspicious activity
   - Check Firestore audit logs for unauthorized access
   - Temporarily disable affected functionality if needed

2. **Investigation:**
   - Identify scope of breach (what data was accessed/modified)
   - Review security rules for gaps
   - Check staff collection for unauthorized users

3. **Remediation:**
   - Update security rules to close vulnerability
   - Deploy rules immediately: `firebase deploy --only firestore:rules`
   - Revoke access for compromised accounts
   - Rotate credentials if needed

4. **Prevention:**
   - Document the issue and fix
   - Add test cases to prevent regression
   - Review related code for similar vulnerabilities

---

## Security Contact

For security concerns or to report vulnerabilities, contact the system administrator or developer.

**Never commit sensitive data like:**
- Service account keys
- Private keys
- Passwords
- Personal student information beyond what's in the database schema
