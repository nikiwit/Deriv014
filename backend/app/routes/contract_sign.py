import os
import json
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, current_app
from app import rag
from app.database import get_db

bp = Blueprint("contract_sign", __name__, url_prefix="/api")

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMP_DIR = Path(os.environ.get("TEMP_DATA_DIR", str(_BASE_DIR / "temp_data")))
TEMP_DIR.mkdir(parents=True, exist_ok=True)




def _get_row(table: str, column: str, value: str):
    """Safe single-row fetch — returns dict or None, never raises on empty."""
    result = get_db().table(table).select("*").eq(column, value).execute()
    rows = result.data if result.data else []
    return rows[0] if rows else None


def llm_reason_over(payload: dict) -> dict:
    """
    Call OpenAI to reason over profile + RAG context and decide on contract signing.
    Falls back gracefully if OPENAI_API_KEY is missing or invalid.
    """
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return {
            "recommended_action": "llm_unavailable",
            "explanation": "OPENAI_API_KEY is not configured. All pre-checks passed.",
            "llm_raw": None
        }

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)

        profile = payload.get("profile", {})
        policy_text = payload.get("policy_text", "No policy context available.")
        user_context_text = payload.get("user_context_text", "No user history available.")
        completion_row = payload.get("completion_row", {})
        contract_row = payload.get("contract_row", {})

        system_msg = (
            "You are an HR compliance assistant. Your job is to review a contract signing request "
            "and decide whether it should be approved. Respond ONLY with valid JSON in this exact format:\n"
            '{"recommended_action": "allow_sign" | "require_approval" | "block", "explanation": "<short reason>"}'
        )

        user_msg = (
            f"Employee: {profile.get('full_name')} (ID: {profile.get('id')})\n"
            f"Role: {profile.get('role')}, Department: {profile.get('department')}\n"
            f"Country: {profile.get('country')}, Salary: {profile.get('salary')}\n"
            f"Start Date: {profile.get('start_date')}\n\n"
            f"Contract completion record: {json.dumps(completion_row)}\n"
            f"Contract record: {json.dumps(contract_row)}\n\n"
            f"Relevant company policy:\n{policy_text}\n\n"
            f"Employee history/notes:\n{user_context_text}\n\n"
            "Based on the above, should this employee be allowed to sign their contract?"
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            temperature=0,
            max_tokens=300
        )

        raw = response.choices[0].message.content.strip()

        # Parse JSON response
        try:
            parsed = json.loads(raw)
            return {
                "recommended_action": parsed.get("recommended_action", "require_approval"),
                "explanation": parsed.get("explanation", ""),
                "llm_raw": raw
            }
        except json.JSONDecodeError:
            # LLM returned non-JSON — treat as require_approval
            return {
                "recommended_action": "require_approval",
                "explanation": raw,
                "llm_raw": raw
            }

    except Exception as e:
        current_app.logger.warning(f"LLM call failed: {e}")
        return {
            "recommended_action": "llm_unavailable",
            "explanation": f"LLM unavailable: {str(e)}. All pre-checks passed.",
            "llm_raw": None
        }


