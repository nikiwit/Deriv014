# Employee Onboarding Journey Plan

## Overview

This document outlines the complete employee onboarding journey when they click **"Employee: Verify Identity"** → **"Complete your onboarding"** from the login page.

## User Flow

```
Login Page
    │
    ▼
┌─────────────────────────────────────┐
│  Employee: Verify Identity          │ ◄── User clicks this
│  Complete your onboarding            │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  MyOnboarding Component             │
│  (Employee Portal)                  │
└─────────────────────────────────────┘
    │
    ├──▶ Documentation Tasks
    ├──▶ Compliance Tasks  
    ├──▶ IT Setup Tasks
    ├──▶ Training Tasks
    └──▶ Culture Tasks
```

---

## Phase 1: Identity Verification & Personal Info

### Task 1.1: Verify Identity (NRIC/Passport)
| Field | Value |
|-------|-------|
| **Title** | Verify Your Identity |
| **Description** | Upload a copy of your NRIC (Malaysian) or Passport (Non-Malaysian) for verification |
| **Category** | documentation |
| **Priority** | required |
| **Est. Time** | 5 min |
| **Action** | Upload Document |
| **Required** | Yes |

**Data Collected:**
- NRIC Number (MY)
- Passport Number (Non-MY)
- Nationality
- Date of Birth

**Validation:**
- NRIC format: YYMMDD-PB-XXXX
- Passport must be valid (expiry > 6 months)

---

### Task 1.2: Complete Personal Information
| Field | Value |
|-------|-------|
| **Title** | Complete Personal Details |
| **Description** | Fill in your personal information for employee records |
| **Category** | documentation |
| **Priority** | required |
| **Est. Time** | 10 min |
| **Action** | Form Fill |
| **Required** | Yes |

**Data Collected:**
- Full Name (from NRIC)
- Email Address
- Phone Number
- Home Address
- Emergency Contact Name
- Emergency Contact Phone
- Emergency Contact Relationship

---

## Phase 2: Offer & Contract

### Task 2.1: Review & Accept Offer Letter
| Field | Value |
|-------|-------|
| **Title** | Accept Offer Letter |
| **Description** | Review and digitally sign your official offer letter |
| **Category** | documentation |
| **Priority** | required |
| **Est. Time** | 10 min |
| **Action** | Digital Signature |
| **Template** | offer_acceptance |
| **Required** | Yes |

**Document Contents:**
- Position & Department
- Start Date
- Salary & Benefits
- Probation Period
- Reporting To
- Work Location

**Signature Required:** Yes (Typed or Drawn)

---

### Task 2.2: Sign Employment Contract
| Field | Value |
|-------|-------|
| **Title** | Sign Employment Contract |
| **Description** | Review and digitally sign your employment contract |
| **Category** | documentation |
| **Priority** | required |
| **Est. Time** | 15 min |
| **Action** | Digital Signature |
| **Template** | contract |
| **Required** | Yes |

**Document Contents:**
- Employment Terms
- Job Description
- Leave Entitlements
- Code of Conduct
- Jurisdiction-Specific Clauses (MY EA1955 / SG EA)

**Signature Required:** Yes (Typed or Drawn)

---

### Task 2.3: Tax Declaration
| Field | Value |
|-------|-------|
| **Title** | Complete Tax Forms (EA/PCB) |
| **Description** | Fill in your tax declaration for payroll processing |
| **Category** | documentation |
| **Priority** | required |
| **Est. Time** | 10 min |
| **Action** | Form Fill |
| **Required** | Yes |

**MY (Form EA):**
- Tax File Number
- Employee EPF Number
- Voluntary EPF Contribution
- Salary Details

**SG (IR8A):**
- Tax File Number (NRIC)
- Central Provident Fund Number
- Bonus Declaration

---

### Task 2.4: Submit Bank Details
| Field | Value |
|-------|-------|
| **Title** | Submit Bank Account Details |
| **Description** | Provide your bank account information for salary disbursement |
| **Category** | documentation |
| **Priority** | required |
| **Est. Time** | 5 min |
| **Action** | Form Fill |
| **Required** | Yes |

**Data Collected:**
- Bank Name
- Bank Account Number
- Account Holder Name (must match NRIC)

---

## Phase 3: Compliance & Legal

### Task 3.1: Acknowledge Data Protection Policy
| Field | Value |
|-------|-------|
| **Title** | Acknowledge PDPA/GDPR Policy |
| **Description** | Review and acknowledge the data protection policy |
| **Category** | compliance |
| **Priority** | required |
| **Est. Time** | 10 min |
| **Action** | Digital Signature |
| **Required** | Yes |

**Documents:**
- MY: Personal Data Protection Act (PDPA)
- SG: Personal Data Protection Act
- GDPR (for EU employees)

---

### Task 3.2: Anti-Harassment Training
| Field | Value |
|-------|-------|
| **Title** | Complete Anti-Harassment Training |
| **Description** | Complete the mandatory workplace harassment prevention course |
| **Category** | compliance |
| **Priority** | required |
| **Est. Time** | 30 min |
| **Action** | Training Module |
| **Required** | Yes |

