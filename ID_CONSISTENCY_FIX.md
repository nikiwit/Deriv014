# ID Consistency Fix - Unified Record Creation

## Problem Identified

### Before Fix: Duplicate Records with Mismatched IDs

**Two separate creation points:**

1. **AIOnboarding.triggerAnalysis** (line 455)
   - Called after AI chat completes
   - Created record in `employees` table
   - Generated ID: `ID_A` (e.g., "abc-123-def")
   - ID was NOT stored or passed forward

2. **generate_offer_approval endpoint** (backend)
   - Called when "Generate Offer Letter" clicked
   - Created record in `users` table
   - Generated NEW ID: `ID_B` (e.g., "xyz-789-ghi")
   - **Result: ID_A ≠ ID_B** ❌

### Consequences

- Two records for same employee with different IDs
- `users.employee_id` points to non-existent employee
- Foreign key relationships broken
- Data inconsistency in database
- Difficult to track employee across tables

## Solution Implemented: Option B

### Single Point of Record Creation

**All records created in ONE place:** `generate_offer_approval` endpoint

**Creates in BOTH tables with SAME ID:**
- `users` table: role = `pending_employee`
- `employees` table: status = `pending_offer`
- Both use: `employee_id` (UUID)

### Implementation Details

#### 1. Removed Duplicate Creation from Frontend

**File:** `components/onboarding/NewEmployeeModeSelection.tsx`

**Changed:** `triggerAnalysis` function (line ~446)

**Before:**
```typescript
// Create employee in backend
try {
  await createEmployee({
    email: data.email,
    full_name: data.fullName,
    // ... other fields
  });
} catch (err) {
  console.error("Backend employee creation failed:", err);
}
```

**After:**
```typescript
// NOTE: Employee record creation removed from here
// Will be created in generate_offer_approval endpoint with matching IDs
// This prevents duplicate records with mismatched IDs

// Store data in localStorage for offer letter generation
try {
  localStorage.setItem(
    "preliminaryEmployeeData",
    JSON.stringify({
      ...data,
      createdAt: new Date().toISOString(),
    }),
  );
} catch (e) {
  console.warn("Failed to save preliminary data:", e);
}
```

#### 2. Enhanced Backend to Create Both Records

**File:** `backend/app/routes/onboarding_workflow.py`

**Endpoint:** `POST /api/onboarding-workflow/generate-offer-approval`

**New Logic:**

```python
# Generate single UUID for both tables
employee_id = str(uuid.uuid4())

# Create/update in users table
user_data = {
    "id": employee_id,  # Use same ID
    "email": email,
    "first_name": first_name,
    "last_name": last_name,
    "role": "pending_employee",
    "employee_id": employee_id,  # Self-reference
    # ... all other fields
}

db.table("users").insert(user_data).execute()

# Create/update in employees table with SAME ID
employee_data = {
    "id": employee_id,  # CRITICAL: Same ID as users table
    "email": email,
    "full_name": full_name,
    "position": position_title,
    "department": department,
    "status": "pending_offer",
    # ... all other fields
}

db.table("employees").insert(employee_data).execute()
```

### Database Consistency Achieved

```
users table:
┌──────────────┬──────────────┬──────────────┬──────────────────┐
│ id           │ employee_id  │ email        │ role             │
├──────────────┼──────────────┼──────────────┼──────────────────┤
│ abc-123-def  │ abc-123-def  │ john@co.com  │ pending_employee │
└──────────────┴──────────────┴──────────────┴──────────────────┘
                     ↓ MATCH! ↓
employees table:
┌──────────────┬──────────────┬────────────────┬────────────────┐
│ id           │ email        │ full_name      │ status         │
├──────────────┼──────────────┼────────────────┼────────────────┤
│ abc-123-def  │ john@co.com  │ John Doe       │ pending_offer  │
└──────────────┴──────────────┴────────────────┴────────────────┘
```

## Updated Flow

### 1. AI Onboarding Phase
```
User answers questions → Data stored in localStorage → No DB records yet
```

