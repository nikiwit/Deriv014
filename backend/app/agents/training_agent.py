"""
Training Agent for DerivHR

Specializes in:
- Training recommendations
- Certification tracking
- Onboarding training programs
- Skill gap analysis
- Learning path generation
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .base import BaseAgent, CrossCheckResult, ValidationResult


class TrainingAgent(BaseAgent):
    """
    Learning & Development Specialist

    Capabilities:
    - Recommend training programs based on role
    - Track certifications and expiry dates
    - Generate onboarding training plans
    - Analyze skill gaps
    - Create personalized learning paths
    """

    TRAINING_CATALOG = {
        "onboarding": {
            "mandatory": [
                {
                    "id": "company_orientation",
                    "name": "Company Orientation",
                    "duration_hours": 4,
                    "deadline_days": 7,
                    "format": "in_person",
                },
                {
                    "id": "policy_training",
                    "name": "Company Policy Training",
                    "duration_hours": 2,
                    "deadline_days": 14,
                    "format": "online",
                },
                {
                    "id": "it_security",
                    "name": "IT Security & Data Protection",
                    "duration_hours": 2,
                    "deadline_days": 14,
                    "format": "online",
                },
                {
                    "id": "workplace_safety",
                    "name": "Workplace Safety",
                    "duration_hours": 1,
                    "deadline_days": 7,
                    "format": "online",
                },
            ],
            "recommended": [
                {
                    "id": "communication_skills",
                    "name": "Effective Communication",
                    "duration_hours": 4,
                    "deadline_days": 30,
                    "format": "online",
                }
            ],
        },
        "compliance": {
            "mandatory": [
                {
                    "id": "epf_socso_awareness",
                    "name": "EPF/SOCSO Awareness",
                    "duration_hours": 2,
                    "deadline_days": 30,
                    "format": "online",
                },
                {
                    "id": "anti_harassment",
                    "name": "Anti-Harassment Training",
                    "duration_hours": 2,
                    "deadline_days": 30,
                    "format": "online",
                },
            ]
        },
        "technical": {
            "engineering": [
                {
                    "id": "code_quality",
                    "name": "Code Quality Standards",
                    "duration_hours": 8,
                    "deadline_days": 60,
                    "format": "online",
                },
                {
                    "id": "git_workflow",
                    "name": "Git Workflow & Best Practices",
                    "duration_hours": 4,
                    "deadline_days": 30,
                    "format": "online",
                },
            ],
            "hr": [
                {
                    "id": "hr_systems",
                    "name": "HR Systems Training",
                    "duration_hours": 8,
                    "deadline_days": 30,
                    "format": "in_person",
                }
            ],
        },
        "leadership": [
            {
                "id": "leadership_fundamentals",
                "name": "Leadership Fundamentals",
                "duration_hours": 16,
                "deadline_days": 90,
                "format": "workshop",
            }
        ],
    }

    CERTIFICATION_TRACKING = {
        "first_aid": {"validity_years": 3, "reminder_months": 3},
        "fire_safety": {"validity_years": 2, "reminder_months": 2},
        "data_protection": {"validity_years": 1, "reminder_months": 1},
    }

    def __init__(self):
        super().__init__("training_agent", "Learning & Development Specialist")
        self.cross_check_agents = ["onboarding_agent"]

    @property
    def capabilities(self) -> List[str]:
        return [
            "training_recommendations",
            "certification_tracking",
            "onboarding_training",
            "skill_gap_analysis",
            "learning_path_generation",
            "training_compliance_check",
        ]

    def _register_handlers(self):
        self._message_handlers = {
            "get_onboarding_training": self._get_onboarding_training,
            "recommend_training": self._recommend_training,
            "track_certification": self._track_certification,
            "analyze_skill_gaps": self._analyze_skill_gaps,
            "generate_learning_path": self._generate_learning_path,
            "check_training_compliance": self._check_training_compliance,
            "get_training_schedule": self._get_training_schedule,
        }

    def _get_onboarding_training(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Get training plan for new employee onboarding."""
        department = payload.get("department", "general")
        position = payload.get("position", "employee")
        start_date = payload.get("start_date", datetime.now().isoformat())

        mandatory = self.TRAINING_CATALOG["onboarding"]["mandatory"].copy()
        recommended = self.TRAINING_CATALOG["onboarding"]["recommended"].copy()

        if department.lower() in ["engineering", "tech", "development"]:
            mandatory.extend(self.TRAINING_CATALOG["technical"]["engineering"])
        elif department.lower() == "hr":
            mandatory.extend(self.TRAINING_CATALOG["technical"]["hr"])

        compliance_training = self.TRAINING_CATALOG["compliance"]["mandatory"]
        mandatory.extend(compliance_training)

        schedule = self._create_training_schedule(mandatory, start_date)

        return {
            "success": True,
            "data": {
                "department": department,
                "position": position,
                "mandatory_training": mandatory,
                "recommended_training": recommended,
                "training_schedule": schedule,
                "total_hours": sum(t["duration_hours"] for t in mandatory),
                "estimated_completion": schedule[-1]["deadline"] if schedule else None,
            },
        }

    def _recommend_training(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Recommend training based on role and skills."""
        role = payload.get("role", "")
        department = payload.get("department", "")
        current_skills = payload.get("current_skills", [])
        career_goal = payload.get("career_goal", "")

        recommendations = []

        if career_goal and "leadership" in career_goal.lower():
            recommendations.extend(self.TRAINING_CATALOG["leadership"])

        if department.lower() in ["engineering", "tech"]:
            technical_training = self.TRAINING_CATALOG["technical"]["engineering"]
            for t in technical_training:
                if t["id"] not in current_skills:
                    recommendations.append(t)

        return {
            "success": True,
            "data": {
                "recommendations": recommendations[:5],
                "reason": f"Based on role: {role}, department: {department}",
                "priority": ["mandatory", "role_specific", "career_development"],
            },
        }

    def _track_certification(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Track and manage certifications."""
        action = payload.get("action", "add")
        employee_id = payload.get("employee_id", "")
        certification = payload.get("certification", {})

        if action == "add":
            cert_type = certification.get("type", "")
            issued_date = certification.get("issued_date", datetime.now().isoformat())

            if cert_type in self.CERTIFICATION_TRACKING:
                validity = self.CERTIFICATION_TRACKING[cert_type]["validity_years"]
                reminder_months = self.CERTIFICATION_TRACKING[cert_type][
                    "reminder_months"
                ]

                issued = datetime.fromisoformat(issued_date)
                expiry = issued + timedelta(days=validity * 365)
                reminder = expiry - timedelta(days=reminder_months * 30)

                return {
                    "success": True,
                    "data": {
                        "certification": cert_type,
                        "issued_date": issued_date,
                        "expiry_date": expiry.isoformat(),
                        "reminder_date": reminder.isoformat(),
                        "validity_years": validity,
                        "status": "active",
                    },
                }

        elif action == "check_expiry":
            certifications = payload.get("certifications", [])
            expiring = []

            for cert in certifications:
                expiry = datetime.fromisoformat(cert.get("expiry_date", ""))
                if (expiry - datetime.now()).days <= 90:
                    expiring.append(cert)

            return {
                "success": True,
                "data": {
                    "expiring_certifications": expiring,
                    "action_required": len(expiring) > 0,
                },
            }

        return {"success": False, "errors": ["Unknown action"]}

    def _analyze_skill_gaps(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Analyze skill gaps for an employee."""
        current_skills = set(payload.get("current_skills", []))
        required_skills = set(payload.get("required_skills", []))
        role = payload.get("role", "")

        gaps = required_skills - current_skills

        recommendations = []
        for gap in gaps:
            for category, trainings in self.TRAINING_CATALOG.items():
                if isinstance(trainings, list):
                    for t in trainings:
                        if gap.lower() in t["name"].lower():
                            recommendations.append(t)
                elif isinstance(trainings, dict):
                    for sub_trainings in trainings.values():
                        if isinstance(sub_trainings, list):
                            for t in sub_trainings:
                                if gap.lower() in t["name"].lower():
                                    recommendations.append(t)

        return {
            "success": True,
            "data": {
                "role": role,
                "current_skills": list(current_skills),
                "required_skills": list(required_skills),
                "skill_gaps": list(gaps),
                "training_recommendations": recommendations[:5],
                "gap_percentage": len(gaps) / len(required_skills) * 100
                if required_skills
                else 0,
            },
        }

    def _generate_learning_path(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Generate a personalized learning path."""
        employee_level = payload.get("level", "entry")
        career_goal = payload.get("career_goal", "")
        timeline_months = payload.get("timeline_months", 12)

        path = []
        current_month = 0

        path.append(
            {
                "phase": 1,
                "name": "Foundation",
                "duration_months": 1,
                "trainings": self.TRAINING_CATALOG["onboarding"]["mandatory"],
                "start_month": current_month,
            }
        )
        current_month += 1

        if career_goal and "leadership" in career_goal.lower():
            path.append(
                {
                    "phase": 2,
                    "name": "Leadership Development",
                    "duration_months": 3,
                    "trainings": self.TRAINING_CATALOG["leadership"],
                    "start_month": current_month,
                }
            )

        return {
            "success": True,
            "data": {
                "employee_level": employee_level,
                "career_goal": career_goal,
                "timeline_months": timeline_months,
                "learning_path": path,
                "total_trainings": sum(len(p["trainings"]) for p in path),
            },
        }

    def _check_training_compliance(
        self, payload: Dict, context: Optional[Dict]
    ) -> Dict:
        """Check if employee has completed mandatory training."""
        employee_id = payload.get("employee_id", "")
        completed_training = payload.get("completed_training", [])
        department = payload.get("department", "")

        mandatory = self.TRAINING_CATALOG["onboarding"]["mandatory"].copy()
        mandatory.extend(self.TRAINING_CATALOG["compliance"]["mandatory"])

        completed_ids = [
            t.get("id") if isinstance(t, dict) else t for t in completed_training
        ]

        missing = []
        for t in mandatory:
            if t["id"] not in completed_ids:
                missing.append(t)

        return {
            "success": True,
            "data": {
                "compliant": len(missing) == 0,
                "completed_count": len(
                    [t for t in mandatory if t["id"] in completed_ids]
                ),
                "total_mandatory": len(mandatory),
                "missing_training": missing,
                "compliance_percentage": (len(mandatory) - len(missing))
                / len(mandatory)
                * 100,
            },
        }

    def _get_training_schedule(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Get training schedule for an employee."""
        employee_id = payload.get("employee_id", "")
        trainings = payload.get("trainings", [])
        start_date = payload.get("start_date", datetime.now().isoformat())

        schedule = self._create_training_schedule(trainings, start_date)

        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "schedule": schedule,
                "upcoming": [
                    s
                    for s in schedule
                    if datetime.fromisoformat(s["deadline"]) > datetime.now()
                ],
                "overdue": [
                    s
                    for s in schedule
                    if datetime.fromisoformat(s["deadline"]) <= datetime.now()
                ],
            },
        }

    def _create_training_schedule(
        self, trainings: List[Dict], start_date: str
    ) -> List[Dict]:
        """Create a training schedule from a list of trainings."""
        schedule = []
        start = (
            datetime.fromisoformat(start_date)
            if isinstance(start_date, str)
            else start_date
        )

        for training in trainings:
            deadline = start + timedelta(days=training.get("deadline_days", 30))
            schedule.append(
                {
                    "training_id": training.get("id"),
                    "name": training.get("name"),
                    "duration_hours": training.get("duration_hours"),
                    "format": training.get("format"),
                    "deadline": deadline.isoformat(),
                    "status": "pending",
                }
            )

        return sorted(schedule, key=lambda x: x["deadline"])

    def validate_cross_check(self, result: Dict[str, Any]) -> CrossCheckResult:
        """Validate training assignments."""
        if result.get("training_type") in ["mandatory", "compliance"]:
            return CrossCheckResult(
                validator_agent=self.agent_id,
                result=ValidationResult.VALID,
                notes="Training assignment verified",
            )

        return CrossCheckResult(
            validator_agent=self.agent_id,
            result=ValidationResult.NEEDS_REVIEW,
            notes="Non-mandatory training, review recommended",
        )
