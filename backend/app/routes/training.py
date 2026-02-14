"""
Training assignment and management routes for DerivHR.
Handles automatic training assignment when contracts are signed.
"""

import os
import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from app.database import get_db
from app.training_templates import (
    get_training_template_for_department,
    get_training_items_for_template
)

bp = Blueprint("training", __name__, url_prefix="/api/training")


@bp.route("/assign", methods=["POST"])
def assign_training():
    """
    Manually assign training to an employee.
    Used for testing or retroactive assignments.

    Request body:
        {
            "employee_id": "uuid-string"
        }

    Returns:
        {
            "status": "ok",
            "employee_id": "...",
            "department": "...",
            "template": "finance|engineering|default",
            "training_count": 17
        }
    """
    data = request.get_json(force=True)
    employee_id = data.get("employee_id")

    if not employee_id:
        return jsonify({"status": "error", "message": "employee_id required"}), 400

    try:
        # Fetch employee to get department
        db = get_db()
        r_user = db.table("users").select("id, department").eq("id", employee_id).execute()

        if not r_user.data:
            return jsonify({"status": "error", "message": "Employee not found"}), 404

        user = r_user.data[0]
        department = user.get("department", "")

        # Assign training based on department
        result = _assign_training_to_employee(employee_id, department)

        return jsonify({
            "status": "ok",
            "employee_id": employee_id,
            "department": department,
            "template": result["template"],
            "training_count": result["training_count"]
        })

    except Exception as e:
        current_app.logger.exception("Error assigning training")
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route("/progress/<employee_id>", methods=["GET"])
def get_training_progress(employee_id):
    """
    Get training progress for an employee from database.

    Returns:
        {
            "status": "ok",
            "employee_id": "...",
            "template": "finance|engineering|default",
            "training_data": [...],
            "assigned_at": "...",
            "last_synced_at": "..."
        }
    """
    try:
        db = get_db()
        r_assignment = db.table("training_assignments") \
            .select("*") \
            .eq("employee_id", employee_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not r_assignment.data:
            return jsonify({
                "status": "not_found",
                "message": "No training assigned yet"
            }), 404

        assignment = r_assignment.data[0]

        return jsonify({
            "status": "ok",
            "employee_id": employee_id,
            "template": assignment.get("training_template"),
            "training_data": assignment.get("training_data"),
            "assigned_at": assignment.get("assigned_at"),
            "last_synced_at": assignment.get("last_synced_at")
        })

    except Exception as e:
        current_app.logger.exception("Error fetching training progress")
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route("/sync", methods=["POST"])
def sync_training_progress():
    """
    Sync training progress from frontend localStorage to database.
    Called periodically by frontend to save progress.

    Request body:
        {
            "employee_id": "uuid-string",
            "training_data": [...]  # Full training items array with updated statuses
        }

    Returns:
        {
            "status": "ok",
            "employee_id": "...",
            "synced_at": "..."
        }
    """
    data = request.get_json(force=True)
    employee_id = data.get("employee_id")
    training_data = data.get("training_data")

    if not employee_id or not training_data:
        return jsonify({
            "status": "error",
            "message": "employee_id and training_data required"
        }), 400

    try:
        db = get_db()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Update existing assignment
        update_result = db.table("training_assignments") \
            .update({
                "training_data": training_data,
                "last_synced_at": now_iso,
                "updated_at": now_iso
            }) \
            .eq("employee_id", employee_id) \
            .execute()

        return jsonify({
            "status": "ok",
            "employee_id": employee_id,
            "synced_at": now_iso
        })

    except Exception as e:
        current_app.logger.exception("Error syncing training progress")
        return jsonify({"status": "error", "message": str(e)}), 500


def _assign_training_to_employee(employee_id: str, department: str) -> dict:
    """
    Internal function to assign training based on department.
    Called from contract signing endpoint and manual assignment.

    Args:
        employee_id: UUID of the employee
        department: Employee's department (e.g., 'Finance', 'Engineering', 'Marketing')

    Returns:
        dict with:
            - template: 'finance', 'engineering', or 'default'
            - training_count: number of items assigned
            - items: list of initialized training items

    Raises:
        Exception: if database operations fail
    """
    db = get_db()

    # Determine template based on department
    template = get_training_template_for_department(department)

    # Get training items for the template
    training_items = get_training_items_for_template(template)

    # Initialize training data with proper status
    # First item is 'available', rest are 'locked' (sequential unlock pattern)
    initialized_items = []
    for idx, item in enumerate(training_items):
        initialized_items.append({
            **item,
            'id': f'training_{idx}',
            'status': 'available' if idx == 0 else 'locked',  # First item available, rest locked
            'completedAt': None,
            'score': None
        })

    # Save to database
    now_iso = datetime.now(timezone.utc).isoformat()

    # Check if assignment already exists
    existing = db.table("training_assignments") \
        .select("id") \
        .eq("employee_id", employee_id) \
        .execute()

    if existing.data:
        # Update existing assignment
        db.table("training_assignments") \
            .update({
                "training_template": template,
                "training_data": initialized_items,
                "updated_at": now_iso
            }) \
            .eq("employee_id", employee_id) \
            .execute()

        current_app.logger.info(
            f"Updated training assignment for {employee_id}: {template} template ({len(initialized_items)} items)"
        )
    else:
        # Insert new assignment
        db.table("training_assignments") \
            .insert({
                "employee_id": employee_id,
                "training_template": template,
                "training_data": initialized_items,
                "assigned_at": now_iso,
                "created_at": now_iso,
                "updated_at": now_iso
            }) \
            .execute()

        current_app.logger.info(
            f"Created training assignment for {employee_id}: {template} template ({len(initialized_items)} items, dept: {department})"
        )

    return {
        "template": template,
        "training_count": len(initialized_items),
        "items": initialized_items
    }


@bp.route("/list", methods=["GET"])
def list_all_training():
    """
    List all training assignments with user information.
    Useful for debugging and testing.

    Returns:
        {
            "status": "ok",
            "count": 16,
            "assignments": [...]
        }
    """
    try:
        db = get_db()

        # Get all training assignments with user info
        assignments = db.table("training_assignments") \
            .select("*, users!training_assignments_employee_id_fkey(id, email, first_name, last_name, department)") \
            .execute()

        if not assignments.data:
            return jsonify({
                "status": "ok",
                "message": "No training assignments found",
                "count": 0,
                "assignments": []
            })

        # Format the response
        formatted = []
        for assignment in assignments.data:
            user_info = assignment.get('users', {})
            formatted.append({
                "user_id": assignment['employee_id'],
                "email": user_info.get('email', 'N/A'),
                "name": f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip(),
                "department": user_info.get('department', 'N/A'),
                "template": assignment['training_template'],
                "item_count": len(assignment['training_data']),
                "assigned_at": assignment['assigned_at']
            })

        return jsonify({
            "status": "ok",
            "count": len(formatted),
            "assignments": formatted
        })

    except Exception as e:
        current_app.logger.exception("Error listing training assignments")
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route("/backfill", methods=["POST"])
def backfill_existing_employees():
    """
    Admin-only: Assign training to all existing employees who don't have training yet.
    Useful for retroactive assignment after deploying this feature.

    Returns:
        {
            "status": "ok",
            "assigned_count": 15,
            "total_users": 20,
            "skipped_count": 5
        }
    """
    try:
        db = get_db()

        # Get all users
        users = db.table("users").select("id, department").execute()

        if not users.data:
            return jsonify({
                "status": "ok",
                "message": "No users found",
                "assigned_count": 0,
                "total_users": 0
            })

        assigned_count = 0
        skipped_count = 0

        for user in users.data:
            user_id = user['id']

            # Check if training already assigned
            existing = db.table("training_assignments") \
                .select("id") \
                .eq("employee_id", user_id) \
                .execute()

            if existing.data:
                skipped_count += 1
                continue

            # Assign training
            try:
                _assign_training_to_employee(user_id, user.get('department', ''))
                assigned_count += 1
            except Exception as e:
                current_app.logger.error(f"Failed to assign training to {user_id}: {e}")
                skipped_count += 1

        return jsonify({
            "status": "ok",
            "assigned_count": assigned_count,
            "total_users": len(users.data),
            "skipped_count": skipped_count
        })

    except Exception as e:
        current_app.logger.exception("Error in backfill operation")
        return jsonify({"status": "error", "message": str(e)}), 500
