# Onboarding Workflow Documentation

## Overview

The DerivHR onboarding workflow automates the generation of employment contracts, policies, and compliance documents when a new employee is added to the system. This workflow ensures compliance with jurisdiction-specific requirements (Malaysia and Singapore) and streamlines the onboarding process.

## Architecture

### Components

1. **Workflow Orchestrator** (`backend/app/workflow.py`)
   - Central coordinator for document generation
   - Manages the complete onboarding workflow
   - Handles errors and provides detailed feedback

2. **Document Generator** (`backend/app/document_generator.py`)
   - Generates PDF documents from HTML templates
   - Supports jurisdiction-specific templates
   - Uses Jinja2 for template rendering

3. **Backend API** (`backend/app/routes/onboarding.py`)
   - RESTful endpoints for employee management
   - Integrates workflow execution with employee creation
   - Provides document download functionality

4. **Frontend Components**
   - `NewEmployeeOnboardingForm.tsx` - Employee data collection
   - `GeneratedDocumentsPanel.tsx` - Document display and download
   - `Onboarding.tsx` - Main onboarding management interface

## Workflow Process

### 1. Employee Data Collection

**Frontend**: `NewEmployeeOnboardingForm.tsx`
- Collects employee information through a multi-step form
- Validates data at each step
- Supports resume parsing for auto-fill
- Submits data to backend API

**Data Collected**:
- Full Name
- Email Address
- Role/Position
- Department
- Start Date
- Nationality (Malaysian/Non-Malaysian)
- Salary
- NRIC (for Malaysian employees)

### 2. Employee Creation & Workflow Execution

**Backend**: `POST /api/onboarding/employees`

When an employee is created, the workflow automatically:

1. **Creates Employee Record**
   - Stores employee data in database
   - Generates unique employee ID
   - Initializes onboarding checklist

2. **Executes Workflow** (`OnboardingWorkflow.execute()`)
   - Generates employment contract
   - Creates policy documents
   - Generates offer letter
   - Creates compliance checklist
   - Stores all documents in database

3. **Returns Response**
   - Employee ID and details
   - List of generated documents
   - Any workflow errors or warnings

### 3. Document Generation

#### Employment Contract
- **Template**: `contract_my.html` or `contract_sg.html`
- **Content**: 
  - Employee details
  - Position and department
  - Salary and benefits
  - Jurisdiction-specific terms
  - Statutory requirements

#### Policy Documents
- **Data & IT Policy**
- **Employee Handbook**
- **Leave Policy**
- **Job Description**

Each policy includes:
- Company information
- Jurisdiction-specific requirements
- Employee details
- Compliance information

#### Offer Letter
- **Template**: Auto-generated HTML
- **Content**:
  - Position and department
  - Salary and benefits
  - Start date
  - Terms of employment
  - Signature section

#### Compliance Checklist
- **Template**: Auto-generated HTML
- **Content**:
  - Required documents list
  - Jurisdiction-specific requirements
  - Submission instructions
  - Employee declaration

### 4. Document Storage

**Database**: `generated_documents` table
- Document ID
- Employee ID
- Document type
- File path
- Creation timestamp
- Status

**File System**: `backend/instance/generated_docs/`
- PDF files stored with descriptive names
- Organized by document type and jurisdiction

### 5. Document Access

**Frontend**: `GeneratedDocumentsPanel.tsx`

Features:
- Displays all generated documents for an employee
- Shows document status (Ready/Processing)
- One-click PDF download
- User-friendly document names

**API Endpoints**:
- `GET /api/onboarding/employees/{employee_id}/documents` - List documents
- `GET /api/onboarding/documents/{document_id}/download` - Download PDF

## Jurisdiction-Specific Requirements

### Malaysia (MY)
- **Statutory Contributions**: EPF (13%/11%), SOCSO, EIS
- **Leave Entitlements**:
  - Annual: 8 days (<2 years), 12 days (2-5 years), 16 days (>5 years)
  - Sick: 14 days (<2 years), 18 days (2-5 years), 22 days (>5 years)
  - Hospitalization: Up to 60 days
  - Maternity: 98 consecutive days
  - Paternity: 7 consecutive days
- **Required Documents**:
  - NRIC copy (front and back)
  - EPF nomination form
  - SOCSO registration form
  - Educational certificates
  - Reference letters

### Singapore (SG)
- **Statutory Contributions**: CPF (17%/20%)
- **Leave Entitlements**:
  - Annual: 7 days (Year 1), +1 day/year up to 14 days
  - Sick: 14 days outpatient, 60 days hospitalization
  - Maternity: 16 weeks (Government-Paid)
  - Paternity: 2 weeks (Government-Paid)
