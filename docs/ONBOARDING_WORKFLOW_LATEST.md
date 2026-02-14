# Onboarding Workflow Documentation (v2.0)

## Overview

The DerivHR onboarding workflow has been enhanced with a **Multi-Agent System** that automates and streamlines the entire employee onboarding process from offer creation to completion. This new system coordinates multiple specialized AI agents to handle different aspects of onboarding with cross-check validation.

## What's New in v2.0

- **Multi-Agent Orchestration**: 5 specialized agents working together
- **Automated Offer Management**: HR creates offer → Employee accepts → Full automation triggers
- **Cross-Check Validation**: Agents validate each other's work for accuracy
- **Smart Notifications**: Automated reminders and alerts via AgentixAgent
- **Employee Self-Service Portal**: Dedicated portal for new hires
- **Document Automation**: Instant generation of all required documents upon acceptance
- **Training Assignment**: Automatic training plan creation based on role/department

---

## System Architecture

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────────┐
│                    Multi-Agent Orchestrator                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
    ┌───────────┬───────┴───────┬───────────┬───────────┐
    │           │               │           │           │
    ▼           ▼               ▼           ▼           ▼
┌────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐
│ Policy │ │  Salary  │ │  Training  │ │   HR/    │ │   HR/    │
│ Agent  │ │  Agent   │ │   Agent    │ │Messaging │ │Messenger │
└────────┘ └──────────┘ └────────────┘ └──────────┘ └──────────┘
    │           │               │           │
    └───────────┴───────────────┴───────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Onboarding     │
              │  Agent (Lead)   │
              └─────────────────┘
