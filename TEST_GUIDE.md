# ID Consistency Testing Guide

This guide helps you verify that the employee and user records are created with matching IDs.

## Quick Start

### Option 1: Automated Test Script (Recommended)

```bash
# Make sure backend is running first
cd backend
source venv/bin/activate
python run.py

# In a new terminal, run the test script
cd /Users/mariaivanova/Desktop/Deriv014_final/Deriv014
python test_id_consistency.py
```

The script will:
- ✅ Check if backend is running
- ✅ Generate a test offer letter
- ✅ Verify ID consistency in API responses
- ✅ Test offer retrieval
- ✅ Test offer acceptance
- ✅ Provide SQL queries for manual database verification

### Option 2: Manual Testing

Follow these steps to manually test the ID consistency:

---

## Manual Testing Steps

### Step 1: Start Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python run.py
```

**Terminal 2 - Frontend:**
```bash
npm start
```

### Step 2: Complete AI Onboarding

1. Open http://localhost:3000
2. Login as HR admin
3. Navigate to "Onboarding" section
4. Click "New Employee"
5. Select "AI-Powered Onboarding"
6. Answer all AI questions:
   - Email: `test@example.com`
   - Full Name: `Test Employee`
   - Position: `Software Engineer`
   - Department: `Engineering`
   - NRIC: `900101-01-1234`
   - Nationality: `Malaysian`
   - Start Date: `2026-03-01`
   - Bank Name: `Maybank`
   - Bank Account: `1234567890`
   - (and any other fields requested)

### Step 3: Verify No Database Records Yet

```sql
-- Should return 0 rows
SELECT * FROM users WHERE email = 'test@example.com';

-- Should return 0 rows
SELECT * FROM employees WHERE email = 'test@example.com';
```

✅ **Expected:** No records exist yet (data only in localStorage)

### Step 4: Generate Offer Letter

1. In the UI, scroll to "Offer Letter Generator"
2. Review all the pre-filled fields
3. Click "Finish & Generate Offer Letter"
4. Wait for success message with offer URL

### Step 5: Verify Database Records Created

```sql
-- Query 1: Check users table
SELECT id, employee_id, email, role, first_name, last_name
FROM users 
WHERE email = 'test@example.com';

-- Query 2: Check employees table
SELECT id, email, full_name, position, department, status
FROM employees 
WHERE email = 'test@example.com';
```

✅ **Expected Results:**
- Both queries return exactly 1 row
- `users.id` should be a UUID (e.g., `abc-123-def-456`)
- `users.employee_id` should be the SAME UUID
- `employees.id` should be the SAME UUID
- `users.role` should be `pending_employee`
- `employees.status` should be `pending_offer`

### Step 6: Verify ID Consistency

```sql
-- This query checks if all IDs match
SELECT 
    u.id as user_id,
    u.employee_id as user_employee_id,
    e.id as employee_id,
    u.email,
    CASE 
        WHEN u.id = e.id AND u.employee_id = e.id THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as consistency_check
FROM users u
JOIN employees e ON u.email = e.email
WHERE u.email = 'test@example.com';
```

✅ **Expected Result:**
```
user_id          | user_employee_id | employee_id      | email              | consistency_check
-----------------|------------------|------------------|--------------------|-----------------
abc-123-def-456  | abc-123-def-456  | abc-123-def-456  | test@example.com   | ✅ MATCH
```

### Step 7: Test Offer Letter Display

1. Copy the offer URL from the success message (e.g., `/offer/abc-123-def-456`)
2. Open it in a new incognito/private window (to simulate candidate without login)
3. Verify you can see the offer details
4. Verify "Accept Offer" and "Decline Offer" buttons are visible

### Step 8: Accept the Offer

1. Click "Accept Offer"
2. Verify success message appears

### Step 9: Verify Role Update

```sql
-- Query 1: Check user role updated
SELECT id, email, role, onboarding_complete
FROM users 
WHERE email = 'test@example.com';

-- Query 2: Check employee status
SELECT id, email, status
FROM employees 
WHERE email = 'test@example.com';

-- Query 3: Verify IDs still match after acceptance
SELECT 
    u.id as user_id,
    e.id as employee_id,
    u.role as user_role,
    e.status as employee_status,
    CASE 
        WHEN u.id = e.id THEN '✅ IDs STILL MATCH'
        ELSE '❌ IDs MISMATCH'
    END as id_consistency
