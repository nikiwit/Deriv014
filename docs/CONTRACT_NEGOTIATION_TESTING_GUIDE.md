# Contract Negotiation Flow - Testing Guide

## Overview

This guide provides comprehensive testing procedures for the contract signing and negotiation flow, including intent bypass, policy compliance checks, and JSON tracking.

---

## Prerequisites

1. **Database Setup**: Run the migration to add new columns to `chat_sessions` table:
   ```bash
   # Execute the migration SQL
   psql -U your_user -d your_database -f docs/migrations/add_contract_negotiation_fields.sql
   ```

2. **Backend Running**: Ensure the Flask backend is running:
   ```bash
   cd backend
   python run.py
   ```

3. **Frontend Running**: Ensure the Next.js frontend is running:
   ```bash
   npm run dev
   ```

4. **Test User**: Have a test employee profile ready with:
   - Full name
   - Email
   - NRIC
   - Nationality
   - Bank details

---

## Test Scenarios

### Scenario 1: Initial Contract Request

**Objective**: Verify contract generation and session activation

**Steps**:
1. Log in as an employee
2. Navigate to the chat interface
3. Send message: "I want to sign my contract"
4. **Expected Results**:
   - Intent classification detects `SIGN_CONTRACT_REQUEST`
   - Contract is generated and displayed in markdown
   - Sign/Reject buttons appear
   - Session flag `active_contract_negotiation` set to `TRUE` in database
   - JSON file created in `backend/temp_data/{user_id}_contract.json`

**Verification**:
```bash
# Check database
SELECT id, active_contract_negotiation, contract_employee_id FROM chat_sessions WHERE active_contract_negotiation = true;

# Check JSON file exists
ls -la backend/temp_data/
```

---

### Scenario 2: Intent Bypass Verification

**Objective**: Verify subsequent messages skip intent classification

**Steps**:
1. After contract is displayed, send various messages:
   - "What is my salary?"
   - "When do I start?"
   - "Tell me about my position"
2. **Expected Results**:
   - Messages bypass IntentClassifier
   - Responses are contextual to the contract
   - Session remains in contract negotiation mode

**Backend Verification**:
Add debug logging in `employee_chat.py`:
```python
if session_data.data and session_data.data[0].get("active_contract_negotiation"):
    print("DEBUG: Bypassing intent classification for active contract session")
```

---

### Scenario 3: Successful Contract Modification (Compliant)

**Objective**: Test approved modification flow

**Test Cases**:

#### 3a. Change Start Date
**Steps**:
1. Send: "Can I change my start date to next week?"
2. **Expected Results**:
   - Modification detected via keywords
   - `contract_negotiation.py` parses request
   - Policy agent validates (should pass)
   - JSON file updated with new start date
   - Modification logged in `modification_history`
   - Success message displayed with updated contract
   - Sign/Reject buttons remain visible with updated data

**Verification**:
```bash
# Check JSON file
cat backend/temp_data/{user_id}_contract.json | jq '.modification_history'
```

#### 3b. Change Position
**Steps**:
1. Send: "Update my position to Senior Developer"
2. **Expected Results**:
   - Position updated
   - Compliance check passes
   - Updated contract displayed

#### 3c. Change Department
**Steps**:
1. Send: "Change my department to Engineering"
2. **Expected Results**:
   - Department updated
   - Contract reflects new department

---

### Scenario 4: Rejected Contract Modification (Non-Compliant)

**Objective**: Test rejection flow with policy violations

**Test Cases**:

#### 4a. Salary Below Minimum Wage (Malaysia)
**Steps**:
1. Send: "Can I change my salary to RM 1000?"
2. **Expected Results**:
   - Modification detected
   - Policy agent validates
   - **Rejection**: Salary below RM1,500 minimum wage
   - Rejection message with reasons displayed
   - Original contract unchanged
   - Rejection logged in modification history

