"""
Training Checklist API Routes

Handles employee training checklist management:
- Get training tasks for an employee
- Update task status (start, complete)
- Get training progress
- HR dashboard for training analytics
"""

from flask import Blueprint, jsonify, request
from supabase import create_client, Client
from app.database import get_db

bp = Blueprint("training", __name__, url_prefix="/api/multiagent/training")

# Default training checklist structure (mirrors frontend constants)
DEFAULT_TRAINING_CATEGORIES = {
    "compliance": {"weight": 0.30, "label": "Compliance"},
    "technical": {"weight": 0.25, "label": "Technical"},
    "soft_skills": {"weight": 0.10, "label": "Soft Skills"},
    "products": {"weight": 0.20, "label": "Products"},
    "tools": {"weight": 0.10, "label": "Tools"},
    "security": {"weight": 0.03, "label": "Security"},
    "leadership": {"weight": 0.02, "label": "Leadership"},
}


def get_supabase_client():
    """Get Supabase client from app config"""
    supabase_url = current_app.config.get("SUPABASE_URL")
    supabase_key = current_app.config.get("SUPABASE_KEY")
    if supabase_url and supabase_key:
        return create_client(supabase_url, supabase_key)
    return None


def get_or_create_training_record(employee_id: str):
    """Get or create training progress record for an employee"""
    db = get_db()
    supabase = get_supabase_client()

    if supabase:
        # Try to get existing record
        result = (
            supabase.table("employee_training")
            .select("*")
            .eq("employee_id", employee_id)
            .execute()
        )
        if result.data and len(result.data) > 0:
            return result.data[0]

        # Create new record
        new_record = {
            "employee_id": employee_id,
            "progress": 0,
            "status": "not_started",
            "tasks": [],
            "completed_at": None,
        }
        result = supabase.table("employee_training").insert(new_record).execute()
        return result.data[0] if result.data else new_record

    # Fallback to local DB
    return {
        "employee_id": employee_id,
        "progress": 0,
        "status": "not_started",
        "tasks": [],
        "completed_at": None,
    }


def initialize_training_tasks(employee_id: str, department: str, role: str):
    """Initialize training tasks based on employee role/department"""

    # Common tasks for all employees
    common_tasks = [
        {
            "id": "common_comp_1",
            "title": "Company Values & Culture",
            "category": "compliance",
            "status": "available",
            "priority": "required",
        },
        {
            "id": "common_comp_2",
            "title": "Workplace Harassment",
            "category": "compliance",
            "status": "available",
            "priority": "required",
        },
        {
            "id": "common_comp_3",
            "title": "Health & Safety",
            "category": "compliance",
            "status": "available",
            "priority": "required",
        },
        {
            "id": "common_sec_1",
            "title": "Cybersecurity Basics",
            "category": "security",
            "status": "available",
            "priority": "required",
        },
        {
            "id": "common_sec_2",
            "title": "Password & MFA Setup",
            "category": "security",
            "status": "locked",
            "priority": "required",
        },
        {
            "id": "common_sec_3",
            "title": "Data Classification",
            "category": "security",
            "status": "locked",
            "priority": "required",
        },
        {
            "id": "common_tools_1",
            "title": "Communication Tools",
            "category": "tools",
            "status": "available",
            "priority": "required",
        },
        {
            "id": "common_tools_2",
            "title": "VPN & Remote Access",
            "category": "tools",
            "status": "locked",
            "priority": "required",
        },
        {
            "id": "common_tools_3",
            "title": "IT Support & Ticketing",
            "category": "tools",
            "status": "locked",
            "priority": "required",
        },
    ]

    # Role-specific tasks (simplified - in production would come from database)
    role_tasks = {
        "Engineering": [
            {
                "id": "eng_tech_1",
                "title": "Development Environment Setup",
                "category": "technical",
                "status": "available",
                "priority": "required",
            },
            {
                "id": "eng_tech_2",
                "title": "Code Review Process",
                "category": "technical",
                "status": "locked",
                "priority": "required",
            },
            {
                "id": "eng_tech_3",
                "title": "CI/CD Pipeline",
                "category": "technical",
                "status": "locked",
                "priority": "required",
            },
            {
                "id": "eng_sec_1",
                "title": "Secure Coding Practices",
                "category": "security",
                "status": "locked",
                "priority": "required",
            },
        ],
        "Sales": [
            {
                "id": "sales_prod_1",
                "title": "Product Knowledge",
                "category": "products",
                "status": "available",
                "priority": "required",
            },
            {
                "id": "sales_prod_2",
                "title": "CRM System",
                "category": "tools",
                "status": "locked",
                "priority": "required",
            },
            {
                "id": "sales_ss_1",
                "title": "Sales Methodology",
                "category": "soft_skills",
                "status": "locked",
                "priority": "required",
            },
        ],
        "Marketing": [
            {
                "id": "mkt_prod_1",
                "title": "Brand Guidelines",
                "category": "products",
                "status": "available",
                "priority": "required",
            },
            {
                "id": "mkt_tools_1",
                "title": "Marketing Automation",
                "category": "tools",
                "status": "locked",
                "priority": "required",
            },
            {
                "id": "mkt_tools_2",
                "title": "Analytics & Reporting",
                "category": "tools",
                "status": "locked",
                "priority": "required",
            },
        ],
        "Finance": [
            {
                "id": "fin_comp_1",
                "title": "Financial Regulations",
                "category": "compliance",
                "status": "available",
                "priority": "required",
            },
            {
                "id": "fin_comp_2",
                "title": "Expense Policy",
                "category": "compliance",
                "status": "available",
                "priority": "required",
            },
            {
                "id": "fin_tech_1",
                "title": "ERP System Training",
                "category": "technical",
                "status": "locked",
                "priority": "required",
            },
        ],
        "HR": [
            {
                "id": "hr_comp_1",
                "title": "Employment Law Basics",
                "category": "compliance",
                "status": "available",
                "priority": "required",
            },
            {
                "id": "hr_comp_2",
                "title": "Equal Opportunity Employment",
                "category": "compliance",
                "status": "available",
                "priority": "required",
            },
            {
                "id": "hr_tools_1",
                "title": "HRIS System",
                "category": "tools",
                "status": "locked",
                "priority": "required",
            },
        ],
        "default": [
            {
                "id": "def_tech_1",
                "title": "Role-Specific Tools",
                "category": "technical",
                "status": "available",
                "priority": "required",
            },
            {
                "id": "def_ss_1",
                "title": "Communication Skills",
                "category": "soft_skills",
                "status": "locked",
                "priority": "recommended",
            },
        ],
    }

    tasks = common_tasks.copy()

    # Add role-specific tasks
    specific_tasks = role_tasks.get(department, role_tasks["default"])
    tasks.extend(specific_tasks)

    return tasks


