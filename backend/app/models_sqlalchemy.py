"""
SQLAlchemy Models for Onboarding
Dual database support: Local PostgreSQL (dev) / Supabase (prod)
"""

import os
from datetime import datetime
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    Text,
    Float,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class OnboardingStatus(enum.Enum):
    OFFER_PENDING = "offer_pending"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_REJECTED = "offer_rejected"
    ONBOARDING_ACTIVE = "onboarding_active"
    ONBOARDING_COMPLETE = "onboarding_complete"


class TaskStatus(enum.Enum):
    LOCKED = "locked"
    AVAILABLE = "available"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskCategory(enum.Enum):
    DOCUMENTATION = "documentation"
    IT_SETUP = "it_setup"
    COMPLIANCE = "compliance"
    TRAINING = "training"
    CULTURE = "culture"


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    jurisdiction = Column(String(10), default="MY")  # MY, SG
    nric = Column(String(20))
    passport_no = Column(String(20))
    position = Column(String(100))
    department = Column(String(100))
    start_date = Column(DateTime)
    phone = Column(String(20))
    address = Column(Text)
    bank_name = Column(String(100))
    bank_account = Column(String(50))
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relation = Column(String(50))
    nationality = Column(String(50))
    date_of_birth = Column(DateTime)
    gender = Column(String(20))
    marital_status = Column(String(20))
    status = Column(String(50), default="onboarding")  # onboarding, active, inactive
    epf_no = Column(String(50))
    tax_id = Column(String(50))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    onboarding_state = relationship(
        "OnboardingState", back_populates="employee", uselist=False
    )
    tasks = relationship("OnboardingTaskProgress", back_populates="employee")
    documents = relationship("OnboardingDocument", back_populates="employee")
    forms = relationship("OnboardingForm", back_populates="employee")


class OnboardingState(Base):
    __tablename__ = "onboarding_states"

    id = Column(String(50), primary_key=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), unique=True)
    offer_id = Column(String(50))
    status = Column(SQLEnum(OnboardingStatus), default=OnboardingStatus.OFFER_PENDING)

    # Timestamps
    offer_sent_at = Column(DateTime)
    offer_expires_at = Column(DateTime)
    offer_responded_at = Column(DateTime)
    accepted_at = Column(DateTime)
    documents_generated_at = Column(DateTime)
    training_assigned_at = Column(DateTime)
    forms_completed_at = Column(DateTime)
    onboarding_completed_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Progress tracking
    progress_percentage = Column(Float, default=0.0)
    current_task_id = Column(String(50))

    # Relationships
    employee = relationship("Employee", back_populates="onboarding_state")


class OnboardingTaskDefinition(Base):
    """Defines all possible onboarding tasks"""

    __tablename__ = "onboarding_task_definitions"

    id = Column(String(50), primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(SQLEnum(TaskCategory))
    priority = Column(String(20), default="required")  # required, recommended, optional
    estimated_minutes = Column(Integer, default=15)
    requires_upload = Column(Boolean, default=False)
    requires_signature = Column(Boolean, default=False)
    template_id = Column(String(50))  # offer_acceptance, contract, etc.
    due_days_from_start = Column(Integer, default=7)  # Due X days from onboarding start
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class TaskDependency(Base):
    """Defines task dependencies (DAG)"""

    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), ForeignKey("onboarding_task_definitions.id"))
    depends_on_task_id = Column(
        String(50), ForeignKey("onboarding_task_definitions.id")
    )


class OnboardingTaskProgress(Base):
    """Tracks individual employee's task progress"""

    __tablename__ = "onboarding_task_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id"))
    task_id = Column(String(50), ForeignKey("onboarding_task_definitions.id"))
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.LOCKED)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    due_date = Column(DateTime)
    notes = Column(Text)
    form_data = Column(Text)  # JSON string for form submissions

    # Relationships
    employee = relationship("Employee", back_populates="tasks")
    task_definition = relationship("OnboardingTaskDefinition")


class OnboardingDocument(Base):
    """Tracks uploaded documents"""

    __tablename__ = "onboarding_documents"

    id = Column(String(50), primary_key=True)
    employee_id = Column(String(50), ForeignKey("employees.id"))
    document_type = Column(String(50))  # identity, offer, contract, etc.
    document_name = Column(String(255))
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_size = Column(Integer)
    mime_type = Column(String(100))
    submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime)
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="documents")


class OnboardingForm(Base):
    """Tracks completed forms"""

    __tablename__ = "onboarding_forms"

    id = Column(String(50), primary_key=True)
    employee_id = Column(String(50), ForeignKey("employees.id"))
    form_type = Column(String(50))  # personal_info, bank_details, tax_declaration, etc.
    form_name = Column(String(255))
    form_data = Column(Text)  # JSON string
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime)
    verified = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="forms")


