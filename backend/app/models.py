from dataclasses import dataclass
from typing import Optional


@dataclass
class ContractParams:
    employee_name: str = "Employee"
    position: str = "Employee"
    department: str = "General"
    jurisdiction: str = "MY"  # "MY" or "SG"
    start_date: str = ""
    salary: float = 0.0
    nric: str = ""
    employee_address: str = ""
    employee_id: str = ""

    @classmethod
    def from_dict(cls, data: dict) -> "ContractParams":
        from datetime import date
        jurisdiction = data.get("jurisdiction", "MY")
        if jurisdiction not in ("MY", "SG"):
            jurisdiction = "MY"
        return cls(
            employee_name=data.get("employee_name") or "Employee",
            position=data.get("position") or "Employee",
            department=data.get("department") or "General",
            jurisdiction=jurisdiction,
            start_date=data.get("start_date") or date.today().isoformat(),
            salary=float(data["salary"]) if data.get("salary") else 0.0,
            nric=data.get("nric", ""),
            employee_address=data.get("employee_address", ""),
            employee_id=data.get("employee_id", ""),
        )


@dataclass
class ChatMessage:
    role: str
    content: str
    sources: Optional[list] = None
    created_at: Optional[str] = None


@dataclass
class GeneratedDocument:
    id: str
    document_type: str
    jurisdiction: str
    employee_name: str
    file_path: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class EmployeeProfile:
    email: str
    full_name: str
    jurisdiction: str  # "MY" or "SG"
    nric: str = ""
    position: str = ""
    department: str = ""
    start_date: str = ""
    phone: str = ""
    address: str = ""
    bank_name: str = ""
    bank_account: str = ""
    emergency_contact_name: str = ""
    emergency_contact_phone: str = ""
    emergency_contact_relation: str = ""

    @classmethod
    def from_dict(cls, data: dict) -> "EmployeeProfile":
        required = ["email", "full_name", "jurisdiction"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        if data["jurisdiction"] not in ("MY", "SG"):
            raise ValueError("Jurisdiction must be 'MY' or 'SG'")
        return cls(**{k: data.get(k, "") for k in cls.__dataclass_fields__})
