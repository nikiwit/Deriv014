# Contract Data Collection & UI Enhancements

## Overview

Enhanced the contract signing flow to properly handle user responses during data collection, extract job details from RAG, and display a visual badge when in contract negotiation mode.

---

## What Was Added

### 1. Data Collection State Management ✅

**Database Schema Update:**
- Added `contract_collection_state` TEXT column to `chat_sessions` table
- Stores JSON state for tracking which field is being collected

**Format:**
```json
{
  "collecting_field": "fullName",
  "missing_fields": [...],
  "started_at": "2026-02-14T10:00:00"
}
```

### 2. Smart Field Collection Handler ✅

**File**: `backend/app/routes/employee_contract.py`

**New Functions:**

#### `process_field_response()`
Processes user responses to field collection questions:
- Validates and parses user input
- Updates employee context and database
- Moves to next field or generates contract when complete
- Handles cancellation ("cancel", "exit", "quit")

#### `_parse_field_value()`
Intelligent parsing for different field types:
- **fullName**: Requires at least 2 words
- **nric**: Extracts NRIC pattern (950620-08-1234), adds dashes if missing
- **nationality**: Detects "Malaysian" or extracts country name
- **dateOfBirth**: Multiple date format support (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
- **bankName**: Accepts any reasonable bank name
- **accountHolder**: Minimum 2 characters
- **accountNumber**: Extracts 8-16 digit numbers

#### `_update_user_field()`
Updates the users table with collected data:
- Maps field keys to database columns
- Handles fullName splitting (first_name, last_name)
- Direct database updates for immediate persistence

#### `_set_collection_state()` / `_get_collection_state()` / `_clear_collection_state()`
State management functions for tracking collection progress

### 3. RAG-Based Job Details Extraction ✅

**File**: `backend/app/routes/employee_contract.py`

#### `_extract_job_details_from_rag()`
Automatically extracts missing job details from onboarding documents:

**Extraction Patterns:**
- **Position/Title**: Searches for "position:", "title:", "role:", or "as a [role]"
- **Department**: Searches for "department:", "team:", "division:"
- **Start Date**: Multiple date format detection in context of "start date", "commence", "joining"

**Workflow:**
1. Queries RAG with employee name and email
2. Parses response using regex patterns
3. Updates merged employee data with extracted values
4. Only asks user for fields that couldn't be extracted

**Example RAG Query:**
```
Extract the following details for employee John Doe (john@company.com) from onboarding records, 
offer letters, HR assignments, or any related documents:
- position title, department, start date

Return the information in a clear format with field names and values.
```

### 4. Employee Chat Integration ✅

**File**: `backend/app/routes/employee_chat.py`

**Enhanced Flow:**
```
User Message
    ↓
Check contract_collection_state
    ↓
If collecting → process_field_response()
    ↓
If active session → check modification keywords
    ↓
Otherwise → normal intent classification
```

**Collection State Check (before intent classification):**
```python
if session_data.data and session_data.data[0].get("contract_collection_state"):
    # Route to field response handler
    result = process_field_response(
        session_id=session_id,
        user_response=message,
        employee_context=employee_context or {}
    )
```

### 5. Visual UI Badge ✅

**File**: `components/EmployeeChatAssistant.tsx`

**New State:**
- `isContractNegotiation`: Boolean flag for badge visibility

**Badge Design:**
```tsx
<div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
  <div className="flex items-center space-x-2">
    <div className="relative">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      <div className="absolute inset-0 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
    </div>
    <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
      📝 Contract Negotiation Active
    </p>
  </div>
  <div className="flex items-center space-x-1 text-xs text-blue-600">
    <span className="font-medium">Session Mode:</span>
    <span className="px-2 py-0.5 bg-blue-100 rounded-full font-bold">Contract Review</span>
  </div>
</div>
```

**Badge Activation:**
- Shows when contract is generated (`contract_ready`)
- Shows during data collection (`missing_fields`)
- Shows during contract negotiation
- Hides when contract is signed or declined
- Hides when new chat is started

**Visual Features:**
- Gradient background (blue-50 to indigo-50)
- Animated pulsing dot indicator
- Clear "Contract Negotiation Active" label
- Session mode badge showing "Contract Review"

---

## Complete User Flow Examples

### Example 1: Missing Personal Data

**User**: "I want to sign my contract"

**System**:
1. Detects missing field: `fullName`
2. Sets `contract_collection_state` in session
3. **Displays badge**: "📝 Contract Negotiation Active"
4. Asks: "What is your full name (as per NRIC/Passport)?"

**User**: "John Doe"

**System**:
1. Parses: `fullName = "John Doe"`
2. Updates database: `first_name = "John"`, `last_name = "Doe"`
3. Moves to next field: `nric`
4. Asks: "What is your NRIC number? (format: 950620-08-1234)"

**User**: "950620081234"

**System**:
1. Parses and formats: `nric = "950620-08-1234"`
2. Updates database
3. Continues until all fields collected
4. Generates and displays contract
5. Shows Sign/Reject buttons

### Example 2: RAG Extraction Success

**User**: "I want to sign my contract"

**System**:
1. Detects missing: `position_title`, `department`, `start_date`
2. Queries RAG: "Extract details for John Doe (john@company.com)..."
3. RAG finds in offer letter:
   - Position: "Senior Software Engineer"
   - Department: "Engineering"
   - Start Date: "2026-03-01"
4. Updates merged data
5. **No user questions needed** ✨
6. Generates contract immediately
7. **Displays badge**: "📝 Contract Negotiation Active"
8. Shows contract with Sign/Reject buttons

### Example 3: Partial RAG Extraction

**User**: "I want to sign my contract"

**System**:
1. Detects missing: `position_title`, `department`, `start_date`
2. Queries RAG
3. RAG finds:
   - Position: "Software Engineer" ✅
   - Department: "Engineering" ✅
   - Start Date: Not found ❌
4. Shows extracted data:
   ```
   I found some details from your onboarding records:
   - Position Title: Software Engineer
   - Department: Engineering
   
   I still need: What is your start date?
   ```
5. **Displays badge**: "📝 Contract Negotiation Active"
6. User provides start date
7. Contract generated

### Example 4: User Cancellation

**User**: "I want to sign my contract"

**System**: "What is your full name?"

**User**: "cancel"

**System**:
1. Clears `contract_collection_state`
2. **Hides badge**
3. Response: "Contract signing cancelled. You can restart by saying 'sign my contract' whenever you're ready."

---

## Data Flow Diagram

```
┌────────────────┐
│ "Sign Contract"│
└───────┬────────┘
        │
        v
┌─────────────────────┐
│ Check Missing Fields│
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    v         v
┌────────┐  ┌──────────────┐
│ Found  │  │ Missing Data │
└───┬────┘  └──────┬───────┘
    │              │
    │              v
    │       ┌──────────────┐
    │       │ Try RAG      │
    │       │ Extraction   │
    │       └──────┬───────┘
    │              │
    │         ┌────┴────┐
    │         │         │
    │         v         v
    │    ┌─────────┐  ┌──────────┐
    │    │ Partial │  │ Complete │
    │    │ Extract │  │ Extract  │
    │    └────┬────┘  └────┬─────┘
    │         │            │
    │         v            │
    │    ┌──────────┐      │
    │    │ Ask User │      │
    │    │ (Set     │      │
    │    │  State)  │      │
    │    └────┬─────┘      │
    │         │            │
    │         v            │
    │    ┌──────────┐      │
    │    │ Parse &  │      │
    │    │ Validate │      │
    │    └────┬─────┘      │
    │         │            │
    │         v            │
    │    ┌──────────┐      │
    │    │ Update   │      │
    │    │ Database │      │
    │    └────┬─────┘      │
    │         │            │
    └─────────┴────────────┘
              │
              v
       ┌──────────────┐
       │ Generate     │
       │ Contract     │
       └──────┬───────┘
              │
              v
       ┌──────────────┐
       │ Show Badge + │
       │ Contract +   │
       │ Buttons      │
       └──────────────┘
```

---

## Field Validation Examples

### ✅ Valid Inputs

| Field | Input | Parsed Output |
|-------|-------|---------------|
| fullName | "John Doe" | "John Doe" |
| nric | "950620081234" | "950620-08-1234" |
| nric | "950620-08-1234" | "950620-08-1234" |
| nationality | "Malaysian" | "Malaysian" |
| nationality | "Singapore" | "Singapore" |
| dateOfBirth | "1995-06-20" | "1995-06-20" |
| dateOfBirth | "20/06/1995" | "20/06/1995" |
| bankName | "Maybank" | "Maybank" |
| accountNumber | "1234567890" | "1234567890" |

### ❌ Invalid Inputs (Re-prompt)

| Field | Input | Issue |
|-------|-------|-------|
| fullName | "John" | Only one word |
| nric | "123" | Incomplete NRIC |
| accountNumber | "123" | Too short (< 8 digits) |

---

## Session State Tracking

### Database: `chat_sessions` table

```sql
-- Example session in data collection
SELECT 
  id,
  active_contract_negotiation,
  contract_employee_id,
  contract_collection_state
FROM chat_sessions
WHERE active_contract_negotiation = true;

-- Result:
id: "session-123"
active_contract_negotiation: true
contract_employee_id: "user-456"
contract_collection_state: '{"collecting_field":"nric","missing_fields":[...],"started_at":"2026-02-14T10:00:00"}'
```

### State Lifecycle

1. **Start**: User says "sign my contract"
   - `contract_collection_state` = NULL
   - Badge: Hidden

2. **Data Collection**: Missing fields detected
   - `contract_collection_state` = `{"collecting_field":"fullName",...}`
   - Badge: **Visible** "Contract Negotiation Active"

3. **Contract Generated**: All fields collected
   - `contract_collection_state` = NULL
   - `active_contract_negotiation` = TRUE
   - Badge: **Visible** "Contract Negotiation Active"

4. **Negotiation**: User modifies contract
   - Badge: **Visible** "Contract Negotiation Active"

5. **Signed/Declined**: Contract finalized
   - `active_contract_negotiation` = FALSE
   - Badge: **Hidden**

---

## Testing Scenarios

### Test 1: Basic Data Collection

```bash
User: "sign my contract"
Bot: "What is your full name?"
User: "Maria Ivanova"
Bot: "What is your NRIC number?"
User: "900515-10-5678"
Bot: "What is your bank name?"
User: "CIMB"
Bot: [Contract displayed with badge]
```

### Test 2: RAG Extraction

```bash
User: "sign my contract"
Bot: [RAG queries offer letter]
Bot: "I found: Position: Developer, Department: Tech"
Bot: "What is your start date?"
User: "2026-03-01"
Bot: [Contract displayed with badge]
```

### Test 3: Cancellation

```bash
User: "sign my contract"
Bot: "What is your full name?"
User: "cancel"
Bot: "Contract signing cancelled. You can restart..."
[Badge hidden]
```

### Test 4: Invalid Input

```bash
User: "sign my contract"
Bot: "What is your NRIC number?"
User: "abc123"
Bot: "I couldn't understand that. What is your NRIC number? (format: 950620-08-1234)"
User: "950620-08-1234"
Bot: "Great! Next, ..."
```

---

## Benefits

### For Users ✨
- **Smoother experience**: Clear questions, one at a time
- **Smart extraction**: Many fields auto-filled from documents
- **Visual feedback**: Badge shows when in contract mode
- **Flexible input**: Forgiving parsing (NRIC with/without dashes, etc.)
- **Easy cancellation**: Type "cancel" anytime

### For System 🛠️
- **State tracking**: Persistent collection state in database
- **Data validation**: Field-specific parsing and validation
- **RAG integration**: Automated data extraction from documents
- **Database updates**: Real-time user profile updates
- **Error handling**: Graceful fallbacks and re-prompts

---

## Configuration

### No additional configuration needed!
- Uses existing database connection
- Uses existing RAG engine
- Uses existing employee_context flow
- Automatic state management

---

## Migration Required

```bash
# Run the updated migration
psql -U your_user -d your_database -f docs/migrations/add_contract_negotiation_fields.sql
```

This adds the `contract_collection_state` column to `chat_sessions`.

---

## Files Modified

1. **`docs/supabase_schema.sql`** - Added `contract_collection_state` column
2. **`docs/migrations/add_contract_negotiation_fields.sql`** - Updated migration
3. **`backend/app/routes/employee_contract.py`** - Added data collection logic
4. **`backend/app/routes/employee_chat.py`** - Added collection state check
5. **`components/EmployeeChatAssistant.tsx`** - Added visual badge UI

---

## Future Enhancements

- [ ] Multi-language support for field questions
- [ ] Photo/document upload during collection
- [ ] Real-time validation feedback (e.g., check NRIC format as user types)
- [ ] Progress bar showing collection completion (3/7 fields)
- [ ] Voice input for data collection
- [ ] OCR for extracting data from uploaded documents

---

**Implementation Date**: February 14, 2026  
**Status**: ✅ Complete  
**No Linter Errors**: All code passes validation  
**Ready for Testing**: Yes
