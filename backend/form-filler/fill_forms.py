#!/usr/bin/env python3
"""
Fill Forms Script - Generate filled PDF forms from case JSON data.

Usage:
    python -m src.fill_forms case_data.json
    python -m src.fill_forms case_data.json --output-dir ./my_output
"""

import sys
import json
import argparse
from pathlib import Path

from .models.case import Case, Beneficiary, Employment, Processing, Address
from .models.attorney import Attorney
from .fillers.pdf_filler import fill_all_forms, list_available_forms


def load_case_from_json(json_path: Path) -> Case:
    """Load case data from a JSON file."""
    with open(json_path, "r") as f:
        data = json.load(f)

    case = Case()

    # Basic info
    case.visa_type = data.get("visa_type", "O-1A")
    case.premium_processing = data.get("premium_processing", True)
    case.petitioner_key = data.get("petitioner_key", "igta")

    # Beneficiary
    b_data = data.get("beneficiary", {})
    case.beneficiary = Beneficiary(
        last_name=b_data.get("last_name", ""),
        first_name=b_data.get("first_name", ""),
        middle_name=b_data.get("middle_name", "N/A"),
        dob=b_data.get("dob", ""),
        sex=b_data.get("sex", "Male"),
        citizenship=b_data.get("citizenship", ""),
        birth_country=b_data.get("birth_country", ""),
        birth_province=b_data.get("birth_province", ""),
        passport_number=b_data.get("passport_number", ""),
        passport_issued=b_data.get("passport_issued", ""),
        passport_expires=b_data.get("passport_expires", ""),
        passport_country=b_data.get("passport_country", ""),
        a_number=b_data.get("a_number", ""),
        uscis_account=b_data.get("uscis_account", ""),
        ssn=b_data.get("ssn", ""),
        in_us=b_data.get("in_us", False),
        current_status=b_data.get("current_status", ""),
        status_expires=b_data.get("status_expires", ""),
        i94_number=b_data.get("i94_number", ""),
        prior_receipt=b_data.get("prior_receipt", ""),
    )

    # Foreign address
    if "foreign_address" in b_data:
        fa = b_data["foreign_address"]
        if isinstance(fa, str):
            case.beneficiary.foreign_address = Address(street=fa)
        elif isinstance(fa, dict):
            case.beneficiary.foreign_address = Address(**fa)

    # US address
    if "us_address" in b_data:
        ua = b_data["us_address"]
        if isinstance(ua, str):
            case.beneficiary.us_address = Address(street=ua)
        elif isinstance(ua, dict):
            case.beneficiary.us_address = Address(**ua)

    # Employment
    e_data = data.get("employment", {})
    case.employment = Employment(
        job_title=e_data.get("job_title", ""),
        start_date=e_data.get("start_date", ""),
        end_date=e_data.get("end_date", ""),
        full_time=e_data.get("full_time", True),
        wage_amount=e_data.get("wage_amount", "See petition"),
        wage_frequency=e_data.get("wage_frequency", "Year"),
        has_itinerary=e_data.get("has_itinerary", False),
    )

    # Processing
    p_data = data.get("processing", {})
    case.processing = Processing(
        consulate_city=p_data.get("consulate_city", ""),
        consulate_country=p_data.get("consulate_country", ""),
        action=p_data.get("action", "new_employment"),
    )

    # Attorney
    if "attorney" in data and data["attorney"]:
        a_data = data["attorney"]
        case.include_g28 = True
        case.attorney = Attorney(
            last_name=a_data.get("last_name", ""),
            first_name=a_data.get("first_name", ""),
            bar_number=a_data.get("bar_number", ""),
            licensing_authority=a_data.get("licensing_authority", ""),
            law_firm=a_data.get("law_firm", ""),
            email=a_data.get("email", ""),
            phone=a_data.get("phone", ""),
        )

    # O/P specific
    case.entertainment_group_name = data.get("entertainment_group_name", "")
    case.labor_org_exists = data.get("labor_org_exists", False)
    case.advisory_opinion_submitted = data.get("advisory_opinion_submitted", False)

    return case


def main():
    parser = argparse.ArgumentParser(
        description="Generate filled USCIS PDF forms from case data"
    )
    parser.add_argument(
        "json_file",
        type=Path,
        help="Path to case JSON file"
    )
    parser.add_argument(
        "--output-dir", "-o",
        type=Path,
        default=None,
        help="Output directory for generated PDFs"
    )
    parser.add_argument(
        "--list-forms",
        action="store_true",
        help="List available form templates"
    )

    args = parser.parse_args()

    if args.list_forms:
        print("Available form templates:")
        for form in list_available_forms():
            print(f"  - {form}")
        return

    if not args.json_file.exists():
        print(f"Error: File not found: {args.json_file}")
        sys.exit(1)

    # Load case data
    print(f"Loading case data from: {args.json_file}")
    try:
        case = load_case_from_json(args.json_file)
    except Exception as e:
        print(f"Error loading case data: {e}")
        sys.exit(1)

    # Generate forms
    generated = fill_all_forms(case, args.output_dir)

    if generated:
        print(f"\n✓ Successfully generated {len(generated)} form(s)")
        for path in generated:
            print(f"  - {path}")
    else:
        print("\n✗ No forms were generated")
        sys.exit(1)


if __name__ == "__main__":
    main()
