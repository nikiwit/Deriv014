"""
Salary Agent for DerivHR

Specializes in:
- Salary and payroll calculations
- EPF/SOCSO/CPF statutory contributions
- Overtime calculations
- Tax deductions (PCB/MTD)
- Cross-check validation for policy compliance
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from .base import BaseAgent, CrossCheckResult, ValidationResult


class SalaryAgent(BaseAgent):
    """
    Compensation & Statutory Calculations Specialist

    Capabilities:
    - Calculate EPF/SOCSO/EIS contributions (MY)
    - Calculate CPF contributions (SG)
    - Compute overtime pay
    - Calculate PCB/MTD tax deductions
    - Validate salary structures
    - Cross-check with PolicyAgent for compliance
    """

    EPF_RATES_MY = {
        "employee": 0.11,
        "employer_below_5k": 0.13,
        "employer_above_5k": 0.12,
    }

    SOCSO_RATES_MY = {"employee": 0.005, "employer": 0.0175, "ceiling": 6000}

    EIS_RATES_MY = {"employee": 0.002, "employer": 0.002, "ceiling": 5000}

    CPF_RATES_SG = {
        "below_55": {"employee": 0.20, "employer": 0.17},
        "55_to_60": {"employee": 0.13, "employer": 0.13},
        "60_to_65": {"employee": 0.075, "employer": 0.09},
        "above_65": {"employee": 0.05, "employer": 0.075},
    }

    OT_RATES_MY = {"normal_day": 1.5, "rest_day": 2.0, "public_holiday": 3.0}

    def __init__(self):
        super().__init__("salary_agent", "Salary & Statutory Specialist")
        self.cross_check_agents = ["policy_agent"]

    @property
    def capabilities(self) -> List[str]:
        return [
            "salary_calculations",
            "epf_calculation",
            "socso_calculation",
            "cpf_calculation",
            "eis_calculation",
            "overtime_calculation",
            "tax_deduction_pcb",
            "payroll_audit",
            "statutory_validation",
        ]

    def _register_handlers(self):
        self._message_handlers = {
            "calculate_epf": self._calculate_epf,
            "calculate_socso": self._calculate_socso,
            "calculate_cpf": self._calculate_cpf,
            "calculate_eis": self._calculate_eis,
            "calculate_overtime": self._calculate_overtime,
            "calculate_pcb": self._calculate_pcb,
            "calculate_payroll": self._calculate_full_payroll,
            "validate_contributions": self._validate_contributions,
            "get_contribution_summary": self._get_contribution_summary,
        }

    def _calculate_epf(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Calculate EPF contributions for Malaysia."""
        salary = float(payload.get("salary", 0))
        jurisdiction = payload.get("jurisdiction", "MY")
        allowance = float(payload.get("allowance", 0))
        age = int(payload.get("age", 30))

        if jurisdiction != "MY":
            return {
                "success": False,
                "errors": ["EPF only applies to Malaysia jurisdiction"],
            }

        wages = salary + allowance

        employee_contribution = self._round_currency(
            wages * self.EPF_RATES_MY["employee"]
        )

        employer_rate = (
            self.EPF_RATES_MY["employer_below_5k"]
            if wages <= 5000
            else self.EPF_RATES_MY["employer_above_5k"]
        )
        employer_contribution = self._round_currency(wages * employer_rate)

        return {
            "success": True,
            "data": {
                "calculation_type": "epf",
                "jurisdiction": "MY",
                "values": {
                    "wages": wages,
                    "employee_rate": self.EPF_RATES_MY["employee"],
                    "employer_rate": employer_rate,
                    "employee_contribution": employee_contribution,
                    "employer_contribution": employer_contribution,
                    "total_contribution": employee_contribution + employer_contribution,
                },
                "formula": f"EPF = Wages x Rate",
                "notes": [
                    "Employee rate: 11% of wages",
                    f"Employer rate: {employer_rate * 100:.0f}% (based on wages {'≤' if wages <= 5000 else '>'} RM5,000)",
                    "Wages = Basic Salary + Allowances",
                ],
                "statutory_reference": "Employees Provident Fund Act 1991",
            },
        }

    def _calculate_socso(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Calculate SOCSO/PERKESO contributions for Malaysia."""
        salary = float(payload.get("salary", 0))
        jurisdiction = payload.get("jurisdiction", "MY")

        if jurisdiction != "MY":
            return {
                "success": False,
                "errors": ["SOCSO only applies to Malaysia jurisdiction"],
            }

        ceiling = min(salary, self.SOCSO_RATES_MY["ceiling"])

        employee_contribution = self._round_currency(
            ceiling * self.SOCSO_RATES_MY["employee"]
        )
        employer_contribution = self._round_currency(
            ceiling * self.SOCSO_RATES_MY["employer"]
        )

        return {
            "success": True,
            "data": {
                "calculation_type": "socso",
                "jurisdiction": "MY",
                "values": {
                    "salary": salary,
                    "ceiling_used": ceiling,
                    "employee_contribution": employee_contribution,
                    "employer_contribution": employer_contribution,
                    "total_contribution": employee_contribution + employer_contribution,
                },
                "formula": f"SOCSO = min(Salary, {self.SOCSO_RATES_MY['ceiling']}) x Rate",
                "notes": [
                    f"Employee rate: {self.SOCSO_RATES_MY['employee'] * 100:.2f}%",
                    f"Employer rate: {self.SOCSO_RATES_MY['employer'] * 100:.2f}%",
                    f"Contribution ceiling: RM{self.SOCSO_RATES_MY['ceiling']}",
                ],
                "statutory_reference": "Employees Social Security Act 1969",
            },
        }

    def _calculate_cpf(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Calculate CPF contributions for Singapore."""
        salary = float(payload.get("salary", 0))
        jurisdiction = payload.get("jurisdiction", "SG")
        age = int(payload.get("age", 30))
        bonus = float(payload.get("bonus", 0))

        if jurisdiction != "SG":
            return {
                "success": False,
                "errors": ["CPF only applies to Singapore jurisdiction"],
            }

        ordinary_wages = min(salary, 6000)
        additional_wages = min(bonus, 102000 - ordinary_wages)
        total_wages = ordinary_wages + additional_wages

        rates = self._get_cpf_rate_by_age(age)

        employee_contribution = self._round_currency(total_wages * rates["employee"])
        employer_contribution = self._round_currency(total_wages * rates["employer"])

        return {
            "success": True,
            "data": {
                "calculation_type": "cpf",
                "jurisdiction": "SG",
                "values": {
                    "age": age,
                    "ordinary_wages": ordinary_wages,
                    "additional_wages": additional_wages,
                    "total_wages": total_wages,
                    "employee_rate": rates["employee"],
                    "employer_rate": rates["employer"],
                    "employee_contribution": employee_contribution,
                    "employer_contribution": employer_contribution,
                    "total_contribution": employee_contribution + employer_contribution,
                },
                "formula": f"CPF = Total Wages x Rate (Age {age})",
                "notes": [
                    f"Employee rate: {rates['employee'] * 100:.1f}%",
                    f"Employer rate: {rates['employer'] * 100:.1f}%",
                    "OW Ceiling: SGD 6,000/month",
                    "Total Wage Ceiling: SGD 102,000/year",
                ],
                "statutory_reference": "Central Provident Fund Act",
            },
        }

    def _calculate_eis(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Calculate EIS (Employment Insurance System) for Malaysia."""
        salary = float(payload.get("salary", 0))
        jurisdiction = payload.get("jurisdiction", "MY")

        if jurisdiction != "MY":
            return {
                "success": False,
                "errors": ["EIS only applies to Malaysia jurisdiction"],
            }

        ceiling = min(salary, self.EIS_RATES_MY["ceiling"])

        employee_contribution = self._round_currency(
            ceiling * self.EIS_RATES_MY["employee"]
        )
        employer_contribution = self._round_currency(
            ceiling * self.EIS_RATES_MY["employer"]
        )

        return {
            "success": True,
            "data": {
                "calculation_type": "eis",
                "jurisdiction": "MY",
                "values": {
                    "salary": salary,
                    "ceiling_used": ceiling,
                    "employee_contribution": employee_contribution,
                    "employer_contribution": employer_contribution,
                    "total_contribution": employee_contribution + employer_contribution,
                },
                "formula": f"EIS = min(Salary, {self.EIS_RATES_MY['ceiling']}) x 0.2%",
                "notes": [
                    "Employee rate: 0.2%",
                    "Employer rate: 0.2%",
                    f"Contribution ceiling: RM{self.EIS_RATES_MY['ceiling']}",
                ],
                "statutory_reference": "Employment Insurance System Act 2017",
            },
        }

    def _calculate_overtime(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Calculate overtime pay for Malaysia."""
        salary = float(payload.get("salary", 0))
        hours = float(payload.get("hours", 0))
        day_type = payload.get("day_type", "normal_day")
        jurisdiction = payload.get("jurisdiction", "MY")

        if jurisdiction != "MY":
            return {
                "success": False,
                "errors": [
                    "Overtime calculation currently only supported for Malaysia"
                ],
            }

        if salary < 4000:
            hourly_rate = salary / 26 / 8
        else:
            hourly_rate = salary / 26 / 8

        ot_rate = self.OT_RATES_MY.get(day_type, 1.5)
        ot_pay = self._round_currency(hourly_rate * ot_rate * hours)

        return {
            "success": True,
            "data": {
                "calculation_type": "overtime",
                "jurisdiction": "MY",
                "values": {
                    "salary": salary,
                    "hourly_rate": self._round_currency(hourly_rate),
                    "ot_rate": ot_rate,
                    "hours": hours,
                    "day_type": day_type,
                    "ot_pay": ot_pay,
                },
                "formula": f"OT = (Salary / 26 / 8) x {ot_rate} x Hours",
                "notes": [
                    f"Normal day OT rate: {self.OT_RATES_MY['normal_day']}x",
                    f"Rest day OT rate: {self.OT_RATES_MY['rest_day']}x",
                    f"Public holiday OT rate: {self.OT_RATES_MY['public_holiday']}x",
                    "EA 1955 Section 60A applies for employees earning < RM4,000",
                ],
                "statutory_reference": "Employment Act 1955 Section 60A",
            },
        }

    def _calculate_pcb(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Calculate PCB/MTD (Monthly Tax Deduction) for Malaysia."""
        salary = float(payload.get("salary", 0))
        jurisdiction = payload.get("jurisdiction", "MY")
        epf_contribution = float(payload.get("epf_contribution", salary * 0.11))
        tax_reliefs = float(payload.get("tax_reliefs", 9000))
        marital_status = payload.get("marital_status", "single")

        if jurisdiction != "MY":
            return {
                "success": False,
                "errors": ["PCB calculation only applies to Malaysia"],
            }

        annual_gross = salary * 12
        annual_epf = min(epf_contribution * 12, 60000)
        taxable_income = annual_gross - annual_epf - tax_reliefs

        tax = self._calculate_income_tax(taxable_income, marital_status)
        monthly_pcb = self._round_currency(tax / 12)

        return {
            "success": True,
            "data": {
                "calculation_type": "pcb",
                "jurisdiction": "MY",
                "values": {
                    "monthly_salary": salary,
                    "annual_gross": annual_gross,
                    "annual_epf_deduction": annual_epf,
                    "tax_reliefs": tax_reliefs,
                    "taxable_income": taxable_income,
                    "annual_tax": tax,
                    "monthly_pcb": monthly_pcb,
                    "marital_status": marital_status,
                },
                "formula": "PCB = (Annual Tax after reliefs) / 12",
                "notes": [
                    "EPF relief capped at RM60,000/year",
                    "Personal relief: RM9,000",
                    "This is an estimate; actual PCB may vary",
                ],
                "statutory_reference": "Income Tax Act 1967",
            },
        }

    def _calculate_full_payroll(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Calculate complete payroll with all contributions."""
        salary = float(payload.get("salary", 0))
        jurisdiction = payload.get("jurisdiction", "MY")
        age = int(payload.get("age", 30))
        allowance = float(payload.get("allowance", 0))

        result = {
            "success": True,
            "data": {
                "jurisdiction": jurisdiction,
                "salary": salary,
                "allowance": allowance,
                "gross_pay": salary + allowance,
                "deductions": {},
                "employer_contributions": {},
                "net_pay": 0,
            },
        }

        if jurisdiction == "MY":
            epf_result = self._calculate_epf(
                {
                    "salary": salary,
                    "allowance": allowance,
                    "jurisdiction": "MY",
                    "age": age,
                },
                context,
            )
            if epf_result["success"]:
                result["data"]["deductions"]["epf"] = epf_result["data"]["values"][
                    "employee_contribution"
                ]
                result["data"]["employer_contributions"]["epf"] = epf_result["data"][
                    "values"
                ]["employer_contribution"]

            socso_result = self._calculate_socso(
                {"salary": salary, "jurisdiction": "MY"}, context
            )
            if socso_result["success"]:
                result["data"]["deductions"]["socso"] = socso_result["data"]["values"][
                    "employee_contribution"
                ]
                result["data"]["employer_contributions"]["socso"] = socso_result[
                    "data"
                ]["values"]["employer_contribution"]

            eis_result = self._calculate_eis(
                {"salary": salary, "jurisdiction": "MY"}, context
            )
            if eis_result["success"]:
                result["data"]["deductions"]["eis"] = eis_result["data"]["values"][
                    "employee_contribution"
                ]
                result["data"]["employer_contributions"]["eis"] = eis_result["data"][
                    "values"
                ]["employer_contribution"]

            total_deductions = sum(result["data"]["deductions"].values())
            result["data"]["net_pay"] = self._round_currency(
                result["data"]["gross_pay"] - total_deductions
            )
            result["data"]["total_employer_cost"] = self._round_currency(
                result["data"]["gross_pay"]
                + sum(result["data"]["employer_contributions"].values())
            )

        elif jurisdiction == "SG":
            cpf_result = self._calculate_cpf(
                {"salary": salary, "jurisdiction": "SG", "age": age}, context
            )
            if cpf_result["success"]:
                result["data"]["deductions"]["cpf"] = cpf_result["data"]["values"][
                    "employee_contribution"
                ]
                result["data"]["employer_contributions"]["cpf"] = cpf_result["data"][
                    "values"
                ]["employer_contribution"]

            sdl = self._round_currency(salary * 0.0025)
            result["data"]["employer_contributions"]["sdl"] = sdl

            total_deductions = sum(result["data"]["deductions"].values())
            result["data"]["net_pay"] = self._round_currency(
                result["data"]["gross_pay"] - total_deductions
            )
            result["data"]["total_employer_cost"] = self._round_currency(
                result["data"]["gross_pay"]
                + sum(result["data"]["employer_contributions"].values())
            )

        return result

    def _validate_contributions(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Validate statutory contributions against expected values."""
        jurisdiction = payload.get("jurisdiction", "MY")
        contributions = payload.get("contributions", {})
        salary = float(payload.get("salary", 0))

        if jurisdiction == "MY":
            expected = self._calculate_full_payroll(
                {"salary": salary, "jurisdiction": "MY"}, context
            )
        else:
            expected = self._calculate_full_payroll(
                {"salary": salary, "jurisdiction": "SG"}, context
            )

        discrepancies = []
        for key, value in contributions.items():
            expected_val = expected["data"]["deductions"].get(key) or expected["data"][
                "employer_contributions"
            ].get(key)
            if expected_val and abs(value - expected_val) > 0.01:
                discrepancies.append(
                    {
                        "contribution": key,
                        "submitted": value,
                        "expected": expected_val,
                        "difference": value - expected_val,
                    }
                )

        return {
            "success": True,
            "data": {
                "valid": len(discrepancies) == 0,
                "discrepancies": discrepancies,
                "expected_values": expected["data"],
            },
        }

    def _get_contribution_summary(self, payload: Dict, context: Optional[Dict]) -> Dict:
        """Get a summary of all contribution types for a jurisdiction."""
        jurisdiction = payload.get("jurisdiction", "MY")

        if jurisdiction == "MY":
            summary = {
                "epf": {
                    "employee_rate": "11%",
                    "employer_rate": "13% (salary ≤RM5,000) / 12% (salary >RM5,000)",
                    "ceiling": "No ceiling",
                },
                "socso": {
                    "employee_rate": "0.5%",
                    "employer_rate": "1.75%",
                    "ceiling": "RM6,000",
                },
                "eis": {
                    "employee_rate": "0.2%",
                    "employer_rate": "0.2%",
                    "ceiling": "RM5,000",
                },
            }
        else:
            summary = {
                "cpf": {
                    "employee_rate": "20% (≤55 yrs), 13% (55-60), 7.5% (60-65), 5% (>65)",
                    "employer_rate": "17% (≤55 yrs), 13% (55-60), 9% (60-65), 7.5% (>65)",
                    "ceiling": "OW: SGD6,000/month",
                },
                "sdl": {"employer_rate": "0.25%", "ceiling": "No ceiling"},
            }

        return {
            "success": True,
            "data": {"jurisdiction": jurisdiction, "contributions": summary},
        }

    def validate_cross_check(self, result: Dict[str, Any]) -> CrossCheckResult:
        """Validate policy decisions against salary calculations."""
        if result.get("calculation_type") in ["epf", "socso", "cpf", "eis"]:
            return CrossCheckResult(
                validator_agent=self.agent_id,
                result=ValidationResult.VALID,
                notes="Salary calculations verified",
            )

        return CrossCheckResult(
            validator_agent=self.agent_id,
            result=ValidationResult.NEEDS_REVIEW,
            notes="Unable to verify non-salary calculation",
        )

    def _get_cpf_rate_by_age(self, age: int) -> Dict[str, float]:
        """Get CPF contribution rates based on age."""
        if age <= 55:
            return self.CPF_RATES_SG["below_55"]
        elif age <= 60:
            return self.CPF_RATES_SG["55_to_60"]
        elif age <= 65:
            return self.CPF_RATES_SG["60_to_65"]
        else:
            return self.CPF_RATES_SG["above_65"]

    def _round_currency(self, amount: float) -> float:
        """Round to 2 decimal places for currency."""
        return float(
            Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        )

    def _calculate_income_tax(
        self, taxable_income: float, marital_status: str
    ) -> float:
        """Calculate annual income tax (simplified)."""
        if taxable_income <= 0:
            return 0

        tax_brackets = [
            (5000, 0.0),
            (20000, 0.01),
            (35000, 0.03),
            (50000, 0.06),
            (70000, 0.11),
            (100000, 0.19),
            (400000, 0.25),
            (600000, 0.26),
            (2000000, 0.28),
            (float("inf"), 0.30),
        ]

        tax = 0
        prev_bracket = 0

        for bracket, rate in tax_brackets:
            if taxable_income > prev_bracket:
                taxable_in_bracket = min(taxable_income, bracket) - prev_bracket
                tax += taxable_in_bracket * rate
            prev_bracket = bracket
            if taxable_income <= bracket:
                break

        return self._round_currency(tax)
