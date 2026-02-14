import datetime
import json
import os
import uuid

import google.generativeai as genai
from flask import Blueprint, current_app, jsonify, request, send_file

from app.database import get_db
from app.models import EmployeeProfile
from app.workflow import OnboardingWorkflow

bp = Blueprint("onboarding", __name__, url_prefix="/api/onboarding")


@bp.route("/parse-resume", methods=["POST"])
def parse_resume():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify(
            {"error": "Server configuration error: Missing Gemini API Key"}
        ), 500

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Read file into memory
        file_content = file.read()
        mime_type = file.content_type or "application/pdf"

        prompt = """
        Extract the following candidate information from this resume.
        Return the result as a raw JSON object (no markdown code blocks) with these keys:
        - fullName (string)
        - email (string)
        - role (string, infer the most likely job title applied for or current title)
        - department (string, infer a likely department e.g. Engineering, Sales, Marketing)
        - nric (string, if Malaysian NRIC format is found)
        - nationality (string, 'Malaysian' or 'Non-Malaysian' - infer from address/NRIC/Universities)
        - salary (string, only if explicitly mentioned, else empty string)

        If a field cannot be found, leave it as an empty string.
        JSON ONLY. No intro or outro text.
        """

        response = model.generate_content(
            [
                {"mime_type": mime_type, "data": file_content},
                prompt,
            ]
        )

        text = response.text
        # Clean up code blocks
        json_str = text.replace("```json", "").replace("```", "").strip()

        # Find JSON object boundaries
        start = json_str.find("{")
        end = json_str.rfind("}")
        if start != -1 and end != -1:
            json_str = json_str[start : end + 1]

        data = json.loads(json_str)
        return jsonify(data)

    except Exception as e:
        current_app.logger.error(f"Resume parsing failed: {e}")
        return jsonify({"error": f"Failed to parse resume: {str(e)}"}), 500


