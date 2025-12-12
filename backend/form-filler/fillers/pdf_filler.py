"""
PDF Form Filler - Fills USCIS PDF forms with case data.
Uses pypdf to populate fillable PDF form fields.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from pypdf import PdfReader, PdfWriter

from ..models.case import Case
from ..models.petitioner import get_petitioner
from ..mappers.i129_mapper import map_i129_fields
from ..mappers.i907_mapper import map_i907_fields
from ..mappers.g28_mapper import map_g28_fields
from ..mappers.op_supplement import map_op_supplement_fields


# Base directory for form templates
FORMS_DIR = Path(__file__).parent.parent.parent / "forms"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"


def get_form_path(form_name: str) -> Path:
    """Get the path to a form template."""
    form_files = {
        "I-129": "i-129.pdf",
        "I-907": "i-907.pdf",
        "G-28": "g-28.pdf",
        "G-1450": "g-1450.pdf",  # Credit card form (if available)
    }
    filename = form_files.get(form_name)
    if filename:
        return FORMS_DIR / filename
    raise ValueError(f"Unknown form: {form_name}")


def build_field_name_map(reader: PdfReader) -> Dict[str, str]:
    """
    Build a mapping from short field names to full hierarchical field names.

    USCIS PDFs use hierarchical names like:
      form1[0].#subform[0].Pt1Line3_FamilyName[0]

    This function creates a map so mappers can use shorter names like:
      Pt1Line3_FamilyName[0] -> form1[0].#subform[0].Pt1Line3_FamilyName[0]
    """
    fields = reader.get_fields()
    if not fields:
        return {}

    name_map = {}
    for full_name in fields.keys():
        # Extract the short name (last component after the last period before [)
        # e.g., "form1[0].#subform[0].Line1_FamilyName[0]" -> "Line1_FamilyName[0]"
        if "." in full_name:
            short_name = full_name.rsplit(".", 1)[-1]
            # If short name not already mapped, add it
            if short_name not in name_map:
                name_map[short_name] = full_name

        # Also map the full name to itself for exact matches
        name_map[full_name] = full_name

    return name_map


def resolve_field_names(field_values: Dict[str, Any], name_map: Dict[str, str]) -> Dict[str, Any]:
    """
    Resolve short field names to full hierarchical names using the name map.

    Tries multiple matching strategies:
    1. Exact match
    2. Short name match (last component)
    3. Partial match (field name contains the short name)
    """
    resolved = {}
    unmatched = []

    for short_name, value in field_values.items():
        # Strategy 1: Exact match
        if short_name in name_map:
            resolved[name_map[short_name]] = value
            continue

        # Strategy 2: Check if any full name ends with the short name
        found = False
        for full_name in name_map.values():
            if full_name.endswith(short_name):
                resolved[full_name] = value
                found = True
                break
            # Also check if it ends with "." + short_name pattern
            if f".{short_name}" in full_name:
                resolved[full_name] = value
                found = True
                break

        if not found:
            # Strategy 3: Partial match - find field containing key parts
            # Strip the [0] suffix for matching
            base_name = short_name.rsplit("[", 1)[0] if "[" in short_name else short_name
            for full_name in name_map.values():
                if base_name in full_name:
                    resolved[full_name] = value
                    found = True
                    break

        if not found:
            unmatched.append(short_name)

    if unmatched and len(unmatched) <= 20:
        print(f"  Warning: {len(unmatched)} fields not found in PDF: {unmatched[:5]}...")
    elif unmatched:
        print(f"  Warning: {len(unmatched)} fields not found in PDF")

    return resolved


def fill_pdf(
    template_path: Path,
    output_path: Path,
    field_values: Dict[str, Any],
    flatten: bool = False
) -> bool:
    """
    Fill a PDF form with the provided field values.

    Args:
        template_path: Path to the PDF template
        output_path: Path for the output PDF
        field_values: Dictionary of field_id -> value
        flatten: If True, flatten the form (make it non-editable)

    Returns:
        True if successful, False otherwise
    """
    try:
        reader = PdfReader(template_path)
        writer = PdfWriter()

        # Build field name map and resolve short names to full names
        name_map = build_field_name_map(reader)
        resolved_values = resolve_field_names(field_values, name_map)

        print(f"  Mapped {len(resolved_values)}/{len(field_values)} fields")

        # Copy pages and fill fields
        for page in reader.pages:
            writer.add_page(page)

        # Update form fields on all pages
        if reader.get_fields():
            for i, page in enumerate(writer.pages):
                try:
                    writer.update_page_form_field_values(
                        page,
                        resolved_values,
                        auto_regenerate=True
                    )
                except Exception:
                    pass  # Some pages may not have fields

        # Write output
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            writer.write(f)

        return True

    except Exception as e:
        print(f"Error filling PDF {template_path}: {e}")
        import traceback
        traceback.print_exc()
        return False


def fill_i129(case: Case, output_dir: Path) -> Optional[Path]:
    """Fill I-129 form with case data."""
    template = get_form_path("I-129")
    if not template.exists():
        print(f"Template not found: {template}")
        return None

    # Combine I-129 base fields with O/P supplement fields
    fields = map_i129_fields(case)
    op_fields = map_op_supplement_fields(case)
    fields.update(op_fields)

    b = case.beneficiary
    filename = f"{b.name_for_filename()}_I-129.pdf"
    output_path = output_dir / filename

    if fill_pdf(template, output_path, fields):
        return output_path
    return None


def fill_i907(case: Case, output_dir: Path) -> Optional[Path]:
    """Fill I-907 form with case data."""
    if not case.premium_processing:
        return None

    template = get_form_path("I-907")
    if not template.exists():
        print(f"Template not found: {template}")
        return None

    fields = map_i907_fields(case)

    b = case.beneficiary
    filename = f"{b.name_for_filename()}_I-907.pdf"
    output_path = output_dir / filename

    if fill_pdf(template, output_path, fields):
        return output_path
    return None


def fill_g28(case: Case, output_dir: Path) -> Optional[Path]:
    """Fill G-28 form with case data."""
    if not case.include_g28 or not case.attorney:
        return None

    template = get_form_path("G-28")
    if not template.exists():
        print(f"Template not found: {template}")
        return None

    fields = map_g28_fields(case)

    b = case.beneficiary
    filename = f"{b.name_for_filename()}_G-28.pdf"
    output_path = output_dir / filename

    if fill_pdf(template, output_path, fields):
        return output_path
    return None


def fill_all_forms(case: Case, output_dir: Optional[Path] = None) -> List[Path]:
    """
    Fill all required forms for a case.

    Args:
        case: The visa case data
        output_dir: Directory for output files (default: output/)

    Returns:
        List of paths to generated PDF files
    """
    if output_dir is None:
        output_dir = OUTPUT_DIR

    output_dir.mkdir(parents=True, exist_ok=True)
    generated = []

    print(f"\nGenerating forms for {case.beneficiary.full_name()}...")
    print(f"Visa Type: {case.visa_type}")
    print(f"Output Directory: {output_dir}\n")

    # G-28 (if attorney)
    if case.include_g28:
        path = fill_g28(case, output_dir)
        if path:
            generated.append(path)
            print(f"  ✓ G-28: {path.name}")
        else:
            print(f"  ✗ G-28: Failed to generate")

    # I-907 (if premium processing)
    if case.premium_processing:
        path = fill_i907(case, output_dir)
        if path:
            generated.append(path)
            print(f"  ✓ I-907: {path.name}")
        else:
            print(f"  ✗ I-907: Failed to generate")

    # I-129 (always)
    path = fill_i129(case, output_dir)
    if path:
        generated.append(path)
        print(f"  ✓ I-129: {path.name}")
    else:
        print(f"  ✗ I-129: Failed to generate")

    print(f"\nGenerated {len(generated)} form(s)")
    return generated


def list_available_forms() -> List[str]:
    """List forms that have templates available."""
    available = []
    for form_name in ["I-129", "I-907", "G-28", "G-1450"]:
        try:
            path = get_form_path(form_name)
            if path.exists():
                available.append(form_name)
        except ValueError:
            pass
    return available
