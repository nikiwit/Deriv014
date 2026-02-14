import uuid

from flask import Blueprint, jsonify, request

from app.database import get_db

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Mock data for when Supabase is not configured
MOCK_USERS = [
    {
        "id": "1",
        "email": "admin@derivhr.com",
        "first_name": "Admin",
        "last_name": "User",
        "role": "hr_admin",
        "department": "HR",
        "employee_id": "",
        "start_date": "",
        "onboarding_complete": False,
        "nationality": "Malaysian",
        "nric": "",
    },
    {
        "id": "2",
        "email": "employee@derivhr.com",
        "first_name": "Employee",
        "last_name": "User",
        "role": "employee",
        "department": "Engineering",
        "employee_id": "EMP-001",
        "start_date": "2024-01-15",
        "onboarding_complete": False,
        "nationality": "Malaysian",
        "nric": "123456-12-1234",
    },
    {
        "id": "3",
        "email": "employee2@derivhr.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "role": "employee",
        "department": "Marketing",
        "employee_id": "EMP-002",
        "start_date": "2024-02-01",
        "onboarding_complete": False,
        "nationality": "Malaysian",
        "nric": "234567-23-5678",
    },
]


@bp.route("/users", methods=["GET"])
def list_users():
    """List users, optionally filtered by role."""
    role = request.args.get("role")
    print(f"Listing users, filter role: {role}")

    try:
        sb = get_db()
        # Verify if sb is actually a client or if it failed silently before
        query = sb.table("users").select("*").order("created_at")
        if role:
            query = query.eq("role", role)
        result = query.execute()
        return jsonify({"users": result.data})
    except Exception as e:
        # Fallback to mock data when Supabase is not configured or query fails
        import traceback

        traceback.print_exc()
        print(f"Database error in list_users, using mock data: {e}")

        filtered_users = MOCK_USERS
        if role:
            filtered_users = [u for u in MOCK_USERS if u.get("role") == role]
        return jsonify({"users": filtered_users})


@bp.route("/users/<user_id>", methods=["GET"])
def get_user(user_id):
    """Get a single user by ID."""
    sb = get_db()
    result = sb.table("users").select("*").eq("id", user_id).execute()

    if not result.data:
        return jsonify({"error": "User not found"}), 404

    return jsonify(result.data[0])


@bp.route("/users", methods=["POST"])
def create_user():
    """Create a new user account."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    required = ["email", "first_name", "last_name", "role"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    if data["role"] not in ("hr_admin", "employee", "pending_employee"):
        return jsonify({"error": "Role must be 'hr_admin', 'employee', or 'pending_employee'"}), 400

    sb = get_db()

    # Check if email already exists
    existing = sb.table("users").select("id").eq("email", data["email"]).execute()
    if existing.data:
        return jsonify(
            {"error": "User with this email already exists", "user": existing.data[0]}
        ), 409

    user_record = {
        "email": data["email"],
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "role": data["role"],
        "department": data.get("department", ""),
        "employee_id": data.get("employee_id", ""),
        "start_date": data.get("start_date", ""),
        "onboarding_complete": data.get("onboarding_complete", False),
        "nationality": data.get("nationality", ""),
        "nric": data.get("nric", ""),
    }

    result = sb.table("users").insert(user_record).execute()
    return jsonify(result.data[0]), 201


@bp.route("/users/<user_id>/employees", methods=["GET"])
def get_hr_employees(user_id):
    """Get all employees assigned to an HR manager."""
    sb = get_db()

    # Verify user is HR admin
    user = sb.table("users").select("role").eq("id", user_id).execute()
    if not user.data:
        return jsonify({"error": "User not found"}), 404

    # Get assignments
    assignments = (
        sb.table("hr_employee_assignments")
        .select("employee_user_id")
        .eq("hr_user_id", user_id)
        .execute()
    )

    if not assignments.data:
        return jsonify({"employees": []})

    employee_ids = [a["employee_user_id"] for a in assignments.data]
    employees = sb.table("users").select("*").in_("id", employee_ids).execute()

    return jsonify({"employees": employees.data})


@bp.route("/assignments", methods=["POST"])
def create_assignment():
    """Assign an employee to an HR manager."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    hr_user_id = data.get("hr_user_id")
    employee_user_id = data.get("employee_user_id")

    if not hr_user_id or not employee_user_id:
        return jsonify({"error": "hr_user_id and employee_user_id are required"}), 400

    sb = get_db()

    # Check for existing assignment
    existing = (
        sb.table("hr_employee_assignments")
        .select("id")
        .eq("hr_user_id", hr_user_id)
        .eq("employee_user_id", employee_user_id)
        .execute()
    )
    if existing.data:
        return jsonify(
            {"message": "Assignment already exists", "id": existing.data[0]["id"]}
        ), 200

    result = (
        sb.table("hr_employee_assignments")
        .insert({"hr_user_id": hr_user_id, "employee_user_id": employee_user_id})
        .execute()
    )

    return jsonify(result.data[0]), 201