**Expected Response**:
```markdown
## Contract Modification Rejected ❌

Your requested change cannot be approved due to policy compliance issues.

**Modified Field:** Salary  
**Requested Value:** 1000  
**Risk Level:** HIGH

### Reasons for Rejection
- Salary RM1000 is below Malaysia minimum wage (RM1,500)

### Recommendations
- Please contact HR for alternative options.
```

#### 4b. Invalid Start Date (Past Date)
**Steps**:
1. Send: "Change my start date to 2020-01-01"
2. **Expected Results**:
   - **Rejection**: Start date cannot be in the past
   - Error message displayed

---

### Scenario 5: Multiple Sequential Modifications

**Objective**: Test multiple changes in one session

**Steps**:
1. "Change my start date to 2026-03-01" → **Approved**
2. "Update my salary to RM 5000" → **Approved**
3. "Change my salary to RM 500" → **Rejected** (below minimum)
4. "Change my department to Marketing" → **Approved**

**Expected Results**:
- All modifications logged in order
- JSON file shows complete history
- Final contract reflects only approved changes

**Verification**:
```bash
cat backend/temp_data/{user_id}_contract.json | jq '.modification_history[]'
```

Expected output:
```json
[
  {
    "timestamp": "2026-02-14T10:30:00",
    "modification": {"field": "start_date", "new_value": "2026-03-01"},
    "approved": true
  },
  {
    "timestamp": "2026-02-14T10:31:00",
    "modification": {"field": "salary", "new_value": "5000"},
    "approved": true
  },
  {
    "timestamp": "2026-02-14T10:32:00",
    "modification": {"field": "salary", "new_value": "500"},
    "approved": false,
    "rejection_reason": ["Salary RM500 is below Malaysia minimum wage (RM1,500)"]
  },
  {
    "timestamp": "2026-02-14T10:33:00",
    "modification": {"field": "department", "new_value": "Marketing"},
    "approved": true
  }
]
```

---

### Scenario 6: Contract Signing After Modifications

**Objective**: Verify final signing with modified contract

**Steps**:
1. Make some approved modifications
2. Click "Sign Contract" button or send "I'm ready to sign"
3. **Expected Results**:
   - Existing `sign_contract` flow executes
   - Final contract with all modifications is signed
   - Session flag `active_contract_negotiation` set back to `FALSE`
   - Final signed contract stored

**Verification**:
```sql
-- Check session is deactivated
SELECT active_contract_negotiation FROM chat_sessions WHERE id = '{session_id}';
-- Should return FALSE

-- Check contract is signed
SELECT status FROM contracts WHERE employee_id = '{user_id}';
-- Should return 'active' or 'signed'
```

---

### Scenario 7: Context-Aware Responses (Non-Modification)

**Objective**: Test contextual responses without modification

**Test Cases**:

1. "What is my salary?"
   - **Expected**: Shows current salary from JSON, offers to negotiate

2. "When do I start?"
   - **Expected**: Shows start date, offers to change

3. "What's my position?"
   - **Expected**: Shows position, offers to discuss

4. "Thank you"
   - **Expected**: Contextual response within contract session

---

## Edge Cases & Error Handling

### Edge Case 1: JSON File Missing
**Trigger**: Delete the JSON file while session is active
```bash
rm backend/temp_data/{user_id}_contract.json
```
**Expected**: Error message: "Contract file not found. Please restart the contract signing process."

### Edge Case 2: Invalid JSON Format
**Trigger**: Corrupt the JSON file
**Expected**: Graceful error handling with HR contact suggestion

### Edge Case 3: Concurrent Modifications
**Trigger**: Multiple browser tabs with same user
**Expected**: Last modification wins (file-based locking not implemented yet)

### Edge Case 4: Ambiguous Modification Request
**Steps**: Send "I want more money"
**Expected**: 
- System may not parse clearly
- RAG fallback used
- May ask for clarification: "What specific salary would you like?"

---

## Policy Agent Compliance Checks

### Tested Validations:

