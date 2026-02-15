"""
HR Query Service

Converts intent filters into actual Supabase queries and aggregates results.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from .database import HRDatabase

logger = logging.getLogger(__name__)


class HRQueryService:
    """Handles all HR-related database queries"""
    
    def __init__(self, database: HRDatabase):
        """
        Initialize query service.
        
        Args:
            database: HRDatabase instance
        """
        self.db = database
    
    def execute_query(self, intent: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute query based on intent and filters.
        
        Args:
            intent: The detected intent type
            filters: Query filters extracted from user message
            
        Returns:
            Dict with query results and metadata
        """
        try:
            if intent == "count_onboarding":
                return self._query_onboarding_count(filters)
            elif intent == "onboarding_status":
                return self._query_onboarding_status(filters)
            elif intent == "training_progress":
                return self._query_training_progress(filters)
            elif intent == "training_delayed":
                return self._query_training_delayed(filters)
            elif intent == "employee_list":
                return self._query_employee_list(filters)
            elif intent == "document_status":
                return self._query_document_status(filters)
            elif intent == "daily_summary":
                return self._query_daily_summary(filters)
            else:
                return {"error": f"Unknown intent: {intent}", "data": []}
                
        except Exception as e:
            logger.error(f"Error executing query for intent {intent}: {e}")
            return {"error": str(e), "data": []}
    
    def _query_onboarding_count(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Get count of employees in onboarding"""
        employees = self.db.get_all_employees(status=filters.get("status"))
        
        # Apply time range filter if specified
        if filters.get("time_range"):
            employees = self._filter_by_time_range(employees, filters["time_range"], "created_at")
        
        return {
            "intent": "count_onboarding",
            "count": len(employees),
            "total_employees": len(self.db.get_all_users(role="employee")),
            "data": employees,
            "filters_applied": filters
        }
    
    def _query_onboarding_status(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed onboarding status"""
        employees = self.db.get_all_employees()
        
        # Filter by time range
        if filters.get("time_range"):
            employees = self._filter_by_time_range(employees, filters["time_range"], "created_at")
        
        # Filter by delayed status
        if filters.get("delayed"):
            employees = self._filter_delayed_onboarding(employees)
        
        # Get onboarding documents for each employee
        detailed_data = []
        for emp in employees:
            emp_id = emp.get("id")
            docs = self.db.get_onboarding_documents(employee_id=emp_id)
            
            total_docs = len(docs)
            submitted_docs = len([d for d in docs if d.get("submitted")])
            progress = (submitted_docs / total_docs * 100) if total_docs > 0 else 0
            
            # Check if delayed (created more than 14 days ago and progress < 80%)
            created_at = emp.get("created_at")
            days_since_created = self._days_since(created_at) if created_at else 0
            is_delayed = days_since_created > 14 and progress < 80
            
            detailed_data.append({
                **emp,
                "total_documents": total_docs,
                "submitted_documents": submitted_docs,
                "progress_percentage": round(progress, 1),
                "days_since_created": days_since_created,
                "is_delayed": is_delayed,
                "missing_documents": [d for d in docs if not d.get("submitted")]
            })
        
        return {
            "intent": "onboarding_status",
            "count": len(detailed_data),
            "data": detailed_data,
            "filters_applied": filters
        }
    
    def _query_training_progress(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Get training progress metrics"""
        assignments = self.db.get_training_assignments()
        
        # Apply time range filter
        if filters.get("time_range"):
            assignments = self._filter_by_time_range(assignments, filters["time_range"], "assigned_at")
        
        # Process training data
        detailed_data = []
        for assignment in assignments:
            employee_id = assignment.get("employee_id")
            training_data = assignment.get("training_data", [])
            
            # Get employee details
            users = self.db.get_all_users()
            employee = next((u for u in users if u.get("id") == employee_id), {})
            
            total_items = len(training_data)
            completed_items = len([t for t in training_data if t.get("status") == "completed"])
            progress = (completed_items / total_items * 100) if total_items > 0 else 0
            
            # Check if completed filter applies
            is_completed = progress >= 100
            if filters.get("completed") is not None:
                if filters["completed"] != is_completed:
                    continue
            
            detailed_data.append({
                "employee_id": employee_id,
                "employee_name": employee.get("first_name", "") + " " + employee.get("last_name", ""),
                "department": employee.get("department", "N/A"),
                "total_training_items": total_items,
                "completed_items": completed_items,
                "progress_percentage": round(progress, 1),
                "is_completed": is_completed,
                "training_template": assignment.get("training_template"),
                "assigned_at": assignment.get("assigned_at"),
                "last_synced_at": assignment.get("last_synced_at")
            })
        
        return {
            "intent": "training_progress",
            "count": len(detailed_data),
            "data": detailed_data,
            "filters_applied": filters
        }
    
    def _query_training_delayed(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Find employees with delayed/incomplete training"""
        assignments = self.db.get_training_assignments()
        
        delayed_data = []
        for assignment in assignments:
            employee_id = assignment.get("employee_id")
            training_data = assignment.get("training_data", [])
            assigned_at = assignment.get("assigned_at")
            
            total_items = len(training_data)
            completed_items = len([t for t in training_data if t.get("status") == "completed"])
            progress = (completed_items / total_items * 100) if total_items > 0 else 0
            
            # Consider delayed if assigned more than 30 days ago and progress < 80%
            days_since_assigned = self._days_since(assigned_at) if assigned_at else 0
            is_delayed = days_since_assigned > 30 and progress < 80
            
            if is_delayed:
                users = self.db.get_all_users()
                employee = next((u for u in users if u.get("id") == employee_id), {})
                
                incomplete_items = [t for t in training_data if t.get("status") != "completed"]
                
                delayed_data.append({
                    "employee_id": employee_id,
                    "employee_name": employee.get("first_name", "") + " " + employee.get("last_name", ""),
                    "department": employee.get("department", "N/A"),
                    "progress_percentage": round(progress, 1),
                    "days_since_assigned": days_since_assigned,
                    "incomplete_count": len(incomplete_items),
                    "incomplete_items": incomplete_items[:5],  # First 5 for brevity
                    "assigned_at": assigned_at
                })
        
        return {
            "intent": "training_delayed",
            "count": len(delayed_data),
            "data": delayed_data,
            "filters_applied": filters
        }
    
    def _query_employee_list(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """List employees with optional filters"""
        users = self.db.get_all_users(role="employee")
        
        # Filter by department if specified
        if filters.get("department"):
            users = [u for u in users if u.get("department", "").lower() == filters["department"].lower()]
        
        # Apply time range for recently added employees
        if filters.get("time_range"):
            users = self._filter_by_time_range(users, filters["time_range"], "created_at")
        
        return {
            "intent": "employee_list",
            "count": len(users),
            "data": users,
            "filters_applied": filters
        }
    
    def _query_document_status(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Get document submission status"""
        docs = self.db.get_onboarding_documents()
        
        # Filter by submission status
        if filters.get("submitted") is not None:
            docs = [d for d in docs if d.get("submitted") == filters["submitted"]]
        
        # Group by employee
        employee_docs = {}
        for doc in docs:
            emp_id = doc.get("employee_id")
            if emp_id not in employee_docs:
                employee_docs[emp_id] = []
            employee_docs[emp_id].append(doc)
        
        summary_data = []
        users = self.db.get_all_users()
        
        for emp_id, emp_docs in employee_docs.items():
            employee = next((u for u in users if u.get("id") == emp_id), {})
            total = len(emp_docs)
            submitted = len([d for d in emp_docs if d.get("submitted")])
            
            summary_data.append({
                "employee_id": emp_id,
                "employee_name": employee.get("first_name", "") + " " + employee.get("last_name", ""),
                "total_documents": total,
                "submitted_documents": submitted,
                "pending_documents": total - submitted,
                "progress_percentage": round((submitted / total * 100) if total > 0 else 0, 1)
            })
        
        return {
            "intent": "document_status",
            "count": len(summary_data),
            "data": summary_data,
            "filters_applied": filters
        }
    
    def _query_daily_summary(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Get comprehensive daily HR summary"""
        # Get all metrics
        onboarding_result = self._query_onboarding_count({"status": "in_progress"})
        training_result = self._query_training_progress({})
        delayed_onboarding = self._query_onboarding_status({"delayed": True})
        delayed_training = self._query_training_delayed({})
        
        # Today's new employees
        new_today = self._filter_by_time_range(
            self.db.get_all_employees(), 
            "today", 
            "created_at"
        )
        
        summary = {
            "intent": "daily_summary",
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "metrics": {
                "total_employees": onboarding_result.get("total_employees", 0),
                "onboarding_in_progress": onboarding_result.get("count", 0),
                "new_employees_today": len(new_today),
                "training_assignments": training_result.get("count", 0),
                "delayed_onboarding_cases": delayed_onboarding.get("count", 0),
                "delayed_training_cases": delayed_training.get("count", 0)
            },
            "new_employees": new_today,
            "delayed_cases": {
                "onboarding": delayed_onboarding.get("data", [])[:3],
                "training": delayed_training.get("data", [])[:3]
            }
        }
        
        return summary
    
    # --- Helper Methods ---
    
    def _filter_by_time_range(
        self, 
        items: List[Dict[str, Any]], 
        time_range: str, 
        date_field: str
    ) -> List[Dict[str, Any]]:
        """Filter items by time range"""
        now = datetime.now(timezone.utc)
        
        if time_range == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "this_week":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "this_month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            return items
        
        filtered = []
        for item in items:
            date_str = item.get(date_field)
            if date_str:
                try:
                    item_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    if item_date >= start:
                        filtered.append(item)
                except:
                    pass
        
        return filtered
    
    def _filter_delayed_onboarding(self, employees: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter employees with delayed onboarding (created >14 days ago)"""
        delayed = []
        for emp in employees:
            created_at = emp.get("created_at")
            if created_at and self._days_since(created_at) > 14:
                delayed.append(emp)
        return delayed
    
    def _days_since(self, date_str: str) -> int:
        """Calculate days since a date string"""
        try:
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            return (now - date).days
        except:
            return 0
