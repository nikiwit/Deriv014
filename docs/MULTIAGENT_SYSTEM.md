# DerivHR Multi-Agent System Architecture

## Overview

This document defines a comprehensive multi-agent system for DerivHR with specialized HR agents that collaborate, cross-check each other's work, and automate the complete employee lifecycle.

## Agent Architecture

### Core Agents

| Agent | Role | Specialization |
|-------|------|----------------|
| **OrchestratorAgent** | Central Coordinator | Routes queries, manages agent communication |
| **PolicyAgent** | Policy Specialist | Policy interpretation, compliance checks |
| **SalaryAgent** | Compensation Specialist | Payroll, EPF/SOCSO/CPF calculations |
| **TrainingAgent** | Learning & Development | Training programs, certifications tracking |
| **OnboardingAgent** | Onboarding Specialist | New hire workflow, document generation |
| **AgentixAgent** | Reminder & Alert System | Pending tasks, notifications, escalation |

### Agent Communication Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                           │
│  (Central Hub - Routes messages, manages sessions)              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ PolicyAgent   │ │ SalaryAgent   │ │ TrainingAgent │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        │     Cross-Check Validation       │
        │         (Agent → Agent)           │
        │                 │                 │
        └────────┬────────┴────────┬────────┘
                 │                 │
                 ▼                 ▼
        ┌───────────────┐ ┌───────────────┐
        │OnboardingAgent│ │ AgentixAgent  │
        └───────────────┘ │ (Reminders)   │
                          └───────────────┘
```

## Agent Definitions

### 1. OrchestratorAgent (Central Coordinator)

```python
class OrchestratorAgent:
    """
    Central coordinator that manages all agent interactions.
    Routes messages, maintains session state, and ensures cross-agent validation.
    """
    capabilities = [
        'query_routing',
        'agent_coordination',
        'session_management',
        'cross_agent_validation',
        'escalation_handling'
    ]
    
    escalation_rules = {
        'low_confidence': 'MAIN_HR',
        'compliance_issue': 'COMPLIANCE',
        'policy_dispute': 'POLICY_RESEARCH',
        'urgent': 'HUMAN_HR'
    }
```

### 2. PolicyAgent

```python
class PolicyAgent:
    """
    Specialized in policy interpretation and compliance verification.
    Cross-checks with SalaryAgent for statutory compliance.
    """
    capabilities = [
        'policy_interpretation',
        'compliance_verification',
        'document_analysis',
        'jurisdiction_comparison',
        'policy_gap_detection'
    ]
    
    cross_check_with = ['SalaryAgent', 'OnboardingAgent']
    
    knowledge_domains = [
        'employment_act_my',      # Malaysia EA 1955
        'employment_act_sg',      # Singapore EA Cap. 91
        'company_policies',       # Internal policies
        'statutory_requirements'  # EPF, SOCSO, CPF, EIS
    ]
```

### 3. SalaryAgent

```python
class SalaryAgent:
    """
    Compensation and statutory calculations specialist.
    Cross-checks with PolicyAgent for statutory compliance.
    """
    capabilities = [
        'salary_calculations',
        'epf_socso_cpf_computation',
        'overtime_calculation',
        'tax_deduction_pcb',
        'payroll_audit'
    ]
    
    cross_check_with = ['PolicyAgent']
    
    calculation_tools = [
        'epf_calculator',
        'socso_calculator',
        'cpf_calculator',
        'overtime_calculator',
        'tax_calculator'
    ]
```

### 4. TrainingAgent

```python
class TrainingAgent:
    """
    Learning & Development specialist for employee training programs.
    """
    capabilities = [
        'training_recommendations',
        'certification_tracking',
        'onboarding_training',
        'skill_gap_analysis',
        'learning_path_generation'
    ]
    
    training_programs = {
        'onboarding': ['company_orientation', 'policy_training', 'safety_training'],
        'compliance': ['epf_socso_training', 'workplace_safety', 'data_protection'],
        'development': ['leadership_training', 'technical_skills', 'soft_skills']
    }
