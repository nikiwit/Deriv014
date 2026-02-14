"""
Policy Agent for DerivHR

Specializes in:
- Policy interpretation and analysis
- Compliance verification
- Cross-jurisdiction comparison (MY/SG)
- Document policy analysis
- Cross-check validation for salary and onboarding
"""

from typing import Dict, Any, List, Optional
from .base import BaseAgent, CrossCheckResult, ValidationResult


class PolicyAgent(BaseAgent):
    """
    Policy Specialist Agent

    Capabilities:
    - Interpret company policies and employment law
    - Verify compliance with statutory requirements
    - Compare MY vs SG jurisdictional differences
    - Validate calculations against policy rules
    - Detect policy gaps and conflicts
    """

    def __init__(self):
        super().__init__("policy_agent", "Policy Specialist")
        self.cross_check_agents = ["salary_agent"]

    @property
    def capabilities(self) -> List[str]:
        return [
            "policy_interpretation",
            "compliance_verification",
            "document_analysis",
            "jurisdiction_comparison",
            "policy_gap_detection",
            "statutory_validation",
        ]

    def _register_handlers(self):
        self._message_handlers = {
            "interpret_policy": self._interpret_policy,
            "verify_compliance": self._verify_compliance,
            "compare_jurisdictions": self._compare_jurisdictions,
            "validate_calculation": self._validate_calculation,
            "check_document_compliance": self._check_document_compliance,
            "get_required_documents": self._get_required_documents,
        }

    def _interpret_policy(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Interpret a policy query with jurisdiction context."""
        query = payload.get("query", "")
        jurisdiction = context.get("jurisdiction", "MY") if context else "MY"
        document_type = payload.get("document_type", "all")

        return {
            "success": True,
            "data": {
                "interpretation": f"Policy interpretation for {query}",
                "jurisdiction": jurisdiction,
                "document_type": document_type,
                "sources": self._get_policy_sources(jurisdiction),
                "confidence": 0.95,
            },
        }

    def _verify_compliance(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Verify compliance of an action or document."""
        action_type = payload.get("action_type", "")
        employee_data = payload.get("employee_data", {})
        jurisdiction = employee_data.get("jurisdiction", "MY")

        compliance_result = self._check_compliance_rules(
            action_type, employee_data, jurisdiction
        )

        return {
            "success": True,
            "data": {
                "compliant": compliance_result["compliant"],
                "issues": compliance_result.get("issues", []),
                "recommendations": compliance_result.get("recommendations", []),
                "risk_level": compliance_result.get("risk_level", "low"),
                "statutory_references": compliance_result.get(
                    "statutory_references", []
                ),
            },
        }

    def _compare_jurisdictions(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Compare policies between MY and SG jurisdictions."""
        topic = payload.get("topic", "")

        comparison = self._get_jurisdiction_comparison(topic)

        return {
            "success": True,
            "data": {
                "topic": topic,
                "malaysia": comparison.get("MY", {}),
                "singapore": comparison.get("SG", {}),
                "key_differences": comparison.get("differences", []),
                "recommendation": comparison.get("recommendation", ""),
            },
        }

    def _validate_calculation(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Validate a calculation against policy rules."""
        calculation_type = payload.get("calculation_type", "")
        values = payload.get("values", {})
        jurisdiction = payload.get("jurisdiction", "MY")

        validation = self._validate_calculation_rules(
            calculation_type, values, jurisdiction
        )

        return {
            "success": True,
            "data": {
                "valid": validation["valid"],
                "errors": validation.get("errors", []),
                "corrected_values": validation.get("corrected_values", {}),
                "policy_reference": validation.get("policy_reference", ""),
            },
        }

    def _check_document_compliance(
        self, payload: Dict, context: Optional[Dict]
    ) -> Dict:
        """Check if a document meets policy requirements."""
        document_type = payload.get("document_type", "")
        document_content = payload.get("content", {})
        jurisdiction = payload.get("jurisdiction", "MY")

        required_elements = self._get_required_document_elements(
            document_type, jurisdiction
        )
        missing = [el for el in required_elements if el not in document_content]

        return {
            "success": True,
            "data": {
                "compliant": len(missing) == 0,
                "missing_elements": missing,
                "required_elements": required_elements,
                "recommendations": self._get_document_recommendations(
                    document_type, jurisdiction
                ),
            },
        }

    def _get_required_documents(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Get required documents for an action."""
        action = payload.get("action", "onboarding")
        jurisdiction = payload.get("jurisdiction", "MY")
        employee_type = payload.get("employee_type", "local")

        docs = self._get_document_list(action, jurisdiction, employee_type)

        return {
            "success": True,
            "data": {
                "required": docs.get("required", []),
                "recommended": docs.get("recommended", []),
                "deadlines": docs.get("deadlines", {}),
                "responsible_party": docs.get("responsible_party", {}),
            },
        }

    def validate_cross_check(self, result: Dict[str, Any]) -> CrossCheckResult:
        """Validate results from SalaryAgent or OnboardingAgent."""
        calculation_type = result.get("calculation_type", "")
        values = result.get("values", {})
        jurisdiction = result.get("jurisdiction", "MY")

        validation = self._validate_calculation_rules(
            calculation_type, values, jurisdiction
        )

        if validation["valid"]:
            return CrossCheckResult(
                validator_agent=self.agent_id,
                result=ValidationResult.VALID,
                notes="Policy compliance verified",
            )
        else:
            return CrossCheckResult(
                validator_agent=self.agent_id,
                result=ValidationResult.INVALID,
                notes=f"Policy violation: {', '.join(validation.get('errors', []))}",
                corrections=validation.get("corrected_values", {}),
            )

    def _get_policy_sources(self, jurisdiction: str) -> List[Dict]:
        """Get relevant policy sources for a jurisdiction."""
        sources = {
            "MY": [
                {"name": "Employment Act 1955", "sections": ["60A", "60E", "60F"]},
                {"name": "EPF Act 1991", "sections": ["Contribution rates"]},
                {"name": "SOCSO Act 1969", "sections": ["Coverage", "Benefits"]},
                {"name": "Company Handbook", "sections": ["All"]},
            ],
            "SG": [
                {"name": "Employment Act Cap. 91", "sections": ["KETs", "Leave"]},
                {"name": "CPF Act", "sections": ["Contribution rates"]},
                {"name": "EFMA", "sections": ["Work passes"]},
                {"name": "Company Handbook", "sections": ["All"]},
            ],
        }
        return sources.get(jurisdiction, sources["MY"])

    def _check_compliance_rules(
        self, action_type: str, employee_data: Dict, jurisdiction: str
    ) -> Dict:
        """Check compliance rules for an action."""
        salary = float(employee_data.get("salary", 0))

        issues = []
        recommendations = []
        risk_level = "low"

        if jurisdiction == "MY":
            if salary > 0 and salary < 1500:
                issues.append("Salary below minimum wage (RM1,500)")
                risk_level = "high"

            if salary >= 4000:
                recommendations.append(
                    "Employee eligible for overtime under EA 1955 Section 60A"
                )

        elif jurisdiction == "SG":
            if salary < 0:
                issues.append("Invalid salary amount")
                risk_level = "high"

        return {
            "compliant": len(issues) == 0,
            "issues": issues,
            "recommendations": recommendations,
            "risk_level": risk_level,
            "statutory_references": self._get_statutory_references(
                jurisdiction, action_type
            ),
        }

    def _get_statutory_references(
        self, jurisdiction: str, action_type: str
    ) -> List[str]:
        """Get statutory references for an action."""
        refs = {
            "MY": {
                "onboarding": ["EA 1955 S.60A", "EPF Act S.43"],
                "termination": ["EA 1955 S.12", "IR Act 1967"],
                "leave": ["EA 1955 S.60E", "EA 1955 S.60F"],
            },
            "SG": {
                "onboarding": ["EA Cap.91 Part IV", "CPF Act"],
                "termination": ["EA Cap.91 Part III"],
                "leave": ["EA Cap.91 Part VII"],
            },
        }
        return refs.get(jurisdiction, {}).get(action_type, [])

    def _get_jurisdiction_comparison(self, topic: str) -> Dict:
        """Get comparison between MY and SG for a topic."""
        comparisons = {
            "annual_leave": {
                "MY": {
                    "min_days": 8,
                    "basis": "years_of_service",
                    "statute": "EA 1955 S.60E",
                },
                "SG": {"min_days": 7, "basis": "year_1_plus_1", "statute": "EA Cap.91"},
                "differences": [
                    "MY based on service years, SG based on calendar year progression"
                ],
                "recommendation": "Apply more favorable provision per contract",
            },
            "sick_leave": {
                "MY": {
                    "days": "14-22",
                    "hospitalization": 60,
                    "statute": "EA 1955 S.60F",
                },
                "SG": {"days": 14, "hospitalization": 60, "statute": "EA Cap.91"},
                "differences": ["MY sick leave increases with service, SG fixed at 14"],
                "recommendation": "Track entitlements separately per jurisdiction",
            },
            "contributions": {
                "MY": {"EPF": "11%/12-13%", "SOCSO": "0.5%/1.75%", "EIS": "0.2%/0.2%"},
                "SG": {"CPF": "17%/20%", "SDL": "0.25% employer"},
                "differences": [
                    "MY has more contribution types, SG has higher CPF rates"
                ],
                "recommendation": "Use jurisdiction-specific payroll calculators",
            },
        }
        return comparisons.get(topic, {})

    def _validate_calculation_rules(
        self, calc_type: str, values: Dict, jurisdiction: str
    ) -> Dict:
        """Validate calculation against policy rules."""
        errors = []
        corrected = {}

        if calc_type == "epf":
            salary = float(values.get("salary", 0))
            employee_rate = float(values.get("employee_rate", 0))
            employer_rate = float(values.get("employer_rate", 0))

            if jurisdiction == "MY":
                if employee_rate != 0.11:
                    errors.append(
                        f"Employee EPF rate should be 11%, got {employee_rate * 100}%"
                    )
                    corrected["employee_rate"] = 0.11

                expected_employer = 0.13 if salary <= 5000 else 0.12
                if employer_rate != expected_employer:
                    errors.append(
                        f"Employer EPF rate should be {expected_employer * 100}%"
                    )
                    corrected["employer_rate"] = expected_employer

        elif calc_type == "cpf":
            if jurisdiction == "SG":
                age = int(values.get("age", 30))
                employee_rate = float(values.get("employee_rate", 0))
                employer_rate = float(values.get("employer_rate", 0))

                expected_rates = self._get_cpf_rates_by_age(age)
                if employee_rate != expected_rates["employee"]:
                    corrected["employee_rate"] = expected_rates["employee"]
                if employer_rate != expected_rates["employer"]:
                    corrected["employer_rate"] = expected_rates["employer"]

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "corrected_values": corrected,
            "policy_reference": f"Statutory rates for {jurisdiction}",
        }

    def _get_cpf_rates_by_age(self, age: int) -> Dict[str, float]:
        """Get CPF contribution rates by age."""
        if age <= 55:
            return {"employee": 0.20, "employer": 0.17}
        elif age <= 60:
            return {"employee": 0.13, "employer": 0.13}
        elif age <= 65:
            return {"employee": 0.075, "employer": 0.09}
        else:
            return {"employee": 0.05, "employer": 0.075}

    def _get_required_document_elements(
        self, doc_type: str, jurisdiction: str
    ) -> List[str]:
        """Get required elements for a document type."""
        elements = {
            "employment_contract": [
                "employee_name",
                "position",
                "department",
                "start_date",
                "salary",
                "probation_period",
                "working_hours",
                "leave_entitlement",
                "termination_notice",
                "jurisdiction_clause",
            ],
            "offer_letter": [
                "employee_name",
                "position",
                "start_date",
                "salary",
                "probation_period",
                "benefits_summary",
                "acceptance_deadline",
            ],
            "termination_letter": [
                "employee_name",
                "termination_date",
                "reason",
                "notice_period",
                "final_pay_details",
                "appeal_rights",
            ],
        }
        return elements.get(doc_type, [])

    def _get_document_recommendations(
        self, doc_type: str, jurisdiction: str
    ) -> List[str]:
        """Get recommendations for document preparation."""
        return [
            "Review with legal counsel before issuance",
            f"Ensure compliance with {jurisdiction} employment law",
            "Include all required statutory provisions",
            "Obtain employee signature where required",
        ]

    def _get_document_list(
        self, action: str, jurisdiction: str, employee_type: str
    ) -> Dict:
        """Get document requirements for an action."""
        docs = {
            "onboarding": {
                "MY": {
                    "required": [
                        "Signed employment contract",
                        "NRIC copy (front and back)",
                        "Educational certificates",
                        "Bank account details form",
                        "EPF nomination form",
                        "SOCSO registration form",
                        "Emergency contact form",
                    ],
                    "recommended": [
                        "Previous employment references",
                        "Passport-sized photographs",
                        "Medical examination report",
                    ],
                    "deadlines": {
                        "contract": "Before start date",
                        "statutory_forms": "Within 7 days of start",
                    },
                    "responsible_party": {
                        "contract": "HR",
                        "statutory_forms": "HR + Employee",
                    },
                },
                "SG": {
                    "required": [
                        "Signed employment contract",
                        "NRIC or work pass copy",
                        "Educational certificates",
                        "Bank account details form",
                        "CPF nomination form",
                        "Emergency contact form",
                    ],
                    "recommended": [
                        "Previous employment references",
                        "Passport-sized photographs",
                    ],
                    "deadlines": {
                        "contract": "Before start date",
                        "statutory_forms": "Within 7 days of start",
                    },
                    "responsible_party": {
                        "contract": "HR",
                        "statutory_forms": "HR + Employee",
                    },
                },
            }
        }
        return docs.get(action, {}).get(
            jurisdiction, docs.get(action, {}).get("MY", {})
        )
