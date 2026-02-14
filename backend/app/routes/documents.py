import json
import uuid
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request, send_file

from app.database import get_db
from app.document_generator import generate_contract
from app.models import ContractParams

bp = Blueprint("documents", __name__, url_prefix="/api/documents")

import logging 
logger = logging.getLogger(__name__)

CHECKLISTS = {
    "new_hire": {
        "MY": [
            "Signed employment contract",
            "Copy of NRIC (front and back)",
            "Educational certificates",
            "Previous employment reference letters",
            "Bank account details (for salary payment)",
            "Passport-sized photograph (2 copies)",
            "EPF nomination form",
            "SOCSO registration form",
            "Emergency contact details",
        ],
        "SG": [
            "Signed employment contract",
            "Copy of NRIC or valid work pass/visa",
            "Educational certificates",
            "Previous employment reference letters",
            "Bank account details (for salary payment)",
            "Passport-sized photograph (2 copies)",
            "CPF nomination form",
            "Tax declaration form (IR8A)",
            "Emergency contact details",
        ],
    },
    "visa_renewal": {
        "MY": [
            "Valid passport (min 12 months validity)",
            "Current work permit/visa",
            "Employment verification letter",
            "Recent payslips (3 months)",
            "Company support letter",
        ],
        "SG": [
            "Valid passport (min 6 months validity)",
            "Current Employment Pass/S Pass",
            "Latest payslip",
            "Company support letter",
            "Updated CV/resume",
            "Educational certificates (if not previously submitted)",
        ],
    },
}


@bp.route("/generate", methods=["POST"])
def generate():
    """Generate an employment contract. Missing fields are filled with defaults."""
    data = request.get_json() or {}

    params = ContractParams.from_dict(data)

    try:
        doc_id, file_path = generate_contract(
            params,
            current_app.config["TEMPLATE_DIR"],
            current_app.config["GENERATED_DOCS_DIR"],
        )
    except Exception as e:
        return jsonify({"error": f"Document generation failed: {str(e)}"}), 500

    file_key = params.employee_id or doc_id[:8]

    return jsonify({
        "id": doc_id,
        "document_type": "employment_contract",
        "jurisdiction": params.jurisdiction,
        "employee_name": params.employee_name,
        "employee_id": file_key,
        "download_url": f"/api/download-contract-json/{file_key}",
    }), 201


@bp.route("", methods=["GET"])
def list_documents():
    """List all generated documents."""
    db = get_db()
    
    response = db.table("generated_documents").select(
        "id, document_type, jurisdiction, employee_name, created_at"
    ).order("created_at", desc=True).execute()
    
    docs = response.data

    return jsonify({
        "documents": [
            {
                "id": d["id"],
                "document_type": d["document_type"],
                "jurisdiction": d["jurisdiction"],
                "employee_name": d["employee_name"],
                "created_at": d["created_at"],
                "download_url": f"/api/documents/{d['id']}/download",
            }
            for d in docs
        ]
    })


@bp.route("/<doc_id>", methods=["GET"])
def get_document(doc_id):
    """Get document metadata."""
    db = get_db()
    
    response = db.table("generated_documents").select(
        "id, document_type, jurisdiction, employee_name, parameters, created_at"
    ).eq("id", doc_id).execute()
    
    if not response.data:
        return jsonify({"error": "Document not found"}), 404
        
    doc = response.data[0]

    return jsonify({
        "id": doc["id"],
        "document_type": doc["document_type"],
        "jurisdiction": doc["jurisdiction"],
        "employee_name": doc["employee_name"],
        "parameters": json.loads(doc["parameters"]) if doc.get("parameters") else {},
        "created_at": doc["created_at"],
        "download_url": f"/api/documents/{doc['id']}/download",
    })


@bp.route("/<doc_id>/download", methods=["GET"])
def download_document(doc_id):
    """Download a generated PDF."""
    db = get_db()
    
    response = db.table("generated_documents").select(
        "file_path, employee_name, jurisdiction"
    ).eq("id", doc_id).execute()
    
    if not response.data:
        return jsonify({"error": "Document not found"}), 404
        
    doc = response.data[0]

    if not doc or not doc.get("file_path"):
        return jsonify({"error": "Document file path missing"}), 404

    return send_file(
        doc["file_path"],
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"contract_{doc['jurisdiction'].lower()}_{doc['employee_name'].replace(' ', '_')}.pdf",
    )


@bp.route("/checklist", methods=["GET"])
def checklist():
    """Get required documents checklist for a scenario."""
    scenario = request.args.get("scenario", "new_hire")
    jurisdiction = request.args.get("jurisdiction", "MY")

    if scenario not in CHECKLISTS:
        return jsonify({"error": f"Unknown scenario. Available: {list(CHECKLISTS.keys())}"}), 400

    items = CHECKLISTS[scenario].get(jurisdiction, CHECKLISTS[scenario].get("MY", []))

    return jsonify({
        "scenario": scenario,
        "jurisdiction": jurisdiction,
        "items": items,
    })


# Additional document routes for onboarding
import os as os_module
from flask_cors import cross_origin
from fpdf import FPDF
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMP_DIR = Path(os_module.getenv("TEMP_DATA_DIR", BASE_DIR / "temp_data"))

# Ensure TEMP_DIR exists
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Create a separate blueprint for onboarding routes (no prefix)
onboarding_docs_bp = Blueprint("onboarding_docs", __name__)

