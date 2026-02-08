import json
import uuid

from flask import Blueprint, current_app, jsonify, request, send_file

from app.database import get_db
from app.document_generator import generate_contract
from app.models import ContractParams

bp = Blueprint("documents", __name__, url_prefix="/api/documents")

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
    """Generate an employment contract PDF."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    try:
        params = ContractParams.from_dict(data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        doc_id, file_path = generate_contract(
            params,
            current_app.config["TEMPLATE_DIR"],
            current_app.config["GENERATED_DOCS_DIR"],
        )
    except Exception as e:
        return jsonify({"error": f"Document generation failed: {str(e)}"}), 500

    # Save to database
    db = get_db()
    db.execute(
        "INSERT INTO generated_documents (id, document_type, jurisdiction, employee_name, parameters, file_path) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            doc_id,
            data.get("document_type", "employment_contract"),
            params.jurisdiction,
            params.employee_name,
            json.dumps(data),
            file_path,
        ),
    )
    db.commit()

    return jsonify({
        "id": doc_id,
        "document_type": "employment_contract",
        "jurisdiction": params.jurisdiction,
        "employee_name": params.employee_name,
        "download_url": f"/api/documents/{doc_id}/download",
    }), 201


@bp.route("", methods=["GET"])
def list_documents():
    """List all generated documents."""
    db = get_db()
    docs = db.execute(
        "SELECT id, document_type, jurisdiction, employee_name, created_at "
        "FROM generated_documents ORDER BY created_at DESC"
    ).fetchall()

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
    doc = db.execute(
        "SELECT id, document_type, jurisdiction, employee_name, parameters, created_at "
        "FROM generated_documents WHERE id = ?",
        (doc_id,),
    ).fetchone()

    if not doc:
        return jsonify({"error": "Document not found"}), 404

    return jsonify({
        "id": doc["id"],
        "document_type": doc["document_type"],
        "jurisdiction": doc["jurisdiction"],
        "employee_name": doc["employee_name"],
        "parameters": json.loads(doc["parameters"]),
        "created_at": doc["created_at"],
        "download_url": f"/api/documents/{doc['id']}/download",
    })


@bp.route("/<doc_id>/download", methods=["GET"])
def download_document(doc_id):
    """Download a generated PDF."""
    db = get_db()
    doc = db.execute(
        "SELECT file_path, employee_name, jurisdiction FROM generated_documents WHERE id = ?",
        (doc_id,),
    ).fetchone()

    if not doc or not doc["file_path"]:
        return jsonify({"error": "Document not found"}), 404

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


# routes/documents.py
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_cors import cross_origin
from fpdf import FPDF
import json
import os
from pathlib import Path

bp = Blueprint("documents", __name__)

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # Adjust as needed to reach your project root
TEMP_DIR = Path(os.getenv("TEMP_DATA_DIR", BASE_DIR / "temp_data"))

@bp.route("/api/save-application", methods=["POST"])
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


def _generate_pdf_from_json(data, out_path: Path):
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)
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
        pdf.multi_cell(0, 7, f"{(label or key)}: {value}")

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
            pdf.multi_cell(0, 7, f"- {edu.get('degree','')} — {edu.get('school','')} ({edu.get('year','')})")

    # Employment history if present
    employment = data.get("employmentHistory") or []
    if employment:
        pdf.ln(4)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, "Employment History", ln=True)
        pdf.set_font("Arial", "", 11)
        for job in employment:
            pdf.multi_cell(0, 7, f"- {job.get('role','')} at {job.get('company','')} ({job.get('from','')} → {job.get('to','')})")

    pdf.output(str(out_path))


@bp.route("/api/generate-pdf/<employee_id>", methods=["GET"])
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


# ── Offer Acceptance ─────────────────────────────────────────────────────────

@bp.route("/api/save-offer-acceptance", methods=["POST"])
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
    pdf.add_page()

    def val(key, default=""):
        v = data.get(key, default)
        return str(v) if v else default

    # Title
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Offer Acceptance Form", ln=True, align="C")
    pdf.ln(6)

    # Candidate Information
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "CANDIDATE INFORMATION", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Full Name: {val('fullName')}")
    pdf.multi_cell(0, 7, f"NRIC/Passport No: {val('nricPassport')}")
    pdf.multi_cell(0, 7, f"Email: {val('email')}")
    pdf.multi_cell(0, 7, f"Mobile: {val('mobile')}")
    pdf.ln(4)

    # Offer Details
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "OFFER DETAILS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Company: {val('company')}")
    pdf.multi_cell(0, 7, f"Position: {val('position')}")
    pdf.multi_cell(0, 7, f"Department: {val('department')}")
    pdf.multi_cell(0, 7, f"Reporting To: {val('reportingTo')}")
    pdf.multi_cell(0, 7, f"Start Date: {val('startDate')}")
    pdf.multi_cell(0, 7, f"Employment Type: {val('employmentType')}")
    pdf.multi_cell(0, 7, f"Probation Period: {val('probationPeriod')}")
    pdf.multi_cell(0, 7, f"Monthly Salary: MYR {val('monthlySalary')}")
    pdf.multi_cell(0, 7, f"Benefits: {val('benefits')}")
    pdf.ln(4)

    # Offer Acceptance
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "OFFER ACCEPTANCE", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    name = val("fullName", "______")
    company = val("company", "______")
    pdf.multi_cell(0, 7, f"I, {name}, hereby accept the offer of employment with {company} under the terms and conditions outlined in the offer letter.")
    pdf.ln(2)
    pdf.multi_cell(0, 7, "I confirm that I have read, understood, and agree to:")
    pdf.multi_cell(0, 7, "  - The position responsibilities and reporting structure")
    pdf.multi_cell(0, 7, "  - The compensation and benefits package")
    pdf.multi_cell(0, 7, "  - The probation period and terms of employment")
    pdf.multi_cell(0, 7, "  - The company policies referenced in the offer letter")
    pdf.ln(2)
    accepted = "[x]" if data.get("accepted") else "[ ]"
    pdf.multi_cell(0, 7, f"{accepted} Offer Accepted")
    pdf.multi_cell(0, 7, f"Acceptance Date: {val('acceptanceDate')}")
    pdf.ln(4)

    # Emergency Contact
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "EMERGENCY CONTACT DETAILS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Emergency Contact Name: {val('emergencyName')}")
    pdf.multi_cell(0, 7, f"Relationship: {val('emergencyRelationship')}")
    pdf.multi_cell(0, 7, f"Mobile Number: {val('emergencyMobile')}")
    pdf.multi_cell(0, 7, f"Alternative Number: {val('emergencyAltNumber', 'N/A')}")
    pdf.ln(4)

    # Conflicts of Interest
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "DECLARATION OF CONFLICTS OF INTEREST", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    no_conflicts = data.get("noConflicts", True)
    pdf.multi_cell(0, 7, f"{'[x]' if no_conflicts else '[ ]'} I have NO conflicts of interest")
    pdf.multi_cell(0, 7, f"{'[ ]' if no_conflicts else '[x]'} I have potential conflicts to disclose")
    if not no_conflicts:
        pdf.multi_cell(0, 7, f"Details: {val('conflictDetails', 'N/A')}")
    pdf.ln(4)

    # Signature
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Signature: {val('fullName')}")
    pdf.multi_cell(0, 7, f"Date: {val('acceptanceDate')}")

    pdf.output(str(out_path))


@bp.route("/api/generate-offer-pdf/<employee_id>", methods=["GET"])
@cross_origin()
def generate_offer_pdf(employee_id):
    json_path = TEMP_DIR / f"{employee_id}_offer.json"
    if not json_path.exists():
        return jsonify({"error": "Offer acceptance data not found"}), 404

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    pdf_path = TEMP_DIR / f"{employee_id}_offer.pdf"
    _generate_offer_pdf(data, pdf_path)

    return send_file(str(pdf_path), as_attachment=True, download_name=f"offer_acceptance_{employee_id}.pdf", mimetype="application/pdf")


# ── Contract ─────────────────────────────────────────────────────────────────

@bp.route("/api/save-contract", methods=["POST"])
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
    pdf.add_page()

    def val(key, default=""):
        v = data.get(key, default)
        return str(v) if v else default

    def check(key):
        return "[x]" if data.get(key) else "[ ]"

    # Title
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Employee Onboarding Form", ln=True, align="C")
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 8, "Deriv Solutions Sdn Bhd", ln=True, align="C")
    pdf.ln(6)

    # Section 1: Personal & Identification
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, "SECTION 1: PERSONAL & IDENTIFICATION DETAILS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Full Name (as per NRIC/Passport): {val('fullName')}")
    pdf.multi_cell(0, 7, f"NRIC No: {val('nric', 'N/A')}")
    pdf.multi_cell(0, 7, f"Passport No (for non-Malaysians): {val('passportNo', 'N/A')}")
    pdf.multi_cell(0, 7, f"Nationality: {val('nationality')}")
    pdf.multi_cell(0, 7, f"Date of Birth: {val('dateOfBirth')}")
    pdf.multi_cell(0, 7, f"Gender: {val('gender')}")
    pdf.multi_cell(0, 7, f"Marital Status: {val('maritalStatus')}")
    pdf.multi_cell(0, 7, f"Race: {val('race')}")
    pdf.multi_cell(0, 7, f"Religion: {val('religion')}")
    pdf.ln(3)

    # Residential Address
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 7, "Residential Address", ln=True)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Address: {val('address1')}, {val('address2')}")
    pdf.multi_cell(0, 7, f"Postcode: {val('postcode')}  City: {val('city')}  State: {val('state')}")
    pdf.multi_cell(0, 7, f"Country: {val('country')}")
    pdf.ln(3)

    # Contact
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 7, "Contact Information", ln=True)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Personal Email: {val('personalEmail')}")
    pdf.multi_cell(0, 7, f"Work Email: {val('workEmail')}")
    pdf.multi_cell(0, 7, f"Mobile Number: {val('mobile')}")
    pdf.multi_cell(0, 7, f"Alternative Number: {val('altNumber', 'N/A')}")
    pdf.ln(3)

    # Emergency Contact
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 7, "Emergency Contact", ln=True)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Name: {val('emergencyName')}")
    pdf.multi_cell(0, 7, f"Relationship: {val('emergencyRelationship')}")
    pdf.multi_cell(0, 7, f"Mobile: {val('emergencyMobile')}")
    pdf.multi_cell(0, 7, f"Alt Number: {val('emergencyAltNumber', 'N/A')}")

    # Section 2: Employment & Bank
    pdf.add_page()
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, "SECTION 2: EMPLOYMENT & BANK INFORMATION", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Job Title: {val('jobTitle')}")
    pdf.multi_cell(0, 7, f"Department: {val('department')}")
    pdf.multi_cell(0, 7, f"Reporting To: {val('reportingTo')}")
    pdf.multi_cell(0, 7, f"Start Date: {val('startDate')}")
    pdf.multi_cell(0, 7, f"Employment Type: {val('employmentType')}")
    pdf.multi_cell(0, 7, f"Work Location: {val('workLocation')}")
    pdf.multi_cell(0, 7, f"Work Model: {val('workModel')}")
    pdf.multi_cell(0, 7, f"Probation Period: {val('probationPeriod')}")
    pdf.ln(3)

    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 7, "Banking Details (for Salary Credit)", ln=True)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Bank Name: {val('bankName')}")
    pdf.multi_cell(0, 7, f"Account Holder Name: {val('accountHolder')}")
    pdf.multi_cell(0, 7, f"Account Number: {val('accountNumber')}")
    pdf.multi_cell(0, 7, f"Bank Branch: {val('bankBranch')}")

    # Section 3: Statutory Registrations
    pdf.ln(6)
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, "SECTION 3: STATUTORY REGISTRATIONS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"EPF Number: {val('epfNumber', 'New registration needed')}")
    pdf.multi_cell(0, 7, f"SOCSO Number: {val('socsoNumber', 'New registration needed')}")
    pdf.multi_cell(0, 7, f"EIS Number: {val('eisNumber', 'New registration needed')}")
    pdf.multi_cell(0, 7, f"Income Tax Number: {val('taxNumber', 'New registration needed')}")
    tax_resident = "Malaysian Tax Resident" if data.get("taxResident") else "Non-Resident"
    pdf.multi_cell(0, 7, f"Tax Resident Status: {tax_resident}")

    # Section 4: Policy Acknowledgements
    pdf.add_page()
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, "SECTION 4: POLICY ACKNOWLEDGEMENTS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"{check('acknowledgeHandbook')} Employee Handbook - read and agreed")
    pdf.multi_cell(0, 7, f"{check('acknowledgeIT')} IT & Data Security Policy - read and agreed")
    pdf.multi_cell(0, 7, f"{check('acknowledgePrivacy')} Data Privacy Policy (PDPA) - consented")
    pdf.multi_cell(0, 7, f"{check('acknowledgeConfidentiality')} Confidentiality & Code of Conduct - agreed")
    pdf.ln(4)

    # Final Declaration
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, "FINAL DECLARATION", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"{check('finalDeclaration')} I declare that all information provided is true, accurate, and complete.")
    pdf.ln(4)

    pdf.multi_cell(0, 7, f"Employee Full Name: {val('fullName')}")
    pdf.multi_cell(0, 7, f"Employee Signature: {val('fullName')}")
    pdf.multi_cell(0, 7, f"Date: {val('signatureDate')}")

    pdf.output(str(out_path))


@bp.route("/api/generate-contract-pdf/<employee_id>", methods=["GET"])
@cross_origin()
def generate_contract_pdf(employee_id):
    json_path = TEMP_DIR / f"{employee_id}_contract.json"
    if not json_path.exists():
        return jsonify({"error": "Contract data not found"}), 404

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    pdf_path = TEMP_DIR / f"{employee_id}_contract.pdf"
    _generate_contract_pdf(data, pdf_path)

    return send_file(str(pdf_path), as_attachment=True, download_name=f"contract_{employee_id}.pdf", mimetype="application/pdf")


# ── Full Employee Report (combines all documents) ────────────────────────────

@bp.route("/api/save-full-report", methods=["POST"])
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


def _generate_full_report_pdf(data, out_path: Path):
    """Generate a comprehensive PDF combining profile, offer acceptance, and contract data."""
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)

    profile = data.get("profile", {})
    offer = data.get("offer", {})
    contract = data.get("contract", {})

    def val(src, key, default=""):
        v = src.get(key, default) if src else default
        return str(v) if v else default

    # ── Cover page ──
    pdf.add_page()
    pdf.set_font("Arial", "B", 20)
    pdf.cell(0, 15, "Employee Full Report", ln=True, align="C")
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 8, "Deriv Solutions Sdn Bhd", ln=True, align="C")
    pdf.ln(10)

    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, val(profile, "fullName", "N/A"), ln=True, align="C")
    pdf.set_font("Arial", "", 11)
    pdf.cell(0, 7, f"{val(profile, 'role', 'N/A')} - {val(profile, 'department', 'N/A')}", ln=True, align="C")
    pdf.cell(0, 7, f"Start Date: {val(profile, 'startDate', 'N/A')}", ln=True, align="C")
    pdf.ln(8)

    # Document status summary
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "DOCUMENT STATUS", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    app_status = "Completed" if profile.get("status") == "in_progress" else "Not started"
    offer_status = "Completed" if offer.get("completedAt") else "Not completed"
    contract_status = "Completed" if contract.get("completedAt") else "Not completed"
    pdf.multi_cell(0, 7, f"[{'x' if app_status == 'Completed' else ' '}] Application: {app_status}")
    pdf.multi_cell(0, 7, f"[{'x' if offer_status == 'Completed' else ' '}] Offer Acceptance: {offer_status}")
    pdf.multi_cell(0, 7, f"[{'x' if contract_status == 'Completed' else ' '}] Contract: {contract_status}")
    pdf.ln(4)

    # ── Part 1: Application / Profile ──
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "PART 1: ONBOARDING APPLICATION", ln=True)
    pdf.ln(4)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, f"Full Name: {val(profile, 'fullName')}")
    pdf.multi_cell(0, 7, f"Email: {val(profile, 'email')}")
    pdf.multi_cell(0, 7, f"Role: {val(profile, 'role')}")
    pdf.multi_cell(0, 7, f"Department: {val(profile, 'department')}")
    pdf.multi_cell(0, 7, f"Start Date: {val(profile, 'startDate')}")
    pdf.multi_cell(0, 7, f"Nationality: {val(profile, 'nationality')}")
    pdf.multi_cell(0, 7, f"NRIC: {val(profile, 'nric', 'N/A')}")
    pdf.multi_cell(0, 7, f"Salary: {val(profile, 'salary', 'N/A')}")

    if profile.get("aiPlan"):
        pdf.ln(4)
        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "AI Onboarding Plan:", ln=True)
        pdf.set_font("Arial", "", 10)
        plan_text = str(profile.get("aiPlan", ""))
        for line in plan_text.split("\n"):
            pdf.multi_cell(0, 6, line)

    # ── Part 2: Offer Acceptance ──
    if offer.get("completedAt"):
        pdf.add_page()
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, "PART 2: OFFER ACCEPTANCE", ln=True)
        pdf.ln(4)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Candidate Information", ln=True)
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, f"Full Name: {val(offer, 'fullName')}")
        pdf.multi_cell(0, 7, f"NRIC/Passport: {val(offer, 'nricPassport')}")
        pdf.multi_cell(0, 7, f"Email: {val(offer, 'email')}")
        pdf.multi_cell(0, 7, f"Mobile: {val(offer, 'mobile')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Offer Details", ln=True)
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, f"Company: {val(offer, 'company')}")
        pdf.multi_cell(0, 7, f"Position: {val(offer, 'position')}")
        pdf.multi_cell(0, 7, f"Department: {val(offer, 'department')}")
        pdf.multi_cell(0, 7, f"Reporting To: {val(offer, 'reportingTo')}")
        pdf.multi_cell(0, 7, f"Start Date: {val(offer, 'startDate')}")
        pdf.multi_cell(0, 7, f"Employment Type: {val(offer, 'employmentType')}")
        pdf.multi_cell(0, 7, f"Probation: {val(offer, 'probationPeriod')}")
        pdf.multi_cell(0, 7, f"Monthly Salary: MYR {val(offer, 'monthlySalary')}")
        pdf.multi_cell(0, 7, f"Benefits: {val(offer, 'benefits')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Acceptance", ln=True)
        pdf.set_font("Arial", "", 11)
        accepted = "[x]" if offer.get("accepted") else "[ ]"
        pdf.multi_cell(0, 7, f"{accepted} Offer Accepted on {val(offer, 'acceptanceDate')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Emergency Contact", ln=True)
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, f"Name: {val(offer, 'emergencyName')} ({val(offer, 'emergencyRelationship')})")
        pdf.multi_cell(0, 7, f"Mobile: {val(offer, 'emergencyMobile')}")

    # ── Part 3: Contract ──
    if contract.get("completedAt"):
        pdf.add_page()
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, "PART 3: EMPLOYMENT CONTRACT", ln=True)
        pdf.ln(4)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Personal Details", ln=True)
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, f"Full Name: {val(contract, 'fullName')}")
        pdf.multi_cell(0, 7, f"NRIC: {val(contract, 'nric', 'N/A')}")
        pdf.multi_cell(0, 7, f"Passport: {val(contract, 'passportNo', 'N/A')}")
        pdf.multi_cell(0, 7, f"Nationality: {val(contract, 'nationality')}")
        pdf.multi_cell(0, 7, f"DOB: {val(contract, 'dateOfBirth')} | Gender: {val(contract, 'gender')} | Marital: {val(contract, 'maritalStatus')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Address", ln=True)
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, f"{val(contract, 'address1')}, {val(contract, 'address2')}")
        pdf.multi_cell(0, 7, f"{val(contract, 'postcode')} {val(contract, 'city')}, {val(contract, 'state')}, {val(contract, 'country')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Employment", ln=True)
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, f"Job Title: {val(contract, 'jobTitle')}")
        pdf.multi_cell(0, 7, f"Department: {val(contract, 'department')}")
        pdf.multi_cell(0, 7, f"Type: {val(contract, 'employmentType')} | Model: {val(contract, 'workModel')}")
        pdf.multi_cell(0, 7, f"Start Date: {val(contract, 'startDate')} | Probation: {val(contract, 'probationPeriod')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Banking", ln=True)
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, f"Bank: {val(contract, 'bankName')} | Account: {val(contract, 'accountNumber')}")
        pdf.multi_cell(0, 7, f"Holder: {val(contract, 'accountHolder')} | Branch: {val(contract, 'bankBranch')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Statutory", ln=True)
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, f"EPF: {val(contract, 'epfNumber', 'Pending')} | SOCSO: {val(contract, 'socsoNumber', 'Pending')}")
        pdf.multi_cell(0, 7, f"EIS: {val(contract, 'eisNumber', 'Pending')} | Tax: {val(contract, 'taxNumber', 'Pending')}")
        pdf.ln(3)

        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 7, "Policy Acknowledgements", ln=True)
        pdf.set_font("Arial", "", 11)

        def chk(key):
            return "[x]" if contract.get(key) else "[ ]"

        pdf.multi_cell(0, 7, f"{chk('acknowledgeHandbook')} Employee Handbook")
        pdf.multi_cell(0, 7, f"{chk('acknowledgeIT')} IT & Data Security")
        pdf.multi_cell(0, 7, f"{chk('acknowledgePrivacy')} Data Privacy (PDPA)")
        pdf.multi_cell(0, 7, f"{chk('acknowledgeConfidentiality')} Confidentiality & Code of Conduct")
        pdf.ln(3)
        pdf.multi_cell(0, 7, f"Signed: {val(contract, 'fullName')} on {val(contract, 'signatureDate')}")

    pdf.output(str(out_path))


@bp.route("/api/generate-full-report-pdf/<employee_id>", methods=["GET"])
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