```

### 5. OnboardingAgent

```python
class OnboardingAgent:
    """
    Manages the complete onboarding workflow from offer letter to active employee.
    Coordinates with all other agents for comprehensive onboarding.
    """
    capabilities = [
        'offer_letter_generation',
        'document_automation',
        'onboarding_workflow',
        'employee_portal_setup',
        'acceptance_tracking'
    ]
    
    workflow_stages = [
        'offer_created',      # HR creates offer
        'offer_sent',         # Sent to candidate
        'offer_pending',      # Awaiting response
        'offer_accepted',     # Candidate accepted
        'offer_rejected',     # Candidate rejected
        'onboarding_active',  # Onboarding in progress
        'onboarding_complete' # All tasks done
    ]
    
    cross_check_with = ['PolicyAgent', 'SalaryAgent', 'TrainingAgent', 'AgentixAgent']
```

### 6. AgentixAgent (Reminder & Alert System)

```python
class AgentixAgent:
    """
    Automated reminder and alert system for pending tasks.
    Monitors onboarding status and escalates delays.
    """
    capabilities = [
        'pending_task_detection',
        'automated_reminders',
        'escalation_management',
        'notification_routing',
        'deadline_tracking'
    ]
    
    reminder_channels = ['email', 'telegram', 'whatsapp', 'in_app']
    
    escalation_thresholds = {
        'onboarding_pending': 3,    # days before escalation
        'document_overdue': 5,      # days before escalation
        'training_incomplete': 7    # days before escalation
    }
```

## Cross-Agent Validation Workflow

### Validation Protocol

Every agent action triggers a cross-check with related agents:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CROSS-CHECK WORKFLOW                         │
└─────────────────────────────────────────────────────────────────┘

Step 1: Agent performs action
        │
        ▼
Step 2: Action logged to SharedContext
        │
        ▼
Step 3: Cross-check agents notified
        │
        ▼
Step 4: Each cross-check agent validates
        │
        ├──► VALID: Acknowledge and proceed
        │
        └──► INVALID: Flag issue, request review
                    │
                    ▼
            OrchestratorAgent reviews
                    │
                    ├──► Escalate to Human HR
                    │
                    └──► Return to original agent for correction
```

### Example: Onboarding Document Generation

```
OnboardingAgent generates employment contract
        │
        ├──► PolicyAgent validates:
        │    - Employment Act compliance
        │    - Company policy alignment
        │    - Jurisdiction requirements
        │
        ├──► SalaryAgent validates:
        │    - Salary calculations correct
        │    - Statutory contributions accurate
        │    - EPF/SOCSO/CPF rates applied
        │
        └──► AgentixAgent logs:
             - Document generated timestamp
             - Sets reminder for employee response
             - Monitors acceptance deadline
```

## Onboarding Workflow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

HR Manager                    System                     Candidate/Employee
    │                           │                              │
    │  1. Create New Employee   │                              │
    │──────────────────────────►│                              │
    │                           │                              │
    │                           │  2. Generate Offer Letter    │
    │                           │     + All Onboarding Docs    │
    │                           │                              │
    │                           │  3. Store in Temp DB         │
    │                           │     (status: offer_pending)  │
    │                           │                              │
    │                           │  4. Send Offer Letter        │
    │                           │─────────────────────────────►│
    │                           │                              │
    │                           │                              │  5. Review Offer
    │                           │                              │
    │                           │  6a. ACCEPT                  │
    │                           │◄─────────────────────────────│
    │                           │                              │
    │                           │  7. Automate All Documents   │
    │                           │     - Employment Contract    │
    │                           │     - Policy Documents       │
    │                           │     - Training Schedule      │
    │                           │     - Compliance Checklist   │
    │                           │                              │
    │                           │  8. Create Employee Portal   │
    │                           │     Access                   │
    │                           │                              │
    │                           │  9. Continue Onboarding      │
    │                           │─────────────────────────────►│
    │                           │                              │
    │  10. Notification         │                              │
    │◄──────────────────────────│                              │
    │                           │                              │
    │                           │                              │
    │                           │  6b. REJECT                  │
    │                           │◄─────────────────────────────│
    │                           │                              │
    │  11. Alert HR             │                              │
    │      (Telegram/Email)     │                              │
    │◄──────────────────────────│                              │
    │                           │                              │
    │  12. HR Follow-up         │                              │
    │═══════════════════════════│                              │
    │                           │                              │