def _append_profile_to_md(profile, employee_id):
    """Append a new employee block to the profiles markdown file."""
    md_dir = current_app.config["MD_FILES_DIR"]
    profiles_path = os.path.join(md_dir, "employees_info_my_profiles.md")

    block = f"""
---

## Employee {employee_id[:8]}
id: {employee_id}
firstName: {profile.full_name.split()[0] if profile.full_name else ""}
lastName: {" ".join(profile.full_name.split()[1:]) if profile.full_name else ""}
email: {profile.email}
phone: {profile.phone or "N/A"}
nationality: {profile.jurisdiction}
nric: {profile.nric or "N/A"}
position: {profile.position or "N/A"}
department: {profile.department or "N/A"}
startDate: {profile.start_date or "N/A"}
bankName: {profile.bank_name or "N/A"}
bankAccount: {profile.bank_account or "N/A"}
emergencyContact: {profile.emergency_contact_name or "N/A"}
emergencyContactPhone: {profile.emergency_contact_phone or "N/A"}
emergencyContactRelationship: {profile.emergency_contact_relation or "N/A"}
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
    existing = db.table("employees").select("id").eq("email", profile.email).execute()
    if existing.data:
        return jsonify({"error": "Employee with this email already exists"}), 409

    db.table("employees").insert(
        {
            "id": employee_id,
            "email": profile.email,
            "full_name": profile.full_name,
            "nric": profile.nric,
            "jurisdiction": profile.jurisdiction,
            "position": profile.position,
            "department": profile.department,
            "start_date": profile.start_date,
            "phone": profile.phone,
            "address": profile.address,
            "bank_name": profile.bank_name,
            "bank_account": profile.bank_account,
            "emergency_contact_name": profile.emergency_contact_name,
            "emergency_contact_phone": profile.emergency_contact_phone,
            "emergency_contact_relation": profile.emergency_contact_relation,
        }
    ).execute()

    # Initialize onboarding checklist
    for doc_name in REQUIRED_DOCS.get(profile.jurisdiction, REQUIRED_DOCS["MY"]):
        db.table("onboarding_documents").insert(
            {"employee_id": employee_id, "document_name": doc_name}
        ).execute()

    # db.commit() # Not needed

    # Append profile to markdown file for RAG indexing
    try:
        _append_profile_to_md(profile, employee_id)
    except Exception as e:
        current_app.logger.warning(f"Failed to append profile to markdown: {e}")

    # Execute workflow to auto-generate documents
    generated_documents = []
    workflow_errors = []

    try:
        template_dir = current_app.config.get(
            "TEMPLATE_DIR", os.path.join(os.path.dirname(__file__), "..", "templates")
        )
        output_dir = current_app.config.get(
            "OUTPUT_DIR",
            os.path.join(os.path.dirname(__file__), "..", "generated_documents"),
        )

        workflow = OnboardingWorkflow(template_dir, output_dir, db)
        result = workflow.execute(profile)

        if result.success:
            generated_documents = [
                {
                    "id": doc.id,
                    "document_type": doc.document_type,
                    "file_path": doc.file_path,
                    "created_at": doc.created_at,
                    "status": doc.status,
                }
                for doc in result.documents
            ]
        else:
            workflow_errors = result.errors
            current_app.logger.warning(
                f"Workflow completed with errors: {result.errors}"
            )

    except Exception as e:
        workflow_errors.append(f"Workflow execution failed: {str(e)}")
        current_app.logger.error(f"Workflow execution error: {e}")

    # Auto-create user account in Supabase and assign to HR manager
    supabase_user_id = None
    try:
        sb = db  # Use the same client
        name_parts = profile.full_name.split() if profile.full_name else [""]
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        # Generate employee_id like EMP-YYYY-NNN
        import datetime

        year = datetime.datetime.now().year
        count_result = (
            sb.table("users")
            .select("id", count="exact")
            .eq("role", "employee")
            .execute()
        )
        emp_count = (count_result.count or 0) + 1
        generated_employee_id = f"EMP-{year}-{emp_count:03d}"

        user_record = {
            "email": profile.email,
            "first_name": first_name,
            "last_name": last_name,
            "role": "employee",
            "department": profile.department or "",
            "employee_id": generated_employee_id,
            "start_date": profile.start_date or "",
            "onboarding_complete": False,
            "nationality": "Malaysian"
            if profile.jurisdiction == "MY"
            else "Non-Malaysian",
            "nric": profile.nric or "",
        }

        # Check if user already exists
        existing = sb.table("users").select("id").eq("email", profile.email).execute()
        if existing.data:
            supabase_user_id = existing.data[0]["id"]
        else:
            result = sb.table("users").insert(user_record).execute()
            if result.data:
                supabase_user_id = result.data[0]["id"]

        # Assign to HR manager if hr_user_id provided
        hr_user_id = data.get("hr_user_id")
        if hr_user_id and supabase_user_id:
            existing_assignment = (
                sb.table("hr_employee_assignments")
                .select("id")
                .eq("hr_user_id", hr_user_id)
                .eq("employee_user_id", supabase_user_id)
                .execute()
            )
            if not existing_assignment.data:
                sb.table("hr_employee_assignments").insert(
                    {
                        "hr_user_id": hr_user_id,
                        "employee_user_id": supabase_user_id,
                    }
                ).execute()

    except Exception as e:
        current_app.logger.warning(f"Failed to create Supabase user: {e}")

    return jsonify(
        {
            "id": employee_id,
            "email": profile.email,
            "full_name": profile.full_name,
            "jurisdiction": profile.jurisdiction,
            "status": "onboarding",
            "checklist_url": f"/api/onboarding/employees/{employee_id}/checklist",
            "generated_documents": generated_documents,
            "workflow_errors": workflow_errors,
            "supabase_user_id": supabase_user_id,
            "message": f"Onboarding initiated. Generated {len(generated_documents)} documents automatically.",
        }
    ), 201


@bp.route("/employees/<employee_id>", methods=["GET"])
def get_employee(employee_id):
    """Get employee profile with comprehensive details."""
    db = get_db()

    response = db.table("employees").select("*").eq("id", employee_id).execute()
    if not response.data:
        return jsonify({"error": "Employee not found"}), 404

    emp = response.data[0]

    # Get onboarding progress
    docs_resp = (
        db.table("onboarding_documents")
        .select("id, document_name, submitted, submitted_at")
        .eq("employee_id", employee_id)
        .execute()
    )

    forms_resp = (
        db.table("onboarding_forms")
        .select("id, form_type, submitted_at")
        .eq("employee_id", employee_id)
        .execute()
    )

    # Calculate progress
    total_docs = len(docs_resp.data) if docs_resp.data else 0
    submitted_docs = (
        sum(1 for d in docs_resp.data if d.get("submitted")) if docs_resp.data else 0
    )

    total_forms = len(forms_resp.data) if forms_resp.data else 0
    submitted_forms = len(forms_resp.data) if forms_resp.data else 0

    progress_percentage = 0
    if total_docs + total_forms > 0:
        progress_percentage = round(
            ((submitted_docs + submitted_forms) / (total_docs + total_forms)) * 100, 1
        )

    # Get onboarding state
    state_resp = (
        db.table("onboarding_states")
        .select("status, created_at, updated_at")
        .eq("employee_id", employee_id)
        .execute()
    )

    onboarding_state = state_resp.data[0] if state_resp.data else None

    employee_details = {
        **emp,
        "onboarding_progress": {
            "percentage": progress_percentage,
            "submitted_documents": submitted_docs,
            "total_documents": total_docs,
            "submitted_forms": submitted_forms,
            "total_forms": total_forms,
        },
        "onboarding_state": onboarding_state,
        "documents": docs_resp.data,
        "forms": forms_resp.data,
    }

    return jsonify(employee_details)


@bp.route("/employees/<employee_id>", methods=["PUT"])
def update_employee(employee_id):
    """Update employee profile with comprehensive field support."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    db = get_db()

    # Check if employee exists
    response = db.table("employees").select("id").eq("id", employee_id).execute()
    if not response.data:
        return jsonify({"error": "Employee not found"}), 404

    # Allow updating most employee fields (excluding system fields)
    allowed = {
        "full_name",
        "phone",
        "address",
        "bank_name",
        "bank_account",
        "emergency_contact_name",
        "emergency_contact_phone",
        "emergency_contact_relation",
        "nric",
        "passport_no",
        "position",
        "department",
        "start_date",
        "nationality",
        "date_of_birth",
        "gender",
        "marital_status",
        "salary",
        "epf_no",
        "tax_id",
        "status",
    }

    # Validate jurisdiction if provided
    if "jurisdiction" in data and data["jurisdiction"] not in ("MY", "SG"):
        return jsonify({"error": "Jurisdiction must be 'MY' or 'SG'"}), 400

    # Allow jurisdiction updates
    if "jurisdiction" in data:
        allowed.add("jurisdiction")

    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify(
            {"error": f"No valid fields to update. Allowed: {sorted(allowed)}"}
        ), 400

    # Add timestamp
    updates["updated_at"] = datetime.datetime.now().isoformat()

    # Update employee record
    db.table("employees").update(updates).eq("id", employee_id).execute()

    # If jurisdiction changed, we may need to update the checklist
    if "jurisdiction" in updates:
        # Remove old documents
        db.table("onboarding_documents").delete().eq(
            "employee_id", employee_id
        ).execute()

        # Add new documents for the new jurisdiction
        for doc_name in REQUIRED_DOCS.get(updates["jurisdiction"], REQUIRED_DOCS["MY"]):
            db.table("onboarding_documents").insert(
                {"employee_id": employee_id, "document_name": doc_name}
            ).execute()

    return jsonify(
        {
            "message": "Employee updated successfully",
            "updated_fields": list(updates.keys()),
            "employee_id": employee_id,
        }
    )