@bp.route("/validate_job_role", methods=["POST"])
def validate_job_role():
    """
    RAG-based check: verify whether a given role/department is an officially
    recognized position per company policy documents.
    Called by the frontend during the contract data-collection step.
    """
    data = request.get_json(force=True)
    role = (data.get("role") or "").strip()
    department = (data.get("department") or "").strip()
    session_id = data.get("session_id") or "contract_validation"

    if not role:
        return jsonify({"status": "error", "message": "role is required"}), 400

    try:
        dept_clause = f" in the {department} department" if department else ""
        query = (
            f"List all officially recognized job titles and approved positions in the company. "
            f"Determine whether '{role}'{dept_clause} is a valid, approved position. "
            f"Return: "
            f"(1) whether this is a recognized company role, "
            f"(2) the closest matching official job title if the input differs from the standard name, "
            f"(3) any policy notes about this role's contract requirements, probation period, "
            f"notice period, or reporting structure that apply at the time of contract signing."
        )
        text, sources = rag.query(session_id, query)
        return jsonify({
            "status": "ok",
            "role": role,
            "department": department,
            "rag_result": text,
            "sources": sources
        })
    except Exception as e:
        current_app.logger.exception("Error in validate_job_role")
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route("/sign_contract", methods=["POST"])
def sign_contract_pipeline():
    data = request.get_json(force=True)
    employee_id = data.get("employee_id")
    requester_id = data.get("requester_id")
    session_id = data.get("session_id") or f"web_{employee_id}"
    signature_url = data.get("signature_url")
    # Client-side collected data for fields that may be missing in DB
    collected_data: dict = data.get("collected_data") or {}

    if not employee_id:
        return jsonify({"status": "error", "message": "employee_id and requester_id required"}), 400

    try:
        # ── Stage 1: Fetch employee profile ──────────────────────────────────
        r_user = get_db().table("users").select("id, first_name, last_name, email, role, department, employee_id, position_title, nationality").eq("id", employee_id).execute()
        
        user_rows = r_user.data if r_user.data else []
        if not user_rows:
            return jsonify({"status": "error", "message": "Employee record not found"}), 404

        user_row = user_rows[0]
        full_name = f"{user_row.get('first_name')} {user_row.get('last_name')}"
        
        profile = {
            "id": user_row.get("id"),
            "employee_id": user_row.get("id"),
            "full_name": full_name,
            "email": user_row.get("email"),
            "role": user_row.get("role"),
            "department": user_row.get("department"),
            "position_title": user_row.get("position_title"),
            "nationality": user_row.get("nationality")
        }

        # Merge client-collected data for any fields missing from DB
        for field in ("role", "department", "position_title", "nationality", "start_date"):
            if not profile.get(field) and collected_data.get(field):
                profile[field] = collected_data[field]

        # ── Stage 2: Fetch employee's contract(s) ─────────────────────────────
        r_contract = get_db().table("contracts") \
            .select("*") \
            .eq("employee_id", employee_id) \
            .eq("status", "pending_signature") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        contract_rows = r_contract.data if r_contract.data else []
        
        if not contract_rows:
            # Check if already signed
            r_signed = get_db().table("contracts") \
                .select("*") \
                .eq("employee_id", employee_id) \
                .in_("status", ["active", "signed"]) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            
            if r_signed:
                signed_contract = r_signed.data[0]
                return jsonify({
                    "status": "already_signed",
                    "allowed": False,
                    "message": f"Contract already signed on {signed_contract.get('employee_signed_at') or signed_contract.get('updated_at')}",
                    "contract": signed_contract
                })
            
            return jsonify({
                "status": "no_contract",
                "allowed": False,
                "message": "No pending contract found for this employee. Contract may not be ready for signature yet."
            }), 404

        contract_row = contract_rows[0]
        contract_id = contract_row.get("id")
        current_status = contract_row.get("status")

      

        # ── Stage 4: RAG queries for policy & context ─────────────────────────
        policy_query = (
            f"Retrieve contract signing conditions, mandatory clauses, and relevant policy "
            f"for role '{profile.get('position_title') or profile.get('role')}' in {profile.get('nationality') or 'company jurisdiction'}. "
            "Return policy summary including approval requirements, signature workflows, and any jurisdictional constraints."
        )
        policy_text, policy_sources = rag.query(session_id, policy_query)

        user_context_query = (
            f"Retrieve any internal notes, previous negotiations, or special conditions "
            f"for {full_name} (employee_id: {profile.get('employee_id')}, user_id: {employee_id}) "
            f"related to contract terms, salary, start date, or reporting structure."
        )
        user_context_text, user_context_sources = rag.query(session_id, user_context_query)
        
        
          # ── Stage 3: Check if HR has approved/signed first (if required) ─────
        hr_signed_at = contract_row.get("hr_signed_at")
        hr_user_id = contract_row.get("hr_user_id")
        
        if not hr_signed_at:
            # Get HR manager assigned to this employee
            r_assignment = get_db().table("hr_employee_assignments") \
                .select("hr_user_id") \
                .eq("employee_id", employee_id) \
                .execute()
            
            assigned_hr_ids = [a.get("hr_user_id") for a in r_assignment.data] if r_assignment.data else []
            
            return jsonify({
                "status": "awaiting_hr_approval",
                "allowed": False,
                "message": f"" + "Contract awaiting HR manager signature/approval." + f"\n{policy_text}, \n {user_context_text}",
                "contract": contract_row,
                "assigned_hr_ids": assigned_hr_ids
            })

        # ── Stage 5: LLM reasoning for final approval ─────────────────────────
        payload = {
            "profile": profile,
            "contract": contract_row,
            "policy_text": policy_text,
            "policy_sources": policy_sources,
            "user_context_text": user_context_text,
            "user_context_sources": user_context_sources,
            "requester_id": requester_id,
            "signature_url": signature_url
        }

        llm_result = llm_reason_over(payload)
        recommended_action = llm_result.get("recommended_action")

        # ── Stage 6: Update contract if LLM approves ──────────────────────────
        if recommended_action == "allow_sign":
            now_iso = datetime.now(timezone.utc).isoformat()
            
            update_data = {
                "employee_signed_at": now_iso,
                "employee_signature_url": signature_url,
                "status": "active",  # or "signed" depending on your workflow
                "updated_at": now_iso
            }
            
            get_db().table("contracts") \
                .update(update_data) \
                .eq("id", contract_id) \
                .execute()

            # Optional: Update user's onboarding status
            get_db().table("users") \
                .update({"onboarding_complete": True}) \
                .eq("id", employee_id) \
                .execute()

        return jsonify({
            "status": "ok",
            "allowed": recommended_action == "allow_sign",
            "recommended_action": recommended_action,
            "llm_result": llm_result,
            "contract": contract_row,
            "profile": profile,
            "policy_summary": policy_text[:500] + "..." if policy_text else None,
            "user_context_summary": user_context_text[:500] + "..." if user_context_text else None
        })

    except Exception as e:
        current_app.logger.exception("Error in sign_contract_pipeline")
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route("/store_contract_json", methods=["POST"])
def store_contract_json():
    """
    Persist the signed contract as JSON after employee confirms consent.
    Saves to: TEMP_DIR / {employee_id}_contract.json
    """
    data = request.get_json(force=True)
    employee_id = data.get("employee_id")
    contract_data = data.get("contract_data")
    if not employee_id or not contract_data:
        return jsonify({"status": "error", "message": "employee_id and contract_data are required"}), 400
    try:
        json_path = TEMP_DIR / f"{employee_id}_contract.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({
                **contract_data,
                "consent_confirmed_at": datetime.now(timezone.utc).isoformat(),
                "consent_given_by": employee_id
            }, f, ensure_ascii=False, indent=2, default=str)
        return jsonify({"status": "ok", "path": str(json_path)})
    except Exception as e:
        current_app.logger.exception("Error storing contract JSON")
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route("/employee-docs-status/<employee_id>", methods=["GET"])
def employee_docs_status(employee_id):
    """Check which onboarding document files exist in TEMP_DIR for a given employee."""
    def _check(path: Path) -> dict:
        if path.exists():
            try:
                d = json.loads(path.read_text(encoding="utf-8"))
                return {"exists": True, "signed_at": d.get("consent_confirmed_at") or d.get("completedAt")}
            except Exception:
                return {"exists": True, "signed_at": None}
        return {"exists": False, "signed_at": None}

    app_status = _check(TEMP_DIR / f"{employee_id}_app_comprehensive.json")
    if not app_status["exists"]:
        app_status = _check(TEMP_DIR / f"{employee_id}.json")

    return jsonify({
        "application": app_status,
        "offer":       _check(TEMP_DIR / f"{employee_id}_offer_acceptance.json"),
        "contract":    _check(TEMP_DIR / f"{employee_id}_contract.json"),
    })


@bp.route("/download-contract-json/<employee_id>", methods=["GET"])
def download_contract_json(employee_id):
    """Serve the signed contract JSON file from TEMP_DIR as a download."""
    from flask import send_file
    path = TEMP_DIR / f"{employee_id}_contract.json"
    if not path.exists():
        return jsonify({"status": "error", "message": "Signed contract not found"}), 404
    return send_file(
        path,
        as_attachment=True,
        download_name=f"contract_{employee_id}.json",
        mimetype="application/json"
    )