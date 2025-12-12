"""
Field mapper for O and P Classifications Supplement to Form I-129.
Maps case data to the O/P supplement section (pages 28-30 of I-129).

Field names verified against actual USCIS I-129 PDF form.
"""

from typing import Dict, Any
from ..models.case import Case
from ..models.petitioner import get_petitioner


# Standard text for O/P supplement fields
STANDARD_TEXT = "Please see the information included with this petition."


def map_op_supplement_fields(case: Case) -> Dict[str, Any]:
    """
    Map case data to O/P Supplement form field values.
    Returns a dictionary of field_id -> value pairs.

    Note: These fields are part of the I-129 form (pages 28-30).
    """
    p = get_petitioner(case.petitioner_key)
    b = case.beneficiary

    fields = {}

    # ===== SECTION 1: O OR P CLASSIFICATION =====

    # Item 1 - Petitioner Name (Line1_PetitionerName[1] for O/P supp)
    if p:
        fields["Line1_PetitionerName[1]"] = p.company

    # Item 2 - Beneficiary Name / Number of Beneficiaries
    fields["Line2_BeneficiaryName[1]"] = b.full_name()
    fields["Line2_TtlNumberofBeneficiaries[1]"] = "1"

    # Item 3 - Classification Sought (checkboxes)
    # The O/P classification checkboxes - need to find the exact field names
    # For now, we'll use a text field approach
    fields["Line3[0]"] = case.visa_type

    # Item 4 - Nature of Event
    fields["Line4[0]"] = STANDARD_TEXT

    # Item 5 - Duties
    fields["Line5[0]"] = STANDARD_TEXT
    fields["Line1_Duties[1]"] = STANDARD_TEXT

    # Item 7 - Ownership Interest
    if case.has_ownership_interest:
        fields["OandPSuppLine7_Yes[0]"] = "1"
    else:
        fields["OandPSuppLine7_No[0]"] = "1"

    # Item 8 - Does labor organization exist?
    if case.labor_org_exists:
        fields["OandPSuppLine8[0]"] = "1"  # Yes
    else:
        fields["OandPSuppLine8[1]"] = "1"  # No

    # Items 10-13 - Organization Info (if advisory opinion not submitted)
    # These are the peer group consultation fields
    if not case.advisory_opinion_submitted and not case.labor_org_exists:
        fields["LSuppLine10a_NameofPeer[0]"] = "N/A"
        fields["LSuppLine11a_NameofPeer[0]"] = "N/A"
        fields["LSuppLine12a_NameofPeer[0]"] = "N/A"
        fields["LSuppLine13a_NameofPeer[0]"] = "N/A"

    # ===== SECTION 2: STATEMENT BY PETITIONER =====
    # Item 1 - Petitioner Name
    if p:
        fields["Line1_FamilyName[5]"] = p.contact_last_name
        fields["Line1_GivenName[2]"] = p.contact_first_name
        fields["Line1_MiddleName[2]"] = p.contact_middle_name or ""

        # Contact Info
        fields["Pt7Line3_DaytimePhoneNumber1[1]"] = p.phone
        fields["Pt7Line3_EmailAddress[1]"] = p.email

    return fields


def get_op_supplement_checkbox_for_visa(visa_type: str) -> str:
    """
    Get the checkbox field ID for a given visa type.
    Returns the field ID that should be checked.
    """
    checkbox_map = {
        "O-1A": "3.a",
        "O-1B": "3.b",
        "O-2": "3.c",
        "P-1A": "3.e",
        "P-1B": "3.e",
        "P-1S": "3.f",
        "P-2": "3.g",
        "P-2S": "3.h",
        "P-3": "3.i",
        "P-3S": "3.j",
    }
    return checkbox_map.get(visa_type, "")