@bp.route("/employees/<employee_id>", methods=["DELETE"])
def delete_employee(employee_id):
    """Delete an employee and all related records."""
    db = get_db()

    # Check if employee exists
    response = (
        db.table("employees")
        .select("id, email, full_name")
        .eq("id", employee_id)
        .execute()
    )
    if not response.data:
        return jsonify({"error": "Employee not found"}), 404

    employee = response.data[0]

    try:
        # Delete related records first to maintain referential integrity
        # Delete onboarding documents
        db.table("onboarding_documents").delete().eq(
            "employee_id", employee_id
        ).execute()

        # Delete onboarding forms
        db.table("onboarding_forms").delete().eq("employee_id", employee_id).execute()

        # Delete task progress
        db.table("onboarding_task_progress").delete().eq(
            "employee_id", employee_id
        ).execute()

        # Delete onboarding state
        db.table("onboarding_states").delete().eq("employee_id", employee_id).execute()

        # Delete the employee record
        db.table("employees").delete().eq("id", employee_id).execute()

        # Also delete from users table if exists
        users_response = (
            db.table("users").select("id").eq("email", employee["email"]).execute()
        )
        if users_response.data:
            user_id = users_response.data[0]["id"]
            db.table("users").delete().eq("id", user_id).execute()

            # Delete HR assignments
            db.table("hr_employee_assignments").delete().eq(
                "employee_user_id", user_id
            ).execute()

        return jsonify(
            {
                "message": f"Employee {employee['full_name']} deleted successfully",
                "employee_id": employee_id,
                "email": employee["email"],
            }
        )

    except Exception as e:
        current_app.logger.error(f"Failed to delete employee {employee_id}: {e}")
        return jsonify({"error": f"Failed to delete employee: {str(e)}"}), 500