```

### Database Schema for Onboarding

```sql
-- Onboarding States
CREATE TABLE onboarding_states (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    status TEXT DEFAULT 'offer_pending',
    
    -- Offer tracking
    offer_sent_at TIMESTAMP,
    offer_expires_at TIMESTAMP,
    offer_responded_at TIMESTAMP,
    offer_response TEXT,  -- 'accepted', 'rejected', 'expired'
    
    -- Rejection handling
    rejection_reason TEXT,
    hr_notified_at TIMESTAMP,
    hr_followup_status TEXT,
    
    -- Acceptance handling
    accepted_at TIMESTAMP,
    portal_created_at TIMESTAMP,
    
    -- Onboarding progress
    documents_generated_at TIMESTAMP,
    training_assigned_at TIMESTAMP,
    compliance_checklist_complete BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Agent Cross-Check Logs
CREATE TABLE agent_cross_checks (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    source_agent TEXT NOT NULL,
    target_agent TEXT NOT NULL,
    action_type TEXT NOT NULL,
    validation_result TEXT,  -- 'valid', 'invalid', 'pending'
    validation_notes TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agentix Reminders
CREATE TABLE agentix_reminders (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    channel TEXT NOT NULL,  -- 'telegram', 'email', 'whatsapp'
    message TEXT NOT NULL,
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    status TEXT DEFAULT 'pending',
    escalation_level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Agent Collaboration Examples

### Example 1: Salary Query with Cross-Check

```python
# User asks: "Calculate EPF contribution for RM5000 salary in Malaysia"

# Step 1: OrchestratorAgent routes to SalaryAgent
orchestrator.route_query("Calculate EPF for RM5000 MY")
    → SalaryAgent

# Step 2: SalaryAgent calculates
result = SalaryAgent.calculate_epf(
    salary=5000,
    jurisdiction='MY',
    age_group='below_60'
)
# Employee: 11% = RM550
# Employer: 13% = RM650

# Step 3: Cross-check with PolicyAgent
validation = PolicyAgent.validate_epf_calculation(
    salary=5000,
    contribution_rates={'employee': 550, 'employer': 650},
    jurisdiction='MY'
)

# Step 4: PolicyAgent confirms rates are correct per EA 1955
if validation.valid:
    return result_with_sources
else:
    return validation.corrections
```

### Example 2: Onboarding Offer Rejection

```python
# Candidate rejects offer

# Step 1: OnboardingAgent receives rejection
OnboardingAgent.handle_rejection(employee_id, reason)

# Step 2: Log to database
db.update_onboarding_state(
    employee_id=employee_id,
    status='offer_rejected',
    rejection_reason=reason,
    responded_at=datetime.now()
)

# Step 3: AgentixAgent triggers HR notification
AgentixAgent.send_alert(
    channel='telegram',
    recipient='hr_channel',
    message=f"Offer rejected by {employee_name}. Reason: {reason}"
)

# Step 4: AgentixAgent creates follow-up task
AgentixAgent.create_followup_task(
    employee_id=employee_id,
    task_type='rejection_followup',
    assigned_to='hr_manager',
    priority='high'
)
```

### Example 3: Pending Onboarding Reminder

```python
# AgentixAgent runs daily check for pending onboardings

def check_pending_onboardings():
    pending = db.get_employees_where(
        status='offer_pending',
        offer_sent_at__lte=datetime.now() - timedelta(days=3)
    )
    
    for employee in pending:
        # Send reminder to candidate
        AgentixAgent.send_reminder(
            to=employee.email,
            type='offer_reminder',
            message=f"Your offer letter from Deriv expires in X days"
        )
        
        # Escalate to HR if > 5 days
        if days_pending > 5:
            AgentixAgent.escalate(
                level=1,
                notify='hr_manager',
                employee_id=employee.id,
                reason='Offer response overdue'
            )
```

## API Endpoints

### Onboarding Flow Endpoints

```python
# HR creates new employee with offer
POST /api/onboarding/offer
{
    "employee_data": {...},
    "offer_details": {
        "position": "Software Engineer",
        "salary": 5000,
        "start_date": "2024-03-01",
        "probation_months": 3
    }
}
Response: {
    "employee_id": "uuid",
    "offer_id": "uuid",
    "documents_generated": [...],
    "status": "offer_pending"
}

# Employee accepts/rejects offer
POST /api/onboarding/offer/{offer_id}/respond
{
    "response": "accepted",  // or "rejected"
    "reason": "Optional rejection reason",
    "signature": "base64_signature"
}
Response: {
    "status": "accepted",
    "next_steps": ["Complete onboarding form", "Submit documents"],
    "portal_url": "/employee/onboarding/{token}"
}

# Check pending onboardings (Agentix)
GET /api/agentix/pending
Response: {
    "pending_offers": [...],
    "overdue_documents": [...],
    "incomplete_training": [...]
}

# Send reminder (Agentix)
POST /api/agentix/remind
{
    "employee_id": "uuid",
    "type": "document_submission",
    "channel": "telegram"
}
```

## Configuration

### Agent Configuration File

```python
# backend/app/agents/config.py

AGENT_CONFIG = {
    'orchestrator': {
        'model': 'gemini-1.5-pro',
        'temperature': 0.3,
        'max_tokens': 4096
    },
    'policy': {
        'model': 'gemini-1.5-pro',
        'temperature': 0.2,
        'cross_check_enabled': True,
        'validation_strict': True
    },
    'salary': {
        'model': 'gemini-1.5-flash',
        'temperature': 0.1,
        'cross_check_with': ['policy'],
        'calculation_precision': 2
    },
    'training': {
        'model': 'gemini-1.5-flash',
        'temperature': 0.4,
        'recommendation_limit': 5
    },
    'onboarding': {
        'model': 'gemini-1.5-pro',
        'temperature': 0.2,
        'auto_generate_documents': True,
        'default_offer_expiry_days': 7
    },
    'agentix': {
        'reminder_interval_hours': 24,
        'escalation_thresholds': {
            'level_1_days': 3,
            'level_2_days': 5,
            'level_3_days': 7
        },
        'channels': {
            'telegram': {'enabled': True, 'bot_token': '...'},
            'email': {'enabled': True, 'smtp': '...'},
            'whatsapp': {'enabled': False}
        }
    }
}
```

## Implementation Checklist

- [ ] Create base Agent class with messaging protocol
- [ ] Implement OrchestratorAgent with routing logic
- [ ] Implement PolicyAgent with knowledge base integration
- [ ] Implement SalaryAgent with calculation tools
- [ ] Implement TrainingAgent with program management
- [ ] Implement OnboardingAgent with workflow stages
- [ ] Implement AgentixAgent with reminder/alert system
- [ ] Create agent cross-check validation framework
- [ ] Build onboarding offer/reject workflow
- [ ] Integrate Telegram notification for rejections
- [ ] Set up automated reminder scheduler
- [ ] Create employee portal for onboarding
- [ ] Build pending onboarding dashboard

## Next Steps

1. Implement the agent classes in `backend/app/agents/`
2. Create database migrations for new tables
3. Build API endpoints for onboarding flow
4. Integrate Telegram bot for HR notifications
5. Create employee portal frontend components
6. Set up cron job for Agentix reminder scheduler