**Content:**
- Recognizing Harassment
- Reporting Procedures
- Company Policy
- Case Studies
- Quiz (80% pass required)

---

### Task 3.3: Health & Safety Briefing
| Field | Value |
|-------|-------|
| **Title** | Watch Health & Safety Video |
| **Description** | Watch the workplace safety orientation video |
| **Category** | compliance |
| **Priority** | required |
| **Est. Time** | 20 min |
| **Action** | Video Watch |
| **Required** | Yes |

**Content:**
- Emergency Procedures
- Workplace Hazards
- First Aid Locations
- Reporting Incidents

---

## Phase 4: IT & Security

### Task 4.1: Accept IT Acceptable Use Policy
| Field | Value |
|-------|-------|
| **Title** | Accept IT Acceptable Use Policy |
| **Description** | Read and acknowledge the IT usage guidelines |
| **Category** | it_setup |
| **Priority** | required |
| **Est. Time** | 10 min |
| **Action** | Digital Signature |
| **Required** | Yes |

**Content:**
- Email Usage Guidelines
- Internet & Network Policy
- Device Security
- Password Policy
- Remote Work Guidelines

---

### Task 4.2: Setup Two-Factor Authentication
| Field | Value |
|-------|-------|
| **Title** | Enable Two-Factor Authentication |
| **Description** | Set up 2FA on your work accounts for enhanced security |
| **Category** | it_setup |
| **Priority** | required |
| **Est. Time** | 10 min |
| **Action** | 2FA Setup |
| **Required** | Yes |

**Methods:**
- Authenticator App (Recommended)
- SMS OTP
- Hardware Key (Optional)

---

### Task 4.3: Configure Email & Communication Tools
| Field | Value |
|-------|-------|
| **Title** | Setup Email & Slack |
| **Description** | Configure your email signature and join Slack channels |
| **Category** | it_setup |
| **Priority** | required |
| **Est. Time** | 15 min |
| **Action** | Configuration |
| **Required** | Yes |

**Setup Steps:**
1. Login to Corporate Email
2. Set Email Signature
3. Join Slack Workspace
4. Join Department Channels
5. Set Up Slack Profile
6. Install Required Apps

---

## Phase 5: Training & Development

### Task 5.1: Company Overview
| Field | Value |
|-------|-------|
| **Title** | Watch Company Overview Video |
| **Description** | Learn about our history, mission, and values |
| **Category** | training |
| **Priority** | recommended |
| **Est. Time** | 15 min |
| **Action** | Video Watch |
| **Required** | No |

**Content:**
- Company History
- Mission & Vision
- Core Values
- Organizational Structure
- Key Leadership

---

### Task 5.2: Role-Specific Training
| Field | Value |
|-------|-------|
| **Title** | Complete Role-Specific Training |
| **Description** | Finish your department onboarding modules |
| **Category** | training |
| **Priority** | recommended |
| **Est. Time** | 60 min |
| **Action** | Training Modules |
| **Required** | No |

**Delivery:**
- Assigned by TrainingAgent based on department
- May include:
  - Tools & Software Training
  - Process & Workflows
  - Team-Specific Knowledge

---

## Phase 6: Culture & Integration

### Task 6.1: Join Slack Interest Groups
| Field | Value |
|-------|-------|
| **Title** | Join Interest Groups on Slack |
| **Description** | Find and join hobby or interest-based channels |
| **Category** | culture |
| **Priority** | optional |
| **Est. Time** | 5 min |
| **Action** | Slack Join |
| **Required** | No |

---

### Task 6.2: Schedule Coffee Chat with Mentor
| Field | Value |
|-------|-------|
| **Title** | Schedule Coffee Chat with Buddy |
| **Description** | Book a 30-min intro call with your assigned onboarding buddy |
| **Category** | culture |
| **Priority** | recommended |
| **Est. Time** | 5 min |
| **Action** | Calendar Booking |
| **Required** | No |

---

### Task 6.3: Complete Your Profile
| Field | Value |
|-------|-------|
| **Title** | Complete Your Employee Profile |
| **Description** | Add a photo and bio to your employee profile |
| **Category** | culture |
| **Priority** | optional |
| **Est. Time** | 10 min |
| **Action** | Profile Edit |
| **Required** | No |

---

## Task Dependencies & Unlock Order

```
START
  │
  ├─▶ 1.1 Verify Identity (NRIC/Passport)
  │
  ├─▶ 1.2 Personal Information
  │         │
  │         ├─▶ 2.1 Accept Offer Letter ──────────┐
  │         │                                      │
  │         ├─▶ 2.2 Sign Employment Contract ◄────┤
  │         │                                      │
  │         ├─▶ 2.3 Tax Forms ───────────────────┼──▶ 3.1 PDPA Policy ──▶ 4.1 IT Policy ──▶ 4.2 2FA ──▶ 4.3 Email ──▶ 5.1 Video ──▶ 5.2 Training ──▶ 6.1 Groups ──▶ 6.2 Buddy ──▶ 6.3 Profile
  │         │                                      │
  │         └─▶ 2.4 Bank Details ─────────────────┘

END: Onboarding Complete ✅
```