class OnboardingFeedback(Base):
    """Post-onboarding feedback"""

    __tablename__ = "onboarding_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id"))
    rating_overall = Column(Integer)  # 1-5
    rating_clarity = Column(Integer)  # 1-5
    rating_support = Column(Integer)  # 1-5
    rating_tools = Column(Integer)  # 1-5
    would_recommend = Column(Boolean)
    feedback_text = Column(Text)
    suggestions = Column(Text)
    submitted_at = Column(DateTime, default=func.now())


class OnboardingBadge(Base):
    """Gamification: Badges earned"""

    __tablename__ = "onboarding_badges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id"))
    badge_type = Column(
        String(50)
    )  # first_task, half_way, completed, speed_demon, etc.
    badge_name = Column(String(100))
    badge_description = Column(Text)
    earned_at = Column(DateTime, default=func.now())


# Database connection manager
class DatabaseManager:
    _local_engine = None
    _local_session = None

    @classmethod
    def get_local_engine(cls):
        if cls._local_engine is None:
            db_url = os.environ.get(
                "LOCAL_DATABASE_URL",
                "postgresql://derivhr:derivhr_dev_password@localhost:5432/derivhr_dev",
            )
            cls._local_engine = create_engine(db_url, pool_pre_ping=True)
        return cls._local_engine

    @classmethod
    def get_local_session(cls):
        if cls._local_session is None:
            engine = cls.get_local_engine()
            Session = sessionmaker(bind=engine)
            cls._local_session = Session()
        return cls._local_session

    @classmethod
    def init_local_db(cls):
        """Initialize local PostgreSQL tables"""
        engine = cls.get_local_engine()
        Base.metadata.create_all(engine)
        return engine

    @classmethod
    def seed_default_tasks(cls):
        """Seed default onboarding tasks"""
        session = cls.get_local_session()

        default_tasks = [
            # Documentation (Phase 1-2)
            {
                "id": "doc_identity",
                "title": "Upload Identity Document",
                "description": "Upload NRIC or Passport",
                "category": "DOCUMENTATION",
                "priority": "required",
                "estimated_minutes": 5,
                "requires_upload": True,
                "order_index": 1,
                "due_days_from_start": 1,
            },
            {
                "id": "doc_personal_info",
                "title": "Complete Personal Information",
                "description": "Fill in personal details",
                "category": "DOCUMENTATION",
                "priority": "required",
                "estimated_minutes": 10,
                "order_index": 2,
                "due_days_from_start": 1,
            },
            {
                "id": "doc_offer",
                "title": "Accept Offer Letter",
                "description": "Review and sign offer letter",
                "category": "DOCUMENTATION",
                "priority": "required",
                "estimated_minutes": 10,
                "requires_signature": True,
                "template_id": "offer_acceptance",
                "order_index": 3,
                "due_days_from_start": 3,
            },
            {
                "id": "doc_contract",
                "title": "Sign Employment Contract",
                "description": "Review and sign employment contract",
                "category": "DOCUMENTATION",
                "priority": "required",
                "estimated_minutes": 15,
                "requires_signature": True,
                "template_id": "contract",
                "order_index": 4,
                "due_days_from_start": 5,
            },
            {
                "id": "doc_tax",
                "title": "Complete Tax Forms (EA/PCB)",
                "description": "Fill in tax declaration",
                "category": "DOCUMENTATION",
                "priority": "required",
                "estimated_minutes": 10,
                "order_index": 5,
                "due_days_from_start": 7,
            },
            {
                "id": "doc_bank",
                "title": "Submit Bank Details",
                "description": "Provide bank account for salary",
                "category": "DOCUMENTATION",
                "priority": "required",
                "estimated_minutes": 5,
                "order_index": 6,
                "due_days_from_start": 7,
            },
            # Compliance (Phase 3)
            {
                "id": "comp_pdpa",
                "title": "Acknowledge Data Protection Policy",
                "description": "Review and accept PDPA/GDPR",
                "category": "COMPLIANCE",
                "priority": "required",
                "estimated_minutes": 10,
                "requires_signature": True,
                "order_index": 7,
                "due_days_from_start": 10,
            },
            {
                "id": "comp_harassment",
                "title": "Complete Anti-Harassment Training",
                "description": "Mandatory workplace training",
                "category": "COMPLIANCE",
                "priority": "required",
                "estimated_minutes": 30,
                "order_index": 8,
                "due_days_from_start": 14,
            },
            {
                "id": "comp_safety",
                "title": "Health & Safety Briefing",
                "description": "Watch safety orientation",
                "category": "COMPLIANCE",
                "priority": "required",
                "estimated_minutes": 20,
                "order_index": 9,
                "due_days_from_start": 14,
            },
            # IT Setup (Phase 4)
            {
                "id": "it_policy",
                "title": "Accept IT Acceptable Use Policy",
                "description": "Read IT guidelines",
                "category": "IT_SETUP",
                "priority": "required",
                "estimated_minutes": 10,
                "requires_signature": True,
                "order_index": 10,
                "due_days_from_start": 5,
            },
            {
                "id": "it_2fa",
                "title": "Setup Two-Factor Authentication",
                "description": "Enable 2FA on accounts",
                "category": "IT_SETUP",
                "priority": "required",
                "estimated_minutes": 10,
                "order_index": 11,
                "due_days_from_start": 3,
            },
            {
                "id": "it_email",
                "title": "Configure Email & Slack",
                "description": "Setup email and join Slack",
                "category": "IT_SETUP",
                "priority": "required",
                "estimated_minutes": 15,
                "order_index": 12,
                "due_days_from_start": 3,
            },
            # Training (Phase 5)
            {
                "id": "train_overview",
                "title": "Watch Company Overview Video",
                "description": "Learn about company",
                "category": "TRAINING",
                "priority": "recommended",
                "estimated_minutes": 15,
                "order_index": 13,
                "due_days_from_start": 21,
            },
            {
                "id": "train_role",
                "title": "Complete Role-Specific Training",
                "description": "Department onboarding modules",
                "category": "TRAINING",
                "priority": "recommended",
                "estimated_minutes": 60,
                "order_index": 14,
                "due_days_from_start": 30,
            },
            # Culture (Phase 6)
            {
                "id": "culture_slack",
                "title": "Join Interest Groups on Slack",
                "description": "Find your tribes",
                "category": "CULTURE",
                "priority": "optional",
                "estimated_minutes": 5,
                "order_index": 15,
                "due_days_from_start": 14,
            },
            {
                "id": "culture_buddy",
                "title": "Schedule Coffee Chat with Buddy",
                "description": "Meet your mentor",
                "category": "CULTURE",
                "priority": "recommended",
                "estimated_minutes": 5,
                "order_index": 16,
                "due_days_from_start": 7,
            },
            {
                "id": "culture_profile",
                "title": "Complete Your Profile",
                "description": "Add photo and bio",
                "category": "CULTURE",
                "priority": "optional",
                "estimated_minutes": 10,
                "order_index": 17,
                "due_days_from_start": 14,
            },
            {
                "id": "culture_org_chart",
                "title": "Explore Org Chart",
                "description": "Know the team structure",
                "category": "CULTURE",
                "priority": "optional",
                "estimated_minutes": 10,
                "order_index": 18,
                "due_days_from_start": 21,
            },
            {
                "id": "culture_team_intro",
                "title": "Meet Your Team",
                "description": "Video intro with team",
                "category": "CULTURE",
                "priority": "recommended",
                "estimated_minutes": 15,
                "order_index": 19,
                "due_days_from_start": 7,
            },
        ]

        for task_data in default_tasks:
            existing = (
                session.query(OnboardingTaskDefinition)
                .filter_by(id=task_data["id"])
                .first()
            )
            if not existing:
                task = OnboardingTaskDefinition(**task_data)
                session.add(task)

        # Add dependencies (DAG)
        dependencies = [
            # After personal info, unlock offer, contract, tax, bank
            ("doc_personal_info", "doc_identity"),
            ("doc_offer", "doc_personal_info"),
            ("doc_contract", "doc_personal_info"),
            ("doc_tax", "doc_personal_info"),
            ("doc_bank", "doc_personal_info"),
            # Compliance after documentation
            ("comp_pdpa", "doc_contract"),
            ("comp_harassment", "comp_pdpa"),
            ("comp_safety", "comp_pdpa"),
            # IT after compliance
            ("it_policy", "comp_pdpa"),
            ("it_2fa", "it_policy"),
            ("it_email", "it_2fa"),
            # Training after IT
            ("train_overview", "it_email"),
            ("train_role", "train_overview"),
            # Culture can start anytime after personal info
            ("culture_slack", "doc_personal_info"),
            ("culture_buddy", "doc_personal_info"),
            ("culture_profile", "doc_personal_info"),
            ("culture_org_chart", "doc_personal_info"),
            ("culture_team_intro", "doc_personal_info"),
        ]

        for task_id, depends_on in dependencies:
            existing_dep = (
                session.query(TaskDependency)
                .filter_by(task_id=task_id, depends_on_task_id=depends_on)
                .first()
            )
            if not existing_dep:
                dep = TaskDependency(task_id=task_id, depends_on_task_id=depends_on)
                session.add(dep)

        session.commit()
        session.close()
