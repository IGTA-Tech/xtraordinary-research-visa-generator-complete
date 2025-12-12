"""
Main CLI entry point for the Visa Form Assistant.
Interactive command-line interface for filling O/P visa forms.
"""

import sys
import os
import json
from pathlib import Path

from .chat_flow import (
    ChatFlow,
    display_welcome,
    display_status,
    display_final_summary,
)
from .validators.field_validator import validate_case, get_completion_status
from .models.petitioner import get_petitioner


class VisaFormCLI:
    """Interactive CLI for visa form completion."""

    def __init__(self):
        self.chat = ChatFlow()
        self.running = True

    def print_header(self):
        """Print application header."""
        print(display_welcome())

    def handle_command(self, cmd: str) -> bool:
        """
        Handle special commands. Returns True if command was handled.
        """
        cmd_lower = cmd.lower().strip()

        if cmd_lower == "status":
            print(display_status(self.chat.case))
            return True

        elif cmd_lower == "preview":
            print("\n" + "=" * 50)
            print("CASE DATA PREVIEW")
            print("=" * 50)
            print(self.chat.to_json())
            return True

        elif cmd_lower == "missing":
            result = validate_case(self.chat.case)
            if result.critical_missing:
                print("\n🔴 MISSING REQUIRED FIELDS:")
                for item in result.critical_missing:
                    print(f"   • {item}")
            else:
                print("\n✓ All required fields are complete!")

            if result.warnings:
                print("\n⚠️  WARNINGS:")
                for item in result.warnings:
                    print(f"   • {item}")
            return True

        elif cmd_lower == "reset":
            confirm = input("Reset all data? [yes/no]: ")
            if confirm.lower() in ("yes", "y"):
                self.chat = ChatFlow()
                print("✓ Data reset. Starting over...")
            return True

        elif cmd_lower == "done":
            self.finish()
            return True

        elif cmd_lower == "help":
            print("""
COMMANDS:
  status   - Show current completion status
  preview  - Show all collected data as JSON
  missing  - List missing required fields
  reset    - Start over with new case
  done     - Generate output files
  help     - Show this help message
  quit     - Exit without saving

TIPS:
  • Answer questions with comma-separated values
  • Use N/A for fields that don't apply
  • Dates should be mm/dd/yyyy format
""")
            return True

        elif cmd_lower in ("quit", "exit", "q"):
            confirm = input("Exit without saving? [yes/no]: ")
            if confirm.lower() in ("yes", "y"):
                self.running = False
            return True

        return False

    def run_initial_step(self):
        """Run initial questions."""
        print(self.chat.get_initial_questions())
        response = input("> ").strip()

        if self.handle_command(response):
            return

        answers = self.chat.parse_initial_answers(response)
        self.chat.apply_initial_answers(answers)

        # Show status after initial setup
        print("\n" + display_status(self.chat.case))

    def run_attorney_step(self):
        """Run attorney questions (if G-28 selected)."""
        if not self.chat.case.include_g28:
            return

        print(self.chat.get_attorney_questions())
        response = input("> ").strip()

        if self.handle_command(response):
            return

        answers = self.chat.parse_attorney_answers(response)
        self.chat.apply_attorney_answers(answers)

    def run_personal_step(self):
        """Run personal information questions."""
        print(self.chat.get_personal_questions())
        response = input("> ").strip()

        if self.handle_command(response):
            return

        answers = self.chat.parse_personal_answers(response)
        self.chat.apply_personal_answers(answers)

        print("\n" + display_status(self.chat.case))

    def run_location_step(self):
        """Run location questions."""
        print(self.chat.get_location_questions())
        response = input("> ").strip()

        if self.handle_command(response):
            return

        answers = self.chat.parse_location_answers(response)
        self.chat.apply_location_answers(answers)

    def run_employment_step(self):
        """Run employment questions."""
        print(self.chat.get_employment_questions())
        response = input("> ").strip()

        if self.handle_command(response):
            return

        answers = self.chat.parse_employment_answers(response)
        self.chat.apply_employment_answers(answers)

        print("\n" + display_status(self.chat.case))

    def run_visa_specific_step(self):
        """Run visa-specific questions."""
        print(self.chat.get_visa_specific_questions())
        response = input("> ").strip()

        if self.handle_command(response):
            return

        answers = self.chat.parse_visa_specific_answers(response)
        self.chat.apply_visa_specific_answers(answers)

    def finish(self):
        """Generate final output."""
        print(display_final_summary(self.chat.case))

        # Validate before generating
        result = validate_case(self.chat.case)
        if result.critical_missing:
            print("\n⚠️  WARNING: Some required fields are missing.")
            print("   Forms may be incomplete.\n")
            confirm = input("Continue anyway? [yes/no]: ")
            if confirm.lower() not in ("yes", "y"):
                return

        # Generate output files
        output_dir = Path(__file__).parent.parent / "output"
        output_dir.mkdir(exist_ok=True)

        b = self.chat.case.beneficiary
        filename_base = b.name_for_filename() if b.first_name else "case"

        # Save JSON data
        json_path = output_dir / f"{filename_base}_case.json"
        with open(json_path, "w") as f:
            f.write(self.chat.to_json())

        print(f"\n✓ Case data saved to: {json_path}")
        print("\nTo generate PDF forms, run:")
        print(f"  python -m src.fill_forms {json_path}")

        self.running = False

    def run(self):
        """Main run loop."""
        self.print_header()

        steps = [
            ("initial", self.run_initial_step),
            ("attorney", self.run_attorney_step),
            ("personal", self.run_personal_step),
            ("location", self.run_location_step),
            ("employment", self.run_employment_step),
            ("visa_specific", self.run_visa_specific_step),
        ]

        for step_name, step_func in steps:
            if not self.running:
                break

            try:
                step_func()
            except KeyboardInterrupt:
                print("\n\nInterrupted. Type 'quit' to exit or continue answering.")
                continue
            except Exception as e:
                print(f"\nError: {e}")
                print("Please try again or type 'help' for assistance.\n")

        if self.running:
            # Final review
            print("\n" + "=" * 50)
            print("FINAL REVIEW")
            print("=" * 50)
            print(display_status(self.chat.case))

            response = input("\nType 'done' to generate files, or answer any missing questions:\n> ")
            if response.lower() == "done":
                self.finish()
            else:
                self.handle_command(response)


def main():
    """Main entry point."""
    cli = VisaFormCLI()
    try:
        cli.run()
    except KeyboardInterrupt:
        print("\n\nExiting...")
        sys.exit(0)


if __name__ == "__main__":
    main()
