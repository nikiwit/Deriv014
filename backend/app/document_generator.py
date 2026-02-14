import os
import uuid
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa

_BASE_DIR = Path(__file__).resolve().parent.parent
TEMP_DIR = Path(os.environ.get("TEMP_DATA_DIR", str(_BASE_DIR / "temp_data")))
TEMP_DIR.mkdir(parents=True, exist_ok=True)


def generate_contract(params, template_dir, output_dir):
    """Generate document (contract/offer letter) from structured data.

    Args:
        params: ContractParams dataclass
        template_dir: Path to Jinja2 HTML templates
        output_dir: Path to store generated PDFs

    Returns:
        (document_id, file_path)
    """
    env = Environment(loader=FileSystemLoader(template_dir))

    if params.document_type == "offer_letter":
        template_name = "offer_letter_simple.html"
    else:
        template_name = f"contract_{params.jurisdiction.lower()}.html"

    template = env.get_template(template_name)

    defaults = _get_jurisdiction_defaults(params.jurisdiction)

    # Use NRIC or Passport No or both combined if needed
    nric_display = params.nric
    if params.passport_no:
        if nric_display:
            nric_display += f" / {params.passport_no}"
        else:
            nric_display = params.passport_no

    html_content = template.render(
        employee_name=params.employee_name,
        nric=nric_display,
        passport_no=params.passport_no,
        employee_address=params.employee_address,
        position=params.position,
        department=params.department,
        start_date=params.start_date,
        salary=f"{params.salary:,.2f}",
        generated_date=datetime.now().strftime("%d %B %Y"),
        **defaults,
    )

    # doc_id = str(uuid.uuid4())
    # filename = f"contract_{params.jurisdiction.lower()}_{doc_id[:8]}.pdf"
    # os.makedirs(output_dir, exist_ok=True)
    # file_path = os.path.join(output_dir, filename)

    # with open(file_path, "wb") as f:
    #     pisa.CreatePDF(html_content, dest=f)

    # return doc_id, file_path

    import json
    from pathlib import Path

    doc_id = str(uuid.uuid4())

    # Ensure temp directory exists
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    # Use employee_id if available, otherwise fall back to a short doc_id prefix
    file_key = (params.employee_id or "").strip() or doc_id[:8]
    file_path = TEMP_DIR / f"{file_key}_contract.json"

    # Store contract metadata instead of PDF
    contract_data = {
        "doc_id": doc_id,
        "employee_id": file_key,
        "jurisdiction": params.jurisdiction,
        "generated_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "html_content": html_content,  # optional: remove if too large
    }

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(contract_data, f, indent=2)

    return doc_id, str(file_path)


def _get_jurisdiction_defaults(jurisdiction):
    """Return jurisdiction-specific contract defaults."""
    if jurisdiction == "MY":
        return {
            "company_name": "Deriv Solutions Sdn Bhd",
            "company_reg": "202301234567 (1234567-A)",
            "company_address": "Level 15, Menara PKNS, Jalan Yong Shook Lin, 46050 Petaling Jaya, Selangor",
            "currency": "RM",
            "governing_law": "Employment Act 1955 (Malaysia)",
            "statutory_contributions": "EPF (Employer: 13%, Employee: 11%), SOCSO, EIS",
            "leave_annual": "8 days (<2 years), 12 days (2-5 years), 16 days (>5 years)",
            "leave_sick": "14 days (<2 years), 18 days (2-5 years), 22 days (>5 years)",
            "leave_hospitalization": "Up to 60 days",
            "leave_maternity": "98 consecutive days",
            "leave_paternity": "7 consecutive days",
            "probation_months": "3",
            "notice_period": "1 month",
            "work_hours": "40 hours/week, Monday to Friday, 9:00 AM - 6:00 PM",
            "overtime_rate": "1.5x (first 4 hours), 2x thereafter",
            "medical_coverage": "RM 50,000 annual limit",
        }
    else:
        return {
            "company_name": "Deriv Solutions Pte Ltd",
            "company_reg": "UEN: 202301234568B",
            "company_address": "1 Marina Boulevard, #18-01 One Marina Boulevard, Singapore 018989",
            "currency": "SGD",
            "governing_law": "Employment Act (Cap. 91) of Singapore",
            "statutory_contributions": "CPF (Employer: 17%, Employee: 20% of Ordinary Wages)",
            "leave_annual": "7 days (Year 1), increasing by 1 day per year up to 14 days",
            "leave_sick": "14 days outpatient, 60 days hospitalization",
            "leave_hospitalization": "Up to 60 days (inclusive of outpatient)",
            "leave_maternity": "16 weeks (Government-Paid)",
            "leave_paternity": "2 weeks (Government-Paid)",
            "probation_months": "3",
            "notice_period": "1 month",
            "work_hours": "44 hours/week, flexible hours between 8:00 AM - 7:00 PM",
            "overtime_rate": "As per Employment Act for eligible employees",
            "medical_coverage": "SGD 80,000 annual limit",
        }
