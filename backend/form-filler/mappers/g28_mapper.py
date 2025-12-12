"""
Field mapper for G-28 (Notice of Entry of Appearance as Attorney).
Maps attorney and case data to PDF form field IDs.
"""

from typing import Dict, Any
from ..models.case import Case
from ..models.petitioner import get_petitioner


def map_g28_fields(case: Case) -> Dict[str, Any]:
    """
    Map case data to G-28 form field values.
    Returns a dictionary of field_id -> value pairs.
    """
    a = case.attorney
    p = get_petitioner(case.petitioner_key)
    b = case.beneficiary

    fields = {}

    if not a:
        return fields

    # ===== PART 1: ATTORNEY INFORMATION =====
    # Item 1 - USCIS Online Account Number
    fields["Pt1Line1_USCISOnlineAcctNumber[0]"] = a.uscis_account or ""

    # Item 2 - Attorney Name
    fields["Pt1Line2a_FamilyName[0]"] = a.last_name
    fields["Pt1Line2b_GivenName[0]"] = a.first_name
    fields["Pt1Line2c_MiddleName[0]"] = a.middle_name or ""

    # Item 3 - Address
    fields["Line3_NameofAttorneyOrRep[0]"] = a.full_name()
    fields["Line3a_StreetNumber[0]"] = a.street
    if a.apt_ste_flr:
        if a.apt_ste_flr.lower() == "ste":
            fields["Line3b_Unit[1]"] = "1"  # Ste checkbox
        elif a.apt_ste_flr.lower() == "apt":
            fields["Line3b_Unit[0]"] = "1"  # Apt checkbox
        elif a.apt_ste_flr.lower() == "flr":
            fields["Line3b_Unit[2]"] = "1"  # Flr checkbox
    fields["Line3b_AptSteFlrNumber[0]"] = a.unit_number or ""
    fields["Line3c_CityOrTown[0]"] = a.city
    fields["Line3d_State[0]"] = a.state
    fields["Line3e_ZipCode[0]"] = a.zip_code
    fields["Line3f_Province[0]"] = a.province or ""
    fields["Line3g_PostalCode[0]"] = a.postal_code or ""
    fields["Line3h_Country[0]"] = a.country or "USA"

    # Item 4-7 - Contact Info
    fields["Line4_DaytimeTelephoneNumber[0]"] = a.phone
    fields["Line7_MobileTelephoneNumber[0]"] = a.mobile or ""
    fields["Line6_EMail[0]"] = a.email
    fields["Pt1ItemNumber7_FaxNumber[0]"] = a.fax or ""

    # ===== PART 2: ELIGIBILITY INFORMATION =====
    if a.is_attorney:
        # Item 1a - Attorney eligible to practice
        fields["CheckBox1[0]"] = "1"  # I am an attorney...
        fields["Pt2Line1a_LicensingAuthority[0]"] = a.licensing_authority
        fields["Pt2Line1b_BarNumber[0]"] = a.bar_number

        # Item 1c - Not subject to suspension
        if a.not_suspended:
            fields["Checkbox1dAmNot[0]"] = "1"
        else:
            fields["Checkbox1dAm[0]"] = "1"

        # Item 1d - Law Firm
        fields["Pt2Line1d_NameofFirmOrOrganization[0]"] = a.law_firm or ""
    else:
        # Accredited Representative
        fields["CheckBox2[0]"] = "1"
        fields["Line2b_NameofOrganization[0]"] = a.recognized_org
        fields["Line2c_DateExpires[0]"] = a.accreditation_date

    # Item 3 - Associated attorney (usually not checked)
    if a.is_associated:
        fields["CheckBox3[0]"] = "1"

    # Item 4 - Law student (usually not checked)
    if a.is_law_student:
        fields["CheckBox4[0]"] = "1"
        fields["Line4b_LawStudent[0]"] = a.law_student_name

    # ===== PART 3: NOTICE OF APPEARANCE =====
    # Item 1a - USCIS checkbox
    fields["Line1a_USCIS[0]"] = "1"

    # Item 1b - Form numbers
    forms = ["I-129"]
    if case.premium_processing:
        forms.append("I-907")
    fields["Line1b_ListFormNumber[0]"] = ", ".join(forms)

    # Item 4 - Receipt Number (blank for new filing)
    fields["Pt3Line4_ReceiptNumber[0]"] = b.prior_receipt or ""

    # Item 5 - Appearance on behalf of Petitioner
    fields["Line4_Checkbox[1]"] = "1"  # Petitioner checkbox

    # Items 6 - Client Info (Petitioner contact)
    if p:
        fields["Pt3Line5a_FamilyName[0]"] = p.contact_last_name
        fields["Pt3Line5b_GivenName[0]"] = p.contact_first_name
        fields["Pt3Line5c_MiddleName[0]"] = p.contact_middle_name or ""

        # Item 7 - Entity Info
        fields["Pt3Line7a_NameOfEntity[0]"] = p.company
        fields["Pt3Line7b_TitleofEntity[0]"] = p.contact_title

        # Item 8 - Client USCIS Account (usually blank)
        fields["Pt3Line8_USCISOnlineAcctNumber[0]"] = ""

        # Item 9 - Client A-Number (usually blank for petitioner)
        fields["Pt3Line9_ANumber[0]"] = ""

        # Items 9-12 - Client Contact
        fields["Line9_DaytimeTelephoneNumber[0]"] = p.phone
        fields["Line10_MobileTelephoneNumber[0]"] = p.mobile or ""
        fields["Line11_EMail[0]"] = p.email

        # Item 13 - Client Mailing Address
        fields["Line12a_StreetNumberName[0]"] = p.mailing_street
        if p.mailing_apt_ste_flr:
            if p.mailing_apt_ste_flr.lower() == "ste":
                fields["Line12b_Unit[1]"] = "1"
            elif p.mailing_apt_ste_flr.lower() == "apt":
                fields["Line12b_Unit[0]"] = "1"
            elif p.mailing_apt_ste_flr.lower() == "flr":
                fields["Line12b_Unit[2]"] = "1"
        fields["Line12b_AptSteFlrNumber[0]"] = p.mailing_unit or ""
        fields["Line12c_CityOrTown[0]"] = p.mailing_city
        fields["Line12d_State[0]"] = p.mailing_state
        fields["Line12e_ZipCode[0]"] = p.mailing_zip
        fields["Line12f_Province[0]"] = ""
        fields["Line12g_PostalCode[0]"] = ""
        fields["Line12h_Country[0]"] = p.mailing_country

    # ===== PART 4: CLIENT CONSENT =====
    # Usually just signatures - no pre-fill needed

    # ===== PART 6: ADDITIONAL INFO (if needed) =====
    # Usually N/A for standard filings

    return fields
