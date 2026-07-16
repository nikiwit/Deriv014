import json
import os
import uuid

from flask import Blueprint, current_app, jsonify, request, send_file

from app.database import get_db
from app.models import EmployeeProfile
from app.workflow import OnboardingWorkflow

bp = Blueprint("onboarding", __name__, url_prefix="/api/onboarding")


def _append_profile_to_md(profile, employee_id):
    """Append a new employee block to the profiles markdown file."""
    md_dir = current_app.config["MD_FILES_DIR"]
    profiles_path = os.path.join(md_dir, "employees_info_my_profiles.md")

    block = f"""
---

## Employee {employee_id[:8]}
id: {employee_id}
firstName: {profile.full_name.split()[0] if profile.full_name else ''}
lastName: {' '.join(profile.full_name.split()[1:]) if profile.full_name else ''}
email: {profile.email}
phone: {profile.phone or 'N/A'}
nationality: {profile.jurisdiction}
nric: {profile.nric or 'N/A'}
position: {profile.position or 'N/A'}
department: {profile.department or 'N/A'}
startDate: {profile.start_date or 'N/A'}
bankName: {profile.bank_name or 'N/A'}
bankAccount: {profile.bank_account or 'N/A'}
emergencyContact: {profile.emergency_contact_name or 'N/A'}
emergencyContactPhone: {profile.emergency_contact_phone or 'N/A'}
emergencyContactRelationship: {profile.emergency_contact_relation or 'N/A'}
complianceStatus: Onboarding
"""
    with open(profiles_path, "a", encoding="utf-8") as f:
        f.write(block)

# Required documents per jurisdiction (T5)
REQUIRED_DOCS = {
    "MY": [
        "Signed employment contract",
        "NRIC copy (front and back)",
        "Educational certificates",
        "Previous employment reference letters",
        "Bank account details form",
        "Passport-sized photographs (2 copies)",
        "EPF nomination form",
        "SOCSO registration form",
        "Emergency contact form",
    ],
    "SG": [
        "Signed employment contract",
        "NRIC or valid work pass copy",
        "Educational certificates",
        "Previous employment reference letters",
        "Bank account details form",
        "Passport-sized photographs (2 copies)",
        "CPF nomination form",
        "Tax declaration form (IR8A)",
        "Emergency contact form",
    ],
}


@bp.route("/employees", methods=["POST"])
def create_employee():
    """Register a new employee and initialize their onboarding checklist with auto-generated documents."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    try:
        profile = EmployeeProfile.from_dict(data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    employee_id = str(uuid.uuid4())
    db = get_db()

    # Check if email already exists
    existing = db.execute("SELECT id FROM employees WHERE email = ?", (profile.email,)).fetchone()
    if existing:
        return jsonify({"error": "Employee with this email already exists"}), 409

    db.execute(
        """INSERT INTO employees
        (id, email, full_name, nric, jurisdiction, position, department, start_date,
         phone, address, bank_name, bank_account,
         emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            employee_id, profile.email, profile.full_name, profile.nric,
            profile.jurisdiction, profile.position, profile.department, profile.start_date,
            profile.phone, profile.address, profile.bank_name, profile.bank_account,
            profile.emergency_contact_name, profile.emergency_contact_phone,
            profile.emergency_contact_relation,
        ),
    )

    # Initialize onboarding checklist
    for doc_name in REQUIRED_DOCS.get(profile.jurisdiction, REQUIRED_DOCS["MY"]):
        db.execute(
            "INSERT INTO onboarding_documents (employee_id, document_name) VALUES (?, ?)",
            (employee_id, doc_name),
        )

    db.commit()

    # Append profile to markdown file for RAG indexing
    try:
        _append_profile_to_md(profile, employee_id)
    except Exception as e:
        current_app.logger.warning(f"Failed to append profile to markdown: {e}")

    # Execute workflow to auto-generate documents
    generated_documents = []
    workflow_errors = []
    
    try:
        template_dir = current_app.config.get("TEMPLATE_DIR", os.path.join(os.path.dirname(__file__), "..", "templates"))
        output_dir = current_app.config.get("OUTPUT_DIR", os.path.join(os.path.dirname(__file__), "..", "generated_documents"))
        
        workflow = OnboardingWorkflow(template_dir, output_dir, db)
        result = workflow.execute(profile)
        
        if result.success:
            generated_documents = [
                {
                    "id": doc.id,
                    "document_type": doc.document_type,
                    "file_path": doc.file_path,
                    "created_at": doc.created_at,
                    "status": doc.status
                }
                for doc in result.documents
            ]
        else:
            workflow_errors = result.errors
            current_app.logger.warning(f"Workflow completed with errors: {result.errors}")
            
    except Exception as e:
        workflow_errors.append(f"Workflow execution failed: {str(e)}")
        current_app.logger.error(f"Workflow execution error: {e}")

    return jsonify({
        "id": employee_id,
        "email": profile.email,
        "full_name": profile.full_name,
        "jurisdiction": profile.jurisdiction,
        "status": "onboarding",
        "checklist_url": f"/api/onboarding/employees/{employee_id}/checklist",
        "generated_documents": generated_documents,
        "workflow_errors": workflow_errors,
        "message": f"Onboarding initiated. Generated {len(generated_documents)} documents automatically."
    }), 201