@onboarding_docs_bp.route("/api/save-application", methods=["POST"])
@cross_origin()
def save_application():
    data = request.get_json() or {}
    employee_id = data.get("id") or data.get("employeeId")
    if not employee_id:
        return jsonify({"error": "Missing id in payload"}), 400

    # Save JSON to temp folder
    file_path = TEMP_DIR / f"{employee_id}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "saved", "id": employee_id}), 200


def _safe_text(text):
    """Sanitize text for PDF rendering - handle None, encoding, and length."""
    if text is None:
        return ""
    text = str(text)
    # Replace problematic characters
    text = text.encode('latin-1', errors='replace').decode('latin-1')
    return text


def _generate_pdf_from_json(data, out_path: Path):
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_left_margin(15)
    pdf.set_right_margin(15)
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Onboarding / Application Document", ln=True, align="C")
    pdf.ln(6)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "Applicant Information", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)

    def line(key, label=None):
        value = data.get(key, "")
        if value is None:
            value = ""
        pdf.multi_cell(180, 7, _safe_text(f"{(label or key)}: {value}"))

    line("fullName", "Full name")
    line("email", "Email")
    line("role", "Role")
    line("department", "Department")
    line("startDate", "Start date")
    line("nationality", "Nationality")
    line("nric", "NRIC")

    # Education if present
    education = data.get("education") or []
    if education:
        pdf.ln(4)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Education", ln=True)
        pdf.set_font("Arial", "", 11)
        for edu in education:
            pdf.multi_cell(180, 7, _safe_text(f"- {edu.get('degree','')} - {edu.get('school','')} ({edu.get('year','')})"))

    # Employment history if present
    employment = data.get("employmentHistory") or []
    if employment:
        pdf.ln(4)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Employment History", ln=True)
        pdf.set_font("Arial", "", 11)
        for job in employment:
            pdf.multi_cell(180, 7, _safe_text(f"- {job.get('role','')} at {job.get('company','')} ({job.get('from','')} - {job.get('to','')})"))

    pdf.output(str(out_path))


@onboarding_docs_bp.route("/api/generate-pdf/<employee_id>", methods=["GET"])
@cross_origin()
def generate_pdf(employee_id):
    # find saved JSON
    json_path = TEMP_DIR / f"{employee_id}.json"
    if not json_path.exists():
        return jsonify({"error": "Application not found"}), 404

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    pdf_path = TEMP_DIR / f"{employee_id}.pdf"
    # generate PDF (overwrite)
    _generate_pdf_from_json(data, pdf_path)

    # return file
    return send_file(str(pdf_path), as_attachment=True, download_name=f"application_{employee_id}.pdf", mimetype="application/pdf")


# ── Comprehensive Application ────────────────────────────────────────────────

@onboarding_docs_bp.route("/api/save-application-comprehensive", methods=["POST"])
@cross_origin()
def save_application_comprehensive():
    data = request.get_json() or {}
    employee_id = data.get("id") or data.get("employeeId")
    if not employee_id:
        return jsonify({"error": "Missing id in payload"}), 400

    file_path = TEMP_DIR / f"{employee_id}_app_comprehensive.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "saved", "id": employee_id}), 200

from datetime import datetime
from pathlib import Path
from fpdf import FPDF

