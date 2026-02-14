"""
Document Reminders API

Tracks employee documents with expiry dates — employment contracts
and immigration documents (visas, employment passes, work permits) —
and provides status computation and filtering for the HR dashboard.
"""

import uuid
import datetime
from flask import Blueprint, jsonify, request
from app.database import get_db
from app.models import EmployeeDocument, DocumentType

bp = Blueprint("document_reminders", __name__, url_prefix="/api/document-reminders")


def _compute_status(expiry_date_str: str) -> dict:
    """Compute document status and days until expiry from expiry_date."""
    today = datetime.date.today()
    expiry = datetime.date.fromisoformat(expiry_date_str)
    days_until = (expiry - today).days

    if days_until < 0:
        status = "expired"
    elif days_until <= 30:
        status = "expiring_30"
    elif days_until <= 60:
        status = "expiring_60"
    elif days_until <= 90:
        status = "expiring_90"
    else:
        status = "valid"

    return {"status": status, "days_until_expiry": days_until}


@bp.route("", methods=["GET"])
def list_documents():
    """List all tracked documents with computed expiry status.

    Query params:
        status: Filter by status (expired, expiring_soon, valid)
        search: Search by employee name or document type
        document_type: Filter by document type
    """
    db = get_db()
    status_filter = request.args.get("status")
    search = request.args.get("search", "").lower()
    doc_type_filter = request.args.get("document_type")

    query = db.table("employee_documents").select(
        "*, employees!inner(full_name, email, department, position)"
    ).order("expiry_date", desc=False)

    if doc_type_filter:
        query = query.eq("document_type", doc_type_filter)

    response = query.execute()

    results = []
    for doc in response.data:
        computed = _compute_status(doc["expiry_date"])

        # Apply status filter
        if status_filter:
            if status_filter == "expiring_soon" and not computed["status"].startswith("expiring"):
                continue
            elif status_filter == "expired" and computed["status"] != "expired":
                continue
            elif status_filter == "valid" and computed["status"] != "valid":
                continue

        employee = doc.pop("employees", {})
        doc["employee_name"] = employee.get("full_name", "")
        doc["employee_email"] = employee.get("email", "")
        doc["employee_department"] = employee.get("department", "")
        doc["employee_position"] = employee.get("position", "")
        doc["computed_status"] = computed["status"]
        doc["days_until_expiry"] = computed["days_until_expiry"]

        # Apply search filter
        if search:
            searchable = f"{doc['employee_name']} {doc['document_type']} {doc.get('document_number', '')}".lower()
            if search not in searchable:
                continue

        results.append(doc)

    return jsonify({"documents": results, "total": len(results)})


@bp.route("/stats", methods=["GET"])
def get_stats():
    """Get summary statistics for document reminders dashboard."""
    db = get_db()

    response = db.table("employee_documents").select("expiry_date").execute()

    total = len(response.data)
    expired = 0
    expiring_soon = 0
    expiring_60 = 0
    expiring_90 = 0
    valid = 0

    monthly_expirations = {}

    for doc in response.data:
        computed = _compute_status(doc["expiry_date"])
        status = computed["status"]

        if status == "expired":
            expired += 1
        elif status == "expiring_30":
            expiring_soon += 1
        elif status == "expiring_60":
            expiring_60 += 1
        elif status == "expiring_90":
            expiring_90 += 1
        else:
            valid += 1

        expiry_date = datetime.date.fromisoformat(doc["expiry_date"])
        month_key = expiry_date.strftime("%Y-%m")
        month_label = expiry_date.strftime("%b %Y")
        if month_key not in monthly_expirations:
            monthly_expirations[month_key] = {"month": month_label, "count": 0}
        monthly_expirations[month_key]["count"] += 1

    sorted_months = sorted(monthly_expirations.items())
    chart_data = [v for _, v in sorted_months[:12]]

    return jsonify({
        "total_tracked": total,
        "expired": expired,
        "expiring_soon": expiring_soon,
        "expiring_60": expiring_60,
        "expiring_90": expiring_90,
        "valid": valid,
        "chart_data": chart_data,
    })


