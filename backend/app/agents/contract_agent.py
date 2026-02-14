import uuid
import datetime
import os
from pathlib import Path
from .messaging import AgentMessage, AgentResponse
from app.document_generator import generate_contract
from app.models import ContractParams

class ContractAgent:
    def receive_message(self, message: AgentMessage) -> AgentResponse:
        action = message.payload.get("action")
        
        if action == "generate_document_package":
            return self._generate_document_package(message.context)
            
        return AgentResponse(payload={"success": False, "error": f"Unknown action: {action}"})

    def _generate_document_package(self, context: dict) -> AgentResponse:
        try:
            employee_data = context.get("employee_data", {})
            employee_name = context.get("employee_name")
            jurisdiction = context.get("jurisdiction", "MY")
            start_date = employee_data.get("start_date", datetime.date.today().isoformat())
            
            # Create contract params
            params = ContractParams(
                employee_name=employee_name,
                position=employee_data.get("position", "Employee"),
                department=employee_data.get("department", "General"),
                jurisdiction=jurisdiction,
                start_date=start_date,
                salary=float(employee_data.get("salary", 0)),
                nric=employee_data.get("nric", ""),
                employee_address=employee_data.get("address", ""),
                employee_id=context.get("employee_id")
            )
            
            # Directories
            from flask import current_app
            try:
                template_dir = current_app.config["TEMPLATE_DIR"]
                output_dir = current_app.config["GENERATED_DOCS_DIR"]
            except:
                # Fallback if outside app context (e.g. testing)
                base_dir = Path(__file__).resolve().parent.parent.parent
                template_dir = base_dir / "templates"
                output_dir = base_dir / "instance" / "generated_documents"

            # Generate Contract
            doc_id, file_path = generate_contract(params, template_dir, output_dir)
            
            documents = [{
                "contract_id": doc_id,
                "document_type": "employment_contract",
                "file_path": file_path,
                "success": True
            }]
            
            return AgentResponse(payload={
                "success": True,
                "data": {
                    "documents": documents
                }
            })
            
        except Exception as e:
            return AgentResponse(payload={
                "success": False,
                "error": str(e)
            })