- **Required Documents**:
  - NRIC or work pass copy
  - CPF nomination form
  - Tax declaration form (IR8A)
  - Educational certificates
  - Reference letters

## API Reference

### Create Employee
```
POST /api/onboarding/employees
Content-Type: application/json

Request Body:
{
  "email": "john.doe@example.com",
  "full_name": "John Doe",
  "jurisdiction": "MY",
  "position": "Software Engineer",
  "department": "Engineering",
  "start_date": "2024-03-01",
  "nric": "910101-14-1234",
  "salary": "5000"
}

Response (201):
{
  "id": "uuid",
  "email": "john.doe@example.com",
  "full_name": "John Doe",
  "jurisdiction": "MY",
  "status": "onboarding",
  "checklist_url": "/api/onboarding/employees/{id}/checklist",
  "generated_documents": [
    {
      "id": "uuid",
      "document_type": "employment_contract",
      "file_path": "/path/to/file.pdf",
      "created_at": "2024-02-08T03:00:00",
      "status": "generated"
    }
  ],
  "workflow_errors": [],
  "message": "Onboarding initiated. Generated 5 documents automatically."
}
```

### Get Employee Documents
```
GET /api/onboarding/employees/{employee_id}/documents

Response (200):
{
  "employee_id": "uuid",
  "employee_name": "John Doe",
  "documents": [
    {
      "id": "uuid",
      "document_type": "employment_contract",
      "file_path": "/path/to/file.pdf",
      "created_at": "2024-02-08T03:00:00",
      "status": "generated",
      "download_url": "/api/onboarding/documents/{id}/download"
    }
  ],
  "total": 5
}
```

### Download Document
```
GET /api/onboarding/documents/{document_id}/download

Response: PDF file (application/pdf)
```

## Frontend Integration

### Onboarding Form
```typescript
// Submit employee data
const response = await fetch('http://localhost:5001/api/onboarding/employees', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(employeeData)
});

const data = await response.json();
// data.generated_documents contains list of auto-generated documents
```

### Display Documents
```typescript
// Open documents panel
setSelectedEmployee({ id: employeeId, name: employeeName });

// GeneratedDocumentsPanel component handles:
// - Fetching documents from API
// - Displaying document cards
// - Download functionality
```

## Error Handling

### Workflow Errors
- Non-blocking: Document generation continues even if some documents fail
- Logged: All errors are logged for debugging
- Reported: Errors returned in API response

### Common Issues
1. **Template Not Found**: Falls back to basic template
2. **PDF Generation Error**: Logged, workflow continues
3. **Database Error**: Transaction rollback, error returned
4. **File System Error**: Logged, document marked as failed

## Configuration

### Backend Config (`backend/app/config.py`)
```python
TEMPLATE_DIR = os.path.join(BASE_DIR, "..", "templates")
OUTPUT_DIR = os.path.join(BASE_DIR, "..", "instance", "generated_docs")
```

### Database Schema
```sql
CREATE TABLE IF NOT EXISTS generated_documents (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    parameters TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

## Testing

### Manual Testing
1. Navigate to Onboarding page
2. Click "New Employee"
3. Fill in employee details
4. Submit form
5. Verify employee appears in list
6. Click document icon for employee
7. Verify all documents are displayed
8. Download each document
9. Verify PDF content is correct

### API Testing
```bash
# Create employee
curl -X POST http://localhost:5001/api/onboarding/employees \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test Employee",
    "jurisdiction": "MY",
    "position": "Software Engineer",
    "department": "Engineering",
    "start_date": "2024-03-01",
    "nric": "910101-14-1234",
    "salary": "5000"
  }'

# Get documents
curl http://localhost:5001/api/onboarding/employees/{employee_id}/documents

# Download document
curl http://localhost:5001/api/onboarding/documents/{document_id}/download \
  --output document.pdf
```

## Future Enhancements

1. **Email Notifications**: Auto-send documents to employee
2. **Digital Signatures**: Integrate e-signature workflow
3. **Document Versioning**: Track document revisions
4. **Bulk Generation**: Generate documents for multiple employees
5. **Custom Templates**: Allow custom document templates
6. **Workflow Customization**: Configurable document sets per role/department
7. **Audit Trail**: Track who generated/accessed documents
8. **Document Expiry**: Track and notify about expiring documents

## Support

For issues or questions:
1. Check backend logs for workflow errors
2. Verify template files exist in `backend/templates/`
3. Ensure output directory is writable
4. Check database connection
5. Review API response for error messages
