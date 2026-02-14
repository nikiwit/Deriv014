"""
Database Backup/Restore Utilities
Supports both local PostgreSQL and Supabase
"""

import os
import json
import subprocess
from datetime import datetime
from flask import current_app


class DatabaseBackup:
    """Backup and restore utilities for onboarding data"""

    def __init__(self, db_mode=None):
        self.db_mode = db_mode or os.environ.get("DB_MODE", "supabase")

    def backup_local_postgres(self, output_path=None):
        """Backup local PostgreSQL database"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"backups/derivhr_backup_{timestamp}.sql"

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        db_url = os.environ.get(
            "LOCAL_DATABASE_URL",
            "postgresql://derivhr:derivhr_dev_password@localhost:5432/derivhr_dev",
        )

        # Extract connection details from URL
        # postgresql://user:password@host:port/dbname
        parts = db_url.replace("postgresql://", "").split("@")
        user_pass = parts[0].split(":")
        host_db = parts[1].split("/")
        host_port = host_db[0].split(":")

        user = user_pass[0]
        password = user_pass[1]
        host = host_port[0]
        port = host_port[1] if len(host_port) > 1 else "5432"
        dbname = host_db[1]

        env = os.environ.copy()
        env["PGPASSWORD"] = password

        cmd = [
            "pg_dump",
            "-h",
            host,
            "-p",
            port,
            "-U",
            user,
            "-d",
            dbname,
            "-f",
            output_path,
            "--verbose",
        ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode == 0:
            return {
                "success": True,
                "path": output_path,
                "size": os.path.getsize(output_path),
            }
        else:
            return {"success": False, "error": result.stderr}

    def restore_local_postgres(self, backup_path):
        """Restore local PostgreSQL database from backup"""
        if not os.path.exists(backup_path):
            return {"success": False, "error": "Backup file not found"}

        db_url = os.environ.get(
            "LOCAL_DATABASE_URL",
            "postgresql://derivhr:derivhr_dev_password@localhost:5432/derivhr_dev",
        )

        parts = db_url.replace("postgresql://", "").split("@")
        user_pass = parts[0].split(":")
        host_db = parts[1].split("/")
        host_port = host_db[0].split(":")

        user = user_pass[0]
        password = user_pass[1]
        host = host_port[0]
        port = host_port[1] if len(host_port) > 1 else "5432"
        dbname = host_db[1]

        env = os.environ.copy()
        env["PGPASSWORD"] = password

        # Drop existing tables and recreate
        cmd = [
            "psql",
            "-h",
            host,
            "-p",
            port,
            "-U",
            user,
            "-d",
            dbname,
            "-f",
            backup_path,
        ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode == 0:
            return {"success": True, "message": f"Restored from {backup_path}"}
        else:
            return {"success": False, "error": result.stderr}

    def export_onboarding_json(self, output_path=None):
        """Export onboarding data as JSON (works with both DBs)"""
        from app.database import get_db, is_local_mode

        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"backups/onboarding_export_{timestamp}.json"

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        if is_local_mode():
            from app.models_sqlalchemy import (
                Employee,
                OnboardingState,
                OnboardingTaskProgress,
                OnboardingDocument,
                OnboardingForm,
            )
            from app.database import get_local_session

            with get_local_session() as session:
                employees = session.query(Employee).all()
                states = session.query(OnboardingState).all()
                tasks = session.query(OnboardingTaskProgress).all()
                docs = session.query(OnboardingDocument).all()
                forms = session.query(OnboardingForm).all()

                data = {
                    "exported_at": datetime.now().isoformat(),
                    "employees": [self._employee_to_dict(e) for e in employees],
                    "onboarding_states": [self._state_to_dict(s) for s in states],
                    "task_progress": [self._task_to_dict(t) for t in tasks],
                    "documents": [self._doc_to_dict(d) for d in docs],
                    "forms": [self._form_to_dict(f) for f in forms],
                }
        else:
            # Supabase export
            db = get_db()
            employees = db.table("employees").select("*").execute()
            states = db.table("onboarding_states").select("*").execute()
            docs = db.table("onboarding_documents").select("*").execute()
            forms = db.table("onboarding_forms").select("*").execute()

            data = {
                "exported_at": datetime.now().isoformat(),
                "employees": employees.data if employees.data else [],
                "onboarding_states": states.data if states.data else [],
                "documents": docs.data if docs.data else [],
                "forms": forms.data if forms.data else [],
            }

        with open(output_path, "w") as f:
            json.dump(data, f, indent=2, default=str)

        return {
            "success": True,
            "path": output_path,
            "size": os.path.getsize(output_path),
        }

    def import_onboarding_json(self, import_path):
        """Import onboarding data from JSON"""
        if not os.path.exists(import_path):
            return {"success": False, "error": "Import file not found"}

        with open(import_path, "r") as f:
            data = json.load(f)

        from app.database import get_db, is_local_mode

        if is_local_mode():
            from app.models_sqlalchemy import (
                Employee,
                OnboardingState,
                OnboardingTaskProgress,
                OnboardingDocument,
                OnboardingForm,
            )
            from app.database import get_local_session

            with get_local_session() as session:
                # Import employees
                for emp_data in data.get("employees", []):
                    emp = Employee(**emp_data)
                    session.merge(emp)

                # Import states
                for state_data in data.get("onboarding_states", []):
                    state = OnboardingState(**state_data)
                    session.merge(state)

                # Import documents
                for doc_data in data.get("documents", []):
                    doc = OnboardingDocument(**doc_data)
                    session.merge(doc)

                # Import forms
                for form_data in data.get("forms", []):
                    form = OnboardingForm(**form_data)
                    session.merge(form)
        else:
            db = get_db()
            # Supabase import
            for emp_data in data.get("employees", []):
                db.table("employees").upsert(emp_data).execute()

            for state_data in data.get("onboarding_states", []):
                db.table("onboarding_states").upsert(state_data).execute()

            for doc_data in data.get("documents", []):
                db.table("onboarding_documents").upsert(doc_data).execute()

            for form_data in data.get("forms", []):
                db.table("onboarding_forms").upsert(form_data).execute()

        return {"success": True, "message": f"Imported from {import_path}"}

    # Helper methods for local mode
    def _employee_to_dict(self, emp):
        return {
            "id": emp.id,
            "email": emp.email,
            "full_name": emp.full_name,
            "jurisdiction": emp.jurisdiction,
            "nric": emp.nric,
            "passport_no": emp.passport_no,
            "position": emp.position,
            "department": emp.department,
            "start_date": emp.start_date.isoformat() if emp.start_date else None,
            "phone": emp.phone,
            "status": emp.status,
            "created_at": emp.created_at.isoformat() if emp.created_at else None,
        }

    def _state_to_dict(self, state):
        return {
            "id": state.id,
            "employee_id": state.employee_id,
            "offer_id": state.offer_id,
            "status": state.status.value if state.status else None,
            "progress_percentage": state.progress_percentage,
            "onboarding_completed_at": state.onboarding_completed_at.isoformat()
            if state.onboarding_completed_at
            else None,
        }

    def _task_to_dict(self, task):
        return {
            "id": task.id,
            "employee_id": task.employee_id,
            "task_id": task.task_id,
            "status": task.status.value if task.status else None,
            "completed_at": task.completed_at.isoformat()
            if task.completed_at
            else None,
            "due_date": task.due_date.isoformat() if task.due_date else None,
        }

    def _doc_to_dict(self, doc):
        return {
            "id": doc.id,
            "employee_id": doc.employee_id,
            "document_type": doc.document_type,
            "document_name": doc.document_name,
            "submitted": doc.submitted,
            "submitted_at": doc.submitted_at.isoformat() if doc.submitted_at else None,
        }

    def _form_to_dict(self, form):
        return {
            "id": form.id,
            "employee_id": form.employee_id,
            "form_type": form.form_type,
            "form_name": form.form_name,
            "completed": form.completed,
            "completed_at": form.completed_at.isoformat()
            if form.completed_at
            else None,
        }


# Flask route handlers for backup/restore
def create_backup_routes(bp):
    """Add backup/restore routes to blueprint"""
    from flask import Blueprint, jsonify, request, send_file
    import tempfile

    backup_bp = Blueprint("backup", __name__)

    @backup_bp.route("/backup/local", methods=["POST"])
    def backup_local():
        """Create local PostgreSQL backup"""
        backup = DatabaseBackup()
        result = backup.backed_local_postgres()
        return jsonify(result)

    @backup_bp.route("/backup/export-json", methods=["POST"])
    def export_json():
        """Export onboarding data as JSON"""
        backup = DatabaseBackup()
        result = backup.export_onboarding_json()
        return jsonify(result)

    @backup_bp.route("/backup/import-json", methods=["POST"])
    def import_json():
        """Import onboarding data from JSON"""
        data = request.get_json()
        import_path = data.get("path")

        if not import_path:
            return jsonify({"error": "path required"}), 400

        backup = DatabaseBackup()
        result = backup.import_onboarding_json(import_path)
        return jsonify(result)

    return backup_bp
