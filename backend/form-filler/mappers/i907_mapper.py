"""
Field mapper for I-907 (Request for Premium Processing Service).
Maps case data to PDF form field IDs.

Field names verified against actual USCIS I-907 PDF form.
"""

from typing import Dict, Any
from ..models.case import Case
from ..models.petitioner import get_petitioner


def map_i907_fields(case: Case) -> Dict[str, Any]:
    """
    Map case data to I-907 form field values.
    Returns a dictionary of field_id -> value pairs.
    """
    p = get_petitioner(case.petitioner_key)
    b = case.beneficiary

    fields = {}

    # ===== PART 1: PERSON FILING THIS REQUEST =====
    # Items 1-2 (A-Number and USCIS Account - usually blank for new petitions)
    fields["Pt1Line1_AlienRegistrationNumber[0]"] = ""
    fields["Pt1Line2_USCISOnlineActNumber[0]"] = ""

    # Item 3 - Name (N/A for organization filing)
    fields["Pt1Line3_FamilyName[0]"] = "NA"
    fields["Pt1Line3_GivenName[0]"] = "NA"
    fields["Pt1Line3_MiddleName[0]"] = "NA"

    # Item 4 - Company Name
    if p:
        fields["Part1_Line4_CompanyorOrganizationName[0]"] = p.company

        # Item 5 - Mailing Address
        fields["Part1_Line5_MailingAddress_InCareofName[0]"] = p.contact_full_name()
        fields["Part1_Line5_MailingAddress_StreetNumberName[0]"] = p.mailing_street
        if p.mailing_apt_ste_flr:
            if p.mailing_apt_ste_flr.lower() == "ste":
                fields["Part1_Line5_MailingAddress_Unit[1]"] = "1"
            elif p.mailing_apt_ste_flr.lower() == "apt":
                fields["Part1_Line5_MailingAddress_Unit[0]"] = "1"
            elif p.mailing_apt_ste_flr.lower() == "flr":
                fields["Part1_Line5_MailingAddress_Unit[2]"] = "1"
        fields["Part1_Line5_MailingAddress_AptSteFlrNumber[0]"] = p.mailing_unit or ""
        fields["Part1_Line5_MailingAddress_CityTown[0]"] = p.mailing_city
        fields["Part1_Line5_MailingAddress_State[0]"] = p.mailing_state
        fields["Part1_Line5_MailingAddress_ZipCode[0]"] = p.mailing_zip
        fields["Part1_Line5_MailingAddress_Country[0]"] = p.mailing_country

    # Item 6 - Same as physical address
    if p and p.has_physical_address():
        fields["Part1Line6_Checkbox[1]"] = "1"  # No - different address
        # Item 7 - Physical Address
        fields["Part1_Line7_PhysicalAddress_StreetNumberName[0]"] = p.physical_street
        if p.physical_apt_ste_flr:
            if p.physical_apt_ste_flr.lower() == "ste":
                fields["Part1_Line7_PhysicalAddress_Unit[1]"] = "1"
            elif p.physical_apt_ste_flr.lower() == "apt":
                fields["Part1_Line7_PhysicalAddress_Unit[0]"] = "1"
            elif p.physical_apt_ste_flr.lower() == "flr":
                fields["Part1_Line7_PhysicalAddress_Unit[2]"] = "1"
        fields["Part1_Line7_PhysicalAddress_AptSteFlrNumber[0]"] = p.physical_unit or ""
        fields["Part1_Line7_PhysicalAddress_CityTown[0]"] = p.physical_city
        fields["Part1_Line7_PhysicalAddress_State[0]"] = p.physical_state
        fields["Part1_Line7_PhysicalAddress_ZipCode[0]"] = p.physical_zip
        fields["Part1_Line7_PhysicalAddress_Country[0]"] = p.physical_country
    else:
        fields["Part1Line6_Checkbox[0]"] = "1"  # Yes - same as mailing

    # Item 8 - Request for Premium Processing (Petitioner checkbox)
    fields["Part1_Line8_CheckBox[0]"] = "1"  # Petitioner/Applicant

    # Item 8 - Point of Contact Info
    if p:
        fields["Part1_Line8_NameOfCompanyPOC_FamilyName[0]"] = p.contact_last_name
        fields["Part1_Line8_NameOfCompanyPOC_GivenName[0]"] = p.contact_first_name
        fields["Part1_Line8_NameOfCompanyPOC_MiddleName[0]"] = p.contact_middle_name or ""
        fields["Part1_Line8_NameOfCompanyPOC_TitleofPOC[0]"] = p.contact_title

        # Item 9 - EIN
        fields["Part1_Line9_CompanyIRSTaxNumber[0]"] = p.fein

    # ===== PART 2: INFORMATION ABOUT THE REQUEST =====
    # Item 1 - Form Number
    fields["P2_Line1_FormNumberof[0]"] = "I-129"

    # Item 2 - Receipt Number (blank for concurrent filing)
    fields["P2_Line2_ReceiptNumberof[0]"] = ""

    # Item 2 - Classification
    fields["P2_Line2_ClassorEligRequested[0]"] = case.visa_type

    # Item 4 - Petitioner/Applicant Name
    if p:
        fields["Part2_Line4_PetitionerApplicantFamilyName[0]"] = p.contact_last_name
        fields["Part2_Line4_PetitionerApplicantGivenName[0]"] = p.contact_first_name
        fields["Part2_Line4_PetitionerApplicantMiddleName[0]"] = p.contact_middle_name or "NA"

    # Item 5 - Beneficiary Name
    fields["Line_FamilyName[0]"] = b.last_name
    fields["Line_GivenName[0]"] = b.first_name
    fields["Line_MiddleName[0]"] = b.middle_name if b.middle_name != "N/A" else "NA"

    # ===== PART 3: REQUESTOR'S STATEMENT =====
    # Item 1.A - Can read English
    fields["P3_Line1_Checkbox[0]"] = "1"  # Can read English

    # Items 4-6 - Contact Info
    if p:
        fields["P3_Line4_DaytimeTelePhoneNumber[0]"] = p.phone
        fields["P3_Line5_MobileTelePhoneNumber[0]"] = p.mobile
        fields["P3_Line6_Email[0]"] = p.email

    # ===== PART 4: INTERPRETER (N/A) =====
    fields["P4_Line1_InterpreterFamilyName[0]"] = "N/A"
    fields["P4_Line1_InterpreterGivenName[0]"] = "N/A"
    fields["P4_Line2_NameofBusinessorOrgName[0]"] = "N/A"
    fields["P4_Line3_StreetNumberName[0]"] = "N/A"
    fields["P4_Line3_CityTown[0]"] = "N/A"
    fields["P4_Line3_Country[0]"] = "N/A"
    fields["P4_Line4_DaytimeTelePhoneNumber[0]"] = "N/A"
    fields["P4_Line5_Email[0]"] = "N/A"

    # ===== PART 5: PREPARER (N/A) =====
    fields["P5_Line1_PreparerFamilyName[0]"] = "N/A"
    fields["P5_Line1_PreparerGivenName[0]"] = "N/A"
    fields["P5_Line2_NameofBusinessorOrgName[0]"] = "N/A"
    fields["P5_Line3_StreetNumberName[0]"] = "N/A"
    fields["P5_Line3_CityTown[0]"] = "N/A"
    fields["P5_Line3_Country[0]"] = "N/A"
    fields["P5_Line4_DaytimeTelePhoneNumber[0]"] = "N/A"
    fields["P5_Line6_EmailAddress[0]"] = "N/A"

    # ===== PART 9: ADDITIONAL INFO (N/A) =====
    fields["Pt9Line3a_PageNumber[0]"] = "NA"
    fields["Pt9Line3b_PartNumber[0]"] = "N/A"
    fields["Pt9Line3c_ItemNumber[0]"] = "N/A"
    fields["Pt9Line3d_AdditionalInfo[0]"] = "N/A"

    return fields
