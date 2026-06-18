# 🧪 COMPREHENSIVE TESTING GUIDE

## Pre-Testing Checklist
- [ ] Clear browser localStorage: DevTools → Application → Clear all
- [ ] Open browser DevTools Network tab to monitor requests
- [ ] Have admin account ready: `admin@arangkada.ph`
- [ ] Have test phone numbers ready (different for each test)
- [ ] Note current time for approval checks

---

## TEST 1: Driver Auto-Approval Refresh ✅

### Scenario: Driver waits for approval without logout

**Setup**:
1. Open app in Browser 1
2. Register as driver with phone `+63917123456`
3. Verify OTP
4. You should be on `/pending-approval` page

**Test**:
1. Open admin panel in Browser 2
2. Login as admin (`admin@arangkada.ph`)
3. Go to Drivers page
4. Find your driver and click "Approve"
5. **Watch Browser 1** - should automatically redirect to `/driver` within 10 seconds
6. Check DevTools Network tab - should see requests every 5-10 seconds

**Expected Results** ✅:
- [ ] PendingApproval page shows "Checking approval status..."
- [ ] Timestamp updates every 10 seconds
- [ ] Auto-redirects to `/driver` when approved (no logout needed)
- [ ] Toast message: "🎉 Your account has been approved!"
- [ ] No manual refresh required

**Fail Indicators** ❌:
- Page doesn't auto-refresh
- Timestamp doesn't update
- Manual logout/login required to see approval
- No visual indicator of checking

---

## TEST 2: Booking Polling Interval ✅

### Scenario: Verify reduced polling load

**Setup**:
1. Login as passenger
2. Open DevTools → Network tab
3. Filter by XHR/Fetch
4. Create a booking

**Test**:
1. Watch Network tab for requests to Supabase
2. Look for polling requests (should be ~every 7 seconds)
3. Count requests over 60 seconds
4. Compare before/after

**Expected Results** ✅:
- [ ] Polling interval: 5-8 seconds (not 2 seconds)
- [ ] Requests per minute: 6-12 (not 30)
- [ ] Each request shows random variance in timing
- [ ] Network usage significantly lower

**Fail Indicators** ❌:
- Polling every 2 seconds
- 30+ requests per minute
- Consistent interval (no jitter/variance)

---

## TEST 3: Deduplication Logic ✅

### Scenario: Multiple bookings don't show duplicates

**Setup**:
1. Open 2 browser windows side-by-side
2. Window A: Logged in as Passenger 1
3. Window B: Logged in as Driver

**Test**:
1. In Window A: Create same booking twice (from same location)
2. In Window B: Driver dashboard should show pending bookings
3. Check the pending bookings list
4. Count duplicates

**Expected Results** ✅:
- [ ] Only ONE booking shown (not 2)
- [ ] Most recent booking shown
- [ ] No duplicates visible
- [ ] Supabase and local data properly merged

**Fail Indicators** ❌:
- Duplicate bookings shown
- Same passenger appears twice
- Inconsistent sorting

---

## TEST 4: Passenger Login Flow ✅

### Scenario: Passenger can login via email/phone/username

**Setup**: None needed

**Test Case 4.1 - Email Login**:
1. Click "Sign In"
2. Select "Passenger"
3. Enter email: `testpass@gmail.com`
4. Enter password: `Test@1234`
5. Click "Sign In"

**Expected Results** ✅:
- [ ] Successful login
- [ ] Redirected to `/passenger`
- [ ] User profile shows in top-right
- [ ] No password stored in localStorage

**Test Case 4.2 - Phone Login**:
1. Click "Sign In"
2. Select "Passenger"
3. Enter phone: `+639171234567`
4. Enter password: `Test@1234`
5. Click "Sign In"

**Expected Results** ✅:
- [ ] Successfully resolves email from phone
- [ ] Logs in correctly
- [ ] No errors

**Test Case 4.3 - Username Login**:
1. Click "Sign In"
2. Select "Passenger"
3. Enter username: `john_doe`
4. Enter password: `Test@1234`
5. Click "Sign In"

**Expected Results** ✅:
- [ ] Resolves email from username
- [ ] Logs in successfully

---

## TEST 5: Booking Fare Calculation ✅

### Scenario: Verify fare calculation with all discount types

