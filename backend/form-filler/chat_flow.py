"""
Conversational chat flow engine for visa form completion.
Asks questions in grouped blocks, tracks progress, and builds case data.
"""

from typing import Optional, Callable, Any
from dataclasses import dataclass
import json

from .models.case import Case, Beneficiary, Employment, Processing, Address, VisaType
from .models.petitioner import Petitioner, PETITIONERS, get_petitioner
from .models.attorney import Attorney
from .validators.field_validator import validate_case, get_completion_status


# Standard text templates
STANDARD_TEXT = {
    "event_description": "Please see the information included with this petition.",
    "duties": "Please see the information included with this petition.",
    "support_dates": "Please see the information included with this petition.",
    "wages": "See petition",
    "wage_frequency": "Year",
    "other_compensation": "Please see the information included with this petition.",
}


def format_progress_bar(percentage: int, width: int = 12) -> str:
    """Create a text-based progress bar."""
    filled = int(width * percentage / 100)
    empty = width - filled
    return f"{'█' * filled}{'░' * empty} {percentage}%"


def display_status(case: Case) -> str:
    """Generate status display string."""
    status = get_completion_status(case)
    fees = case.calculate_fees()

    lines = [
        "═" * 50,
        f"📋 FORM COMPLETION: {status['overall']}%",
        "─" * 50,
        f"I-129 BASE:        {format_progress_bar(status['i129_base'])}",
        f"O/P SUPPLEMENT:    {format_progress_bar(status['op_supplement'])}",
    ]

    if case.premium_processing:
        lines.append(f"I-907 PREMIUM:     {format_progress_bar(status['i907'])}")

    lines.append("─" * 50)

    if status['critical_missing']:
        lines.append("🔴 CRITICAL MISSING:")
        for item in status['critical_missing'][:5]:
            lines.append(f"   • {item}")
        if len(status['critical_missing']) > 5:
            lines.append(f"   ... and {len(status['critical_missing']) - 5} more")

    if status['warnings']:
        lines.append("⚠️  WARNINGS:")
        for item in status['warnings'][:3]:
            lines.append(f"   • {item}")

    lines.append("─" * 50)
    lines.append(f"FILING FEES: ${fees['Total']:,}")
    lines.append("═" * 50)

    return "\n".join(lines)


def display_welcome() -> str:
    """Display welcome message."""
    return """
═══════════════════════════════════════════════════════════
   SHERROD SPORTS VISAS - FORM ASSISTANT
   O-1A | O-1B | P-1A | P-1B Petition Forms
═══════════════════════════════════════════════════════════

Commands: status | preview | missing | reset | done | help

Let's prepare the visa forms!
"""


def display_final_summary(case: Case) -> str:
    """Display final summary when case is complete."""
    b = case.beneficiary
    e = case.employment
    p = get_petitioner(case.petitioner_key)
    fees = case.calculate_fees()

    forms = case.get_forms_needed()

    lines = [
        "═" * 60,
        "        ✓ FORM PACKAGE COMPLETE - READY FOR REVIEW",
        "═" * 60,
        "",
        "CASE SUMMARY:",
        f"• Visa: {case.visa_type}",
        f"• Beneficiary: {b.full_name()}",
        f"• Petitioner: {p.company if p else 'Unknown'}",
        f"• Employment: {e.start_date} to {e.end_date}",
        f"• Compensation: ${e.wage_amount} per {e.wage_frequency}",
        "",
        "FORMS PREPARED:",
    ]

    for form in forms:
        lines.append(f"☑ {form}")

    lines.extend([
        "",
        "FILING FEES:",
        f"• I-129: ${fees.get('I-129', 0):,}",
    ])

    if case.premium_processing:
        lines.append(f"• I-907: ${fees.get('I-907', 0):,}")

    lines.extend([
        f"• TOTAL: ${fees['Total']:,}",
        "",
    ])

    validation = validate_case(case)
    if validation.critical_missing:
        lines.append(f"🔴 CRITICAL ITEMS: {len(validation.critical_missing)} missing")
    else:
        lines.append("✓ CRITICAL ITEMS: None")

    if validation.warnings:
        lines.append(f"⚠️  WARNINGS: {len(validation.warnings)}")

    lines.extend([
        "",
        "FORM DATA READY FOR PDF GENERATION",
        "═" * 60,
    ])

    return "\n".join(lines)