```

### Agent Responsibilities

| Agent | Role | Key Functions |
|-------|------|---------------|
| **OnboardingAgent** | Lead Coordinator | Offer creation, acceptance handling, document automation, portal setup |
| **PolicyAgent** | Compliance Validator | Verify legal compliance, jurisdiction-specific requirements |
| **SalaryAgent** | Compensation Expert | Calculate statutory contributions (EPF, SOCSO, CPF), validate salary packages |
| **TrainingAgent** | L&D Specialist | Generate onboarding training plans, assign mandatory courses |
| **AgentixAgent** | Communications Hub | Send reminders, Telegram alerts, notification management |

---

## HR Workflow: Creating & Managing Offers

### Phase 1: Create New Employee Offer

**Entry Point**: HR Dashboard → Onboarding → New Employee

#### Step 1: Enter Employee Details

```json
POST /api/multiagent/onboarding/offer
{
  "employee_data": {
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+60123456789",
    "nric": "910101-14-1234",
    "jurisdiction": "MY"
  },
  "offer_details": {
    "position": "Software Engineer",
    "department": "Engineering",
    "salary": 8000,
    "start_date": "2024-03-15",
    "probation_months": 3,
    "expiry_days": 7
  }
}
```

#### Automated Agent Workflow

When HR submits the offer, the system automatically:

1. **OnboardingAgent** creates the offer with unique IDs
2. **PolicyAgent** validates compliance with local employment laws
3. **SalaryAgent** calculates and validates statutory contributions:
   - Malaysia: EPF (Employee 11%, Employer 13%), SOCSO, EIS
   - Singapore: CPF rates based on age and salary
4. **AgentixAgent** sets up reminder schedule for offer expiry
5. All results are cross-checked for validation

**Response**:
```json
{
  "success": true,
  "offer_id": "off_abc123",
  "employee_id": "emp_xyz789",
  "status": "offer_pending",
  "portal_url": "/employee/offer/off_abc123",
  "expires_at": "2024-03-08T10:00:00",
  "cross_checks": [
    {"agent": "policy_agent", "result": "valid", "notes": "MY employment law compliant"},
    {"agent": "salary_agent", "result": "valid", "notes": "EPF/SOCSO calculations verified"}
  ]
}
```

#### HR Dashboard View

- New employee appears in "Pending Offers" list
- Status: "Offer Pending"
- Expiry countdown displayed
- Direct link to offer details

### Phase 2: Monitor Offer Status

**API Endpoint**: `GET /api/multiagent/onboarding/pending`

HR can view:
- All pending offers
- Offers expiring soon (≤ 2 days)
- Average response time
- Acceptance/rejection rates

### Phase 3: Handle Offer Response

#### If Employee Accepts

**Automated Actions Triggered**:

1. **Document Generation** (OnboardingAgent)
   - Employment Contract
   - Offer Letter
   - Data & IT Policy
   - Employee Handbook
   - Leave Policy
   - Compliance Checklist
   - Training Schedule
   - Jurisdiction-specific forms (EPF/SOCSO/CPF)

2. **Employee Portal Setup** (OnboardingAgent)
   - Creates portal access at `/employee/portal/{employee_id}`
   - Generates access token
   - Sets up document upload capabilities

3. **Training Assignment** (TrainingAgent)
   - Mandatory: Security Awareness, Code of Conduct, Data Protection
   - Role-specific based on department/position
   - Onboarding pathway assigned

4. **Reminder Schedule** (AgentixAgent)
   - Document submission reminders
   - Training completion nudges
   - Form deadline alerts

**HR Notification**:
```json
{
  "status": "accepted",
  "employee_id": "emp_xyz789",
  "documents_generated": 9,
  "training_modules_assigned": 4,
  "next_steps": [
    "Employee will complete personal information form",
    "Upload required documents via portal",
    "Complete mandatory training modules",
    "Sign employment contract digitally"
  ]
}
```

#### If Employee Rejects

**Automated Actions**:

1. **Status Update**: Offer marked as "rejected"
2. **HR Alert** (AgentixAgent): Telegram notification sent to HR manager
3. **Follow-up Task**: Auto-created for HR to review
4. **Data Archiving**: Candidate data archived for future reference

**HR Notification**:
```json
{
  "alert_type": "offer_rejection",
  "employee_name": "John Doe",
  "position": "Software Engineer",
  "reason": "Accepted another offer",
  "channel": "telegram",
  "priority": "high",
  "action_required": "Review rejection and update recruitment pipeline"
}
```

---

## Employee Workflow: Accepting Offer & Onboarding

### Phase 1: Receive & Review Offer

**Entry Point**: Employee receives email with portal link

**Portal URL**: `/employee/offer/{offer_id}`

**Employee Sees**:
- Position and department
- Salary and benefits
- Start date and probation period
- Company information
- Expiry countdown

### Phase 2: Accept or Reject Offer

**API Endpoint**: `POST /api/multiagent/onboarding/offer/{offer_id}/respond`

#### Accepting the Offer

```json
{
  "response": "accepted",
  "signature": "base64_encoded_signature_data"
}
```

**What Happens Next**:

1. **Immediate Response**:
   ```json
   {
     "success": true,
     "status": "accepted",
     "portal_url": "/employee/portal/emp_xyz789",
     "onboarding_checklist": "/employee/portal/emp_xyz789/checklist",
     "next_steps": [
       "Complete personal information form",
       "Upload required documents",
       "Complete mandatory training",
       "Sign employment contract"
     ]
   }
   ```

2. **Redirected to Employee Portal**

#### Rejecting the Offer

```json
{
  "response": "rejected",
  "reason": "Accepted another opportunity"
}
```

**Confirmation Message**: "HR has been notified of your decision. Thank you for your interest."

### Phase 3: Employee Onboarding Portal

**Entry Point**: `/employee/portal/{employee_id}`

#### Portal Features

**1. Onboarding Progress Dashboard**

```
┌─────────────────────────────────────────────┐
│  Welcome, John Doe!                         │
│                                             │
│  Onboarding Progress: 45% Complete          │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░    │
│                                             │
│  Documents: 3/9 submitted                   │
│  Training: 1/4 completed                    │
│  Forms: 2/5 completed                       │
└─────────────────────────────────────────────┘
```

**2. Document Checklist**

| Document | Required | Status | Action |
|----------|----------|--------|--------|
| NRIC Copy | Yes | ⏳ Pending | Upload |
| EPF Form | Yes | ✅ Submitted | View |
| SOCSO Form | Yes | ⏳ Pending | Upload |
| Education Cert | Yes | ⏳ Pending | Upload |
| Employment Contract | Auto | ✅ Generated | Sign |

**3. Training Modules**

| Training | Type | Status | Due Date |
|----------|------|--------|----------|
| Security Awareness | Mandatory | ✅ Complete | - |
| Code of Conduct | Mandatory | 🔄 In Progress | 2024-03-20 |
| Data Protection | Mandatory | ⏳ Not Started | 2024-03-22 |
| Dept: Engineering Onboarding | Role-specific | ⏳ Not Started | 2024-03-25 |

**4. Forms to Complete**

- Personal Information Form
- Emergency Contact Details
- Bank Account Information
- Tax Declaration
- Benefits Enrollment

### Phase 4: Document Upload & Digital Signature

#### Uploading Documents

**API**: `POST /api/employee/{employee_id}/documents/upload`

Supported formats: PDF, JPG, PNG (max 10MB)

**Process**:
1. Employee selects document type
2. Uploads file via drag-and-drop
3. System validates file format and size
4. OnboardingAgent updates progress
5. Progress bar updates automatically

#### Digital Signature

**Component**: `SignaturePad`

**Features**:
- Draw signature with mouse/touch
- Type name for auto-generated script signature
- Preview before confirming
- Legally binding e-signature

**Usage**:
```typescript
// For Employment Contract
<SignaturePad 
  onSign={(signatureData) => submitSignature(employeeId, signatureData)}
  documentType="employment_contract"