### 2. Offer Letter Generation Phase
```
Click "Generate Offer Letter"
    ↓
generate_offer_approval endpoint called
    ↓
Generate single UUID: employee_id
    ↓
Create JSON file: {employee_id}_offer_approval.json
    ↓
Create in users table (id = employee_id, role = pending_employee)
    ↓
Create in employees table (id = employee_id, status = pending_offer)
    ↓
Return employee_id and offer_url
```

### 3. Offer Acceptance Phase
```
Candidate opens /offer/{employee_id}
    ↓
View offer details
    ↓
Click Accept
    ↓
Update users.role: pending_employee → employee
    ↓
Update employees.status: pending_offer → active
```

## Benefits

### 1. Data Consistency
- Single ID across all tables
- Foreign keys work correctly
- Easy to join tables and track employee

### 2. No Duplicates
- One creation point = one set of records
- No risk of orphaned records
- Cleaner database

### 3. Simpler Logic
- No need to track multiple IDs
- No need to sync between tables manually
- One API call does everything

### 4. Better Performance
- One less API call during AI chat
- Faster onboarding flow
- Reduced database writes

### 5. Easier Debugging
- Single source of truth
- Clear ownership of record creation
- Easier to trace issues

## Database Schema Alignment

### users table (ID = employee_id)
```sql
id              = abc-123-def  -- PRIMARY KEY
employee_id     = abc-123-def  -- Same value (self-reference)
email           = john@co.com
role            = pending_employee
```

### employees table (ID = employee_id)
```sql
id              = abc-123-def  -- PRIMARY KEY (SAME as users.id)
email           = john@co.com
full_name       = John Doe
status          = pending_offer
```

### Foreign Key Relationships Now Work
```sql
-- Other tables can reference either:
generated_documents.employee_id → employees.id ✅
hr_employee_assignments.employee_user_id → users.id ✅
```

## Testing Verification

### Step 1: AI Onboarding
- Complete AI chat
- Check: NO records in database yet ✅
- Data only in localStorage ✅

### Step 2: Generate Offer Letter
- Click button
- Check database:
  ```sql
  SELECT id, employee_id, email, role FROM users WHERE email='test@example.com';
  -- Should return: id=X, employee_id=X (matching)
  
  SELECT id, email, status FROM employees WHERE email='test@example.com';
  -- Should return: id=X (same X as above)
  ```
- Verify: `users.id == users.employee_id == employees.id` ✅

### Step 3: Accept Offer
- Candidate accepts
- Check database:
  ```sql
  SELECT role FROM users WHERE id='X';
  -- Should return: role='employee'
  
  SELECT status FROM employees WHERE id='X';
  -- Should return: status='active'
  ```

## Files Modified

1. **`components/onboarding/NewEmployeeModeSelection.tsx`**
   - Removed `createEmployee` call from `triggerAnalysis`
   - Added localStorage storage instead
   - Updated completion message

2. **`backend/app/routes/onboarding_workflow.py`**
   - Enhanced `generate_offer_approval` endpoint
   - Creates in both `users` and `employees` tables
   - Uses same `employee_id` for both
   - Handles updates for existing records
   - Added better error handling

## Migration Notes

### For Existing Data
If you have existing mismatched records, you may need to:

1. **Identify mismatches:**
```sql
SELECT u.id, u.employee_id, e.id 
FROM users u 
LEFT JOIN employees e ON u.email = e.email
WHERE u.id != e.id;
```

2. **Fix manually or create migration script**

### For New Installations
- Clean slate, no migration needed
- All new records will have matching IDs

## Success Criteria

- [ ] No `createEmployee` call in AIOnboarding
- [ ] `generate_offer_approval` creates both records
- [ ] `users.id == users.employee_id == employees.id`
- [ ] No duplicate records with different IDs
- [ ] Foreign keys work correctly
- [ ] Can query across tables easily
- [ ] Offer acceptance updates both tables correctly

## Result

Single source of truth for employee record creation with guaranteed ID consistency across all database tables!
