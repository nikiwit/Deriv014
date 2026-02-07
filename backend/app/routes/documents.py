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