def _generate_comprehensive_app_pdf(data, out_path: Path):
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_left_margin(15)
    pdf.set_right_margin(15)
    pdf.add_page()

    def val(key, default=""):
        v = data.get(key, default)
        return _safe_text(str(v) if v else default)

    # Geometry & spacing
    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    line_h = 7
    small_line_h = 6
    section_gap = 6

    def full_width(text, h=line_h):
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(usable_width, h, text)

    def section_title(text):
        pdf.set_font("Arial", "B", 12)
        pdf.set_x(pdf.l_margin)
        # border="B" isn't always necessary; using ln=True then small gap
        pdf.cell(0, 8, text, ln=True)
        pdf.ln(2)
        pdf.set_font("Arial", "", 11)

    # Title
    pdf.set_font("Arial", "B", 18)
    pdf.cell(0, 10, "ONBOARDING APPLICATION", ln=True, align="C")
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 8, "Official Record of Employment", ln=True, align="C")
    pdf.ln(8)

    # 1. Employee Details
    section_title("1. EMPLOYEE DETAILS")
    full_width(f"Full Name: {val('fullName')}")
    full_width(f"Email: {val('email')}")
    # use two shorter lines for compact items if desired
    full_width(f"Nationality: {val('nationality')}")
    full_width(f"NRIC / ID: {val('nric', 'N/A')}")
    pdf.ln(section_gap)

    # 2. Employment Information
    section_title("2. EMPLOYMENT INFORMATION")
    full_width(f"Job Title: {val('role')}")
    full_width(f"Department: {val('department')}")
    full_width(f"Start Date: {val('startDate')}")
    manager = val('reportingTo', 'Department Head')
    full_width(f"Reporting Manager: {manager}")
    pdf.ln(section_gap)

    # 3. Compensation Summary
    section_title("3. COMPENSATION SUMMARY")
    full_width(f"Monthly Base Salary: {val('salary', 'Refer to Offer Letter')}")
    full_width("Currency: MYR (Malaysian Ringgit)")
    full_width("Payment Cycle: Monthly, by the 28th of each calendar month.")
    pdf.ln(section_gap)

    # 4. Benefits Enrollment
    section_title("4. BENEFITS ENROLLMENT INSTRUCTIONS")
    full_width("As per the company job description and regional policies, you are eligible for:")
    # smaller line height for the bullets to fit neatly
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, small_line_h, "- Medical Outpatient & Hospitalization (RM 50,000 annual limit)")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, small_line_h, "- Performance Bonus (up to 2 months based on KPI)")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, small_line_h, "- L&D Allowance (RM 1,500/year)")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, small_line_h, "- Statutory: EPF (13%), SOCSO, EIS")
    pdf.ln(2)
    pdf.set_font("Arial", "I", 10)
    full_width("Action Required: Complete your 'My Profile' statutory details to initiate enrollment.", h=small_line_h)
    pdf.set_font("Arial", "", 11)
    pdf.ln(section_gap)

    # 5. Company Policies
    section_title("5. COMPANY POLICIES ACKNOWLEDGMENT")
    full_width("You acknowledge compliance with the following foundational documents:")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, small_line_h, " [x] Employee Handbook - Global Standards")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, small_line_h, " [x] Code of Conduct - Professional Integrity")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, small_line_h, " [x] IT & Data Security - Acceptable Use Policy")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, small_line_h, " [x] Privacy Notice - PDPA Compliance")
    pdf.ln(section_gap)

    # 6. Contractual Agreements
    section_title("6. CONTRACTUAL AGREEMENTS (ITEMIZED)")
    agreements = [
        "1. Confidentiality: Employee shall not disclose trade secrets or proprietary data.",
        "2. IP Assignment: All inventions and works produced are the Company's sole property.",
        "3. Notice Period: 1 month termination notice required by either party.",
        "4. Non-Solicitation: Agreement not to solicit clients or staff for 12 months post-exit.",
        "5. Compliance: Employee agrees to follow all local Malaysian statutory regulations."
    ]
    for agg in agreements:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(usable_width, small_line_h, agg)
    pdf.ln(6)

    # Signatures - draw a thin line across the usable area and print labels below
    cur_y = pdf.get_y() + 6
    line_x1 = pdf.l_margin
    line_x2 = pdf.l_margin + usable_width
    # draw signature line left-to-right but leave margin space inside auto page margin
    pdf.line(line_x1, cur_y, line_x2, cur_y)
    pdf.ln(8)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, f"Applicant Signature: {val('fullName')}")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, f"Date: {datetime.now().strftime('%Y-%m-%d')}")

    # Finish
    pdf.output(str(out_path))


@onboarding_docs_bp.route("/api/generate-app-comprehensive-pdf/<employee_id>", methods=["GET"])
@cross_origin()
def generate_app_comprehensive_pdf(employee_id):
    json_path = TEMP_DIR / f"{employee_id}_app_comprehensive.json"
    if not json_path.exists():
        return jsonify({"error": "Comprehensive application data not found"}), 404

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    pdf_path = TEMP_DIR / f"{employee_id}_contract.pdf"
    _generate_comprehensive_app_pdf(data, pdf_path)

    return send_file(str(pdf_path), as_attachment=True, download_name=f"onboarding_application_{employee_id}.pdf", mimetype="application/pdf")


# ── Offer Acceptance ─────────────────────────────────────────────────────────

@onboarding_docs_bp.route("/api/save-offer-acceptance", methods=["POST"])
@cross_origin()
def save_offer_acceptance():
    data = request.get_json() or {}
    employee_id = data.get("id") or data.get("employeeId")
    if not employee_id:
        return jsonify({"error": "Missing id in payload"}), 400

    file_path = TEMP_DIR / f"{employee_id}_offer.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "saved", "id": employee_id}), 200

