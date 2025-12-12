"""
Field validation for visa case data.
Validates required fields and checks for common issues.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime

from ..models.case import Case, Beneficiary, Employment, Processing


@dataclass
class ValidationResult:
    """Result of case validation."""
    is_valid: bool = True
    completion_percentage: int = 0
    critical_missing: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    info: List[str] = field(default_factory=list)


def validate_date(date_str: str) -> bool:
    """Validate date is in mm/dd/yyyy format."""
    if not date_str or date_str in ("N/A", "NA", ""):
        return False
    try:
        datetime.strptime(date_str, "%m/%d/%Y")
        return True
    except ValueError:
        return False


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse date from mm/dd/yyyy format."""
    try:
        return datetime.strptime(date_str, "%m/%d/%Y")
    except (ValueError, TypeError):
        return None


def validate_beneficiary(beneficiary: Beneficiary, result: ValidationResult) -> int:
    """
    Validate beneficiary fields. Returns number of completed fields.
    """
    completed = 0
    total = 10  # Number of critical beneficiary fields

    # Critical fields (form will be rejected without)
    if beneficiary.last_name:
        completed += 1
    else:
        result.critical_missing.append("Beneficiary last name")

    if beneficiary.first_name:
        completed += 1
    else:
        result.critical_missing.append("Beneficiary first name")

    if validate_date(beneficiary.dob):
        completed += 1
    else:
        result.critical_missing.append("Beneficiary date of birth")

    if beneficiary.citizenship:
        completed += 1
    else:
        result.critical_missing.append("Country of citizenship")

    if beneficiary.birth_country:
        completed += 1
    else:
        result.critical_missing.append("Country of birth")

    if beneficiary.passport_number and beneficiary.passport_number not in ("N/A", ""):
        completed += 1
    else:
        result.critical_missing.append("Passport number")

    if validate_date(beneficiary.passport_expires):
        completed += 1
    else:
        result.critical_missing.append("Passport expiration date")

    if beneficiary.passport_country:
        completed += 1
    else:
        result.critical_missing.append("Passport country of issuance")

    # Location-specific validation
    if beneficiary.in_us:
        if beneficiary.current_status:
            completed += 1
        else:
            result.critical_missing.append("Current nonimmigrant status")

        if beneficiary.us_address and beneficiary.us_address.street:
            completed += 1
        else:
            result.critical_missing.append("Current US address")
    else:
        # Outside US - need consulate and foreign address
        if beneficiary.foreign_address and beneficiary.foreign_address.street:
            completed += 2
        else:
            result.critical_missing.append("Foreign address")

    return completed


def validate_employment(employment: Employment, result: ValidationResult) -> int:
    """Validate employment fields. Returns number of completed fields."""
    completed = 0
    total = 3

    if employment.job_title:
        completed += 1
    else:
        result.critical_missing.append("Job title")

    if validate_date(employment.start_date):
        completed += 1
    else:
        result.critical_missing.append("Employment start date")

    if validate_date(employment.end_date):
        completed += 1
    else:
        result.critical_missing.append("Employment end date")

    return completed


def validate_processing(processing: Processing, beneficiary: Beneficiary,
                        result: ValidationResult) -> int:
    """Validate processing fields. Returns number of completed fields."""
    completed = 0

    if not beneficiary.in_us:
        # Need consulate info
        if processing.consulate_city and processing.consulate_country:
            completed += 1
        else:
            result.critical_missing.append("Consulate city and country")

    return completed


def check_warnings(case: Case, result: ValidationResult):
    """Check for non-critical issues that may cause problems."""
    beneficiary = case.beneficiary
    employment = case.employment

    # Passport expiration warning
    passport_exp = parse_date(beneficiary.passport_expires)
    employment_end = parse_date(employment.end_date)

    if passport_exp and employment_end and passport_exp < employment_end:
        result.warnings.append(
            f"Passport expires ({beneficiary.passport_expires}) before "
            f"employment ends ({employment.end_date}). Beneficiary will need to renew."
        )

    # P-1A itinerary warning
    if case.visa_type == "P-1A" and not employment.has_itinerary:
        result.warnings.append(
            "P-1A requires an itinerary of events. Make sure to include one."
        )

    # O-1 advisory opinion
    if case.visa_type in ("O-1A", "O-1B") and not case.advisory_opinion_submitted:
        result.info.append(
            "Advisory opinion from peer group is recommended for O-1 petitions."
        )

    # P-1B group name
    if case.visa_type == "P-1B" and not case.entertainment_group_name:
        result.warnings.append("P-1B requires entertainment group name.")

    # Employment duration warning (O-1/P-1 max is usually 3 years)
    if employment_end and parse_date(employment.start_date):
        start = parse_date(employment.start_date)
        duration_days = (employment_end - start).days
        if duration_days > 1095:  # 3 years
            result.info.append(
                f"Employment duration is {duration_days // 365} years. "
                "O-1/P-1 petitions are typically approved for up to 3 years."
            )


def validate_case(case: Case) -> ValidationResult:
    """
    Validate a complete case and return validation result.
    """
    result = ValidationResult()

    # Validate visa type
    valid_types = ["O-1A", "O-1B", "P-1A", "P-1B", "O-2", "P-1S", "O-3", "P-4"]
    if case.visa_type not in valid_types:
        result.critical_missing.append(f"Invalid visa type: {case.visa_type}")

    # Count completed fields
    beneficiary_complete = validate_beneficiary(case.beneficiary, result)
    employment_complete = validate_employment(case.employment, result)
    processing_complete = validate_processing(
        case.processing, case.beneficiary, result
    )

    # Calculate completion percentage
    total_critical = 16  # Approximate number of critical fields
    completed = beneficiary_complete + employment_complete + processing_complete
    result.completion_percentage = min(100, int((completed / total_critical) * 100))

    # Check for warnings
    check_warnings(case, result)

    # Set overall validity
    result.is_valid = len(result.critical_missing) == 0

    return result


def get_completion_status(case: Case) -> dict:
    """
    Get detailed completion status for each form section.
    """
    result = validate_case(case)

    # Calculate per-section completion
    b = case.beneficiary
    e = case.employment

    i129_fields = {
        "petitioner_info": 100,  # Pre-loaded
        "beneficiary_info": min(100, sum([
            20 if b.last_name else 0,
            20 if b.first_name else 0,
            20 if b.dob else 0,
            20 if b.citizenship else 0,
            20 if b.passport_number else 0,
        ])),
        "employment_info": min(100, sum([
            34 if e.job_title else 0,
            33 if e.start_date else 0,
            33 if e.end_date else 0,
        ])),
    }

    i129_total = sum(i129_fields.values()) // len(i129_fields)

    return {
        "overall": result.completion_percentage,
        "i129_base": i129_total,
        "op_supplement": 50 if case.visa_type else 0,  # Simplified
        "i907": 80 if case.premium_processing else 0,
        "critical_missing": result.critical_missing,
        "warnings": result.warnings,
    }
