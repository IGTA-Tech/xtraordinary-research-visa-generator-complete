"""
Field mapper for I-129 (Petition for Nonimmigrant Worker).
Maps case data to PDF form field IDs.

Field names verified against actual USCIS I-129 PDF form.
"""

from typing import Dict, Any
from ..models.case import Case
from ..models.petitioner import get_petitioner


def map_i129_fields(case: Case) -> Dict[str, Any]:
    """
    Map case data to I-129 form field values.
    Returns a dictionary of field_id -> value pairs.
    """
    p = get_petitioner(case.petitioner_key)
    b = case.beneficiary
    e = case.employment
    proc = case.processing

    fields = {}

    # ===== PART 1: PETITIONER INFORMATION (subform[0]) =====
    # Item 1 - Individual Petitioner Name (N/A for org filing)
    fields["Line1_FamilyName[0]"] = "N/A"
    fields["Line1_GivenName[0]"] = "N/A"
    fields["Line1_MiddleName[0]"] = "N/A"

    # Item 2 - Company Name (Line3 in actual form)
    if p:
        fields["Line3_CompanyorOrgName[0]"] = p.company

        # Item 3 - Mailing Address
        fields["Line7a_InCareofName[0]"] = p.contact_full_name()
        fields["Line7b_StreetNumberName[0]"] = p.mailing_street
        if p.mailing_apt_ste_flr:
            if p.mailing_apt_ste_flr.lower() == "ste":
                fields["Line3_Unit[1]"] = "1"
            elif p.mailing_apt_ste_flr.lower() == "apt":
                fields["Line3_Unit[0]"] = "1"
            elif p.mailing_apt_ste_flr.lower() == "flr":
                fields["Line3_Unit[2]"] = "1"
        fields["Line3_AptSteFlrNumber[0]"] = p.mailing_unit or ""
        fields["Line_CityTown[0]"] = p.mailing_city
        fields["P1_Line3_State[0]"] = p.mailing_state
        fields["P1_Line3_ZipCode[0]"] = p.mailing_zip
        fields["P1_Line3_Country[0]"] = p.mailing_country

        # Item 4 - Contact Info
        fields["Line2_DaytimePhoneNumber1_Part8[0]"] = p.phone
        fields["Line3_MobilePhoneNumber1_Part8[0]"] = p.mobile
        fields["Line9_EmailAddress[0]"] = p.email

        # Item 5 - FEIN (TextField1)
        fields["TextField1[0]"] = p.fein

        # Item 6 - Nonprofit
        if p.is_nonprofit:
            fields["P1Line6_Yes[0]"] = "1"
        else:
            fields["P1Line6_No[0]"] = "1"

    # Items 7-8 - Individual Tax/SSN (N/A for org) - in subform[1]
    fields["Line3_TaxNumber[0]"] = "N / A"
    fields["Line4_SSN[0]"] = "N / A"

    # ===== PART 2: INFORMATION ABOUT THIS PETITION (subform[1]) =====
    # Item 1 - Classification
    fields["Part2_ClassificationSymbol[0]"] = case.visa_type

    # Item 2 - Basis for Classification (checkbox fields)
    basis_map = {
        "new_employment": "new[0]",
        "continuation": "continuation[0]",
        "change_in_employment": "change[0]",
        "concurrent": "concurrent[0]",
        "change_employer": "previouschange[0]",
        "amended": "amended[0]",
    }
    basis_field = basis_map.get(proc.action, "new[0]")
    fields[basis_field] = "1"

    # Item 3 - Prior Receipt Number
    fields["Line1_ReceiptNumber[0]"] = b.prior_receipt or "None"

    # Item 4 - Requested Action (P2Checkbox4)
    if b.in_us:
        if proc.action == "new_employment":
            fields["P2Checkbox4[1]"] = "1"  # Change status
        else:
            fields["P2Checkbox4[2]"] = "1"  # Extend stay
    else:
        fields["P2Checkbox4[0]"] = "1"  # Notify consulate

    # Item 5 - Number of workers
    fields["TtlNumbersofWorker[0]"] = "1"

    # ===== PART 3: BENEFICIARY INFORMATION (subform[1]-[2]) =====
    # Item 1 - Named/Unnamed
    fields["P3Line1_Checkbox[0]"] = "1"  # Named beneficiary

    # Item 2 - Entertainment Group Name - N/A for O-1A
    # fields["Line_GroupName[0]"] = case.entertainment_group_name or "N/A"

    # Item 3 - Beneficiary Name
    fields["Part3_Line2_FamilyName[0]"] = b.last_name
    fields["Part3_Line2_GivenName[0]"] = b.first_name
    fields["Part3_Line2_MiddleName[0]"] = b.middle_name or "N/A"

    # Item 4 - Other Names (Line3_FamilyName1, etc.) - in subform[2]
    fields["Line3_FamilyName1[0]"] = "N/A"
    fields["Line3_GivenName1[0]"] = "N/A"
    fields["Line3_MiddleName1[0]"] = "N/A"

    # Item 5 - Other Info (subform[2])
    fields["Line6_DateOfBirth[0]"] = b.dob
    if b.sex == "Male":
        fields["Line1_Gender_P3[0]"] = "1"
    else:
        fields["Line1_Gender_P3[1]"] = "1"
    fields["Line5_SSN[0]"] = b.ssn or ""
    fields["Line1_AlienNumber[0]"] = b.a_number or ""
    fields["Part3Line4_CountryOfBirth[0]"] = b.birth_country
    # Province of birth - not in standard form
    fields["Part3Line4_CountryOfCitizenship[0]"] = b.citizenship

    # Item 6 - If in US (subform[2])
    if b.in_us:
        fields["Part3Line5_DateofArrival[0]"] = b.date_last_arrival or "N/A"
        fields["Part3Line5_ArrivalDeparture[0]"] = b.i94_number or "N / A"
        fields["Part3Line5_PassportorTravDoc[0]"] = b.passport_number
        fields["Line11e_ExpDate[0]"] = b.passport_expires
        fields["Line_CountryOfIssuance[0]"] = b.passport_country
        fields["Line11g_CurrentNon[0]"] = b.current_status
        fields["Line11h_DateStatusExpires[0]"] = b.status_expires
        fields["Line5_SEVIS[0]"] = b.sevis_number or "N/A"
        fields["Line5_EAD[0]"] = b.ead_number or "N/A"

        # US Address (subform[2])
        if b.us_address:
            fields["Line8a_StreetNumberName[0]"] = b.us_address.street
            fields["Line8d_CityTown[0]"] = b.us_address.city
            fields["Line8e_State[0]"] = b.us_address.state
            fields["Line8f_ZipCode[0]"] = b.us_address.zip_code
    else:
        fields["Part3Line5_DateofArrival[0]"] = "N/A"
        fields["Part3Line5_ArrivalDeparture[0]"] = "N / A"
        fields["Part3Line5_PassportorTravDoc[0]"] = b.passport_number
        fields["Line11e_ExpDate[0]"] = b.passport_expires
        fields["Line_CountryOfIssuance[0]"] = b.passport_country
        fields["Line11g_CurrentNon[0]"] = "N/A"
        fields["Line11h_DateStatusExpires[0]"] = "N/A"
        fields["Line5_SEVIS[0]"] = "N/A"
        fields["Line5_EAD[0]"] = "N/A"
        fields["Line8a_StreetNumberName[0]"] = "N/A"
        fields["Line8d_CityTown[0]"] = "N/A"
        fields["Line8f_ZipCode[0]"] = "N/A"

    # ===== PART 4: PROCESSING INFORMATION (subform[2]-[3]) =====
    # Item 1 - Consulate/POE
    if not b.in_us:
        fields["TypeofOffice[0]"] = "1"  # Consulate checkbox
        fields["OfficeAddressCity[0]"] = proc.consulate_city
        fields["Part4_1c_State_or_Country[0]"] = proc.consulate_country

    # Foreign Address (subform[3])
    if b.foreign_address:
        fields["Line2b_StreetNumberName[0]"] = b.foreign_address.street
        fields["Line2c_CityTown[0]"] = b.foreign_address.city
        fields["Line2g2_Province[0]"] = b.foreign_address.province
        fields["Line3f_PostalCode[0]"] = b.foreign_address.postal_code
        fields["Line_Country[0]"] = b.foreign_address.country

    # Items 2-11 - Various Yes/No questions (subform[3])
    fields["P4Line2_Checkbox[0]"] = "1"  # Valid passport
    fields["P4Line3_No[0]"] = "1"   # Other petitions
    fields["P4Line4_No[0]"] = "1"   # I-94 applications
    fields["P4Line5_No[0]"] = "1"   # Dependent applications
    fields["P4Line6_No[0]"] = "1"   # Removal proceedings
    fields["P4Line7[1]"] = "1"      # No immigrant petition filed
    fields["P4Line8[0]"] = "1"      # First petition
    fields["P4Line8a_No[0]"] = "1"  # Prior classification
    fields["P4Line8b_No[0]"] = "1"  # Prior denial
    fields["P4Line9_No[0]"] = "1"   # Previous petition
    fields["P4Line10_No[0]"] = "1"  # Entertainment group membership
    fields["P4Line11a_No[0]"] = "1" # J-1 exchange visitor

    # ===== PART 5: EMPLOYMENT INFORMATION (subform[4]-[5]) =====
    fields["Part5_Q1_JobTitle[0]"] = e.job_title
    fields["Part5_Q2_LCAorETA[0]"] = "N/A"

    # Work address - N/A if same as petitioner (subform[4])
    fields["P5Line3a_StreetNumberName[0]"] = "See petitioner address"
    fields["P5Line3a_CityTown[0]"] = ""
    fields["P5Line3a_ZipCode[0]"] = ""

    fields["P5Line4_Yes[0]"] = "1" if e.has_itinerary else ""
    fields["P5Line4_No[0]"] = "" if e.has_itinerary else "1"
    fields["P5Line5_No[0]"] = "1"   # Off-site work
    fields["P5Line6_No[0]"] = "1"   # CNMI
    fields["P5Line7_Yes[0]"] = "1" if e.full_time else ""
    fields["P5Line7_No[0]"] = "" if e.full_time else "1"
    fields["P5Line9_Hours[0]"] = "" if e.full_time else str(e.hours_per_week)

    # Wages (subform[4])
    fields["Line8_Wages[0]"] = e.wage_amount
    fields["Line8_Per[0]"] = e.wage_frequency

    # Employment dates (subform[4])
    fields["Part5_Q10_DateFrom[0]"] = e.start_date
    fields["Part5_Q10_DateTo[0]"] = e.end_date

    # Business info (subform[5])
    if p:
        fields["Part5Line12_TypeofBusiness[0]"] = p.type_of_business
        fields["P5Line13_YearEstablished[0]"] = p.year_established
        fields["P5Line14_NumberofEmployees[0]"] = str(p.num_employees)
        if p.num_employees <= 25:
            fields["P5Line15_CB[0]"] = "1"  # 25 or fewer
        else:
            fields["P5Line15_CB[1]"] = "1"  # More than 25
        fields["Line15_GrossAnnualIncome[0]"] = p.gross_annual_income
        fields["Line16_NetAnnualIncome[0]"] = p.net_annual_income

    # ===== PART 6: EXPORT CONTROL (subform[5]) =====
    if case.visa_type == "O-1A":
        if proc.export_license_required:
            fields["Deemed[0]"] = "1"
        else:
            fields["NoDeemed[0]"] = "1"

    # ===== PART 7: PETITIONER DECLARATION (subform[5]) =====
    if p:
        fields["Line1a_PetitionerLastName[0]"] = p.contact_last_name
        fields["Line1b_PetitionerFirstName[0]"] = p.contact_first_name
        # Title and contact in later fields - typically same as Part 1

    return fields