FROM users u
JOIN employees e ON u.email = e.email
WHERE u.email = 'test@example.com';
```

✅ **Expected Results:**
- `users.role` = `employee` (changed from `pending_employee`)
- `users.id` = `employees.id` (still matching)
- No duplicate records

---

## Test Scenarios

### Scenario 1: New Employee (Happy Path)

```
Action: Complete AI onboarding → Generate offer → Accept
Expected: 
  ✅ users.id = employees.id = [same UUID]
  ✅ users.role: pending_employee → employee
  ✅ employees.status: pending_offer → active
  ✅ 1 record in each table
```

### Scenario 2: Existing Email

```
Action: Try to create offer for same email again
Expected: 
  ✅ Records updated (not duplicated)
  ✅ IDs remain the same
  ✅ Still only 1 record in each table
```

### Scenario 3: Rejection Flow

```
Action: Complete AI onboarding → Generate offer → Reject
Expected: 
  ✅ users.id = employees.id (still matching)
  ✅ users.role stays 'pending_employee'
  ✅ JSON status = 'rejected'
  ✅ Dispute record created
```

---

## Common Issues & Solutions

### Issue 1: IDs Don't Match

**Symptom:**
```sql
user_id ≠ employee_id
```

**Cause:** Old code still running (before the fix)

**Solution:**
1. Clear database test records
2. Restart backend server
3. Hard refresh frontend (Cmd+Shift+R)
4. Try again

### Issue 2: Duplicate Records

**Symptom:**
```sql
SELECT COUNT(*) FROM users WHERE email = 'test@example.com';
-- Returns: 2 or more
```

**Cause:** Old `createEmployee` call still in frontend

**Solution:**
1. Verify `NewEmployeeModeSelection.tsx` has the updated code
2. Check `triggerAnalysis` function - should NOT call `createEmployee`
3. Restart frontend: `npm start`

### Issue 3: No Records Created

**Symptom:** After clicking "Generate Offer Letter", no database records

**Cause:** Backend endpoint not being called or failing

**Solution:**
1. Check browser console for errors
2. Check backend logs for errors
3. Verify backend is running: `curl http://localhost:5001/api/health`
4. Check network tab in browser DevTools

### Issue 4: Button Stuck on "Processing..."

**Symptom:** Button never changes after clicking

**Cause:** Frontend not receiving response or error not handled

**Solution:**
1. Check browser console for errors
2. Check if backend is running
3. Look for network errors in DevTools
4. Verify backend endpoint is working: 
   ```bash
   curl -X POST http://localhost:5001/api/health
   ```

---

## Cleanup Test Data

After testing, clean up test records:

```sql
-- Delete test user
DELETE FROM users WHERE email = 'test@example.com';

-- Delete test employee
DELETE FROM employees WHERE email = 'test@example.com';

-- Delete test JSON file
-- From backend/temp_data/ folder, delete: {employee_id}_offer_approval.json
```

---

## Success Criteria Checklist

- [ ] AI onboarding completes without database writes
- [ ] "Generate Offer Letter" creates records in both tables
- [ ] `users.id` = `users.employee_id` = `employees.id`
- [ ] No duplicate records with different IDs
- [ ] Offer letter displays correctly via URL
- [ ] Accept/Reject functionality works
- [ ] Role updates from `pending_employee` to `employee` on acceptance
- [ ] IDs remain consistent throughout the entire flow
- [ ] No linter errors
- [ ] No console errors

---

## Automated Test Output Example

When you run `python test_id_consistency.py`, you should see:

```
============================================================
  ID CONSISTENCY TEST SUITE
============================================================

✅ Backend server is running

============================================================
  TEST 1: Offer Generation
============================================================

ℹ️  Generating offer for: test_abc123@example.com
✅ Offer generation successful!
ℹ️  Employee ID: abc-123-def-456
ℹ️  User ID: abc-123-def-456

✅ ID CONSISTENCY CHECK PASSED!
   Both employee_id and user_id are: abc-123-def-456

============================================================
  TEST 2: Database ID Consistency
============================================================

[SQL queries provided for manual verification]

============================================================
  TEST 3: Offer Retrieval
============================================================

✅ Offer retrieval successful!

============================================================
  TEST 4: Offer Acceptance
============================================================

✅ Offer acceptance successful!

============================================================
  TEST SUMMARY
============================================================

Total Tests: 6
Passed: 6
Failed: 0

🎉 All automated tests passed!
```

---

## Questions?

If you encounter any issues not covered here:

1. Check the detailed error messages in console/logs
2. Verify both servers are running
3. Review `ID_CONSISTENCY_FIX.md` for implementation details
4. Check `BUTTON_STUCK_FIX.md` for frontend error handling
5. Review `OFFER_LETTER_FLOW.md` for the complete flow

Happy testing! 🚀