class ChatFlow:
    """
    Manages the conversational flow for collecting visa form data.
    """

    def __init__(self):
        self.case = Case()
        self.current_step = "initial"
        self.steps = [
            "initial",       # Visa type, name, premium, petitioner, G-28
            "attorney",      # Attorney info (if G-28 selected)
            "personal",      # DOB, sex, citizenship, passport
            "location",      # In US or abroad, address, consulate
            "employment",    # Job title, dates, wages
            "visa_specific", # O/P specific questions
            "review",        # Final review
        ]

    def get_initial_questions(self) -> str:
        """Get initial question block."""
        return """
Quick setup questions:

1. Visa type? [O-1A / O-1B / P-1A / P-1B]
2. Beneficiary's full legal name (as on passport)?
3. Premium processing ($2,805)? [Yes/No]
4. Which petitioner?
   [A] Innovative Global Talent Agency LLC
   [B] Innovative Global Accelerator Studios LLC
5. Include G-28 (attorney appearance)? [Yes/No]

Enter your answers (e.g., "O-1A, John Smith Doe, Yes, A, No"):
"""

    def parse_initial_answers(self, response: str) -> dict:
        """Parse initial question responses."""
        parts = [p.strip() for p in response.split(",")]
        result = {}

        if len(parts) >= 1:
            visa = parts[0].upper().replace(" ", "-")
            if visa in ["O-1A", "O-1B", "P-1A", "P-1B", "O1A", "O1B", "P1A", "P1B"]:
                result["visa_type"] = visa.replace("O1", "O-1").replace("P1", "P-1")

        if len(parts) >= 2:
            name_parts = parts[1].strip().split()
            if len(name_parts) >= 2:
                result["first_name"] = name_parts[0]
                result["last_name"] = name_parts[-1]
                if len(name_parts) > 2:
                    result["middle_name"] = " ".join(name_parts[1:-1])

        if len(parts) >= 3:
            result["premium"] = parts[2].lower() in ("yes", "y", "true", "1")

        if len(parts) >= 4:
            pet = parts[3].lower()
            if pet in ("a", "igta", "talent"):
                result["petitioner"] = "igta"
            elif pet in ("b", "accelerator", "studios"):
                result["petitioner"] = "accelerator"

        if len(parts) >= 5:
            result["include_g28"] = parts[4].lower() in ("yes", "y", "true", "1")

        return result

    def get_attorney_questions(self) -> str:
        """Get attorney information questions."""
        return """
Attorney Information for G-28:

1. Attorney name (Last, First)?
2. State bar (e.g., "North Carolina")?
3. Bar number?
4. Law firm name (or N/A)?
5. Attorney email?
6. Attorney phone?

Enter your answers (comma-separated):
"""

    def parse_attorney_answers(self, response: str) -> dict:
        """Parse attorney question responses."""
        parts = [p.strip() for p in response.split(",")]
        result = {}

        if len(parts) >= 1:
            name_parts = parts[0].split()
            if len(name_parts) >= 2:
                result["last_name"] = name_parts[0].rstrip(",")
                result["first_name"] = name_parts[1] if len(name_parts) > 1 else ""

        if len(parts) >= 2:
            result["licensing_authority"] = parts[1]

        if len(parts) >= 3:
            result["bar_number"] = parts[2]

        if len(parts) >= 4:
            result["law_firm"] = parts[3] if parts[3].lower() != "n/a" else ""

        if len(parts) >= 5:
            result["email"] = parts[4]

        if len(parts) >= 6:
            result["phone"] = parts[5]

        return result

    def get_personal_questions(self) -> str:
        """Get personal information questions."""
        name = self.case.beneficiary.full_name() or "[Beneficiary]"
        return f"""
Tell me about {name}:

1. Date of birth (mm/dd/yyyy)?
2. Sex (Male/Female)?
3. Country of citizenship?
4. Country of birth?
5. Province/State of birth (or N/A)?
6. Passport number?
7. Passport issue date (mm/dd/yyyy)?
8. Passport expiration date (mm/dd/yyyy)?
9. Passport country of issuance?

Enter your answers (comma-separated):
"""

    def parse_personal_answers(self, response: str) -> dict:
        """Parse personal information responses."""
        parts = [p.strip() for p in response.split(",")]
        result = {}

        fields = [
            "dob", "sex", "citizenship", "birth_country", "birth_province",
            "passport_number", "passport_issued", "passport_expires", "passport_country"
        ]

        for i, field in enumerate(fields):
            if i < len(parts):
                value = parts[i].strip()
                if field == "sex":
                    result[field] = "Male" if value.lower().startswith("m") else "Female"
                elif value.lower() not in ("n/a", "na", "none", ""):
                    result[field] = value

        return result

    def get_location_questions(self) -> str:
        """Get location-related questions."""
        return """
Location Information:

1. Is the beneficiary currently in the US? [Yes/No]

If YES (in US):
2. Current nonimmigrant status (e.g., P1, O1, B1/B2)?
3. Status expiration date (mm/dd/yyyy)?
4. I-94 number (or N/A)?
5. Current US address (Street, City, State ZIP)?

If NO (outside US):
2. Foreign address (Street, City, Province, Postal Code, Country)?
3. Consulate city for visa interview?
4. Consulate country?

Enter "YES" or "NO" first, then the relevant answers:
"""

    def parse_location_answers(self, response: str) -> dict:
        """Parse location responses."""
        parts = [p.strip() for p in response.split(",")]
        result = {}

        if len(parts) >= 1:
            in_us = parts[0].lower() in ("yes", "y", "true", "1", "in us")
            result["in_us"] = in_us

            if in_us:
                if len(parts) >= 2:
                    result["current_status"] = parts[1].upper()
                if len(parts) >= 3:
                    result["status_expires"] = parts[2]
                if len(parts) >= 4:
                    result["i94_number"] = parts[3] if parts[3].lower() != "n/a" else ""
                if len(parts) >= 5:
                    # Parse US address
                    result["us_address"] = parts[4]
            else:
                if len(parts) >= 2:
                    result["foreign_address"] = parts[1]
                if len(parts) >= 3:
                    result["consulate_city"] = parts[2]
                if len(parts) >= 4:
                    result["consulate_country"] = parts[3]

        return result

    def get_employment_questions(self) -> str:
        """Get employment-related questions."""
        return """
Employment Details:

1. Job title?
2. Employment start date (mm/dd/yyyy)?
3. Employment end date (mm/dd/yyyy)?
4. Full-time position? [Yes/No]
5. Include itinerary with petition? [Yes/No] (Required for P-1A)

Enter your answers (comma-separated):
"""

    def parse_employment_answers(self, response: str) -> dict:
        """Parse employment responses."""
        parts = [p.strip() for p in response.split(",")]
        result = {}

        if len(parts) >= 1:
            result["job_title"] = parts[0]
        if len(parts) >= 2:
            result["start_date"] = parts[1]
        if len(parts) >= 3:
            result["end_date"] = parts[2]
        if len(parts) >= 4:
            result["full_time"] = parts[3].lower() in ("yes", "y", "true", "1")
        if len(parts) >= 5:
            result["has_itinerary"] = parts[4].lower() in ("yes", "y", "true", "1")

        return result

    def get_visa_specific_questions(self) -> str:
        """Get visa-type specific questions."""
        visa = self.case.visa_type

        if visa == "O-1A":
            return """
O-1A Specific Questions:

1. Does appropriate labor organization exist for this petition? [Yes/No]
2. Is advisory opinion being submitted? [Yes/No/N/A]
3. Export control: Will petitioner release controlled technology to beneficiary? [No/Yes]

Enter your answers (comma-separated):
"""
        elif visa == "O-1B":
            return """
O-1B Specific Questions:

1. Does appropriate labor organization exist? [Yes/No]
2. Is advisory opinion from labor org being submitted? [Yes/No/N/A]
3. Is advisory opinion from management org being submitted? [Yes/No/N/A]

Enter your answers (comma-separated):
"""
        elif visa == "P-1A":
            return """
P-1A Specific Questions:

1. Is this Major League Sports (6+ teams, $10M+ revenue)? [Yes/No]
2. Does appropriate labor organization exist? [Yes/No]
3. Is required consultation being submitted? [Yes/No]

Enter your answers (comma-separated):
"""
        elif visa == "P-1B":
            return """
P-1B Specific Questions:

1. Entertainment group name?
2. Does appropriate labor organization exist? [Yes/No]
3. Is required consultation being submitted? [Yes/No]

Enter your answers (comma-separated):
"""
        else:
            return "No additional questions for this visa type.\n\nPress Enter to continue:"

    def parse_visa_specific_answers(self, response: str) -> dict:
        """Parse visa-specific responses."""
        parts = [p.strip() for p in response.split(",")]
        result = {}

        visa = self.case.visa_type

        if visa == "O-1A":
            if len(parts) >= 1:
                result["labor_org_exists"] = parts[0].lower() in ("yes", "y")
            if len(parts) >= 2:
                result["advisory_opinion"] = parts[1].lower() not in ("no", "n", "n/a")
            if len(parts) >= 3:
                result["export_license"] = parts[2].lower() in ("yes", "y")

        elif visa == "O-1B":
            if len(parts) >= 1:
                result["labor_org_exists"] = parts[0].lower() in ("yes", "y")
            if len(parts) >= 2:
                result["labor_advisory"] = parts[1].lower() not in ("no", "n", "n/a")
            if len(parts) >= 3:
                result["management_advisory"] = parts[2].lower() not in ("no", "n", "n/a")

        elif visa == "P-1A":
            if len(parts) >= 1:
                result["major_league"] = parts[0].lower() in ("yes", "y")
            if len(parts) >= 2:
                result["labor_org_exists"] = parts[1].lower() in ("yes", "y")
            if len(parts) >= 3:
                result["consultation_submitted"] = parts[2].lower() in ("yes", "y")

        elif visa == "P-1B":
            if len(parts) >= 1:
                result["group_name"] = parts[0]
            if len(parts) >= 2:
                result["labor_org_exists"] = parts[1].lower() in ("yes", "y")
            if len(parts) >= 3:
                result["consultation_submitted"] = parts[2].lower() in ("yes", "y")

        return result

    def apply_initial_answers(self, answers: dict):
        """Apply initial answers to case."""
        if "visa_type" in answers:
            self.case.visa_type = answers["visa_type"]

        if "first_name" in answers:
            self.case.beneficiary.first_name = answers["first_name"]
        if "last_name" in answers:
            self.case.beneficiary.last_name = answers["last_name"]
        if "middle_name" in answers:
            self.case.beneficiary.middle_name = answers["middle_name"]

        if "premium" in answers:
            self.case.premium_processing = answers["premium"]

        if "petitioner" in answers:
            self.case.petitioner_key = answers["petitioner"]

        if "include_g28" in answers:
            self.case.include_g28 = answers["include_g28"]
            if answers["include_g28"]:
                self.case.attorney = Attorney()

    def apply_attorney_answers(self, answers: dict):
        """Apply attorney answers to case."""
        if self.case.attorney is None:
            self.case.attorney = Attorney()

        for key, value in answers.items():
            if hasattr(self.case.attorney, key):
                setattr(self.case.attorney, key, value)

    def apply_personal_answers(self, answers: dict):
        """Apply personal info answers to case."""
        b = self.case.beneficiary
        for key, value in answers.items():
            if hasattr(b, key):
                setattr(b, key, value)

    def apply_location_answers(self, answers: dict):
        """Apply location answers to case."""
        b = self.case.beneficiary

        if "in_us" in answers:
            b.in_us = answers["in_us"]

        if b.in_us:
            if "current_status" in answers:
                b.current_status = answers["current_status"]
            if "status_expires" in answers:
                b.status_expires = answers["status_expires"]
            if "i94_number" in answers:
                b.i94_number = answers["i94_number"]
            if "us_address" in answers:
                # Simple address parsing
                b.us_address = Address(street=answers["us_address"])
        else:
            if "foreign_address" in answers:
                b.foreign_address = Address(street=answers["foreign_address"])
            if "consulate_city" in answers:
                self.case.processing.consulate_city = answers["consulate_city"]
            if "consulate_country" in answers:
                self.case.processing.consulate_country = answers["consulate_country"]
                b.foreign_address = b.foreign_address or Address()
                b.foreign_address.country = answers["consulate_country"]

    def apply_employment_answers(self, answers: dict):
        """Apply employment answers to case."""
        e = self.case.employment

        if "job_title" in answers:
            e.job_title = answers["job_title"]
        if "start_date" in answers:
            e.start_date = answers["start_date"]
        if "end_date" in answers:
            e.end_date = answers["end_date"]
        if "full_time" in answers:
            e.full_time = answers["full_time"]
        if "has_itinerary" in answers:
            e.has_itinerary = answers["has_itinerary"]

        # Apply standard text
        e.wage_amount = STANDARD_TEXT["wages"]
        e.wage_frequency = STANDARD_TEXT["wage_frequency"]
        e.other_compensation = STANDARD_TEXT["other_compensation"]

    def apply_visa_specific_answers(self, answers: dict):
        """Apply visa-specific answers to case."""
        if "labor_org_exists" in answers:
            self.case.labor_org_exists = answers["labor_org_exists"]
        if "advisory_opinion" in answers:
            self.case.advisory_opinion_submitted = answers["advisory_opinion"]
        if "export_license" in answers:
            self.case.processing.export_license_required = answers["export_license"]
        if "group_name" in answers:
            self.case.entertainment_group_name = answers["group_name"]

    def to_json(self) -> str:
        """Export case data to JSON."""
        p = get_petitioner(self.case.petitioner_key)
        b = self.case.beneficiary
        e = self.case.employment

        data = {
            "visa_type": self.case.visa_type,
            "premium_processing": self.case.premium_processing,
            "petitioner": {
                "company": p.company if p else "",
                "fein": p.fein if p else "",
                "contact": p.contact_full_name() if p else "",
                "address": p.format_mailing_address() if p else "",
                "phone": p.phone if p else "",
                "email": p.email if p else "",
            } if p else {},
            "beneficiary": {
                "last_name": b.last_name,
                "first_name": b.first_name,
                "middle_name": b.middle_name,
                "dob": b.dob,
                "sex": b.sex,
                "citizenship": b.citizenship,
                "birth_country": b.birth_country,
                "passport_number": b.passport_number,
                "passport_issued": b.passport_issued,
                "passport_expires": b.passport_expires,
                "passport_country": b.passport_country,
                "in_us": b.in_us,
                "current_status": b.current_status,
                "status_expires": b.status_expires,
            },
            "employment": {
                "job_title": e.job_title,
                "start_date": e.start_date,
                "end_date": e.end_date,
                "full_time": e.full_time,
                "wage_amount": e.wage_amount,
                "wage_frequency": e.wage_frequency,
            },
            "processing": {
                "consulate_city": self.case.processing.consulate_city,
                "consulate_country": self.case.processing.consulate_country,
            },
            "completion_percentage": get_completion_status(self.case)["overall"],
            "forms_needed": self.case.get_forms_needed(),
            "fees": self.case.calculate_fees(),
        }

        if self.case.include_g28 and self.case.attorney:
            a = self.case.attorney
            data["attorney"] = {
                "name": a.full_name(),
                "bar_number": a.bar_number,
                "licensing_authority": a.licensing_authority,
                "law_firm": a.law_firm,
                "email": a.email,
                "phone": a.phone,
            }

        return json.dumps(data, indent=2)
