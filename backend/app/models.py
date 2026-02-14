from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OnboardingStatus(Enum):
    OFFER_CREATED = "offer_created"
    OFFER_SENT = "offer_sent"
    OFFER_PENDING = "offer_pending"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_REJECTED = "offer_rejected"
    DOCUMENTS_GENERATED = "documents_generated"
    FORMS_PENDING = "forms_pending"
    TRAINING_PENDING = "training_pending"
    ONBOARDING_ACTIVE = "onboarding_active"
    ONBOARDING_COMPLETE = "onboarding_complete"


class OfferResponseStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"


@dataclass
class ContractParams:
    employee_name: str = "Employee"
    position: str = "Employee"
    department: str = "General"
    jurisdiction: str = "MY"
    start_date: str = ""
    salary: float = 0.0
    nric: str = ""
    passport_no: str = ""
    employee_address: str = ""
    employee_id: str = ""
    document_type: str = "employment_contract"

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
            passport_no=data.get("passport_no", ""),
            employee_address=data.get("employee_address", ""),
            employee_id=data.get("employee_id", ""),
            document_type=data.get("document_type", "employment_contract"),
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
    jurisdiction: str
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
    salary: float = 0.0
    passport_no: str = ""
    nationality: str = ""
    date_of_birth: str = ""
    gender: str = ""
    marital_status: str = ""

    @classmethod
    def from_dict(cls, data: dict) -> "EmployeeProfile":
        required = ["email", "full_name", "jurisdiction"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        if data["jurisdiction"] not in ("MY", "SG"):
            raise ValueError("Jurisdiction must be 'MY' or 'SG'")
        return cls(**{k: data.get(k, "") for k in cls.__dataclass_fields__})


@dataclass
class OfferDetails:
    position: str
    department: str
    salary: float
    currency: str = "MYR"
    start_date: str = ""
    probation_months: int = 3
    employment_type: str = "full_time"
    work_location: str = ""
    reporting_to: str = ""
    annual_leave_days: int = 14
    medical_coverage: str = "Standard"
    bonus_details: str = "As per company policy"
    expiry_days: int = 7

    @classmethod
    def from_dict(cls, data: dict) -> "OfferDetails":
        return cls(
            position=data.get("position", ""),
            department=data.get("department", ""),
            salary=float(data.get("salary", 0)),
            currency=data.get("currency", "MYR"),
            start_date=data.get("start_date", ""),
            probation_months=int(data.get("probation_months", 3)),
            employment_type=data.get("employment_type", "full_time"),
            work_location=data.get("work_location", ""),
            reporting_to=data.get("reporting_to", ""),
            annual_leave_days=int(data.get("annual_leave_days", 14)),
            medical_coverage=data.get("medical_coverage", "Standard"),
            bonus_details=data.get("bonus_details", "As per company policy"),
            expiry_days=int(data.get("expiry_days", 7)),
        )


@dataclass
class OnboardingState:
    id: str
    employee_id: str
    offer_id: str
    status: OnboardingStatus
    employee_name: str
    email: str
    position: str
    department: str
    salary: float
    jurisdiction: str

    offer_sent_at: Optional[str] = None
    offer_expires_at: Optional[str] = None
    offer_responded_at: Optional[str] = None
    offer_response: OfferResponseStatus = OfferResponseStatus.PENDING

    rejection_reason: str = ""
    hr_notified_at: Optional[str] = None
    hr_followup_status: str = ""

    accepted_at: Optional[str] = None
    documents_generated_at: Optional[str] = None
    training_assigned_at: Optional[str] = None
    forms_completed_at: Optional[str] = None
    onboarding_completed_at: Optional[str] = None

    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> "OnboardingState":
        return cls(
            id=data.get("id", ""),
            employee_id=data.get("employee_id", ""),
            offer_id=data.get("offer_id", ""),
            status=OnboardingStatus(data.get("status", "offer_created")),
            employee_name=data.get("employee_name", ""),
            email=data.get("email", ""),
            position=data.get("position", ""),
            department=data.get("department", ""),
            salary=float(data.get("salary", 0)),
            jurisdiction=data.get("jurisdiction", "MY"),
            offer_sent_at=data.get("offer_sent_at"),
            offer_expires_at=data.get("offer_expires_at"),
            offer_responded_at=data.get("offer_responded_at"),
            offer_response=OfferResponseStatus(data.get("offer_response", "pending")),
            rejection_reason=data.get("rejection_reason", ""),
            hr_notified_at=data.get("hr_notified_at"),
            hr_followup_status=data.get("hr_followup_status", ""),
            accepted_at=data.get("accepted_at"),
            documents_generated_at=data.get("documents_generated_at"),
            training_assigned_at=data.get("training_assigned_at"),
            forms_completed_at=data.get("forms_completed_at"),
            onboarding_completed_at=data.get("onboarding_completed_at"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


@dataclass
class OnboardingChecklist:
    employee_id: str
    documents: List[dict]
    forms: List[dict]
    training: List[dict]

    @property
    def total_items(self) -> int:
        return len(self.documents) + len(self.forms) + len(self.training)

    @property
    def completed_items(self) -> int:
        completed = sum(1 for d in self.documents if d.get("completed"))
        completed += sum(1 for f in self.forms if f.get("completed"))
        completed += sum(1 for t in self.training if t.get("completed"))
        return completed

    @property
    def progress_percentage(self) -> float:
        if self.total_items == 0:
            return 0.0
        return round((self.completed_items / self.total_items) * 100, 1)