def _generate_offer_pdf(data, out_path: Path):
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_left_margin(15)
    pdf.set_right_margin(15)
    pdf.add_page()

    def val(key, default=""):
        v = data.get(key, default)
        return _safe_text(str(v) if v else default)

    # Useful geometry
    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    gap = 6  # gap between two columns, mm
    col_w = (usable_width - gap) / 2
    line_h = 7

    # Helper: draw two columns of wrapped text, keeping rows aligned vertically
    def two_col_multicell(left_text, right_text, left_w=col_w, right_w=col_w, h=line_h):
        # Save starting position
        x_start = pdf.get_x()
        y_start = pdf.get_y()

        # Left column
        pdf.multi_cell(left_w, h, left_text)
        y_after_left = pdf.get_y()

        # Right column: go back to start y, move to right column x
        pdf.set_xy(x_start + left_w + gap, y_start)
        pdf.multi_cell(right_w, h, right_text)
        y_after_right = pdf.get_y()

        # Move cursor to the next line after the taller of the two columns,
        # and reset x to left margin
        pdf.set_xy(pdf.l_margin, max(y_after_left, y_after_right))

    # Title
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Offer Acceptance Form", ln=True, align="C")
    pdf.ln(6)

    # Candidate Information
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "CANDIDATE INFORMATION", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)

    # Use two-column rows for compact fields
    two_col_multicell(f"Full Name: {val('fullName')}", f"NRIC/Passport No: {val('nricPassport')}")
    two_col_multicell(f"Email: {val('email')}", f"Mobile: {val('mobile')}")
    pdf.ln(4)

    # Offer Details (we mix one- and two-column rows)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "OFFER DETAILS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)

    two_col_multicell(f"Company: {val('company')}", f"Position: {val('position')}")
    two_col_multicell(f"Department: {val('department')}", f"Reporting To: {val('reportingTo')}")
    two_col_multicell(f"Start Date: {val('startDate')}", f"Employment Type: {val('employmentType')}")
    two_col_multicell(f"Probation Period: {val('probationPeriod')}", f"Monthly Salary: MYR {val('monthlySalary')}")
    # Benefits may be long -> full width
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, f"Benefits: {val('benefits')}")
    pdf.ln(4)

    # Offer Acceptance
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "OFFER ACCEPTANCE", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    name = val("fullName") or "______"
    company = val("company") or "______"

    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, f"I, {name}, hereby accept the offer of employment with {company} under the terms and conditions outlined in the offer letter.")
    pdf.ln(2)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, "I confirm that I have read, understood, and agree to:")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, "  - The position responsibilities and reporting structure")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, "  - The compensation and benefits package")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, "  - The probation period and terms of employment")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, "  - The company policies referenced in the offer letter")
    pdf.ln(2)

    accepted = "[x]" if data.get("accepted") else "[ ]"
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, f"{accepted} Offer Accepted")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, f"Acceptance Date: {val('acceptanceDate')}")
    pdf.ln(4)

    # Emergency Contact
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "EMERGENCY CONTACT DETAILS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)

    two_col_multicell(f"Emergency Contact Name: {val('emergencyName')}", f"Relationship: {val('emergencyRelationship')}")
    two_col_multicell(f"Mobile Number: {val('emergencyMobile')}", f"Alternative Number: {val('emergencyAltNumber') or 'N/A'}")
    pdf.ln(4)

    # Conflicts of Interest
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "DECLARATION OF CONFLICTS OF INTEREST", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    no_conflicts = data.get("noConflicts", True)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, f"{'[x]' if no_conflicts else '[ ]'} I have NO conflicts of interest")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, line_h, f"{'[ ]' if no_conflicts else '[x]'} I have potential conflicts to disclose")
    if not no_conflicts:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(usable_width, line_h, f"Details: {val('conflictDetails') or 'N/A'}")
    pdf.ln(4)

    # Signature block - two columns: signature (left) and date (right)
    pdf.set_font("Arial", "", 11)
    sig_left = f"Signature: {val('fullName')}"
    sig_right = f"Date: {val('acceptanceDate')}"

    # Use the two-column helper to keep signature and date aligned even if they wrap
    two_col_multicell(sig_left, sig_right, left_w=col_w, right_w=col_w, h=line_h)

    # Optionally add space for handwriting/signature line
    pdf.ln(6)
    # print file
    pdf.output(str(out_path))

@onboarding_docs_bp.route("/api/generate-offer-pdf/<employee_id>", methods=["GET"])
@cross_origin()
def generate_offer_pdf(employee_id):
    """
    Generate offer PDF from authenticated user data in Supabase.
    Falls back to JSON file if user data not found in database.
    """
    from app.database import get_db
    
    # Try to fetch user data from Supabase first
    try:
        db = get_db()
        user_result = db.table("users").select("*").eq("id", employee_id).execute()
        
        if user_result.data and len(user_result.data) > 0:
            # Build data from Supabase user record
            user = user_result.data[0]
            data = {
                "fullName": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "nricPassport": user.get("nric", ""),
                "email": user.get("email", ""),
                "mobile": user.get("phone", ""),
                "company": "Deriv Solutions Sdn Bhd",
                "position": user.get("position_title", user.get("role", "")),
                "department": user.get("department", ""),
                "reportingTo": "",
                "startDate": user.get("start_date", ""),
                "employmentType": "Permanent",
                "probationPeriod": "3 months",
                "monthlySalary": user.get("salary", ""),
                "benefits": "As per company policy",
                "acceptanceDate": datetime.now().strftime("%Y-%m-%d"),
                "emergencyName": user.get("emergency_contact_name", ""),
                "emergencyRelationship": user.get("emergency_contact_relation", ""),
                "emergencyMobile": user.get("emergency_contact_phone", ""),
                "emergencyAltNumber": "",
                "noConflicts": True,
                "conflictDetails": "",
                "accepted": True,
                "completedAt": datetime.now().isoformat(),
                "id": employee_id
            }
        else:
            # Fallback to JSON file if user not in database
            json_path = TEMP_DIR / f"{employee_id}_offer.json"
            if not json_path.exists():
                return jsonify({"error": "Offer data not found in database or file system"}), 404
            
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
    
    except Exception as e:
        # Fallback to JSON file on error
        json_path = TEMP_DIR / f"{employee_id}_offer.json"
        if not json_path.exists():
            return jsonify({"error": f"Failed to fetch offer data: {str(e)}"}), 500
        
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

    # Generate PDF
    pdf_path = TEMP_DIR / f"{employee_id}_offer.pdf"
    _generate_offer_pdf(data, pdf_path)

    return send_file(str(pdf_path), as_attachment=True, download_name=f"offer_acceptance_{employee_id}.pdf", mimetype="application/pdf")


# ── Contract ─────────────────────────────────────────────────────────────────

