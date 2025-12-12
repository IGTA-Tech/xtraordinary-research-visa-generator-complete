"""
Petitioner data model and pre-loaded petitioner configurations.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Petitioner:
    """
    Information about the petitioning organization.
    For O/P visas, this is typically a talent agency or sports organization.
    """
    # Organization info
    company: str = ""
    fein: str = ""  # Federal Employer Identification Number
    is_nonprofit: bool = False
    year_established: str = ""
    type_of_business: str = ""

    # Contact person
    contact_last_name: str = ""
    contact_first_name: str = ""
    contact_middle_name: str = ""
    contact_title: str = ""

    # Mailing address (where notices go)
    mailing_street: str = ""
    mailing_apt_ste_flr: str = ""  # "Apt", "Ste", or "Flr"
    mailing_unit: str = ""
    mailing_city: str = ""
    mailing_state: str = ""
    mailing_zip: str = ""
    mailing_country: str = "USA"

    # Physical address (if different from mailing)
    physical_street: str = ""
    physical_apt_ste_flr: str = ""
    physical_unit: str = ""
    physical_city: str = ""
    physical_state: str = ""
    physical_zip: str = ""
    physical_country: str = "USA"
    same_as_mailing: bool = False

    # Contact info
    phone: str = ""
    mobile: str = ""
    email: str = ""
    fax: str = ""

    # Business info
    gross_annual_income: str = "Private"
    net_annual_income: str = "Private"
    num_employees: int = 2

    def contact_full_name(self) -> str:
        """Return contact person's full name."""
        parts = [self.contact_first_name]
        if self.contact_middle_name and self.contact_middle_name not in ("N/A", "NA", ""):
            parts.append(self.contact_middle_name)
        parts.append(self.contact_last_name)
        return " ".join(parts)

    def format_mailing_address(self) -> str:
        """Format mailing address for display."""
        parts = [self.mailing_street]
        if self.mailing_apt_ste_flr and self.mailing_unit:
            parts[0] += f" {self.mailing_apt_ste_flr} {self.mailing_unit}"
        parts.append(f"{self.mailing_city}, {self.mailing_state} {self.mailing_zip}")
        return ", ".join(parts)

    def has_physical_address(self) -> bool:
        """Check if physical address is provided and different from mailing."""
        return bool(self.physical_street) and not self.same_as_mailing


# Pre-loaded petitioner data from sample forms
PETITIONERS = {
    "igta": Petitioner(
        company="Innovative Global Talent Agency LLC",
        fein="99-1132430",
        is_nonprofit=False,
        year_established="2024",
        type_of_business="Talent Agency",
        # Contact
        contact_last_name="Wilks",
        contact_first_name="Lanita",
        contact_middle_name="",
        contact_title="Human Resources",
        # Mailing address
        mailing_street="1069 Sycamore Green Pl",
        mailing_apt_ste_flr="",
        mailing_unit="",
        mailing_city="Charlotte",
        mailing_state="NC",
        mailing_zip="28202",
        mailing_country="USA",
        # Physical address
        physical_street="1500 Gateway Blvd",
        physical_apt_ste_flr="Ste",
        physical_unit="220",
        physical_city="Boynton Beach",
        physical_state="FL",
        physical_zip="33426",
        physical_country="USA",
        same_as_mailing=False,
        # Contact info
        phone="5612035863",
        mobile="5612035863",
        email="info@innovativeglobaltalent.com",
        fax="",
        # Business info
        gross_annual_income="Private",
        net_annual_income="Private",
        num_employees=2,
    ),

    "accelerator": Petitioner(
        company="Innovative Global Accelerator Studios LLC",
        fein="41-2457146",
        is_nonprofit=False,
        year_established="2024",
        type_of_business="Entertainment Studio",
        # Contact
        contact_last_name="Davis",
        contact_first_name="Andre",
        contact_middle_name="",
        contact_title="Manager",
        # Mailing address
        mailing_street="1069 Sycamore Green Place",
        mailing_apt_ste_flr="",
        mailing_unit="",
        mailing_city="Charlotte",
        mailing_state="NC",
        mailing_zip="28202",
        mailing_country="USA",
        # Physical (same as mailing for this one)
        physical_street="",
        physical_apt_ste_flr="",
        physical_unit="",
        physical_city="",
        physical_state="",
        physical_zip="",
        physical_country="USA",
        same_as_mailing=True,
        # Contact info
        phone="5612035863",
        mobile="5612035863",
        email="info@innovativeglobaltalent.com",
        fax="",
        # Business info
        gross_annual_income="Private",
        net_annual_income="Private",
        num_employees=2,
    ),

    # Trackhouse from sample forms (for reference/future use)
    "trackhouse": Petitioner(
        company="Trackhouse Entertainment Group LLC",
        fein="32-0782570",
        is_nonprofit=False,
        year_established="",
        type_of_business="Entertainment",
        # Contact
        contact_last_name="Corsnitz",
        contact_first_name="Karen",
        contact_middle_name="",
        contact_title="HR Manager",
        # Mailing address
        mailing_street="1131 4th Avenue South",
        mailing_apt_ste_flr="Ste",
        mailing_unit="301",
        mailing_city="Nashville",
        mailing_state="TN",
        mailing_zip="37210",
        mailing_country="USA",
        # Physical (same)
        same_as_mailing=True,
        # Contact info
        phone="7042351174",
        mobile="7042351174",
        email="kcorsnitz@trackhouse.com",
        fax="",
        gross_annual_income="Private",
        net_annual_income="Private",
        num_employees=25,
    ),
}


def get_petitioner(key: str) -> Optional[Petitioner]:
    """Get a petitioner by key."""
    return PETITIONERS.get(key.lower())


def list_petitioners() -> list:
    """List available petitioner keys and names."""
    return [(k, p.company) for k, p in PETITIONERS.items()]
