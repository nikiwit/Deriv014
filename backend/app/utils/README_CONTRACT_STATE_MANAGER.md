# ContractStateManager - Usage Guide

## Overview

The `ContractStateManager` class provides a centralized interface for managing contract data collection state across multiple storage locations (database, template files, and users table).

## Quick Start

```python
from app.utils.contract_state_manager import ContractStateManager

# Initialize
manager = ContractStateManager(session_id, user_id)

# Start collection
result = manager.initialize_collection(jurisdiction="MY", initial_data={
    "position_title": "Software Engineer",
    "department": "Engineering"
})

# Update a field (triple-update happens automatically)
result = manager.update_collected_field(
    field_key="fullName",
    value="John Doe",
    section="personal_details"
)

# Check current state
state = manager.get_state()
print(f"Collected: {len(state['collected_data'])} fields")

# Finalize (rename template to contract)
result = manager.finalize_collection()

# Load finalized contract
contract = manager.load_contract()
```

## API Reference

### Constructor

```python
ContractStateManager(session_id: str, user_id: str)
```

**Parameters:**
- `session_id`: Active chat session ID
- `user_id`: Employee/user UUID

**Properties:**
- `template_path`: Path to `{user_id}_contract_template.json`
- `contract_path`: Path to `{user_id}_contract.json`

### Methods

#### `initialize_collection()`

Creates template file, sets database flags, and initializes collection state.

```python
def initialize_collection(
    jurisdiction: str, 
    initial_data: Optional[Dict] = None
) -> Dict
```

**Parameters:**
- `jurisdiction`: "MY" or "SG"
- `initial_data`: Pre-populated fields (e.g., from RAG)

**Returns:**
```json
{
  "status": "initialized",
  "template_path": "backend/temp_data/uuid_contract_template.json",
  "collection_state": {...}
}
```

**Side Effects:**
- Creates template file
- Sets `active_contract_negotiation = TRUE`
- Sets `contract_employee_id`
- Initializes `contract_collection_state` in DB

---

#### `update_collected_field()`

Performs triple-update: collection_state + users table + template file.

```python
def update_collected_field(
    field_key: str,
    value: Any,
    field_schema: Optional[Dict] = None,
    section: str = "personal_details"
) -> Dict
```

**Parameters:**
- `field_key`: Field identifier (e.g., "fullName", "nric")
- `value`: Validated field value
- `field_schema`: Schema definition (for validation)
- `section`: Template section ("personal_details", "banking_details", "employment_details")

**Returns:**
```json
{
  "status": "updated",
  "field": "fullName",
  "value": "John Doe",
  "collected_count": 4,
  "remaining_fields": 6
}
```

**Side Effects:**
1. Updates `contract_collection_state.collected_data` in DB
2. Updates corresponding field in `users` table
3. Updates template file section
4. Increments `collection_progress.collected_fields`
5. Updates `missing_fields` list

**Error Handling:**
Returns `{"status": "error", "error": "..."}` if any update fails.

---

#### `finalize_collection()`

Completes collection: renames template to contract, clears collection state.

```python
def finalize_collection() -> Dict
```

**Returns:**
```json
{
  "status": "finalized",
  "contract_path": "backend/temp_data/uuid_contract.json",
  "contract_data": {...}
}
```

**Side Effects:**
- Validates all required fields present
- Sets template `status = "ready_for_signature"`
- Adds `finalized_at` timestamp
- Renames template → contract
- Clears `contract_collection_state` in DB
- Keeps `active_contract_negotiation = TRUE`

**Validation:**
- Fails if missing fields remain
- Fails if template file not found

---

#### `resume_collection()`

Resumes from existing state (for session resumption).

```python
def resume_collection() -> Dict
```

**Returns:**
```json
{
  "status": "resumed",
  "collected_count": 5,
  "remaining_fields": [...],
  "collected_data": {...},
  "resume_count": 2
}
```

**Side Effects:**
- Increments `resume_count`
- Updates `last_resumed` timestamp

---

#### `get_state()`

Retrieves current collection state from database.

```python
def get_state() -> Optional[Dict]
```

**Returns:**
```json
{
  "collecting_field": "fullName",
  "missing_fields": [...],
  "collected_data": {...},
  "template_file_path": "...",
  "started_at": "2026-02-14T10:30:00",
  "last_updated": "2026-02-14T10:35:00",
  "resume_count": 0
}
```

**Returns `None` if:**
- No collection state found
- JSON parse error

---

#### `clear_state()`

Clears all collection state (for cancellation or errors).

```python
def clear_state() -> Dict
```

