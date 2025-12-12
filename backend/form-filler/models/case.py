"""
Core data models for visa case management.
Supports O-1A, O-1B, P-1A, P-1B visa classifications.
"""

from dataclasses import dataclass, field
from typing import Literal, Optional, List
from datetime import datetime


@dataclass
class Address:
    """Physical or mailing address."""
    street: str = ""
    apt_ste_flr: str = ""  # "Apt", "Ste", or "Flr"
    unit_number: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    province: str = ""
    postal_code: str = ""
    country: str = ""

    def is_us_address(self) -> bool:
        return self.country.upper() in ("USA", "US", "UNITED STATES", "")

    def format_full(self) -> str:
        """Format address for display."""
        parts = [self.street]
        if self.apt_ste_flr and self.unit_number:
            parts[0] += f" {self.apt_ste_flr} {self.unit_number}"
        parts.append(f"{self.city}, {self.state} {self.zip_code}")
        if self.country and self.country.upper() not in ("USA", "US"):
            parts.append(self.country)
        return ", ".join(p for p in parts if p.strip())


@dataclass
class Beneficiary:
    """Information about the visa beneficiary (the person receiving the visa)."""
    # Name
    last_name: str = ""
    first_name: str = ""
    middle_name: str = "N/A"

    # Other names (aliases, maiden name, etc.)
    other_names: List[dict] = field(default_factory=list)

    # Personal info
    dob: str = ""  # mm/dd/yyyy
    sex: Literal["Male", "Female"] = "Male"

    # Country info
    citizenship: str = ""
    birth_country: str = ""
    birth_province: str = ""

    # Passport
    passport_number: str = ""
    passport_issued: str = ""  # mm/dd/yyyy
    passport_expires: str = ""  # mm/dd/yyyy
    passport_country: str = ""

    # USCIS identifiers
    a_number: str = ""
    uscis_account: str = ""
    ssn: str = ""
    sevis_number: str = ""
    ead_number: str = ""

    # Current US status (if in US)
    in_us: bool = False
    date_last_arrival: str = ""  # mm/dd/yyyy
    i94_number: str = ""
    current_status: str = ""  # P1, O1, B1/B2, etc.
    status_expires: str = ""  # mm/dd/yyyy or "D/S"

    # Addresses
    us_address: Optional[Address] = None
    foreign_address: Optional[Address] = None

    # Prior petition
    prior_receipt: str = ""  # Previous petition receipt number

    def full_name(self) -> str:
        """Return full legal name."""
        parts = [self.first_name]
        if self.middle_name and self.middle_name != "N/A":
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(parts)

    def name_for_filename(self) -> str:
        """Return name suitable for filename."""
        return f"{self.first_name}_{self.last_name}".replace(" ", "_")


@dataclass
class Employment:
    """Information about the proposed employment."""
    job_title: str = ""
    start_date: str = ""  # mm/dd/yyyy
    end_date: str = ""    # mm/dd/yyyy
    full_time: bool = True
    hours_per_week: int = 40

    # Wages - usually "See petition" for O/P visas
    wage_amount: str = "See petition"
    wage_frequency: str = "Year"
    other_compensation: str = "Please see the information included with this petition."

    # Work location (if different from petitioner address)
    work_addresses: List[Address] = field(default_factory=list)
    is_third_party: bool = False
    third_party_name: str = ""

    # Itinerary (required for P-1A)
    has_itinerary: bool = False


@dataclass
class Processing:
    """Information about petition processing."""
    # Basis for classification
    action: Literal[
        "new_employment",
        "continuation",
        "change_in_employment",
        "concurrent",
        "change_employer",
        "amended"
    ] = "new_employment"

    # Requested action
    request_type: Literal[
        "notify_consulate",  # Beneficiary outside US
        "change_status",     # Change from another status
        "extend_stay",       # Already has this status
        "amend_stay"         # Amend without additional time
    ] = "notify_consulate"

    # Consulate info (if outside US)
    consulate_city: str = ""
    consulate_country: str = ""

    # Export control certification (O-1A only)
    export_license_required: bool = False  # Usually False


VisaType = Literal["O-1A", "O-1B", "P-1A", "P-1B", "O-2", "P-1S", "O-3", "P-4"]


@dataclass
class Case:
    """
    Complete visa case containing all information needed to fill forms.
    """
    # Core info
    visa_type: VisaType = "O-1A"
    premium_processing: bool = True

    # Petitioner (will reference Petitioner object)
    petitioner_key: str = "igta"  # Key to look up in PETITIONERS

    # Attorney (optional)
    include_g28: bool = False
    attorney: Optional["Attorney"] = None

    # Beneficiary
    beneficiary: Beneficiary = field(default_factory=Beneficiary)

    # Employment
    employment: Employment = field(default_factory=Employment)

    # Processing
    processing: Processing = field(default_factory=Processing)

    # O/P Supplement specific
    entertainment_group_name: str = ""  # For P-1B
    has_ownership_interest: bool = False
    labor_org_exists: bool = False  # Usually False for athletes
    advisory_opinion_submitted: bool = False

    # Tracking
    completion_percentage: int = 0
    critical_missing: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def get_forms_needed(self) -> List[str]:
        """Return list of forms needed for this case."""
        forms = []
        if self.include_g28:
            forms.append("G-28")
        forms.append("G-1450")  # Credit card form
        if self.premium_processing:
            forms.append("I-907")
        forms.append("I-129")  # Always needed
        return forms

    def calculate_fees(self) -> dict:
        """Calculate filing fees."""
        fees = {"I-129": 460}
        if self.premium_processing:
            fees["I-907"] = 2805
        fees["Total"] = sum(fees.values())
        return fees

    def get_visa_display_name(self) -> str:
        """Get human-readable visa type description."""
        names = {
            "O-1A": "O-1A Extraordinary Ability (Sciences/Business/Athletics)",
            "O-1B": "O-1B Extraordinary Achievement (Arts/Entertainment)",
            "P-1A": "P-1A Internationally Recognized Athlete",
            "P-1B": "P-1B Internationally Recognized Entertainment Group",
            "O-2": "O-2 Essential Support Personnel (O-1)",
            "P-1S": "P-1S Essential Support Personnel (P-1)",
            "O-3": "O-3 Dependent of O-1/O-2",
            "P-4": "P-4 Dependent of P-1/P-2/P-3",
        }
        return names.get(self.visa_type, self.visa_type)


# Import Attorney here to avoid circular import
from .attorney import Attorney