**Setup**:
1. Login as passenger
2. Go to "Book a Ride"

**Test Case 5.1 - Regular Fare**:
1. Pickup: Current location
2. Destination: 1.5 km away
3. Passenger type: "Regular"
4. Check calculated fare

**Expected Fare**: ₱21
- Formula: ₱16 + ceil(0.5/0.5) × ₱5 = ₱16 + ₱5 = ₱21 ✓

**Test Case 5.2 - Student Discount**:
1. Pickup: Current location
2. Destination: 1.5 km away
3. Passenger type: "Student"
4. Check calculated fare

**Expected Fare**: ₱18.90 (₱21 × 0.9)

**Test Case 5.3 - PWD Discount**:
1. Pickup: Current location
2. Destination: 1.5 km away
3. Passenger type: "PWD"
4. Check calculated fare

**Expected Fare**: ₱18.90 (₱21 × 0.9)

**All Expected Results** ✅:
- [ ] Base fare (0.8 km): ₱16
- [ ] 1.5 km: ₱21
- [ ] 2.0 km: ₱26
- [ ] 2.5 km: ₱31
- [ ] 3.0 km: ₱36
- [ ] With student discount: 10% off
- [ ] With PWD discount: 10% off

---

## TEST 6: Driver Online/Offline Toggle ✅

### Scenario: Driver can toggle availability

**Setup**:
1. Login as approved driver
2. On `/driver` dashboard

**Test**:
1. See "Online/Offline" toggle switch
2. Toggle to "Offline"
3. Check that pending bookings disappear
4. Toggle back to "Online"
5. Pending bookings reappear

**Expected Results** ✅:
- [ ] Toggle switch is visible
- [ ] Shows current status clearly
- [ ] When offline: no new booking requests shown
- [ ] When online: pending bookings reappear
- [ ] Toast confirmation message shown

**Fail Indicators** ❌:
- Toggle doesn't work
- Status doesn't change visually
- Bookings still show when offline

---

## TEST 7: Accept Booking Flow ✅

### Scenario: Driver accepts pending booking

**Setup**:
1. Passenger created booking
2. Driver is online on dashboard

**Test**:
1. See pending booking card
2. Click "Accept"
3. Watch redirect to `/driver/active-ride`
4. Verify booking details shown

**Expected Results** ✅:
- [ ] Booking card visible with passenger info
- [ ] Distance and fare displayed
- [ ] Accept button is clickable
- [ ] Toast: "Ride accepted! Navigate to pickup location."
- [ ] Redirected to active ride page
- [ ] Booking marked as "accepted"

---

## TEST 8: Active Ride Status Updates ✅

### Scenario: Driver updates ride status through 4 stages

**Setup**:
1. Driver has accepted booking
2. On `/driver/active-ride` page

**Test**:
1. **Stage 1**: Click "En Route to Pickup"
   - Status changes to "en_route"
   - Toast: "Status updated: En route to pickup"
2. **Stage 2**: Click "Arrived at Pickup"
   - Status changes to "arrived"
   - Toast: "Status updated: Arrived at pickup"
3. **Stage 3**: Click "Start Trip"
   - Status changes to "in_progress"
   - Toast: "Trip started!"
4. **Stage 4**: Click "Complete Ride"
   - Shows completion dialog
   - Displays trip summary

**Expected Results** ✅:
- [ ] Each status update shows toast confirmation
- [ ] Status buttons enable/disable appropriately
- [ ] Map updates with driver location
- [ ] Passenger sees status updates
- [ ] Location tracking working (if allowed)

---

## TEST 9: Completed Trip Summary ✅

### Scenario: Driver completes ride and sees summary

**Setup**:
1. Ride in "in_progress" status
2. On active ride page

**Test**:
1. Click "Complete Ride"
2. Completion dialog appears
3. Shows trip summary:
   - Passenger name
   - Fare amount
   - Distance traveled
   - Payment method
4. Click "Confirm Completion"

**Expected Results** ✅:
- [ ] Trip summary dialog shown
- [ ] Correct fare calculated
- [ ] Correct distance shown
- [ ] Payment method displayed
- [ ] Redirected to dashboard
- [ ] Trip added to history

---

## TEST 10: Ride History ✅

### Scenario: Both driver and passenger can view history