**Returns:**
```json
{
  "status": "cleared"
}
```

**Side Effects:**
- Deletes template file (if exists)
- Sets `active_contract_negotiation = FALSE`
- Clears `contract_employee_id`
- Clears `contract_collection_state`

**Note:** Does NOT rollback users table updates.

---

#### `load_template()`

Loads template file if it exists.

```python
def load_template() -> Optional[Dict]
```

**Returns:** Template data dict or `None`

---

#### `load_contract()`

Loads finalized contract file if it exists.

```python
def load_contract() -> Optional[Dict]
```

**Returns:** Contract data dict or `None`

---

## Usage Patterns

### Pattern 1: Fresh Contract Collection

```python
# Step 1: Initialize
manager = ContractStateManager(session_id, user_id)
init_result = manager.initialize_collection("MY", {
    "position_title": "Engineer",
    "department": "IT",
    "start_date": "2026-03-01"
})

# Step 2: Collect fields one by one
fields_to_collect = [
    ("fullName", "John Doe"),
    ("nric", "950620-08-1234"),
    ("nationality", "Malaysian"),
    # ... more fields
]

for field_key, value in fields_to_collect:
    section = "personal_details" if field_key in [...] else "banking_details"
    result = manager.update_collected_field(field_key, value, section=section)
    
    if result["status"] == "error":
        print(f"Failed to update {field_key}: {result['error']}")
        break

# Step 3: Finalize
finalize_result = manager.finalize_collection()
if finalize_result["status"] == "finalized":
    print("Contract ready for signature!")
```

### Pattern 2: Session Resumption

```python
manager = ContractStateManager(session_id, user_id)

# Check for existing state
state = manager.get_state()

if state and state.get("collected_data"):
    # Resume from existing state
    resume_result = manager.resume_collection()
    
    collected = resume_result["collected_data"]
    remaining = resume_result["remaining_fields"]
    
    print(f"Resuming: {len(collected)} fields already collected")
    print(f"Next field: {remaining[0]['key']}")
else:
    # Start fresh
    manager.initialize_collection("MY")
```

### Pattern 3: Error Recovery

```python
manager = ContractStateManager(session_id, user_id)

# Update with retry logic
max_retries = 3
for attempt in range(max_retries):
    result = manager.update_collected_field("fullName", "John Doe")
    
    if result["status"] == "updated":
        break
    elif attempt < max_retries - 1:
        time.sleep(1)  # Brief delay before retry
        continue
    else:
        # All retries failed - clear state and notify
        manager.clear_state()
        send_notification("Contract collection failed")
```

### Pattern 4: Cancellation

```python
manager = ContractStateManager(session_id, user_id)

# User cancels mid-collection
if user_input.lower() == "cancel":
    result = manager.clear_state()
    
    return {
        "status": "cancelled",
        "response": "Contract signing cancelled. You can restart anytime."
    }
```

## Data Consistency

### Triple-Update Guarantee

Every `update_collected_field()` call updates **all three** storage locations:

1. **Database** (`chat_sessions.contract_collection_state`):
   ```json
   {
     "collected_data": {
       "fullName": "John Doe"
     }
   }
   ```

2. **Users Table** (`users.first_name`, `users.last_name`):
   ```sql
   UPDATE users SET first_name='John', last_name='Doe' WHERE id='uuid';
   ```

3. **Template File** (`backend/temp_data/{user_id}_contract_template.json`):
   ```json
   {
     "personal_details": {
       "fullName": "John Doe"
     }
   }
   ```

### Failure Handling

If any update fails:
- Function returns `{"status": "error"}`
- Partial updates may exist (no automatic rollback)
- Logging captures which storage failed
- Manual cleanup may be required

**Best Practice**: Always check return status:

```python
result = manager.update_collected_field(...)
if result["status"] != "updated":
    logger.error(f"Update failed: {result.get('error')}")
    # Handle error appropriately
```

## File Structure

### Template File

**Location**: `backend/temp_data/{user_id}_contract_template.json`

**Content**:
```json
{
  "employee_id": "uuid",
  "session_id": "uuid",
  "status": "collecting_data",
  "jurisdiction": "MY",
  "created_at": "2026-02-14T10:30:00",
  "last_updated": "2026-02-14T10:35:00",
  "personal_details": {
    "fullName": "John Doe",
    "nric": "950620-08-1234",
    "nationality": "Malaysian",
    "dateOfBirth": "1995-06-20"
  },
  "banking_details": {
    "bankName": "Maybank",
    "accountHolder": "John Doe",
    "accountNumber": "1234567890"
  },
  "employment_details": {
    "position_title": "Software Engineer",
    "department": "Engineering",
    "start_date": "2026-03-01",
    "salary": "5000"
  },
  "collection_progress": {
    "total_fields": 10,
    "collected_fields": 10,
    "missing_fields": []
  }
}
```

