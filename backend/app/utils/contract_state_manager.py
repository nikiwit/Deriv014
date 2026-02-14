"""
Contract Collection State Manager

Handles all state operations for contract data collection:
- Reading/writing collection_state in chat_sessions
- Template file operations
- Data synchronization across DB and files
"""

import json
import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import logging

from app.database import get_db

logger = logging.getLogger(__name__)

# Base directory for temp files
_BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMP_DIR = _BASE_DIR / "temp_data"
TEMP_DIR.mkdir(exist_ok=True)


class ContractStateManager:
    """Manages contract data collection state across database and files."""
    
    def __init__(self, session_id: str, user_id: str):
        """
        Initialize the state manager.
        
        Args:
            session_id: Active chat session ID
            user_id: Employee/user ID
        """
        self.session_id = session_id
        self.user_id = user_id
        self.template_path = TEMP_DIR / f"{user_id}_contract_template.json"
        self.contract_path = TEMP_DIR / f"{user_id}_contract.json"
        self.db = get_db()
    
    def initialize_collection(self, jurisdiction: str, initial_data: Optional[Dict] = None) -> Dict:
        """
        Start new collection: set flag, create template, init state.
        
        Args:
            jurisdiction: MY or SG
            initial_data: Pre-populated data (e.g., from RAG or users table)
            
        Returns:
            dict with status and initial collection state
        """
        try:
            # Create initial template file
            template_data = {
                "employee_id": self.user_id,
                "session_id": self.session_id,
                "status": "collecting_data",
                "jurisdiction": jurisdiction,
                "created_at": datetime.datetime.now().isoformat(),
                "last_updated": datetime.datetime.now().isoformat(),
                "personal_details": {
                    "fullName": None,
                    "nric": None,
                    "nationality": None,
                    "dateOfBirth": None
                },
                "banking_details": {
                    "bankName": None,
                    "accountHolder": None,
                    "accountNumber": None
                },
                "employment_details": {
                    "position_title": None,
                    "department": None,
                    "start_date": None,
                    "salary": None
                },
                "collection_progress": {
                    "total_fields": 10,
                    "collected_fields": 0,
                    "missing_fields": []
                }
            }
            
            # Merge initial data if provided
            if initial_data:
                for section in ["personal_details", "banking_details", "employment_details"]:
                    for field_key, value in initial_data.items():
                        if field_key in template_data.get(section, {}):
                            template_data[section][field_key] = value
                            template_data["collection_progress"]["collected_fields"] += 1
            
            # Write template file
            with open(self.template_path, "w", encoding="utf-8") as f:
                json.dump(template_data, f, indent=2, ensure_ascii=False)
            
            # Initialize collection state in database
            collection_state = {
                "collecting_field": None,
                "missing_fields": [],
                "collected_data": initial_data or {},
                "template_file_path": str(self.template_path),
                "started_at": datetime.datetime.now().isoformat(),
                "last_updated": datetime.datetime.now().isoformat(),
                "resume_count": 0
            }
            
            # Set active_contract_negotiation flag and save state
            self.db.table("chat_sessions").update({
                "active_contract_negotiation": True,
                "contract_employee_id": str(self.user_id),
                "contract_collection_state": json.dumps(collection_state)
            }).eq("id", self.session_id).execute()
            
            logger.info(f"Initialized contract collection for user {self.user_id}, session {self.session_id}")
            
            return {
                "status": "initialized",
                "template_path": str(self.template_path),
                "collection_state": collection_state
            }
            
        except Exception as e:
            logger.error(f"Failed to initialize collection: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def get_state(self) -> Optional[Dict]:
        """
        Load collection state from chat_sessions.
        
        Returns:
            Collection state dict or None if not found
        """
        try:
            result = self.db.table("chat_sessions").select("contract_collection_state").eq("id", self.session_id).execute()
            
            if result.data and result.data[0].get("contract_collection_state"):
                state = json.loads(result.data[0]["contract_collection_state"])
                return state
            
            return None
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse collection state JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to get collection state: {e}")
            return None
    
    def update_collected_field(
        self, 
        field_key: str, 
        value: Any, 
        field_schema: Optional[Dict] = None,
        section: str = "personal_details"
    ) -> Dict:
        """
        Triple update: state + users table + template file.
        
        Args:
            field_key: Field key (e.g., "fullName", "nric")
            value: Validated field value
            field_schema: Schema definition for validation
            section: Template section (personal_details, banking_details, employment_details)
            
        Returns:
            dict with update status
        """
        try:
            # 1. Update collection state in database
            collection_state = self.get_state()
            if not collection_state:
                return {
                    "status": "error",
                    "error": "No active collection state found"
                }
            
            collection_state["collected_data"][field_key] = value
            collection_state["last_updated"] = datetime.datetime.now().isoformat()
            
            # Remove field from missing_fields if present
            collection_state["missing_fields"] = [
                f for f in collection_state.get("missing_fields", [])
                if f.get("key") != field_key
            ]
            
            # Update database
            self.db.table("chat_sessions").update({
                "contract_collection_state": json.dumps(collection_state)
            }).eq("id", self.session_id).execute()
            
            # 2. Update users table
            db_field_map = {
                "fullName": None,  # Special handling
                "nric": "nric",
                "nationality": "nationality",
                "dateOfBirth": "date_of_birth",
                "bankName": "bank_name",
                "accountHolder": "bank_account_holder",
                "accountNumber": "bank_account_number",
                "position_title": "position_title",
                "department": "department",
                "start_date": "start_date",
                "salary": "salary"
            }
            
            if field_key == "fullName":
                # Split into first_name and last_name
                parts = str(value).split(maxsplit=1)
                self.db.table("users").update({
                    "first_name": parts[0],
                    "last_name": parts[1] if len(parts) > 1 else ""
                }).eq("id", self.user_id).execute()
            elif field_key in db_field_map and db_field_map[field_key]:
                self.db.table("users").update({
                    db_field_map[field_key]: value
                }).eq("id", self.user_id).execute()
            
            # 3. Update template file
            if self.template_path.exists():
                with open(self.template_path, "r", encoding="utf-8") as f:
                    template_data = json.load(f)
                
                if section in template_data and field_key in template_data[section]:
                    template_data[section][field_key] = value
                    template_data["last_updated"] = datetime.datetime.now().isoformat()
                    template_data["collection_progress"]["collected_fields"] = len(
                        [v for section_data in [template_data.get("personal_details", {}),
                                                 template_data.get("banking_details", {}),
                                                 template_data.get("employment_details", {})]
                         for v in section_data.values() if v is not None]
                    )
                    
                    # Update missing fields list
                    all_fields = (list(template_data.get("personal_details", {}).keys()) +
                                  list(template_data.get("banking_details", {}).keys()) +
                                  list(template_data.get("employment_details", {}).keys()))
                    missing = []
                    for section_name, section_data in [("personal_details", template_data.get("personal_details", {})),
                                                         ("banking_details", template_data.get("banking_details", {})),
                                                         ("employment_details", template_data.get("employment_details", {}))]:
                        for key, val in section_data.items():
                            if val is None:
                                missing.append(key)
                    
                    template_data["collection_progress"]["missing_fields"] = missing
                    
                    with open(self.template_path, "w", encoding="utf-8") as f:
                        json.dump(template_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Updated field '{field_key}' for user {self.user_id} (triple update successful)")
            
            return {
                "status": "updated",
                "field": field_key,
                "value": value,
                "collected_count": len(collection_state["collected_data"]),
                "remaining_fields": len(collection_state.get("missing_fields", []))
            }
            
        except Exception as e:
            logger.error(f"Failed to update field '{field_key}': {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def finalize_collection(self) -> Dict:
        """
        Complete collection: rename template to contract, clear state.
        
        Returns:
            dict with finalization status
        """
        try:
            # Verify template file exists
            if not self.template_path.exists():
                return {
                    "status": "error",
                    "error": "Template file not found"
                }
            
            # Load template and verify all required fields are present
            with open(self.template_path, "r", encoding="utf-8") as f:
                template_data = json.load(f)
            
            missing = template_data.get("collection_progress", {}).get("missing_fields", [])
            if missing:
                return {
                    "status": "error",
                    "error": f"Cannot finalize: missing fields {missing}"
                }
            
            # Update template status
            template_data["status"] = "ready_for_signature"
            template_data["finalized_at"] = datetime.datetime.now().isoformat()
            
            # Rename template to final contract file
            with open(self.contract_path, "w", encoding="utf-8") as f:
                json.dump(template_data, f, indent=2, ensure_ascii=False)
            
            # Remove template file
            self.template_path.unlink()
            
            # Clear collection state but keep negotiation active
            self.db.table("chat_sessions").update({
                "contract_collection_state": None
            }).eq("id", self.session_id).execute()
            
            logger.info(f"Finalized contract for user {self.user_id}")
            
            return {
                "status": "finalized",
                "contract_path": str(self.contract_path),
                "contract_data": template_data
            }
            
        except Exception as e:
            logger.error(f"Failed to finalize collection: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def resume_collection(self) -> Dict:
        """
        Resume from existing state.
        
        Returns:
            dict with resume status and next action
        """
        try:
            collection_state = self.get_state()
            
            if not collection_state:
                return {
                    "status": "no_state",
                    "message": "No existing collection state found"
                }
            
            # Increment resume count
            collection_state["resume_count"] = collection_state.get("resume_count", 0) + 1
            collection_state["last_resumed"] = datetime.datetime.now().isoformat()
            
            # Update database
            self.db.table("chat_sessions").update({
                "contract_collection_state": json.dumps(collection_state)
            }).eq("id", self.session_id).execute()
            
            collected_count = len(collection_state.get("collected_data", {}))
            missing_fields = collection_state.get("missing_fields", [])
            
            logger.info(f"Resumed collection for user {self.user_id} (resume count: {collection_state['resume_count']})")
            
            return {
                "status": "resumed",
                "collected_count": collected_count,
                "remaining_fields": missing_fields,
                "collected_data": collection_state.get("collected_data", {}),
                "resume_count": collection_state["resume_count"]
            }
            
        except Exception as e:
            logger.error(f"Failed to resume collection: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def clear_state(self) -> Dict:
        """
        Clear all collection state (for cancellation or errors).
        
        Returns:
            dict with clear status
        """
        try:
            # Remove template file if exists
            if self.template_path.exists():
                self.template_path.unlink()
            
            # Clear database state
            self.db.table("chat_sessions").update({
                "active_contract_negotiation": False,
                "contract_employee_id": None,
                "contract_collection_state": None
            }).eq("id", self.session_id).execute()
            
            logger.info(f"Cleared collection state for user {self.user_id}")
            
            return {
                "status": "cleared"
            }
            
        except Exception as e:
            logger.error(f"Failed to clear state: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def load_template(self) -> Optional[Dict]:
        """
        Load template file if it exists.
        
        Returns:
            Template data dict or None
        """
        try:
            if self.template_path.exists():
                with open(self.template_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            return None
        except Exception as e:
            logger.error(f"Failed to load template: {e}")
            return None
    
    def load_contract(self) -> Optional[Dict]:
        """
        Load finalized contract file if it exists.
        
        Returns:
            Contract data dict or None
        """
        try:
            if self.contract_path.exists():
                with open(self.contract_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            return None
        except Exception as e:
            logger.error(f"Failed to load contract: {e}")
            return None