@bp.route("/employees/<employee_id>/checklist", methods=["GET"])
def get_checklist(employee_id):
    """Get onboarding document checklist with submission status."""
    db = get_db()

    emp_resp = (
        db.table("employees")
        .select("full_name, jurisdiction, status")
        .eq("id", employee_id)
        .execute()
    )
    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404
    emp = emp_resp.data[0]

    docs_resp = (
        db.table("onboarding_documents")
        .select("id, document_name, required, submitted, submitted_at, notes")
        .eq("employee_id", employee_id)
        .order("id")
        .execute()
    )

    items = [
        {
            "id": d["id"],
            "document_name": d["document_name"],
            "required": bool(d["required"]),
            "submitted": bool(d["submitted"]),
            "submitted_at": d["submitted_at"],
            "notes": d["notes"],
        }
        for d in docs_resp.data
    ]

    total = len(items)
    submitted = sum(1 for d in items if d["submitted"])

    return jsonify(
        {
            "employee_id": employee_id,
            "employee_name": emp["full_name"],
            "jurisdiction": emp["jurisdiction"],
            "onboarding_status": emp["status"],
            "progress": f"{submitted}/{total}",
            "complete": submitted == total,
            "documents": items,
        }
    )


@bp.route("/employees/<employee_id>/checklist/<int:doc_id>", methods=["PUT"])
def update_checklist_item(employee_id, doc_id):
    """Mark a document as submitted or add notes."""
    data = request.get_json() or {}
    db = get_db()

    # Verify doc exists
    doc_resp = (
        db.table("onboarding_documents")
        .select("id")
        .eq("id", doc_id)
        .eq("employee_id", employee_id)
        .execute()
    )
    if not doc_resp.data:
        return jsonify({"error": "Document not found"}), 404

    submitted = data.get("submitted", True)
    notes = data.get("notes", "")

    db.table("onboarding_documents").update(
        {
            "submitted": 1 if submitted else 0,
            "submitted_at": datetime.datetime.now().isoformat(),
            "notes": notes,
        }
    ).eq("id", doc_id).execute()

    # Check remaining
    remaining_resp = (
        db.table("onboarding_documents")
        .select("id", count="exact")
        .eq("employee_id", employee_id)
        .eq("required", True)
        .eq("submitted", False)
        .execute()
    )
    remaining = remaining_resp.count

    if remaining == 0:
        db.table("employees").update(
            {"status": "active", "updated_at": datetime.datetime.now().isoformat()}
        ).eq("id", employee_id).execute()

    return jsonify(
        {
            "doc_id": doc_id,
            "submitted": bool(submitted),
            "remaining_required": remaining,
            "onboarding_complete": remaining == 0,
        }
    )