/>
```

### Phase 5: Complete Onboarding

**Completion Criteria**:
- All required documents submitted
- All mandatory training completed
- Employment contract signed
- All forms completed

**On Complete**:
1. Status changes to `onboarding_complete`
2. Employee receives confirmation email
3. HR notified of completion
4. Employee transitioned to "Active" status
5. Access to full employee portal unlocked

---

## API Reference

### Multi-Agent Onboarding Endpoints

#### Create Offer (HR)
```http
POST /api/multiagent/onboarding/offer
Content-Type: application/json

{
  "employee_data": { ... },
  "offer_details": { ... }
}

Response: 201 Created
{
  "success": true,
  "offer_id": "...",
  "employee_id": "...",
  "portal_url": "...",
  "cross_checks": [...]
}
```

#### Respond to Offer (Employee)
```http
POST /api/multiagent/onboarding/offer/{offer_id}/respond
Content-Type: application/json

{
  "response": "accepted" | "rejected",
  "reason": "...",
  "signature": "..."
}

Response: 200 OK
{
  "success": true,
  "status": "accepted",
  "portal_url": "...",
  "documents_generated": [...],
  "training_assigned": {...}
}
```

#### Get Offer Details
```http
GET /api/multiagent/onboarding/offer/{offer_id}

Response: 200 OK
{
  "offer_id": "...",
  "employee_name": "...",
  "position": "...",
  "salary": 8000,
  "status": "offer_pending",
  "expires_at": "..."
}
```

#### Get Employee Portal Data
```http
GET /api/multiagent/onboarding/employee/{employee_id}/portal

Response: 200 OK
{
  "employee_id": "...",
  "employee_name": "...",
  "status": "onboarding_active",
  "onboarding_progress": {
    "total": 18,
    "submitted": 8,
    "percentage": 44
  },
  "documents": [...]
}
```

#### Get Pending Onboardings (HR Dashboard)
```http
GET /api/multiagent/onboarding/pending

Response: 200 OK
{
  "pending_offers": [...],
  "expiring_soon": [...],
  "total_pending": 12
}
```

#### Send Reminder
```http
POST /api/multiagent/onboarding/reminders/send
Content-Type: application/json

{
  "employee_id": "...",
  "type": "document_pending",
  "channel": "email",
  "message": "Please submit your pending documents"
}
```

#### Calculate Statutory Contributions
```http
POST /api/multiagent/onboarding/calculate/epf
Content-Type: application/json

{
  "salary": 8000,
  "jurisdiction": "MY",
  "age": 30
}