@bp.route("/employee/<employee_id>/tasks", methods=["GET"])
def get_employee_training_tasks(employee_id):
    """Get all training tasks for an employee"""
    try:
        supabase = get_supabase_client()

        if supabase:
            result = (
                supabase.table("employee_training")
                .select("*")
                .eq("employee_id", employee_id)
                .execute()
            )

            if result.data and len(result.data) > 0:
                record = result.data[0]
                return jsonify(
                    {
                        "employee_id": employee_id,
                        "tasks": record.get("tasks", []),
                        "progress": record.get("progress", 0),
                        "status": record.get("status", "not_started"),
                    }
                )

        # Return default tasks if no record exists
        tasks = initialize_training_tasks(employee_id, "Engineering", "Employee")
        return jsonify(
            {
                "employee_id": employee_id,
                "tasks": tasks,
                "progress": 0,
                "status": "not_started",
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/employee/<employee_id>/tasks/<task_id>", methods=["POST"])
def update_training_task(employee_id, task_id):
    """Update a specific training task (start, complete, etc.)"""
    try:
        data = request.get_json() or {}
        new_status = data.get("status", "in_progress")

        supabase = get_supabase_client()

        if supabase:
            # Get current record
            result = (
                supabase.table("employee_training")
                .select("*")
                .eq("employee_id", employee_id)
                .execute()
            )

            if result.data and len(result.data) > 0:
                record = result.data[0]
                tasks = record.get("tasks", [])

                # Update task status
                for task in tasks:
                    if task.get("id") == task_id:
                        task["status"] = new_status
                        if new_status == "completed":
                            task["completed_at"] = datetime.datetime.now().isoformat()
                        elif new_status == "in_progress" and "started_at" not in task:
                            task["started_at"] = datetime.datetime.now().isoformat()
                        break

                # Calculate new progress
                completed = sum(1 for t in tasks if t.get("status") == "completed")
                progress = int((completed / len(tasks) * 100)) if tasks else 0

                # Determine overall status
                overall_status = "not_started"
                if progress == 100:
                    overall_status = "completed"
                elif progress > 0:
                    overall_status = "in_progress"

                # Update record
                supabase.table("employee_training").update(
                    {
                        "tasks": tasks,
                        "progress": progress,
                        "status": overall_status,
                        "completed_at": datetime.datetime.now().isoformat()
                        if overall_status == "completed"
                        else None,
                    }
                ).eq("employee_id", employee_id).execute()

                return jsonify(
                    {
                        "success": True,
                        "task_id": task_id,
                        "status": new_status,
                        "progress": progress,
                        "overall_status": overall_status,
                    }
                )

        return jsonify(
            {"success": True, "task_id": task_id, "status": new_status, "progress": 0}
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/employee/<employee_id>/progress", methods=["GET"])
def get_employee_training_progress(employee_id):
    """Get detailed training progress for an employee"""
    try:
        supabase = get_supabase_client()

        if supabase:
            result = (
                supabase.table("employee_training")
                .select("*")
                .eq("employee_id", employee_id)
                .execute()
            )

            if result.data and len(result.data) > 0:
                record = result.data[0]
                tasks = record.get("tasks", [])

                # Calculate category-wise progress
                category_progress = {}
                for cat, config in DEFAULT_TRAINING_CATEGORIES.items():
                    cat_tasks = [t for t in tasks if t.get("category") == cat]
                    if cat_tasks:
                        completed = sum(
                            1 for t in cat_tasks if t.get("status") == "completed"
                        )
                        cat_progress = (completed / len(cat_tasks)) * 100
                        category_progress[cat] = {
                            "completed": completed,
                            "total": len(cat_tasks),
                            "percentage": int(cat_progress),
                            "weight": config["weight"],
                        }

                return jsonify(
                    {
                        "employee_id": employee_id,
                        "overall_progress": record.get("progress", 0),
                        "overall_status": record.get("status", "not_started"),
                        "category_progress": category_progress,
                        "tasks": tasks,
                    }
                )

        # Return default
        tasks = initialize_training_tasks(employee_id, "Engineering", "Employee")
        return jsonify(
            {
                "employee_id": employee_id,
                "overall_progress": 0,
                "overall_status": "not_started",
                "category_progress": {},
                "tasks": tasks,
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/hr/employees-progress", methods=["GET"])
def get_all_employees_training_progress():
    """HR Dashboard: Get training progress for all employees"""
    try:
        supabase = get_supabase_client()

        if supabase:
            result = supabase.table("employee_training").select("*").execute()

            if result.data:
                employees = []
                for record in result.data:
                    employees.append(
                        {
                            "employee_id": record.get("employee_id"),
                            "progress": record.get("progress", 0),
                            "status": record.get("status", "not_started"),
                            "completed_at": record.get("completed_at"),
                        }
                    )

                return jsonify(
                    {
                        "employees": employees,
                        "total": len(employees),
                        "completed": sum(
                            1 for e in employees if e["status"] == "completed"
                        ),
                        "in_progress": sum(
                            1 for e in employees if e["status"] == "in_progress"
                        ),
                        "not_started": sum(
                            1 for e in employees if e["status"] == "not_started"
                        ),
                    }
                )

        return jsonify(
            {
                "employees": [],
                "total": 0,
                "completed": 0,
                "in_progress": 0,
                "not_started": 0,
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/hr/initiate", methods=["POST"])
def initiate_employee_training():
    """HR: Initiate training for a new employee"""
    try:
        data = request.get_json() or {}
        employee_id = data.get("employee_id")
        department = data.get("department", "Engineering")
        role = data.get("role", "Employee")

        if not employee_id:
            return jsonify({"error": "employee_id required"}), 400

        tasks = initialize_training_tasks(employee_id, department, role)

        supabase = get_supabase_client()

        if supabase:
            # Check if record exists
            result = (
                supabase.table("employee_training")
                .select("id")
                .eq("employee_id", employee_id)
                .execute()
            )

            if result.data and len(result.data) > 0:
                # Update existing
                supabase.table("employee_training").update(
                    {"tasks": tasks, "progress": 0, "status": "not_started"}
                ).eq("employee_id", employee_id).execute()
            else:
                # Create new
                supabase.table("employee_training").insert(
                    {
                        "employee_id": employee_id,
                        "department": department,
                        "role": role,
                        "tasks": tasks,
                        "progress": 0,
                        "status": "not_started",
                    }
                ).execute()

        return jsonify({"success": True, "employee_id": employee_id, "tasks": tasks})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Import datetime for timestamps
import datetime
from flask import current_app