**Setup**:
1. Complete at least one ride
2. Login as driver or passenger

**Test - Passenger**:
1. Go to Profile → Ride History
2. Should see completed rides
3. Click on a ride for details

**Test - Driver**:
1. Go to Dashboard → "View History"
2. Should see all completed rides
3. Shows earnings summary

**Expected Results** ✅:
- [ ] History list appears
- [ ] Completed rides shown
- [ ] Correct dates and times
- [ ] Correct fares and distances
- [ ] Earnings total shown (driver)

---

## TEST 11: Admin Driver Approval ✅

### Scenario: Admin reviews and approves drivers

**Setup**:
1. Multiple drivers in pending status
2. Admin logged in

**Test**:
1. Go to Admin Panel → Drivers
2. Filter by "Pending"
3. Click on pending driver
4. Modal shows driver details and documents
5. Click "Approve"

**Expected Results** ✅:
- [ ] Pending drivers list displays
- [ ] Driver detail modal shows all documents
- [ ] Approve button works
- [ ] Driver redirects automatically (if waiting)
- [ ] Status changes to "Active"

---

## TEST 12: Admin Reject Driver ✅

### Scenario: Admin rejects driver application

**Test**:
1. Open pending driver detail
2. Click "Reject"
3. Optional: Enter rejection reason
4. Confirm rejection

**Expected Results** ✅:
- [ ] Rejection dialog appears
- [ ] Driver status changes to "Blocked"
- [ ] Driver receives notification (PendingApproval page shows "Rejected")

---

## TEST 13: Admin Block Driver ✅

### Scenario: Admin blocks an active driver

**Test**:
1. Open active driver detail
2. Click "Block Driver"
3. Confirmation dialog appears
4. Confirm block

**Expected Results** ✅:
- [ ] Driver cannot login
- [ ] Status shows "Blocked"
- [ ] Can be reinstated later

---

## TEST 14: Password Security ✅

### Scenario: Verify password not stored in localStorage

**Setup**:
1. Login as passenger with password `Test@1234`

**Test**:
1. Open DevTools → Application → Local Storage
2. Click "current_user"
3. Inspect the stored JSON
4. Search for password field

**Expected Results** ✅:
- [ ] "password" field NOT present
- [ ] User data stored but no credentials
- [ ] Safe from localStorage attacks

**Fail Indicators** ❌:
- Password visible in localStorage
- "password": "Test@1234" found

---

## TEST 15: Approval Status Persistence ✅

### Scenario: Verify approval status saved correctly

**Setup**:
1. Driver at `/pending-approval`
2. Admin approves driver

**Test**:
1. Driver auto-redirected to `/driver`
2. Close browser completely
3. Reopen browser and login as driver
4. Should already be approved (no pending-approval page)

**Expected Results** ✅:
- [ ] Auto-approval works
- [ ] Approval persists across sessions
- [ ] No re-approval needed

---

## PERFORMANCE BASELINE TESTS

### Test P1: Supabase Query Load
1. Open Network DevTools
2. Login as passenger
3. Stay on app for 60 seconds
4. Count requests to Supabase

**Before Fix**: ~30 requests (2s polling)
**After Fix**: ~6-12 requests (5-8s polling) ✅

### Test P2: Battery/CPU Usage
1. Open app on mobile device
2. Let run for 30 minutes with screen on
3. Check battery drain rate
4. Compare before/after

**Expected**: 20-30% improvement ✅

---

## COMMON ISSUES & TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|----------|
| Auto-redirect not working | Browser requires full page reload | Hard refresh (Ctrl+Shift+R) |
| Polling requests stuck at 30/min | Old code cached | Clear cache and rebuild |
| Duplicate bookings still showing | Dedup not applied everywhere | Check all files updated |
| Password visible in storage | Old version still active | Full logout and login |

---

## SIGN-OFF CHECKLIST

- [ ] All 4 Phase 1 critical fixes tested
- [ ] All 1 Phase 2 high priority fix tested
- [ ] No regression in existing features
- [ ] Performance metrics improved
- [ ] Mobile app tested
- [ ] Admin panel working
- [ ] Ready for production deployment

---

**Test Date**: _______________
**Tester Name**: _______________
**All Tests Passed**: [ ] Yes [ ] No
**Issues Found**: _______________
