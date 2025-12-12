#!/usr/bin/env python3
"""
Visa Form Assistant CLI - Entry Point

Usage:
    python visa_form_cli.py           # Start interactive mode
    python visa_form_cli.py --help    # Show help

Sherrod Sports Visas - O-1A, O-1B, P-1A, P-1B Form Completion
"""

import sys
import argparse
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.cli import main, VisaFormCLI


def parse_args():
    parser = argparse.ArgumentParser(
        description="Visa Form Assistant - Fill O/P visa petition forms",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python visa_form_cli.py                    Start interactive mode
  python visa_form_cli.py --visa O-1A        Start with O-1A pre-selected
  python visa_form_cli.py --petitioner igta  Start with IGTA petitioner

Supported Visa Types:
  O-1A  - Extraordinary Ability (Sciences/Business/Athletics)
  O-1B  - Extraordinary Achievement (Arts/Entertainment)
  P-1A  - Internationally Recognized Athlete
  P-1B  - Internationally Recognized Entertainment Group

Petitioner Keys:
  igta        - Innovative Global Talent Agency LLC
  accelerator - Innovative Global Accelerator Studios LLC
"""
    )

    parser.add_argument(
        "--visa", "-v",
        choices=["O-1A", "O-1B", "P-1A", "P-1B"],
        help="Pre-select visa type"
    )

    parser.add_argument(
        "--petitioner", "-p",
        choices=["igta", "accelerator"],
        help="Pre-select petitioner"
    )

    parser.add_argument(
        "--premium", "-r",
        action="store_true",
        default=True,
        help="Include premium processing (default: yes)"
    )

    parser.add_argument(
        "--no-premium",
        action="store_true",
        help="Exclude premium processing"
    )

    parser.add_argument(
        "--g28",
        action="store_true",
        help="Include G-28 attorney form"
    )

    parser.add_argument(
        "--version",
        action="version",
        version="Visa Form Assistant v1.0.0"
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    cli = VisaFormCLI()

    # Apply command-line arguments
    if args.visa:
        cli.chat.case.visa_type = args.visa
    if args.petitioner:
        cli.chat.case.petitioner_key = args.petitioner
    if args.no_premium:
        cli.chat.case.premium_processing = False
    if args.g28:
        cli.chat.case.include_g28 = True
        from src.models.attorney import Attorney
        cli.chat.case.attorney = Attorney()

    try:
        cli.run()
    except KeyboardInterrupt:
        print("\n\nExiting...")
        sys.exit(0)