@bp.route("/employees", methods=["GET"])
def list_employees():
    """List all employees with onboarding progress."""
    try:
        db = get_db()

        # Fetch all employees
        emp_resp = (
            db.table("employees")
            .select(
                "id, email, full_name, jurisdiction, position, department, status, created_at"
            )
            .order("created_at", desc=True)
            .execute()
        )

        employees = emp_resp.data
        if not employees:
            return jsonify({"employees": []})

        # Fetch all doc stats (optimize: could be improved with a view or RPC)
        # For now, fetch all docs for these employees? Or just iterate if N is small.
        # Let's try to fetch all docs relevant to these employees.
        emp_ids = [e["id"] for e in employees]
        # Supabase 'in' filter
        docs_resp = (
            db.table("onboarding_documents")
            .select("employee_id, submitted")
            .in_("employee_id", emp_ids)
            .execute()
        )

        # Aggregate
        stats = {}  # emp_id -> {total: 0, submitted: 0}
        for d in docs_resp.data:
            eid = d["employee_id"]
            if eid not in stats:
                stats[eid] = {"total": 0, "submitted": 0}
            stats[eid]["total"] += 1
            if d["submitted"]:
                stats[eid]["submitted"] += 1

        result = []
        for emp in employees:
            eid = emp["id"]
            s = stats.get(eid, {"total": 0, "submitted": 0})
            result.append(
                {
                    **emp,
                    "progress": f"{s['submitted']}/{s['total']}",
                }
            )

        return jsonify({"employees": result})
    except Exception as e:
        current_app.logger.error(f"List employees failed: {e}")
        # Return empty list on error to prevent frontend crash
        return jsonify({"employees": []})


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
    emp_resp = (
        db.table("employees").select("id, full_name").eq("id", employee_id).execute()
    )
    if not emp_resp.data:
        return jsonify({"error": "Employee not found"}), 404
    emp = emp_resp.data[0]

    # Get generated documents
    docs_resp = (
        db.table("generated_documents")
        .select("id, document_type, file_path, created_at, status")
        .eq("employee_id", employee_id)
        .order("created_at", desc=True)
        .execute()
    )

    documents = [
        {
            "id": doc["id"],
            "document_type": doc["document_type"],
            "file_path": doc["file_path"],
            "created_at": doc["created_at"],
            "status": doc["status"],
            "download_url": f"/api/onboarding/documents/{doc['id']}/download",
        }
        for doc in docs_resp.data
    ]

    return jsonify(
        {
            "employee_id": employee_id,
            "employee_name": emp["full_name"],
            "documents": documents,
            "total": len(documents),
        }
    )