### Contract File (After Finalization)

**Location**: `backend/temp_data/{user_id}_contract.json`

**Content**: Same as template + additional fields:
```json
{
  ...all template fields...,
  "status": "ready_for_signature",
  "finalized_at": "2026-02-14T10:40:00",
  "modification_history": [],
  "signature": null,
  "signed_at": null
}
```

## Performance Considerations

### Template File I/O
- Read: ~1-2ms (JSON parse)
- Write: ~2-5ms (JSON dump + file write)
- Recommended: Async file operations for production

### Database Operations
- Collection state update: ~10-20ms
- Users table update: ~10-20ms
- Total per field: ~30-50ms

### Optimization Tips

1. **Batch Validation**: Validate all inputs before any updates
2. **Async Operations**: Use async DB client for better concurrency
3. **Caching**: Cache template in memory during collection
4. **Indexing**: Ensure `session_id` indexed in `chat_sessions`

## Error Scenarios

| Scenario | Behavior | Recovery |
|----------|----------|----------|
| Template file missing | `finalize_collection()` fails | Re-initialize collection |
| DB connection lost | Update returns error | Retry with backoff |
| JSON parse error | `get_state()` returns None | Log error, start fresh |
| Disk full | File write fails | Fallback to DB-only mode |
| User deleted | All operations fail | Graceful error messages |

## Logging

The manager logs key events:

```python
logger.info(f"Initialized contract collection for user {user_id}")
logger.info(f"Updated field 'fullName' for user {user_id}")
logger.info(f"Finalized contract for user {user_id}")
logger.warning("_set_collection_state is deprecated")
logger.error(f"Failed to update field: {error}")
```

**Log Levels**:
- `INFO`: Normal operations
- `WARNING`: Deprecated function usage
- `ERROR`: Failed operations

## Testing

```python
# Unit test example
def test_contract_state_manager():
    manager = ContractStateManager("test-session", "test-user")
    
    # Test initialization
    result = manager.initialize_collection("MY")
    assert result["status"] == "initialized"
    assert manager.template_path.exists()
    
    # Test update
    result = manager.update_collected_field(
        "fullName", "John Doe", section="personal_details"
    )
    assert result["status"] == "updated"
    
    # Verify state
    state = manager.get_state()
    assert state["collected_data"]["fullName"] == "John Doe"
    
    # Test finalization
    # ... complete all fields first ...
    result = manager.finalize_collection()
    assert result["status"] == "finalized"
    assert not manager.template_path.exists()
    assert manager.contract_path.exists()
    
    # Cleanup
    manager.clear_state()
```

## Migration from Old System

Old code:
```python
_set_collection_state(session_id, field, missing)
_update_user_field(user_id, field, value)
# ... manual file operations ...
```

New code:
```python
manager = ContractStateManager(session_id, user_id)
manager.update_collected_field(field, value, section="personal_details")
# Triple-update handled automatically!
```

## Common Pitfalls

### Pitfall 1: Not Checking Return Status
```python
# BAD
manager.update_collected_field("fullName", "John")

# GOOD
result = manager.update_collected_field("fullName", "John")
if result["status"] != "updated":
    handle_error(result)
```

### Pitfall 2: Wrong Section
```python
# BAD - nric is personal, not banking
manager.update_collected_field("nric", "123", section="banking_details")

# GOOD
manager.update_collected_field("nric", "123", section="personal_details")
```

### Pitfall 3: Finalizing Too Early
```python
# BAD - missing fields remain
manager.finalize_collection()  # Will fail!

# GOOD - check first
state = manager.get_state()
if len(state["missing_fields"]) == 0:
    manager.finalize_collection()
```

## Best Practices

1. **Always check return status**
2. **Use correct section for each field**
3. **Validate before calling update**
4. **Handle errors gracefully**
5. **Clean up on cancellation**
6. **Log important events**
7. **Test thoroughly**

## Support

For issues or questions:
- Check logs: `backend/logs/app.log`
- Review template files: `backend/temp_data/`
- Check database: `chat_sessions.contract_collection_state`
- Consult implementation docs: `docs/CONTRACT_NEGOTIATION_IMPLEMENTATION_SUMMARY.md`

---

**Version**: 1.0
**Last Updated**: February 14, 2026
**Status**: Production Ready