---

## Progress Tracking

### Categories & Weights

| Category | Tasks | Weight |
|----------|-------|--------|
| Documentation | 6 | 40% |
| Compliance | 3 | 25% |
| IT Setup | 3 | 20% |
| Training | 2 | 10% |
| Culture | 3 | 5% |

### Progress Calculation

```
Progress = (Completed Tasks / Total Required Tasks) × 100

Example:
- Required Tasks: 14
- Completed: 7
- Progress: 7/14 × 100 = 50%
```

---

## Multi-Agent Integration

Based on `ONBOARDING_WORKFLOW_LATEST.md`, the onboarding journey integrates with the Multi-Agent System:

### Agents Involved

| Agent | Trigger | Action |
|-------|---------|--------|
| **OnboardingAgent** | Offer Accepted | Generates all documents |
| **PolicyAgent** | Document Generation | Validates compliance |
| **SalaryAgent** | Offer Acceptance | Calculates EPF/CPF |
| **TrainingAgent** | Onboarding Active | Assigns training modules |
| **AgentixAgent** | Task Overdue | Sends reminders |

### API Flow

```
POST /api/multiagent/onboarding/offer
    │
    ▼
OnboardingAgent creates offer
    │
    ▼
PolicyAgent validates compliance
    │
    ▼
SalaryAgent calculates contributions
    │
    ▼
Employee receives portal link
    │
    ▼
Employee accepts offer
    │
    ▼
Documents auto-generated
Training assigned
Reminders set up
```

---

## Frontend Components

### Current Implementation

| Component | File | Purpose |
|-----------|------|---------|
| MyOnboarding | `components/employee/MyOnboarding.tsx` | Main onboarding UI |
| SignaturePad | `components/design-system/SignaturePad.tsx` | Digital signature |
| LoginPage | `components/auth/LoginPage.tsx` | Entry point |

### Task Categories (UI)

```typescript
const categoryConfig = {
  documentation: { label: 'Documentation', color: 'bg-blue-500' },
  it_setup: { label: 'IT Setup', color: 'bg-purple-500' },
  compliance: { label: 'Compliance', color: 'bg-red-500' },
  training: { label: 'Training', color: 'bg-amber-500' },
  culture: { label: 'Culture', color: 'bg-pink-500' }
};
```

---

## Default Tasks (Current)

From `constants.tsx`:

```typescript
export const DEFAULT_ONBOARDING_TASKS = [
  // Documentation (5 tasks)
  { title: 'Upload Identity Document', ... },
  { title: 'Accept Offer Letter', templateId: 'offer_acceptance' ... },
  { title: 'Sign Employment Contract', templateId: 'contract' ... },
  { title: 'Complete Tax Forms (EA/PCB)', ... },
  { title: 'Submit Bank Details', ... },

  // IT Setup (3 tasks)
  { title: 'Accept IT Acceptable Use Policy', ... },
  { title: 'Setup Two-Factor Authentication', ... },
  { title: 'Configure Email & Slack', ... },

  // Compliance (3 tasks)
  { title: 'Complete Anti-Harassment Training', ... },
  { title: 'Acknowledge Data Protection Policy', ... },
  { title: 'Health & Safety Briefing', ... },

  // Training (2 tasks)
  { title: 'Watch Company Overview Video', ... },
  { title: 'Complete Role-Specific Training', ... },

  // Culture (3 tasks)
  { title: 'Join Interest Groups on Slack', ... },
  { title: 'Schedule Coffee Chat with Mentor', ... },
  { title: 'Complete Your Profile', ... },
];
```

---

## Completion Criteria

### For Onboarding to be "Complete"

✅ All **Required** tasks must be completed (14 tasks)
- Documentation: 6/6
- Compliance: 3/3
- IT Setup: 3/3
- Training: 1/2 (minimum)
- Culture: 0/3 (optional)

### On Completion

1. **Status Update**: `onboardingComplete: true`
2. **Employee Transition**: From onboarding to active employee
3. **HR Notification**: Dashboard updated
4. **Access Unlocked**: Full employee portal access

---

## Future Enhancements

1. **AI-Personalized Journey** - Customize tasks based on role/department
2. **Progress Sharing** - Allow employees to share progress with HR
3. **Mobile App** - Mobile-friendly onboarding
4. **Gamification** - Badges and rewards for completion
5. **Automated Reminders** - AgentixAgent sends nudges for incomplete tasks
6. **Manager Dashboard** - HR can view individual progress

---

## Related Documentation

- [ONBOARDING_WORKFLOW_LATEST.md](./ONBOARDING_WORKFLOW_LATEST.md) - Full workflow documentation
- [MULTIAGENT_SYSTEM.md](./MULTIAGENT_SYSTEM.md) - Agent system details
- [API Reference](../backend/API_REFERENCE.md) - Backend endpoints