1. **Salary Validation** (`_validate_salary_change`):
   - ✅ Minimum wage: MY RM1,500, SG SGD1,400
   - ✅ Maximum reasonable: < 50,000 (warns if higher)
   - ✅ Numeric format validation

2. **Start Date Validation** (`_validate_start_date`):
   - ✅ Cannot be in the past
   - ✅ Cannot be > 1 year in future (warns)
   - ✅ Date format validation (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)

3. **Policy Agent Integration** (`_check_compliance`):
   - ✅ Jurisdiction-specific rules (MY vs SG)
   - ✅ Risk level assessment (low, medium, high)
   - ✅ Statutory references

---

## Monitoring & Debugging

### View Logs
```bash
# Backend logs
tail -f backend/logs/app.log

# Check for intent bypass
grep "Bypassing intent classification" backend/logs/app.log

# Check for negotiation calls
grep "Contract negotiation" backend/logs/app.log
```

### Inspect Session State
```sql
-- Active contract sessions
SELECT 
    cs.id,
    cs.active_contract_negotiation,
    cs.contract_employee_id,
    cs.created_at,
    COUNT(cm.id) as message_count
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
WHERE cs.active_contract_negotiation = true
GROUP BY cs.id;
```

### Inspect Contract JSON Files
```bash
# List all contract files
ls -lh backend/temp_data/*_contract.json

# View specific contract
cat backend/temp_data/{user_id}_contract.json | jq '.'

# View modification history only
cat backend/temp_data/{user_id}_contract.json | jq '.modification_history'
```

---

## Cleanup & Reset

### Reset Test Session
```sql
-- Clear active contract flag
UPDATE chat_sessions 
SET active_contract_negotiation = false, 
    contract_employee_id = null 
WHERE id = '{session_id}';

-- Clear chat messages
DELETE FROM chat_messages WHERE session_id = '{session_id}';
```

### Clear Test Data
```bash
# Remove contract JSON files
rm backend/temp_data/*_contract.json

# Keep .gitkeep and README.md
```

---

## Known Issues & Limitations

1. **No File Locking**: Concurrent modifications may cause race conditions
2. **Date Parsing**: Relative dates ("next week") use simple +7 days logic
3. **LLM Parsing Fallback**: May not always extract field/value correctly
4. **No Rollback**: Once modified, can't undo without restarting contract flow
5. **Session Timeout**: Long inactive sessions may lose state

---

## Success Criteria

✅ All test scenarios pass  
✅ No linter errors  
✅ Database schema updated correctly  
✅ JSON files created and updated properly  
✅ Policy compliance enforced  
✅ Frontend displays responses correctly  
✅ Intent bypass works as expected  
✅ Modification history tracked accurately

---

## Troubleshooting

### Problem: Intent classification still running during contract session
**Solution**: Check database - ensure `active_contract_negotiation = true`

### Problem: Modification not detected
**Solution**: Check keyword patterns in `_is_contract_modification_request()`

### Problem: Policy agent rejects everything
**Solution**: Check `policy_agent.py` initialization and method signatures

### Problem: JSON file not created
**Solution**: Check `temp_data/` directory permissions and path resolution

### Problem: Frontend not showing updated contract
**Solution**: Check `data.updated_contract` is being passed and `setPendingConsent` is called

---

## Performance Benchmarks

Target response times:
- Initial contract generation: < 2s
- Modification request: < 1s
- Policy compliance check: < 500ms
- JSON file update: < 100ms

---

## Next Steps / Future Enhancements

1. Add WebSocket support for real-time updates
2. Implement file locking for concurrent access
3. Add undo/rollback functionality
4. Enhanced LLM parsing for ambiguous requests
5. Multi-step negotiation wizard
6. Email notifications for modifications
7. HR dashboard for monitoring negotiations
8. Contract version comparison view

---

**Last Updated**: 2026-02-14  
**Version**: 1.0  
**Author**: Contract Negotiation System
