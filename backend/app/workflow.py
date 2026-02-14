"""
Onboarding Workflow Orchestrator
Automates document generation during employee onboarding
"""
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from jinja2 import Environment

from app.document_generator import generate_contract, _get_jurisdiction_defaults
from app.models import EmployeeProfile, ContractParams


@dataclass
class GeneratedDocument:
    """Represents a generated document"""
    id: str
    document_type: str
    file_path: str
    employee_id: str
    created_at: str
    status: str = "generated"


@dataclass
class WorkflowResult:
    """Result of workflow execution"""
    success: bool
    employee_id: str
    documents: List[GeneratedDocument]
    errors: List[str]
    message: str


class OnboardingWorkflow:
    """Orchestrates the onboarding workflow with automatic document generation"""
    
    def __init__(self, template_dir: str, output_dir: str, db):
        self.template_dir = template_dir
        self.output_dir = output_dir
        self.db = db
        
    def execute(self, profile: EmployeeProfile) -> WorkflowResult:
        """
        Execute the complete onboarding workflow
        
        Args:
            profile: Employee profile data
            
        Returns:
            WorkflowResult with generated documents and status
        """
        employee_id = str(uuid.uuid4())
        documents = []
        errors = []
        
        try:
            # Step 1: Generate Employment Contract
            contract_result = self._generate_contract(profile, employee_id)
            if contract_result:
                documents.append(contract_result)
            else:
                errors.append("Failed to generate employment contract")
            
            # Step 2: Generate Policy Documents
            policy_results = self._generate_policies(profile, employee_id)
            documents.extend(policy_results)
            
            # Step 3: Generate Offer Letter
            offer_result = self._generate_offer_letter(profile, employee_id)
            if offer_result:
                documents.append(offer_result)
            
            # Step 4: Generate Compliance Checklist
            compliance_result = self._generate_compliance_checklist(profile, employee_id)
            if compliance_result:
                documents.append(compliance_result)
            
            # Step 5: Store documents in database
            self._store_documents(employee_id, documents)
            
            success = len(errors) == 0
            message = f"Successfully generated {len(documents)} documents" if success else f"Completed with {len(errors)} errors"
            
            return WorkflowResult(
                success=success,
                employee_id=employee_id,
                documents=documents,
                errors=errors,
                message=message
            )
            
        except Exception as e:
            errors.append(f"Workflow execution failed: {str(e)}")
            return WorkflowResult(
                success=False,
                employee_id=employee_id,
                documents=documents,
                errors=errors,
                message=f"Workflow failed: {str(e)}"
            )
    
    def _generate_contract(self, profile: EmployeeProfile, employee_id: str) -> Optional[GeneratedDocument]:
        """Generate employment contract"""
        try:
            params = ContractParams(
                employee_name=profile.full_name,
                position=profile.position or "Employee",
                department=profile.department or "General",
                jurisdiction=profile.jurisdiction,
                start_date=profile.start_date or datetime.now().strftime("%Y-%m-%d"),
                salary=float(profile.salary) if hasattr(profile, 'salary') and profile.salary else 0.0,
                nric=profile.nric or "",
                employee_address=profile.address or ""
            )
            
            doc_id, file_path = generate_contract(params, self.template_dir, self.output_dir)
            
            return GeneratedDocument(
                id=doc_id,
                document_type="employment_contract",
                file_path=file_path,
                employee_id=employee_id,
                created_at=datetime.now().isoformat(),
                status="generated"
            )
        except Exception as e:
            print(f"Error generating contract: {e}")
            return None
    
    def _generate_policies(self, profile: EmployeeProfile, employee_id: str) -> List[GeneratedDocument]:
        """Generate policy documents based on jurisdiction"""
        documents = []
        jurisdiction = profile.jurisdiction
        
        # Define policies to generate based on jurisdiction
        if jurisdiction == "MY":
            policies = [
                ("data_it_policy", "Data & IT Policy"),
                ("employee_handbook", "Employee Handbook"),
                ("leave_policy", "Leave Policy"),
                ("job_description", "Job Description")
            ]
        else:  # SG
            policies = [
                ("data_it_policy", "Data & IT Policy"),
                ("employee_handbook", "Employee Handbook"),
                ("leave_policy", "Leave Policy"),
                ("job_description", "Job Description")
            ]
        
        for policy_key, policy_name in policies:
            try:
                doc = self._generate_policy_document(profile, employee_id, policy_key, policy_name)
                if doc:
                    documents.append(doc)
            except Exception as e:
                print(f"Error generating {policy_name}: {e}")
        
        return documents
    
    def _generate_policy_document(self, profile: EmployeeProfile, employee_id: str, 
                                  policy_key: str, policy_name: str) -> Optional[GeneratedDocument]:
        """Generate a single policy document"""
        try:
            from jinja2 import Environment, FileSystemLoader
            from xhtml2pdf import pisa
            
            env = Environment(loader=FileSystemLoader(self.template_dir))
            template_name = f"policy_{policy_key}_{profile.jurisdiction.lower()}.html"
            
            # Check if template exists, if not create a basic one
            try:
                template = env.get_template(template_name)
            except:
                # Create basic policy template if not found
                template = self._create_basic_policy_template(env, policy_key, profile.jurisdiction)
            
            defaults = _get_jurisdiction_defaults(profile.jurisdiction)
            
            html_content = template.render(
                employee_name=profile.full_name,
                position=profile.position or "Employee",
                department=profile.department or "General",
                start_date=profile.start_date or datetime.now().strftime("%Y-%m-%d"),
                generated_date=datetime.now().strftime("%d %B %Y"),
                policy_name=policy_name,
                **defaults
            )
            
            doc_id = str(uuid.uuid4())
            filename = f"policy_{policy_key}_{profile.jurisdiction.lower()}_{doc_id[:8]}.pdf"
            os.makedirs(self.output_dir, exist_ok=True)
            file_path = os.path.join(self.output_dir, filename)
            
            with open(file_path, "wb") as f:
                pisa.CreatePDF(html_content, dest=f)
            
            return GeneratedDocument(
                id=doc_id,
                document_type=f"policy_{policy_key}",
                file_path=file_path,
                employee_id=employee_id,
                created_at=datetime.now().isoformat(),
                status="generated"
            )
        except Exception as e:
            print(f"Error generating policy document {policy_key}: {e}")
            return None
    
    def _create_basic_policy_template(self, env: Environment, policy_key: str, jurisdiction: str):
        """Create a basic policy template if one doesn't exist"""
        from jinja2 import Template
        
        template_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{{{ policy_name }}}}</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }}
        h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        h2 {{ color: #34495e; margin-top: 30px; }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .content {{ margin: 20px 0; }}
        .footer {{ margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #7f8c8d; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{{{{ company_name }}}}</h1>
        <h2>{{{{ policy_name }}}}</h2>
    </div>
    
    <div class="content">
        <p><strong>Employee:</strong> {{{{ employee_name }}}}</p>
        <p><strong>Position:</strong> {{{{ position }}}}</p>
        <p><strong>Department:</strong> {{{{ department }}}}</p>
        <p><strong>Start Date:</strong> {{{{ start_date }}}}</p>
        <p><strong>Generated:</strong> {{{{ generated_date }}}}</p>
        
        <h3>Policy Overview</h3>
        <p>This policy document outlines the guidelines and procedures that apply to all employees of {{{{ company_name }}}}. As an employee, you are expected to familiarize yourself with these policies and adhere to them at all times.</p>
        
        <h3>Jurisdiction</h3>
        <p>This policy is governed by the laws and regulations of {{{{ governing_law }}}}.</p>
        
        <h3>Compliance</h3>
        <p>All employees must comply with this policy. Failure to do so may result in disciplinary action, up to and including termination of employment.</p>
        
        <h3>Questions</h3>
        <p>If you have any questions about this policy, please contact the Human Resources department.</p>
    </div>
    
    <div class="footer">
        <p>This document was automatically generated on {{{{ generated_date }}}}</p>
        <p>{{{{ company_address }}}}</p>
    </div>
</body>
</html>
        """
        
        return Template(template_content)
    
    def _generate_offer_letter(self, profile: EmployeeProfile, employee_id: str) -> Optional[GeneratedDocument]:
        """Generate offer letter"""
        try:
            from jinja2 import Template
            from xhtml2pdf import pisa
            
            defaults = _get_jurisdiction_defaults(profile.jurisdiction)
            
            template_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Offer Letter</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }}
        h1 {{ color: #2c3e50; }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .content {{ margin: 20px 0; }}
        .signature {{ margin-top: 60px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{{{{ company_name }}}}</h1>
        <p>{{{{ company_address }}}}</p>
        <p>{{{{ company_reg }}}}</p>
    </div>
    
    <div class="content">
        <p><strong>Date:</strong> {{{{ generated_date }}}}</p>
        <br>
        <p><strong>To:</strong> {{{{ employee_name }}}}</p>
        <p><strong>Email:</strong> {{{{ email }}}}</p>
        <br>
        <h2>Employment Offer</h2>
        <p>Dear {{{{ employee_name }}}},</p>
        <p>We are pleased to offer you the position of <strong>{{{{ position }}}}</strong> in the <strong>{{{{ department }}}} Department</strong> at {{{{ company_name }}}}. We believe your skills and experience will be a valuable addition to our team.</p>
        
        <h3>Terms of Employment</h3>
        <ul>
            <li><strong>Position:</strong> {{{{ position }}}}</li>
            <li><strong>Department:</strong> {{{{ department }}}}</li>
            <li><strong>Start Date:</strong> {{{{ start_date }}}}</li>
            <li><strong>Salary:</strong> {{{{ currency }}}} {{{{ salary }}}}/month</li>
            <li><strong>Probation Period:</strong> {{{{ probation_months }}}} months</li>
            <li><strong>Working Hours:</strong> {{{{ work_hours }}}}</li>
        </ul>
        
        <h3>Benefits</h3>
        <ul>
            <li><strong>Annual Leave:</strong> {{{{ leave_annual }}}}</li>
            <li><strong>Sick Leave:</strong> {{{{ leave_sick }}}}</li>
            <li><strong>Medical Coverage:</strong> {{{{ medical_coverage }}}}</li>
            <li><strong>Statutory Contributions:</strong> {{{{ statutory_contributions }}}}</li>
        </ul>
        
        <h3>Acceptance</h3>
        <p>Please sign and return this offer letter by {{{{ start_date }}}} to confirm your acceptance of this employment offer.</p>
        
        <p>We look forward to welcoming you to the {{{{ company_name }}}} team!</p>
        
        <p>Sincerely,</p>
        <p><strong>Human Resources Department</strong><br>{{{{ company_name }}}}</p>
    </div>
    
    <div class="signature">
        <p>_________________________</p>
        <p>Employee Signature</p>
        <p>Date: _________________</p>
    </div>
</body>
</html>
            """
            
            template = Template(template_content)
            
            html_content = template.render(
                employee_name=profile.full_name,
                email=profile.email,
                position=profile.position or "Employee",
                department=profile.department or "General",
                start_date=profile.start_date or datetime.now().strftime("%Y-%m-%d"),
                salary=f"{float(profile.salary):,.2f}" if hasattr(profile, 'salary') and profile.salary else "0.00",
                generated_date=datetime.now().strftime("%d %B %Y"),
                **defaults
            )
            
            doc_id = str(uuid.uuid4())
            filename = f"offer_letter_{profile.jurisdiction.lower()}_{doc_id[:8]}.pdf"
            os.makedirs(self.output_dir, exist_ok=True)
            file_path = os.path.join(self.output_dir, filename)
            
            with open(file_path, "wb") as f:
                pisa.CreatePDF(html_content, dest=f)
            
            return GeneratedDocument(
                id=doc_id,
                document_type="offer_letter",
                file_path=file_path,
                employee_id=employee_id,
                created_at=datetime.now().isoformat(),
                status="generated"
            )
        except Exception as e:
            print(f"Error generating offer letter: {e}")
            return None
    
    def _generate_compliance_checklist(self, profile: EmployeeProfile, employee_id: str) -> Optional[GeneratedDocument]:
        """Generate compliance checklist"""
        try:
            from jinja2 import Template
            from xhtml2pdf import pisa
            
            defaults = _get_jurisdiction_defaults(profile.jurisdiction)
            
            # Define compliance items based on jurisdiction
            if profile.jurisdiction == "MY":
                compliance_items = [
                    "Signed employment contract",
                    "NRIC copy (front and back)",
                    "Educational certificates",
                    "Previous employment reference letters",
                    "Bank account details form",
                    "Passport-sized photographs (2 copies)",
                    "EPF nomination form",
                    "SOCSO registration form",
                    "Emergency contact form",
                    "Data protection acknowledgement",
                    "IT policy acceptance"
                ]
            else:  # SG
                compliance_items = [
                    "Signed employment contract",
                    "NRIC or valid work pass copy",
                    "Educational certificates",
                    "Previous employment reference letters",
                    "Bank account details form",
                    "Passport-sized photographs (2 copies)",
                    "CPF nomination form",
                    "Tax declaration form (IR8A)",
                    "Emergency contact form",
                    "Data protection acknowledgement",
                    "IT policy acceptance"
                ]
            
            template_content = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Compliance Checklist</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #2c3e50; }
        .header { text-align: center; margin-bottom: 40px; }
        .checklist { margin: 20px 0; }
        .checklist-item { padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px; }
        .checkbox { width: 20px; height: 20px; border: 2px solid #3498db; display: inline-block; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ company_name }}</h1>
        <h2>Onboarding Compliance Checklist</h2>
    </div>
    
    <div class="content">
        <p><strong>Employee:</strong> {{ employee_name }}</p>
        <p><strong>Position:</strong> {{ position }}</p>
        <p><strong>Department:</strong> {{ department }}</p>
        <p><strong>Start Date:</strong> {{ start_date }}</p>
        <p><strong>Generated:</strong> {{ generated_date }}</p>
        
        <h3>Required Documents & Actions</h3>
        <p>Please complete all items below and submit to HR:</p>
        
        <div class="checklist">
            {% for item in compliance_items %}
            <div class="checklist-item">
                <span class="checkbox"></span>
                <strong>{{ item }}</strong>
            </div>
            {% endfor %}
        </div>
        
        <h3>Important Notes</h3>
        <ul>
            <li>All documents must be submitted before your start date</li>
            <li>Original documents may be required for verification</li>
            <li>Contact HR if you have any questions</li>
        </ul>
        
        <h3>Employee Declaration</h3>
        <p>I confirm that all information provided is accurate and complete.</p>
        
        <div class="signature">
            <p>_________________________</p>
            <p>Employee Signature</p>
            <p>Date: _________________</p>
        </div>
    </div>
</body>
</html>
            """
            
            template = Template(template_content)
            
            html_content = template.render(
                employee_name=profile.full_name,
                position=profile.position or "Employee",
                department=profile.department or "General",
                start_date=profile.start_date or datetime.now().strftime("%Y-%m-%d"),
                generated_date=datetime.now().strftime("%d %B %Y"),
                compliance_items=compliance_items,
                **defaults
            )
            
            doc_id = str(uuid.uuid4())
            filename = f"compliance_checklist_{profile.jurisdiction.lower()}_{doc_id[:8]}.pdf"
            os.makedirs(self.output_dir, exist_ok=True)
            file_path = os.path.join(self.output_dir, filename)
            
            with open(file_path, "wb") as f:
                pisa.CreatePDF(html_content, dest=f)
            
            return GeneratedDocument(
                id=doc_id,
                document_type="compliance_checklist",
                file_path=file_path,
                employee_id=employee_id,
                created_at=datetime.now().isoformat(),
                status="generated"
            )
        except Exception as e:
            print(f"Error generating compliance checklist: {e}")
            return None
    
    def _store_documents(self, employee_id: str, documents: List[GeneratedDocument]):
        """Store generated documents in database"""
        try:
            for doc in documents:
                self.db.table("generated_documents").insert({
                    "id": doc.id,
                    "employee_id": employee_id,
                    "document_type": doc.document_type,
                    "file_path": doc.file_path,
                    "created_at": doc.created_at,
                    "status": doc.status
                }).execute()
        except Exception as e:
            print(f"Error storing documents: {e}")
