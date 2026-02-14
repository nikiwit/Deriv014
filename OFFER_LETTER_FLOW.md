# Offer Letter Generation & Acceptance Flow

## Complete Implementation Summary

### Overview
The system now has a complete end-to-end flow for creating employees with offer letters, from data collection through acceptance.

## User Flow

### Step 1: Data Collection (AI Onboarding)
1. User clicks "New Employee" → selects "AI Assisted"
2. AI chatbot collects all 18+ employee fields:
   - Personal: name, email, nationality, DOB, NRIC
   - Employment: position, department, start date, salary
   - Work details: location, hours, leave days, holidays policy
   - Banking: bank name, account holder, account number

### Step 2: Review & Generate (Offer Letter Generator)
1. All collected data displays in editable form
2. User reviews and can modify any field
3. Clicks "Generate Offer Letter" button
4. Backend:
   - Creates `{employee_id}_offer_approval.json` in `backend/temp_data/`
   - Creates user in database with role `'pending_employee'`
   - Returns employee_id and offer_url

### Step 3: Offer Letter Display (NEW!)
1. **Automatically shows after generation** (no more going back to list)
2. Displays professional offer letter view with:
   - Success banner with employee ID
   - Copyable offer URL to share with candidate
   - Complete offer details in organized sections:
     - Personal Information
     - Employment Details
     - Work Details
     - Banking Details
   - Two action buttons: **Accept Offer** and **Reject Offer**

### Step 4: Accept Offer
1. User clicks "Accept Offer" button
2. Backend:
   - Updates user role from `'pending_employee'` → `'employee'`
   - Updates JSON file status to `'accepted'`
   - Logs acceptance in `offer_acceptance_log` table
3. Success message: "Offer accepted successfully! Your account has been created."
4. Returns to employee list

### Step 5: Reject Offer (Alternative)
1. User clicks "Reject Offer" button
2. Modal appears asking for rejection reason
3. User enters reason and confirms
4. Backend:
   - Updates JSON file status to `'rejected'`
   - Creates record in `offer_disputes` table
   - Notifies HR via `hr_notifications` table
5. Success message: "Offer rejected. HR has been notified."
6. Returns to employee list

## Technical Implementation

### Frontend Components

#### OfferLetterDisplay Component
**Location:** `components/onboarding/NewEmployeeModeSelection.tsx`

**Features:**
- Professional card layout with gradient header
- Success banner with employee ID
- Copyable offer URL with copy button
- Four-section details display:
  - Personal Information
  - Employment Details
  - Work Details
  - Banking Details (conditional)
- Accept button (green/jade theme)
- Reject button (red theme) with modal dialog
- Loading states for async operations

**Props:**
```typescript
{
  offerData: {
    employee_id: string;
    offer_url: string;
    user_id: string;
    message: string;
  };
  employeeData: {
    full_name: string;
    email: string;
    position_title: string;
    department: string;
    // ... all other fields
  };
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
}
```

### State Management

**Onboarding.tsx Updates:**
- Added `"offer_display"` to ViewMode type
- Added state: `generatedOfferData` and `generatedEmployeeData`
- Updated `onGenerate` callback to:
  - Store offer data
  - Store employee data
  - Switch to `offer_display` view
- Added render logic for `offer_display` view
- Added `onAccept` callback to show success and return to list
- Added `onReject` callback to return to list

### Backend Endpoints

#### 1. Generate Offer Approval
**Endpoint:** `POST /api/onboarding-workflow/generate-offer-approval`

**Functionality:**
- Accepts comprehensive employee data
- Generates UUID for employee_id
- Creates JSON file with all data
- Creates user with `pending_employee` role
- Returns employee_id and offer_url

#### 2. Display Offer Letter
**Endpoint:** `GET /api/offer/<employee_id>`

**Functionality:**
- Reads JSON file from temp_data
- Returns offer data
- Provides accept/reject URLs

#### 3. Accept Offer
**Endpoint:** `POST /api/offer/<employee_id>/accept`

**Functionality:**
- Updates user role to `'employee'`
- Updates JSON status to `'accepted'`
- Logs in offer_acceptance_log
- Returns success confirmation

#### 4. Reject Offer
**Endpoint:** `POST /api/offer/<employee_id>/reject`

**Functionality:**
- Accepts rejection reason
- Updates JSON status to `'rejected'`
- Creates dispute record
- Notifies HR
- Returns dispute_id

### API Client Functions

**Location:** `services/api.ts`

```typescript
- generateOfferApproval(data) → Creates offer and user
- getOfferLetter(employeeId) → Fetches offer details
- acceptOfferLetter(employeeId) → Accepts offer
- rejectOfferLetter(employeeId, reason) → Rejects with reason
```

## Database Schema

### Users Table (Updated)
Added fields:
- `offer_url TEXT` - Link to offer letter
- `work_location TEXT`
- `work_hours TEXT`
- `leave_annual_days INTEGER`
- `leave_sick_days INTEGER`
- `public_holidays_policy TEXT`
- `date_of_birth DATE`
- `bank_name TEXT`
- `bank_account_holder TEXT`
- `bank_account_number TEXT`

Updated role constraint:
```sql
role TEXT CHECK (role IN ('hr_admin', 'employee', 'pending_employee'))
```

## Files Modified

### Frontend
1. `components/onboarding/NewEmployeeModeSelection.tsx`
   - Added OfferLetterDisplay component
   - Updated imports for accept/reject functions
   - Updated OfferLetterGenerator to pass result data

2. `components/Onboarding.tsx`
   - Added offer_display view mode
   - Added state for generated offer data
   - Updated flow to show offer display after generation
   - Added accept/reject handlers

3. `services/api.ts`
   - Added 4 new API functions
   - Added TypeScript interfaces

4. `types.ts`
   - Added 'pending_employee' to UserRole type

### Backend
1. `backend/app/routes/onboarding_workflow.py`
   - Added generate-offer-approval endpoint
   - Added offer display endpoint
   - Added accept/reject endpoints
   - Created offer_bp blueprint

2. `backend/app/routes/auth.py`
   - Updated role validation

3. `backend/app/__init__.py`
   - Registered offer_bp blueprint

4. `docs/supabase_schema.sql`
   - Updated users table schema

## Testing the Flow

1. **Start Backend:** `cd backend && python run.py`
2. **Start Frontend:** `npm run dev`
3. **Test Steps:**
   - Click "New Employee"
   - Select "AI Assisted"
   - Answer all questions in chat
   - Click "Finish & Generate Offer Letter"
   - Review data in form
   - Click "Generate Offer Letter"
   - **View offer letter display** ✅
   - Click "Copy" to copy offer URL
   - Click "Accept Offer" to create employee account
   - Verify user created with role='employee'

## Success Indicators

✅ No more stuck buttons
✅ Offer letter view automatically displays after generation
✅ Professional UI with all data organized
✅ Accept button creates employee account
✅ Reject button notifies HR with reason
✅ URL can be copied and shared
✅ Smooth transitions between views
✅ Loading states during async operations

## Next Steps (Future Enhancements)

1. Email notification when offer is generated
2. Expiration date for offer letters
3. Digital signature for acceptance
4. Print/PDF export of offer letter
5. Multi-language support for offer letters
6. Custom offer letter templates by department
