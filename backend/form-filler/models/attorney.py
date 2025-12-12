"""
Attorney/Accredited Representative data model for G-28 form.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Attorney:
    """
    Information about the attorney or accredited representative.
    Used to fill G-28 (Notice of Entry of Appearance).
    """
    # Part 1 - Attorney Info
    uscis_account: str = ""

    # Name
    last_name: str = ""
    first_name: str = ""
    middle_name: str = ""

    # Address
    street: str = ""
    apt_ste_flr: str = ""  # "Apt", "Ste", or "Flr"
    unit_number: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    province: str = ""
    postal_code: str = ""
    country: str = "USA"

    # Contact
    phone: str = ""
    mobile: str = ""
    email: str = ""
    fax: str = ""

    # Part 2 - Eligibility
    is_attorney: bool = True  # True = attorney, False = accredited rep
    licensing_authority: str = ""  # e.g., "North Carolina", "Florida"
    bar_number: str = ""
    not_suspended: bool = True  # "am not" subject to suspension orders
    law_firm: str = ""

    # For accredited representatives only
    recognized_org: str = ""
    accreditation_date: str = ""  # mm/dd/yyyy

    # Associated attorney (for limited appearances)
    is_associated: bool = False
    associated_with: str = ""

    # Law student/graduate
    is_law_student: bool = False
    law_student_name: str = ""

    def full_name(self) -> str:
        """Return full name."""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(parts)

    def format_address(self) -> str:
        """Format address for display."""
        parts = [self.street]
        if self.apt_ste_flr and self.unit_number:
            parts[0] += f" {self.apt_ste_flr} {self.unit_number}"
        parts.append(f"{self.city}, {self.state} {self.zip_code}")
        if self.country and self.country.upper() not in ("USA", "US"):
            parts.append(self.country)
        return ", ".join(p for p in parts if p.strip())

    def get_g28_forms_list(self, premium_processing: bool = True) -> str:
        """
        Return the form numbers string for G-28 Part 3.1b.
        e.g., "I-129, I-907" or "I-129"
        """
        forms = ["I-129"]
        if premium_processing:
            forms.append("I-907")
        return ", ".join(forms)


# Pre-loaded attorney configurations
ATTORNEYS = {
    "sherrod": Attorney(
        # Name
        last_name="Sherrod",
        first_name="Thomas",
        middle_name="",
        # Address - UPDATE WITH ACTUAL ADDRESS
        street="1069 Sycamore Green Pl",
        apt_ste_flr="",
        unit_number="",
        city="Charlotte",
        state="NC",
        zip_code="28202",
        country="USA",
        # Contact
        phone="5612035863",
        mobile="5612035863",
        email="info@sherrodsportsvisas.com",
        fax="",
        # Eligibility
        is_attorney=True,
        licensing_authority="North Carolina",
        bar_number="",  # UPDATE WITH ACTUAL BAR NUMBER
        not_suspended=True,
        law_firm="Sherrod Sports Visas",
    ),

    "igta_counsel": Attorney(
        # Name - UPDATE WITH ACTUAL ATTORNEY INFO
        last_name="",
        first_name="",
        middle_name="",
        # Address
        street="1069 Sycamore Green Pl",
        apt_ste_flr="",
        unit_number="",
        city="Charlotte",
        state="NC",
        zip_code="28202",
        country="USA",
        # Contact
        phone="5612035863",
        mobile="5612035863",
        email="legal@innovativeglobaltalent.com",
        fax="",
        # Eligibility
        is_attorney=True,
        licensing_authority="",
        bar_number="",
        not_suspended=True,
        law_firm="Innovative Global Talent Agency LLC",
    ),
}


def get_attorney(key: str):
    """Get a pre-loaded attorney by key."""
    return ATTORNEYS.get(key.lower())


def list_attorneys() -> list:
    """List available attorney keys and names."""
    return [(k, f"{a.full_name()} - {a.law_firm}") for k, a in ATTORNEYS.items() if a.last_name]


