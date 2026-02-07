# Backend API Reference

`http://127.0.0.1:5001` | CORS open | No auth | Jurisdictions: `MY` (Malaysia), `SG` (Singapore)

**Run backend:** `cd backend && source .venv/bin/activate && python run.py`
Frontend can be served from anywhere (file://, Live Server, etc.) — CORS is fully open.

## Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message, get JSON response |
| POST | `/api/chat/stream` | Send message, get SSE stream |
| GET | `/api/chat/history/<session_id>` | Conversation history |

**Request** (both endpoints):
```json
{ "message": "...", "session_id": null, "jurisdiction": "MY" }
```
`session_id`: null creates new session. Pass returned ID for follow-ups.

**Response** (`/api/chat`):
```json
{ "session_id": "uuid", "response": "text", "sources": [{"file": "deriv_my_leave_policy.md", "jurisdiction": "MY", "score": 0.6}] }
```

**SSE stream** (`/api/chat/stream`): Session ID in `X-Session-Id` header.
```
data: {"token": "For"}
data: {"token": " employees"}
data: {"done": true, "sources": [...]}
```

## Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/generate` | Generate contract PDF |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/<id>` | Document metadata |
| GET | `/api/documents/<id>/download` | Download PDF |
| GET | `/api/documents/checklist?scenario=new_hire&jurisdiction=MY` | Required docs list |

**Generate request**:
```json
{ "jurisdiction": "MY", "employee_name": "Ahmad bin Ibrahim", "position": "Full Stack Developer", "department": "Engineering", "start_date": "2026-03-01", "salary": 7000, "nric": "901234-10-5678" }
```
Required: `employee_name`, `position`, `department`, `jurisdiction`, `start_date`, `salary`

**Generate response** (201):
```json
{ "id": "uuid", "jurisdiction": "MY", "employee_name": "...", "download_url": "/api/documents/uuid/download" }
```

Scenarios for checklist: `new_hire`, `visa_renewal`

## Onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/onboarding/employees` | Register employee + init checklist |
| GET | `/api/onboarding/employees` | List employees with progress |
| GET | `/api/onboarding/employees/<id>` | Full profile |
| PUT | `/api/onboarding/employees/<id>` | Update fields |
| GET | `/api/onboarding/employees/<id>/checklist` | Document checklist + status |
| PUT | `/api/onboarding/employees/<id>/checklist/<doc_id>` | Mark doc submitted |

**Create employee** (required: `email`, `full_name`, `jurisdiction`):
```json
{ "email": "ahmad@deriv.com.my", "full_name": "Ahmad bin Ibrahim", "jurisdiction": "MY", "position": "Full Stack Developer", "department": "Engineering", "start_date": "2026-03-01", "phone": "+60123456789", "address": "...", "bank_name": "Maybank", "bank_account": "1234567890", "emergency_contact_name": "Siti", "emergency_contact_phone": "+601...", "emergency_contact_relation": "Spouse" }
```

**Checklist response**:
```json
{ "progress": "1/9", "complete": false, "documents": [{"id": 1, "document_name": "Signed employment contract", "submitted": true}, ...] }
```

**Mark submitted**: `PUT .../checklist/1` with `{"submitted": true}`
When all required docs submitted, employee status auto-changes to `active`.

## Health

`GET /api/health` → `{"status": "ok", "rag_loaded": true}`