@onboarding_docs_bp.route("/api/save-contract", methods=["POST"])
@cross_origin()
def save_contract():
    data = request.get_json() or {}
    employee_id = data.get("id") or data.get("employeeId")
    if not employee_id:
        return jsonify({"error": "Missing id in payload"}), 400

    file_path = TEMP_DIR / f"{employee_id}_contract.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "saved", "id": employee_id}), 200

def _generate_contract_pdf(data, out_path: Path):
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_left_margin(15)
    pdf.set_right_margin(15)
    pdf.add_page()

    def val(key, default=""):
        v = data.get(key, default)
        # If v is None, use default; otherwise, convert to string and strip if it's a string
        if v is None:
            result = default
        else:
            result = str(v).strip()
        return _safe_text(result)

    def check(key):
        return "[x]" if data.get(key) else "[ ]"

    # Geometry
    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    gap = 6  # mm between columns
    col_w = (usable_width - gap) / 2
    line_h = 6

    # Helper: two-column wrapped text keeping rows vertically aligned
    def two_col_multicell(left_text, right_text, left_w=col_w, right_w=col_w, h=line_h):
        x_start = pdf.get_x()
        y_start = pdf.get_y()

        # Left column
        pdf.multi_cell(left_w, h, left_text)
        y_after_left = pdf.get_y()

        # Right column: reset to original y and move to right column x
        pdf.set_xy(x_start + left_w + gap, y_start)
        pdf.multi_cell(right_w, h, right_text)
        y_after_right = pdf.get_y()

        # Move cursor to the next line after taller column and reset X
        pdf.set_xy(pdf.l_margin, max(y_after_left, y_after_right))

    # Small helper to print a full-width label/value
    def full_width(text, h=line_h):
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(usable_width, h, text)

    # Title
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Employee Onboarding Form", ln=True, align="C")
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 8, "Deriv Solutions Sdn Bhd", ln=True, align="C")
    pdf.ln(6)

    # SECTION 1: Personal & Identification
    pdf.set_font("Arial", "B", 13)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 8, "SECTION 1: PERSONAL & IDENTIFICATION DETAILS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)

    two_col_multicell(f"Full Name (as per NRIC/Passport): {val('fullName')}",
                      f"NRIC No: {val('nric', 'N/A')}")
    two_col_multicell(f"Passport No (for non-Malaysians): {val('passportNo', 'N/A')}",
                      f"Nationality: {val('nationality')}")
    two_col_multicell(f"Date of Birth: {val('dateOfBirth')}", f"Gender: {val('gender')}")
    two_col_multicell(f"Marital Status: {val('maritalStatus')}", f"Race: {val('race')}")
    full_width(f"Religion: {val('religion')}")
    pdf.ln(3)

    # Residential Address (full width)
    pdf.set_font("Arial", "B", 11)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 7, "Residential Address", ln=True)
    pdf.set_font("Arial", "", 11)
    two_col_multicell(f"Address: {val('address1')}" + (f", {val('address2')}" if val('address2') else ""), "")
    two_col_multicell(f"Postcode: {val('postcode')}", f"City: {val('city')}")
    two_col_multicell(f"State: {val('state')}", f"Country: {val('country')}")
    pdf.ln(3)

    # Contact
    pdf.set_font("Arial", "B", 11)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 7, "Contact Information", ln=True)
    pdf.set_font("Arial", "", 11)
    two_col_multicell(f"Personal Email: {val('personalEmail')}", f"Work Email: {val('workEmail')}")
    two_col_multicell(f"Mobile Number: {val('mobile')}", f"Alternative Number: {val('altNumber', 'N/A')}")
    pdf.ln(3)

    # Emergency Contact
    pdf.set_font("Arial", "B", 11)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 7, "Emergency Contact", ln=True)
    pdf.set_font("Arial", "", 11)
    two_col_multicell(f"Name: {val('emergencyName')}", f"Relationship: {val('emergencyRelationship')}")
    two_col_multicell(f"Mobile: {val('emergencyMobile')}", f"Alt Number: {val('emergencyAltNumber', 'N/A')}")
    pdf.ln(3)

    # SECTION 2: Employment & Bank
    pdf.add_page()
    pdf.set_font("Arial", "B", 13)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 8, "SECTION 2: EMPLOYMENT & BANK INFORMATION", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)

    two_col_multicell(f"Job Title: {val('jobTitle')}", f"Department: {val('department')}")
    two_col_multicell(f"Reporting To: {val('reportingTo')}", f"Start Date: {val('startDate')}")
    two_col_multicell(f"Employment Type: {val('employmentType')}", f"Work Location: {val('workLocation')}")
    two_col_multicell(f"Work Model: {val('workModel')}", f"Probation Period: {val('probationPeriod')}")
    pdf.ln(3)

    pdf.set_font("Arial", "B", 11)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 7, "Banking Details (for Salary Credit)", ln=True)
    pdf.set_font("Arial", "", 11)
    two_col_multicell(f"Bank Name: {val('bankName')}", f"Account Holder Name: {val('accountHolder')}")
    two_col_multicell(f"Account Number: {val('accountNumber')}", f"Bank Branch: {val('bankBranch')}")
    pdf.ln(3)

    # SECTION 3: Statutory Registrations
    pdf.set_font("Arial", "B", 13)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 8, "SECTION 3: STATUTORY REGISTRATIONS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    two_col_multicell(f"EPF Number: {val('epfNumber', 'New registration needed')}",
                      f"SOCSO Number: {val('socsoNumber', 'New registration needed')}")
    two_col_multicell(f"EIS Number: {val('eisNumber', 'New registration needed')}",
                      f"Income Tax Number: {val('taxNumber', 'New registration needed')}")
    pdf.set_x(pdf.l_margin)
    tax_resident = "Malaysian Tax Resident" if data.get("taxResident") else "Non-Resident"
    full_width(f"Tax Resident Status: {tax_resident}")
    pdf.ln(3)

    # SECTION 4: Policy Acknowledgements
    pdf.add_page()
    pdf.set_font("Arial", "B", 13)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 8, "SECTION 4: POLICY ACKNOWLEDGEMENTS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.set_x(pdf.l_margin)
    full_width(f"{check('acknowledgeHandbook')} Employee Handbook - read and agreed")
    pdf.set_x(pdf.l_margin)
    full_width(f"{check('acknowledgeIT')} IT & Data Security Policy - read and agreed")
    pdf.set_x(pdf.l_margin)
    full_width(f"{check('acknowledgePrivacy')} Data Privacy Policy (PDPA) - consented")
    pdf.set_x(pdf.l_margin)
    full_width(f"{check('acknowledgeConfidentiality')} Confidentiality & Code of Conduct - agreed")
    pdf.ln(4)

    # Final Declaration
    pdf.set_font("Arial", "B", 13)
    pdf.set_x(pdf.l_margin)
    pdf.cell(0, 8, "FINAL DECLARATION", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.set_x(pdf.l_margin)
    full_width(f"{check('finalDeclaration')} I declare that all information provided is true, accurate, and complete.")
    pdf.ln(6)

    # Signature block: two columns (signature left, date right)
    sig_left = f"Employee Full Name: {val('fullName')}"
    sig_center = f"Employee Signature: {val('fullName')}"
    sig_right = f"Date: {val('signatureDate')}"

    # Use two-col for name/date and render signature line in center area
    two_col_multicell(sig_left, sig_right)
    # center column for signature line (drawn as horizontal line)
    # compute center x and y
    x_center = pdf.l_margin + col_w + gap
    y_center = pdf.get_y() + 6
    # line width 60% of col_w centered in the center area
    line_w = col_w * 0.6
    line_x = x_center + (col_w - line_w) / 2
    pdf.line(line_x, y_center, line_x + line_w, y_center)
    # add label below line
    pdf.set_xy(line_x, y_center + 2)
    pdf.set_font("Arial", "", 10)
    pdf.cell(line_w, 5, "Sign above", align="C")

    pdf.output(str(out_path))


@onboarding_docs_bp.route("/api/generate-contract-pdf/<employee_id>", methods=["GET"])
@cross_origin()
def generate_contract_pdf(employee_id):
    """
    Generate contract PDF from authenticated user data in Supabase.
    Falls back to JSON file if user data not found in database.
    """
    from app.database import get_db
    
    # Try to fetch user data from Supabase first
    try:
        db = get_db()
        user_result = db.table("users").select("*").eq("id", employee_id).execute()
        
        if user_result.data and len(user_result.data) > 0:
            # Build contract data from Supabase user record
            user = user_result.data[0]
            
            # Determine jurisdiction
            nationality = (user.get("nationality") or "").lower()
            jurisdiction = "SG" if "singapore" in nationality or "singaporean" in nationality else "MY"
            
            data = {
                "fullName": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "nric": user.get("nric", ""),
                "passportNo": "",
                "nationality": user.get("nationality", "Malaysian"),
                "dateOfBirth": user.get("date_of_birth", ""),
                "gender": "",
                "maritalStatus": "",
                "race": "",
                "religion": "",
                "address1": user.get("address", ""),
                "address2": "",
                "postcode": "",
                "city": "",
                "state": "",
                "country": "Malaysia" if jurisdiction == "MY" else "Singapore",
                "personalEmail": "",
                "workEmail": user.get("email", ""),
                "mobile": user.get("phone", ""),
                "altNumber": "",
                "emergencyName": user.get("emergency_contact_name", ""),
                "emergencyRelationship": user.get("emergency_contact_relation", ""),
                "emergencyMobile": user.get("emergency_contact_phone", ""),
                "emergencyAltNumber": "",
                "jobTitle": user.get("position_title", user.get("role", "")),
                "department": user.get("department", ""),
                "reportingTo": "",
                "startDate": str(user.get("start_date", "")),
                "employmentType": "Full-Time Permanent",
                "probationMonths": 3,
                "workHours": "9:00 AM - 6:00 PM (Mon-Fri)",
                "monthlySalary": str(user.get("salary", "")),
                "currency": "MYR" if jurisdiction == "MY" else "SGD",
                "overtimeRate": "1.5x hourly rate",
                "noticePeriod": "1 month",
                "annualLeave": 14,
                "sickLeave": 14,
                "hospitalizationLeave": 60,
                "maternityLeave": 60 if jurisdiction == "MY" else 112,
                "paternityLeave": 7,
                "bankName": user.get("bank_name", ""),
                "accountHolder": user.get("bank_account_holder", ""),
                "accountNumber": user.get("bank_account_number", ""),
                "taxResident": "malaysian" in nationality,
                "acknowledgeHandbook": True,
                "acknowledgeIT": True,
                "acknowledgePrivacy": True,
                "acknowledgeConfidentiality": True,
                "finalDeclaration": True,
                "signature": user.get("signature", ""),  # Get signature if stored in DB
                "signatureDate": datetime.now().strftime("%Y-%m-%d"),
                "id": employee_id,
                "completedAt": datetime.now().isoformat(),
            }
            
            # If JSON file exists, merge signature from it (signature not in DB)
            json_path = TEMP_DIR / f"{employee_id}_contract.json"
            if json_path.exists():
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        json_data = json.load(f)
                    # Override signature and completedAt if present in saved file
                    if json_data.get("signature"):
                        data["signature"] = json_data["signature"]
                    if json_data.get("completedAt"):
                        data["completedAt"] = json_data["completedAt"]
                    if json_data.get("signatureDate"):
                        data["signatureDate"] = json_data["signatureDate"]
                except Exception as e:
                    logger.warning(f"Could not merge signature from JSON file: {e}")
        else:
            # Fallback to JSON file if user not in database
            json_path = TEMP_DIR / f"{employee_id}_contract.json"
            if not json_path.exists():
                return jsonify({"error": "Contract data not found in database or file system"}), 404
            
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
    
    except Exception as e:
        # Fallback to JSON file on error
        json_path = TEMP_DIR / f"{employee_id}_contract.json"
        if not json_path.exists():
            return jsonify({"error": f"Failed to fetch contract data: {str(e)}"}), 500
        
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

    # Generate PDF
    pdf_path = TEMP_DIR / f"{employee_id}_contract.pdf"
    _generate_contract_pdf(data, pdf_path)

    return send_file(str(pdf_path), as_attachment=True, download_name=f"contract_{employee_id}.pdf", mimetype="application/pdf")


# ── Full Employee Report (combines all documents) ────────────────────────────

@onboarding_docs_bp.route("/api/save-full-report", methods=["POST"])
@cross_origin()
def save_full_report():
    data = request.get_json() or {}
    employee_id = data.get("id") or data.get("employeeId")
    if not employee_id:
        return jsonify({"error": "Missing id in payload"}), 400

    file_path = TEMP_DIR / f"{employee_id}_full_report.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "saved", "id": employee_id}), 200

from datetime import datetime
from pathlib import Path
from fpdf import FPDF

def _generate_full_report_pdf(data, out_path: Path):
    """Generate a comprehensive PDF combining profile, offer acceptance, and contract data."""
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_left_margin(15)
    pdf.set_right_margin(15)

    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    line_h = 7
    small_h = 6
    section_gap = 6

    profile = data.get("profile", {}) or {}
    offer = data.get("offer", {}) or {}
    contract = data.get("contract", {}) or {}

    def val(src, key, default=""):
        v = src.get(key, default) if src else default
        return _safe_text(str(v) if v else default)

    def full(text, h=line_h):
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(usable_width, h, text)

    def section_title(text, size=14):
        pdf.set_font("Arial", "B", size)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 10, text, ln=True)
        pdf.ln(2)
        pdf.set_font("Arial", "", 11)

    # ── COVER PAGE ──
    pdf.add_page()
    pdf.set_font("Arial", "B", 20)
    pdf.cell(0, 15, "Employee Full Report", ln=True, align="C")
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 8, "Deriv Solutions Sdn Bhd", ln=True, align="C")
    pdf.ln(10)

    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, val(profile, "fullName", "N/A"), ln=True, align="C")
    pdf.set_font("Arial", "", 11)
    pdf.cell(0, 7, _safe_text(f"{val(profile, 'role', 'N/A')} - {val(profile, 'department', 'N/A')}"), ln=True, align="C")
    pdf.cell(0, 7, _safe_text(f"Start Date: {val(profile, 'startDate', 'N/A')}"), ln=True, align="C")
    pdf.ln(8)

    # Document status summary
    section_title("DOCUMENT STATUS", size=12)
    app_status = "Completed" if profile.get("status") == "in_progress" else "Not started"
    offer_status = "Completed" if offer.get("completedAt") else "Not completed"
    contract_status = "Completed" if contract.get("completedAt") else "Not completed"
    full(f"[{'x' if app_status == 'Completed' else ' '}] Application: {app_status}")
    full(f"[{'x' if offer_status == 'Completed' else ' '}] Offer Acceptance: {offer_status}")
    full(f"[{'x' if contract_status == 'Completed' else ' '}] Contract: {contract_status}")
    pdf.ln(section_gap)

    # ── Part 1: Application / Profile ──
    pdf.add_page()
    section_title("PART 1: ONBOARDING APPLICATION")
    full(f"Full Name: {val(profile, 'fullName')}")
    full(f"Email: {val(profile, 'email')}")
    full(f"Role: {val(profile, 'role')}")
    full(f"Department: {val(profile, 'department')}")
    full(f"Start Date: {val(profile, 'startDate')}")
    full(f"Nationality: {val(profile, 'nationality')}")
    full(f"NRIC: {val(profile, 'nric', 'N/A')}")
    full(f"Salary: {val(profile, 'salary', 'N/A')}")

    if profile.get("aiPlan"):
        pdf.ln(4)
        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "AI Onboarding Plan:", ln=True)
        pdf.set_font("Arial", "", 10)
        for line in str(profile.get("aiPlan", "")).splitlines():
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(usable_width, small_h, _safe_text(line))
    pdf.ln(section_gap)

    # ── Part 2: Offer Acceptance ──
    if offer.get("completedAt"):
        pdf.add_page()
        section_title("PART 2: OFFER ACCEPTANCE")
        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Candidate Information", ln=True)
        pdf.set_font("Arial", "", 11)

        full(f"Full Name: {val(offer, 'fullName')}")
        full(f"NRIC/Passport: {val(offer, 'nricPassport')}")
        full(f"Email: {val(offer, 'email')}")
        full(f"Mobile: {val(offer, 'mobile')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Offer Details", ln=True)
        pdf.set_font("Arial", "", 11)
        full(f"Company: {val(offer, 'company')}")
        full(f"Position: {val(offer, 'position')}")
        full(f"Department: {val(offer, 'department')}")
        full(f"Reporting To: {val(offer, 'reportingTo')}")
        full(f"Start Date: {val(offer, 'startDate')}")
        full(f"Employment Type: {val(offer, 'employmentType')}")
        full(f"Probation: {val(offer, 'probationPeriod')}")
        full(f"Monthly Salary: MYR {val(offer, 'monthlySalary')}")
        # Benefits can be long — ensure full width and smaller line height if needed
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(usable_width, small_h, f"Benefits: {val(offer, 'benefits')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Acceptance", ln=True)
        pdf.set_font("Arial", "", 11)
        accepted = "[x]" if offer.get("accepted") else "[ ]"
        full(f"{accepted} Offer Accepted on {val(offer, 'acceptanceDate')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Emergency Contact", ln=True)
        pdf.set_font("Arial", "", 11)
        full(f"Name: {val(offer, 'emergencyName')} ({val(offer, 'emergencyRelationship')})")
        full(f"Mobile: {val(offer, 'emergencyMobile')}")
        pdf.ln(section_gap)

    # ── Part 3: Contract ──
    if contract.get("completedAt"):
        pdf.add_page()
        section_title("PART 3: EMPLOYMENT CONTRACT")
        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Personal Details", ln=True)
        pdf.set_font("Arial", "", 11)
        full(f"Full Name: {val(contract, 'fullName')}")
        full(f"NRIC: {val(contract, 'nric', 'N/A')}")
        full(f"Passport: {val(contract, 'passportNo', 'N/A')}")
        full(f"Nationality: {val(contract, 'nationality')}")
        full(f"DOB: {val(contract, 'dateOfBirth')} | Gender: {val(contract, 'gender')} | Marital: {val(contract, 'maritalStatus')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Address", ln=True)
        pdf.set_font("Arial", "", 11)
        full(f"{val(contract, 'address1')}" + (f", {val(contract, 'address2')}" if val(contract, 'address2') else ""))
        full(f"{val(contract, 'postcode')} {val(contract, 'city')}, {val(contract, 'state')}, {val(contract, 'country')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Employment", ln=True)
        pdf.set_font("Arial", "", 11)
        full(f"Job Title: {val(contract, 'jobTitle')}")
        full(f"Department: {val(contract, 'department')}")
        full(f"Type: {val(contract, 'employmentType')} | Model: {val(contract, 'workModel')}")
        full(f"Start Date: {val(contract, 'startDate')} | Probation: {val(contract, 'probationPeriod')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Banking", ln=True)
        pdf.set_font("Arial", "", 11)
        full(f"Bank: {val(contract, 'bankName')} | Account: {val(contract, 'accountNumber')}")
        full(f"Holder: {val(contract, 'accountHolder')} | Branch: {val(contract, 'bankBranch')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Statutory", ln=True)
        pdf.set_font("Arial", "", 11)
        full(f"EPF: {val(contract, 'epfNumber', 'Pending')} | SOCSO: {val(contract, 'socsoNumber', 'Pending')}")
        full(f"EIS: {val(contract, 'eisNumber', 'Pending')} | Tax: {val(contract, 'taxNumber', 'Pending')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 7, "Policy Acknowledgements", ln=True)
        pdf.set_font("Arial", "", 11)

        def chk(key):
            return "[x]" if contract.get(key) else "[ ]"

        full(f"{chk('acknowledgeHandbook')} Employee Handbook")
        full(f"{chk('acknowledgeIT')} IT & Data Security")
        full(f"{chk('acknowledgePrivacy')} Data Privacy (PDPA)")
        full(f"{chk('acknowledgeConfidentiality')} Confidentiality & Code of Conduct")
        pdf.ln(3)
        full(f"Signed: {val(contract, 'fullName')} on {val(contract, 'signatureDate')}")

    # final output
    pdf.output(str(out_path))
    

@onboarding_docs_bp.route("/api/generate-full-report-pdf/<employee_id>", methods=["GET"])
@cross_origin()
def generate_full_report_pdf(employee_id):
    json_path = TEMP_DIR / f"{employee_id}_full_report.json"
    if not json_path.exists():
        return jsonify({"error": "Full report data not found"}), 404

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    pdf_path = TEMP_DIR / f"{employee_id}_full_report.pdf"
    _generate_full_report_pdf(data, pdf_path)

    return send_file(str(pdf_path), as_attachment=True, download_name=f"full_report_{employee_id}.pdf", mimetype="application/pdf")