@bp.route("", methods=["POST"])
def create_document():
    """Add a new document to track."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    try:
        doc = EmployeeDocument.from_dict(data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    db = get_db()

    emp_resp = db.table("employees").select("id").eq("id", doc.employee_id).execute()
    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404

    doc_id = str(uuid.uuid4())
    computed = _compute_status(doc.expiry_date)

    db.table("employee_documents").insert({
        "id": doc_id,
        "employee_id": doc.employee_id,
        "document_type": doc.document_type,
        "document_number": doc.document_number,
        "issue_date": doc.issue_date or None,
        "expiry_date": doc.expiry_date,
        "status": computed["status"],
        "jurisdiction": doc.jurisdiction,
        "issuing_authority": doc.issuing_authority,
        "notes": doc.notes,
    }).execute()

    return jsonify({
        "id": doc_id,
        "status": computed["status"],
        "days_until_expiry": computed["days_until_expiry"],
        "message": "Document tracking created successfully",
    }), 201


@bp.route("/<doc_id>", methods=["PUT"])
def update_document(doc_id):
    """Update a tracked document."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    db = get_db()

    existing = db.table("employee_documents").select("id").eq("id", doc_id).execute()
    if not existing.data:
        return jsonify({"error": "Document not found"}), 404

    allowed = {
        "document_type", "document_number", "issue_date", "expiry_date",
        "jurisdiction", "issuing_authority", "notes",
    }
    updates = {k: v for k, v in data.items() if k in allowed}

    if not updates:
        return jsonify({"error": f"No valid fields. Allowed: {sorted(allowed)}"}), 400

    if "expiry_date" in updates:
        computed = _compute_status(updates["expiry_date"])
        updates["status"] = computed["status"]

    updates["updated_at"] = datetime.datetime.now().isoformat()

    db.table("employee_documents").update(updates).eq("id", doc_id).execute()

    return jsonify({"updated": list(updates.keys()), "document_id": doc_id})


@bp.route("/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    """Remove a tracked document."""
    db = get_db()

    existing = db.table("employee_documents").select("id").eq("id", doc_id).execute()
    if not existing.data:
        return jsonify({"error": "Document not found"}), 404

    db.table("employee_documents").delete().eq("id", doc_id).execute()

    return jsonify({"deleted": True, "document_id": doc_id})


@bp.route("/<doc_id>/renew", methods=["POST"])
def renew_document(doc_id):
    """Mark a document as renewed and create the new document record."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "New expiry_date is required"}), 400

    new_expiry = data.get("expiry_date")
    if not new_expiry:
        return jsonify({"error": "expiry_date is required"}), 400

    db = get_db()

    old_doc = db.table("employee_documents").select("*").eq("id", doc_id).execute()
    if not old_doc.data:
        return jsonify({"error": "Document not found"}), 404

    old = old_doc.data[0]
    now = datetime.datetime.now().isoformat()

    # Mark old document as renewed
    db.table("employee_documents").update({
        "renewed_at": now,
        "updated_at": now,
    }).eq("id", doc_id).execute()

    # Create new document linked to previous
    new_id = str(uuid.uuid4())
    computed = _compute_status(new_expiry)

    db.table("employee_documents").insert({
        "id": new_id,
        "employee_id": old["employee_id"],
        "document_type": old["document_type"],
        "document_number": data.get("document_number", old.get("document_number", "")),
        "issue_date": data.get("issue_date"),
        "expiry_date": new_expiry,
        "status": computed["status"],
        "jurisdiction": old.get("jurisdiction", ""),
        "issuing_authority": old.get("issuing_authority", ""),
        "notes": data.get("notes", ""),
        "previous_document_id": doc_id,
    }).execute()

    return jsonify({
        "new_document_id": new_id,
        "previous_document_id": doc_id,
        "status": computed["status"],
        "days_until_expiry": computed["days_until_expiry"],
        "message": "Document renewed successfully",
    }), 201