@bp.route("/invite-links", methods=["POST"])
def create_invite_link():
    """Create a new invite link for an employee."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    employee_id = data.get("employee_id")
    if not employee_id:
        return jsonify({"error": "employee_id is required"}), 400

    db = get_db()

    token = str(uuid.uuid4())

    expiry_days = data.get("expiry_days", 7)
    expires_at = datetime.datetime.now() + datetime.timedelta(days=expiry_days)

    invite_data = {
        "id": str(uuid.uuid4()),
        "token": token,
        "employee_id": employee_id,
        "created_by": data.get("created_by", "hr_admin"),
        "created_at": datetime.datetime.now().isoformat(),
        "expires_at": expires_at.isoformat(),
        "is_one_time": data.get("is_one_time", False),
        "custom_message": data.get("custom_message", ""),
        "view_count": 0,
        "status": "active",
    }

    try:
        db.table("invite_links").insert(invite_data).execute()
        return jsonify(
            {
                "success": True,
                "invite_link": {**invite_data, "url": f"/login?invite_token={token}"},
            }
        ), 201
    except Exception as e:
        current_app.logger.error(f"Failed to create invite link: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/invite-links", methods=["GET"])
def get_invite_links():
    """Get all invite links, optionally filtered by employee_id."""
    employee_id = request.args.get("employee_id")
    db = get_db()

    try:
        query = db.table("invite_links").select("*").order("created_at", desc=True)
        if employee_id:
            query = query.eq("employee_id", employee_id)

        result = query.execute()

        links = []
        for item in result.data:
            links.append({**item, "url": f"/login?invite_token={item['token']}"})

        return jsonify({"invite_links": links}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to get invite links: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/invite-links/<link_id>", methods=["GET"])
def get_invite_link(link_id):
    """Get a single invite link by ID."""
    db = get_db()

    try:
        result = db.table("invite_links").select("*").eq("id", link_id).execute()

        if not result.data:
            return jsonify({"error": "Invite link not found"}), 404

        link = result.data[0]
        link["url"] = f"/login?invite_token={link['token']}"

        return jsonify({"invite_link": link}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to get invite link: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/invite-links/<link_id>", methods=["DELETE"])
def delete_invite_link(link_id):
    """Delete/revoke an invite link."""
    db = get_db()

    try:
        db.table("invite_links").update({"status": "revoked"}).eq(
            "id", link_id
        ).execute()

        return jsonify({"success": True}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to delete invite link: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/invite-links/<link_id>/stats", methods=["GET"])
def get_invite_link_stats(link_id):
    """Get statistics for an invite link."""
    db = get_db()

    try:
        result = db.table("invite_links").select("*").eq("id", link_id).execute()

        if not result.data:
            return jsonify({"error": "Invite link not found"}), 404

        link = result.data[0]

        status = "active"
        if link.get("status") == "revoked":
            status = "revoked"
        elif link.get("is_used"):
            status = "used"
        elif link.get("expires_at"):
            expires = datetime.datetime.fromisoformat(link["expires_at"])
            if expires < datetime.datetime.now():
                status = "expired"

        return jsonify(
            {
                "link_id": link_id,
                "view_count": link.get("view_count", 0),
                "first_viewed_at": link.get("first_viewed_at"),
                "last_viewed_at": link.get("last_viewed_at"),
                "status": status,
                "created_at": link.get("created_at"),
                "expires_at": link.get("expires_at"),
            }
        ), 200
    except Exception as e:
        current_app.logger.error(f"Failed to get invite link stats: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/invite-links/track/<token>", methods=["POST"])
def track_invite_link_view(token):
    """Track when someone views/clicks an invite link."""
    db = get_db()

    try:
        result = db.table("invite_links").select("*").eq("token", token).execute()

        if not result.data:
            return jsonify({"error": "Invite link not found"}), 404

        link = result.data[0]
        now = datetime.datetime.now().isoformat()

        update_data = {
            "view_count": (link.get("view_count") or 0) + 1,
            "last_viewed_at": now,
        }

        if not link.get("first_viewed_at"):
            update_data["first_viewed_at"] = now

        db.table("invite_links").update(update_data).eq("token", token).execute()

        return jsonify({"success": True}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to track invite link: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/documents/<document_id>/download", methods=["GET"])
def download_document(document_id):
    """Download a generated document."""
    db = get_db()

    doc_resp = (
        db.table("generated_documents")
        .select("file_path, document_type, employee_name")
        .eq("id", document_id)
        .execute()
    )

    if not doc_resp.data:
        return jsonify({"error": "Document not found"}), 404

    doc = doc_resp.data[0]

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
        mimetype="application/pdf",
    )