Response: 200 OK
{
  "success": true,
  "calculation_type": "epf",
  "data": {
    "employee_contribution": 880.00,
    "employer_contribution": 1040.00,
    "total": 1920.00
  },
  "cross_checks": [...]
}
```

---

## Onboarding Status Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  OFFER_      │────▶│  OFFER_      │────▶│  OFFER_      │
│  CREATED     │     │  SENT        │     │  PENDING     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                         ┌────────────────────────┼────────────────────────┐
                         │                        │                        │
                         ▼                        ▼                        ▼
                  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
                  │  OFFER_      │      │  OFFER_      │      │  OFFER_      │
                  │  ACCEPTED    │      │  REJECTED    │      │  EXPIRED     │
                  └──────┬───────┘      └──────────────┘      └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  ONBOARDING_ │
                  │  ACTIVE      │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  ONBOARDING_ │
                  │  COMPLETE    │
                  └──────────────┘
```

### Status Definitions

| Status | Description | Next Actions |
|--------|-------------|--------------|
| `offer_created` | Offer initialized in system | Send to candidate |
| `offer_sent` | Offer email delivered | Wait for response |
| `offer_pending` | Awaiting candidate decision | Monitor expiry |
| `offer_accepted` | Candidate accepted | Trigger automation |
| `offer_rejected` | Candidate declined | Notify HR, archive |
| `offer_expired` | Past expiry date | Follow up or close |
| `onboarding_active` | Documents/training in progress | Track completion |
| `onboarding_complete` | All requirements fulfilled | Transition to active |

---

## Jurisdiction-Specific Requirements

### Malaysia (MY)

#### Statutory Contributions
- **EPF**: Employee 11%, Employer 12-13% (based on salary)
- **SOCSO**: Employer 1.75%, Employee 0.5%
- **EIS**: Employer 0.2%, Employee 0.2%

#### Required Documents
- NRIC copy (front and back)
- EPF nomination form (Form KWSP 4A)
- SOCSO registration form
- Educational certificates
- Bank account details

#### Leave Entitlements
- Annual: 8-16 days (based on tenure)
- Sick: 14-22 days
- Hospitalization: 60 days
- Maternity: 98 consecutive days
- Paternity: 7 consecutive days

### Singapore (SG)

#### Statutory Contributions
- **CPF**: Employee 20%, Employer 17% (rates vary by age)

#### Required Documents
- NRIC or Work Pass copy
- CPF nomination form
- Tax declaration (IR8A preparation)
- Educational certificates
- Bank account details

#### Leave Entitlements
- Annual: 7-14 days (increases with tenure)
- Sick: 14 days outpatient + 60 days hospitalization
- Maternity: 16 weeks (Government-Paid)
- Paternity: 2 weeks (Government-Paid)

---

## Database Schema

### Onboarding States Table