@bp.route("/employees/<employee_id>", methods=["GET"])
def get_employee(employee_id):
    """Get employee profile."""
    db = get_db()
    emp = db.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    return jsonify({k: emp[k] for k in emp.keys()})


@bp.route("/employees/<employee_id>", methods=["PUT"])
def update_employee(employee_id):
    """Update employee profile (T3 - personal state change)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    db = get_db()
    emp = db.execute("SELECT id FROM employees WHERE id = ?", (employee_id,)).fetchone()
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    # Only allow updating specific fields
    allowed = {
        "full_name", "phone", "address", "bank_name", "bank_account",
        "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
        "nric", "position", "department", "start_date",
    }
    updates = {k: v for k, v in data.items() if k in allowed and v}
    if not updates:
        return jsonify({"error": f"No valid fields to update. Allowed: {sorted(allowed)}"}), 400

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [employee_id]
    db.execute(
        f"UPDATE employees SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        values,
    )
    db.commit()

    return jsonify({"updated": list(updates.keys()), "employee_id": employee_id})


@bp.route("/employees/<employee_id>/checklist", methods=["GET"])
def get_checklist(employee_id):
    """Get onboarding document checklist with submission status."""
    db = get_db()
    emp = db.execute("SELECT full_name, jurisdiction, status FROM employees WHERE id = ?", (employee_id,)).fetchone()
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    docs = db.execute(
        "SELECT id, document_name, required, submitted, submitted_at, notes "
        "FROM onboarding_documents WHERE employee_id = ? ORDER BY id",
        (employee_id,),
    ).fetchall()

    items = [
        {
            "id": d["id"],
            "document_name": d["document_name"],
            "required": bool(d["required"]),
            "submitted": bool(d["submitted"]),
            "submitted_at": d["submitted_at"],
            "notes": d["notes"],
        }
        for d in docs
    ]

    total = len(items)
    submitted = sum(1 for d in items if d["submitted"])

    return jsonify({
        "employee_id": employee_id,
        "employee_name": emp["full_name"],
        "jurisdiction": emp["jurisdiction"],
        "onboarding_status": emp["status"],
        "progress": f"{submitted}/{total}",
        "complete": submitted == total,
        "documents": items,
    })


@bp.route("/employees/<employee_id>/checklist/<int:doc_id>", methods=["PUT"])
def update_checklist_item(employee_id, doc_id):
    """Mark a document as submitted or add notes."""
    data = request.get_json() or {}
    db = get_db()

    doc = db.execute(
        "SELECT id FROM onboarding_documents WHERE id = ? AND employee_id = ?",
        (doc_id, employee_id),
    ).fetchone()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    submitted = data.get("submitted", True)
    notes = data.get("notes", "")

    db.execute(
        "UPDATE onboarding_documents SET submitted = ?, submitted_at = CURRENT_TIMESTAMP, notes = ? "
        "WHERE id = ?",
        (1 if submitted else 0, notes, doc_id),
    )

    # Check if all docs are submitted - update employee status
    remaining = db.execute(
        "SELECT COUNT(*) as cnt FROM onboarding_documents "
        "WHERE employee_id = ? AND required = 1 AND submitted = 0",
        (employee_id,),
    ).fetchone()["cnt"]

    if remaining == 0:
        db.execute(
            "UPDATE employees SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (employee_id,),
        )

    db.commit()

    return jsonify({
        "doc_id": doc_id,
        "submitted": bool(submitted),
        "remaining_required": remaining,
        "onboarding_complete": remaining == 0,
    })


@bp.route("/employees", methods=["GET"])
def list_employees():
    """List all employees with onboarding progress."""
    db = get_db()
    employees = db.execute(
        "SELECT id, email, full_name, jurisdiction, position, department, status, created_at "
        "FROM employees ORDER BY created_at DESC"
    ).fetchall()

    result = []
    for emp in employees:
        total = db.execute(
            "SELECT COUNT(*) as cnt FROM onboarding_documents WHERE employee_id = ?",
            (emp["id"],),
        ).fetchone()["cnt"]
        submitted = db.execute(
            "SELECT COUNT(*) as cnt FROM onboarding_documents WHERE employee_id = ? AND submitted = 1",
            (emp["id"],),
        ).fetchone()["cnt"]
        result.append({
            **{k: emp[k] for k in emp.keys()},
            "progress": f"{submitted}/{total}",
        })

    return jsonify({"employees": result})


@bp.route("/templates/<template_name>", methods=["GET"])
def get_template(template_name):
    """Serve a markdown template with optional variable substitution.

    Query params are used as template variables, e.g.:
    GET /api/onboarding/templates/offer_acceptance_my?name=John+Doe&email=john@co.com
    """
    allowed = {
        "offer_acceptance_my",
        "offer_acceptance_sg",
        "contract_my",
        "contract_sg",
    }
    if template_name not in allowed:
        return jsonify({"error": f"Unknown template. Allowed: {sorted(allowed)}"}), 404

    md_dir = current_app.config["MD_FILES_DIR"]
    path = os.path.join(md_dir, f"{template_name}.md")
    if not os.path.exists(path):
        return jsonify({"error": f"Template file not found: {template_name}.md"}), 404

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Substitute {{variable}} placeholders with query params
    for key, value in request.args.items():
        content = content.replace("{{" + key + "}}", value)

    return jsonify({"template": template_name, "content": content})


@bp.route("/employees/<employee_id>/documents", methods=["GET"])
def get_employee_documents(employee_id):
    """Get all generated documents for an employee."""
    db = get_db()
    
    # Verify employee exists
    emp = db.execute("SELECT id, full_name FROM employees WHERE id = ?", (employee_id,)).fetchone()
    if not emp:
        return jsonify({"error": "Employee not found"}), 404
    
    # Get generated documents
    docs = db.execute(
        """SELECT id, document_type, file_path, created_at, status
        FROM generated_documents 
        WHERE employee_id = ? 
        ORDER BY created_at DESC""",
        (employee_id,)
    ).fetchall()
    
    documents = [
        {
            "id": doc["id"],
            "document_type": doc["document_type"],
            "file_path": doc["file_path"],
            "created_at": doc["created_at"],
            "status": doc["status"],
            "download_url": f"/api/onboarding/documents/{doc['id']}/download"
        }
        for doc in docs
    ]
    
    return jsonify({
        "employee_id": employee_id,
        "employee_name": emp["full_name"],
        "documents": documents,
        "total": len(documents)
    })


@bp.route("/documents/<document_id>/download", methods=["GET"])
def download_document(document_id):
    """Download a generated document."""
    db = get_db()
    
    doc = db.execute(
        """SELECT file_path, document_type, employee_name
        FROM generated_documents 
        WHERE id = ?""",
        (document_id,)
    ).fetchone()
    
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    
    file_path = doc["file_path"]
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on server"}), 404
    
    # Generate a user-friendly filename
    document_type = doc["document_type"].replace("_", " ").title()
    employee_name = doc["employee_name"].replace(" ", "_")
    filename = f"{employee_name}_{document_type}.pdf"
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype='application/pdf'
    )



