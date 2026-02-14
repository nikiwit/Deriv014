# Quick Test Guide - Contract Data Collection & UI Badge

## 🚀 Quick Start Testing

### Prerequisites
1. Run the migration:
   ```bash
   psql -U your_user -d your_database -f docs/migrations/add_contract_negotiation_fields.sql
   ```

2. Start backend and frontend:
   ```bash
   # Terminal 1
   cd backend && python run.py
   
   # Terminal 2
   npm run dev
   ```

---

## Test Scenarios (5 minutes each)

### ✅ Scenario 1: Data Collection with Questions

**Goal**: Verify system asks for missing fields and processes responses

**Steps**:
1. Login as employee
2. Say: **"I want to sign my contract"**
3. **Verify badge appears**: "📝 Contract Negotiation Active" (blue gradient at top)
4. System asks: "What is your full name?"
5. Answer: **"Maria Ivanova"**
6. System asks: "What is your NRIC number?"
7. Answer: **"900515105678"** (without dashes)
8. **Verify**: System formats it as "900515-10-5678"
9. Continue answering all questions
10. **Verify**: Contract displayed with Sign/Reject buttons
11. **Verify**: Badge still visible

**Expected**:
- ✅ Badge visible throughout
- ✅ Each field asked one at a time
- ✅ NRIC formatted automatically
- ✅ Contract generated after all fields collected

---

### ✅ Scenario 2: RAG Auto-Extraction

**Goal**: Verify system extracts data from documents

**Prerequisites**: Employee has offer letter or onboarding documents in RAG

**Steps**:
1. Say: **"sign my contract"**
2. **Verify badge appears**
3. **Watch for**: "I found some details from your onboarding records:"
4. System shows auto-extracted fields
5. System only asks for missing fields (if any)

**Expected**:
- ✅ Badge visible
- ✅ System shows what it found
- ✅ Fewer questions (or none if all extracted)
- ✅ Contract generated quickly

---

### ✅ Scenario 3: Invalid Input Handling

**Goal**: Verify validation and re-prompts

**Steps**:
1. Say: **"sign my contract"**
2. System asks: "What is your full name?"
3. Answer: **"John"** (only one word)
4. **Verify**: System says "I couldn't understand that" and asks again
5. Answer: **"John Doe"** (correct)
6. System moves to next field
7. When asked for NRIC, answer: **"123"**
8. **Verify**: System asks again
9. Answer: **"950620-08-1234"** (correct)

**Expected**:
- ✅ Badge stays visible during errors
- ✅ Helpful error messages
- ✅ System re-asks same field
- ✅ Valid input accepted and moves forward

---

### ✅ Scenario 4: Cancellation

**Goal**: Verify user can exit data collection

**Steps**:
1. Say: **"sign my contract"**
2. **Verify badge appears**
3. System asks first question
4. Answer: **"cancel"**
5. **Verify badge disappears**
6. **Verify**: Message says "Contract signing cancelled..."
7. Say: **"sign my contract"** again
8. **Verify**: Process restarts from beginning

**Expected**:
- ✅ Badge disappears on cancel
- ✅ Clear cancellation message
- ✅ Can restart anytime

---

### ✅ Scenario 5: Contract Modification with Badge

**Goal**: Verify badge stays during negotiation

**Steps**:
1. Complete data collection to get contract displayed
2. **Verify badge visible**: "Contract Negotiation Active"
3. Say: **"change my start date to next week"**
4. **Verify badge stays visible**
5. System processes modification
6. **Verify badge still visible**
7. Click **"Sign Contract"**
8. **Verify badge disappears** after signing

**Expected**:
- ✅ Badge visible throughout negotiation
- ✅ Badge disappears only after sign/reject

---

## Visual Verification Checklist

### Badge Appearance
- [ ] Gradient background (blue-50 to indigo-50)
- [ ] Pulsing blue dot animation
- [ ] Text: "📝 Contract Negotiation Active"
- [ ] Right side shows "Session Mode: Contract Review"
- [ ] Positioned below profile banner

### Badge Visibility Rules
- [ ] **Show** when: contract request started
- [ ] **Show** when: collecting data (asking questions)
- [ ] **Show** when: contract displayed
- [ ] **Show** when: negotiating changes
- [ ] **Hide** when: contract signed
- [ ] **Hide** when: contract rejected
- [ ] **Hide** when: new chat started
- [ ] **Hide** when: user cancels

---

## Database Verification

### Check Collection State
```sql
-- Should have state when asking questions
SELECT 
  id,
  contract_collection_state
FROM chat_sessions
WHERE contract_collection_state IS NOT NULL;

-- Example output:
-- {"collecting_field":"nric","missing_fields":[...],"started_at":"..."}
```

### Check User Updates
```sql
-- Verify field was updated
SELECT 
  first_name,
  last_name,
  nric,
  nationality
FROM users
WHERE id = 'your-user-id';
```

---

## Common Issues & Fixes

### Issue: Badge not showing
**Fix**: Check browser console for errors, refresh page

### Issue: Data not persisting
**Fix**: Check database connection, verify migration ran

### Issue: RAG not extracting
**Fix**: Verify documents are in RAG index, check logs

### Issue: Invalid input loops forever
**Fix**: Type "cancel" to exit, then restart

---

## Quick Command Reference

```bash
# Check migration applied
psql -U user -d db -c "SELECT column_name FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='contract_collection_state';"

# View active sessions
psql -U user -d db -c "SELECT * FROM chat_sessions WHERE active_contract_negotiation = true;"

# Clear test data
psql -U user -d db -c "UPDATE chat_sessions SET active_contract_negotiation = false, contract_collection_state = null WHERE active_contract_negotiation = true;"
```

---

## Success Criteria

All tests should show:
- ✅ Badge appears and disappears correctly
- ✅ Data collection flows smoothly
- ✅ User responses processed correctly
- ✅ Database updated in real-time
- ✅ RAG extraction works when available
- ✅ Validation catches errors
- ✅ Cancellation works cleanly

---

**Total Test Time**: ~25 minutes for all scenarios  
**Recommended**: Test in order listed above  
**Browser**: Chrome/Firefox recommended for best badge animations