```sql
CREATE TABLE onboarding_states (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL,
    offer_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255),
    email VARCHAR(255),
    position VARCHAR(255),
    department VARCHAR(255),
    salary DECIMAL(10,2),
    jurisdiction VARCHAR(2),
    offer_sent_at TIMESTAMP,
    offer_expires_at TIMESTAMP,
    offer_responded_at TIMESTAMP,
    offer_response VARCHAR(50),
    rejection_reason TEXT,
    hr_notified_at TIMESTAMP,
    accepted_at TIMESTAMP,
    documents_generated_at TIMESTAMP,
    training_assigned_at TIMESTAMP,
    onboarding_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Onboarding Documents Table

```sql
CREATE TABLE onboarding_documents (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL,
    document_name VARCHAR(255),
    document_type VARCHAR(100),
    required BOOLEAN DEFAULT true,
    submitted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP,
    file_path VARCHAR(500),
    verified BOOLEAN DEFAULT false
);
```

---

## Frontend Components

### HR Admin Components

| Component | Path | Purpose |
|-----------|------|---------|
| `HRCreateEmployee` | `components/onboarding/HRCreateEmployee.tsx` | Create new employee offer |
| `OnboardingWorkflow` | `components/onboarding/OnboardingWorkflow.tsx` | Manage onboarding processes |
| `GeneratedDocumentsPanel` | `components/onboarding/GeneratedDocumentsPanel.tsx` | View generated documents |
| `HRChatAgent` | `components/onboarding/HRChatAgent.tsx` | AI assistant for HR |

### Employee Components

| Component | Path | Purpose |
|-----------|------|---------|
| `MyOnboarding` | `components/employee/MyOnboarding.tsx` | Employee onboarding dashboard |
| `MyDocuments` | `components/employee/MyDocuments.tsx` | Document upload/management |
| `OfferAcceptanceForm` | `components/employee/OfferAcceptanceForm.tsx` | Accept/reject offer |
| `ContractForm` | `components/employee/ContractForm.tsx` | Sign employment contract |
| `SignaturePad` | `components/design-system/SignaturePad.tsx` | Digital signature capture |
| `CandidatePortal` | `components/CandidatePortal.tsx` | Pre-hire offer portal |

---

## Testing the Workflow

### Manual Testing Steps

#### HR Flow
1. Log in as HR Admin
2. Navigate to Onboarding → New Employee
3. Fill in employee details
4. Submit offer
5. Verify offer appears in pending list
6. Check cross-validation results

#### Employee Flow
1. Access offer link (simulated or via email)
2. Review offer details
3. Accept offer with signature
4. Access employee portal
5. Upload required documents
6. Complete training modules
7. Sign employment contract
8. Verify onboarding completion

### API Testing

```bash
# Create offer
curl -X POST http://localhost:5001/api/multiagent/onboarding/offer \
  -H "Content-Type: application/json" \
  -d '{
    "employee_data": {
      "full_name": "Test Employee",
      "email": "test@example.com",
      "nric": "910101-14-1234",
      "jurisdiction": "MY"
    },
    "offer_details": {
      "position": "Developer",
      "department": "Engineering",
      "salary": 5000,
      "start_date": "2024-03-01"
    }
  }'

# Accept offer
curl -X POST http://localhost:5001/api/multiagent/onboarding/offer/{offer_id}/respond \
  -H "Content-Type: application/json" \
  -d '{"response": "accepted"}'

# Check portal
curl http://localhost:5001/api/multiagent/onboarding/employee/{employee_id}/portal
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Offer not appearing in pending list | Check `onboarding_states` table for correct status |
| Documents not generating on acceptance | Verify OnboardingAgent handler is registered |
| Cross-check validation failing | Review PolicyAgent and SalaryAgent configurations |
| Employee portal 404 | Ensure employee_id exists in both `employees` and `onboarding_states` tables |
| Training not assigned | Check TrainingAgent response and database insertion |
| Reminders not sending | Verify AgentixAgent configuration and notification channels |

### Debug Endpoints

```http
# Get all agents info
GET /api/multiagent/onboarding/agents/info

# Check pending items
GET /api/multiagent/onboarding/pending

# Verify policy compliance
POST /api/multiagent/onboarding/policy/verify
```

---

## Future Enhancements

1. **Email Integration**: Automated offer emails with branded templates
2. **SMS Notifications**: WhatsApp/SMS reminders for urgent actions
3. **Video Onboarding**: Integration with Loom for welcome videos
4. **E-signature Integration**: DocuSign/Adobe Sign for contracts
5. **Background Checks**: Automated background verification
6. **Equipment Provisioning**: IT equipment request workflow
7. **Buddy Assignment**: Auto-assign onboarding buddies
8. **30-60-90 Day Plans**: Automated milestone tracking
9. **Analytics Dashboard**: Onboarding funnel metrics
10. **Feedback Collection**: Post-onboarding surveys

---

## Support & Resources

### Documentation
- [Multi-Agent System](./MULTIAGENT_SYSTEM.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](../backend/API_REFERENCE.md)

### Key Files
- `backend/app/agents/onboarding_agent.py` - OnboardingAgent implementation
- `backend/app/agents/multi_agent_orchestrator.py` - Orchestrator logic
- `backend/app/routes/multiagent_onboarding.py` - API routes
- `backend/app/models.py` - Data models

### Contact
For technical issues or feature requests, contact the DerivHR development team.
