#!/usr/bin/env python3
"""
PDF Form Field Extractor for USCIS Immigration Forms
Extracts all fillable fields from PDF forms and outputs structured JSON.
"""

import json
import os
import re
from datetime import datetime
from pypdf import PdfReader


def get_field_type(field):
    """Determine the field type from PDF field object."""
    field_type = field.get('/FT', '')

    if field_type == '/Tx':
        return 'text'
    elif field_type == '/Btn':
        # Check if it's a checkbox or radio button
        if '/Ff' in field:
            flags = field['/Ff']
            if flags & (1 << 15):  # Radio button flag
                return 'radio'
        # Check for /AP (appearance) to distinguish
        if '/AS' in field or '/V' in field:
            return 'checkbox'
        return 'checkbox'
    elif field_type == '/Ch':
        # Check if it's a dropdown or list
        if '/Ff' in field:
            flags = field.get('/Ff', 0)
            if flags & (1 << 17):  # Combo box flag
                return 'dropdown'
        return 'dropdown'
    elif field_type == '/Sig':
        return 'signature'
    else:
        return 'unknown'


def get_field_options(field):
    """Get options for dropdown/radio fields."""
    options = []
    if '/Opt' in field:
        opts = field['/Opt']
        for opt in opts:
            if isinstance(opt, list):
                options.append(str(opt[1]) if len(opt) > 1 else str(opt[0]))
            else:
                options.append(str(opt))
    return options


def get_max_length(field):
    """Get maximum length for text fields."""
    if '/MaxLen' in field:
        return int(field['/MaxLen'])
    return None


def parse_field_name(field_id):
    """Parse the field ID to extract readable information."""
    # Extract part number if present
    part_match = re.search(r'Pt(\d+)', field_id)
    part_num = part_match.group(1) if part_match else None

    # Extract line number if present
    line_match = re.search(r'Line(\d+[a-z]?)', field_id, re.IGNORECASE)
    line_num = line_match.group(1) if line_match else None

    # Try to create a readable name
    readable = field_id
    # Remove form path prefix
    readable = re.sub(r'^form1\[0\]\.#subform\[\d+\]\.', '', readable)
    readable = re.sub(r'\[\d+\]$', '', readable)

    # Convert camelCase to spaces
    readable = re.sub(r'([a-z])([A-Z])', r'\1 \2', readable)
    readable = re.sub(r'_', ' ', readable)

    return {
        'part': part_num,
        'line': line_num,
        'readable': readable.strip()
    }


def determine_section(field_id, page_num):
    """Determine which section a field belongs to based on its ID and page."""
    field_id_lower = field_id.lower()

    # I-129 specific sections
    if 'pt1' in field_id_lower or 'part1' in field_id_lower:
        return "Part 1 - Petitioner Information"
    elif 'pt2' in field_id_lower or 'part2' in field_id_lower:
        return "Part 2 - Requested Nonimmigrant Classification"
    elif 'pt3' in field_id_lower or 'part3' in field_id_lower:
        return "Part 3 - Beneficiary Information"
    elif 'pt4' in field_id_lower or 'part4' in field_id_lower:
        return "Part 4 - Processing Information"
    elif 'pt5' in field_id_lower or 'part5' in field_id_lower:
        return "Part 5 - Basic Information About Employment"
    elif 'pt6' in field_id_lower or 'part6' in field_id_lower:
        return "Part 6 - Additional Information"
    elif 'pt7' in field_id_lower or 'part7' in field_id_lower:
        return "Part 7 - Petitioner Contact and Declaration"
    elif 'pt8' in field_id_lower or 'part8' in field_id_lower:
        return "Part 8 - Interpreter's Contact Information"
    elif 'pt9' in field_id_lower or 'part9' in field_id_lower:
        return "Part 9 - Preparer's Contact Information"
    elif 'oclass' in field_id_lower or 'o_class' in field_id_lower or 'osup' in field_id_lower:
        return "O Classification Supplement"
    elif 'pclass' in field_id_lower or 'p_class' in field_id_lower or 'psup' in field_id_lower:
        return "P Classification Supplement"
    elif 'hclass' in field_id_lower or 'h_class' in field_id_lower or 'hsup' in field_id_lower:
        return "H Classification Supplement"
    elif 'lclass' in field_id_lower or 'l_class' in field_id_lower or 'lsup' in field_id_lower:
        return "L Classification Supplement"
    elif 'eclass' in field_id_lower or 'e_class' in field_id_lower:
        return "E Classification Supplement"
    elif 'tnclass' in field_id_lower or 'tn_class' in field_id_lower:
        return "TN Classification Supplement"
    else:
        return f"Page {page_num}"


def extract_form_fields(pdf_path, form_name, form_url):
    """Extract all fillable fields from a PDF form."""
    reader = PdfReader(pdf_path)

    fields = []
    sections = {}

    # Get form fields
    if reader.get_fields():
        for field_name, field_obj in reader.get_fields().items():
            field_type = get_field_type(field_obj)
            parsed = parse_field_name(field_name)

            # Try to determine page number
            page_num = 1
            if '/P' in field_obj:
                # Page reference - need to find page index
                page_ref = field_obj['/P']
                for idx, page in enumerate(reader.pages):
                    if page.indirect_reference == page_ref:
                        page_num = idx + 1
                        break

            section = determine_section(field_name, page_num)

            field_data = {
                'field_id': field_name,
                'field_name_readable': parsed['readable'],
                'field_type': field_type,
                'page': page_num,
                'section': section,
                'part': parsed['part'],
                'line': parsed['line'],
            }

            # Add type-specific properties
            if field_type == 'text':
                max_len = get_max_length(field_obj)
                if max_len:
                    field_data['max_length'] = max_len

            if field_type in ['dropdown', 'radio']:
                options = get_field_options(field_obj)
                if options:
                    field_data['options'] = options

            # Check if required (this is a heuristic)
            field_data['required'] = False  # Default, will need manual review

            # Add placeholder for mapping
            field_data['maps_to'] = None

            fields.append(field_data)

            # Track sections
            if section not in sections:
                sections[section] = {
                    'section_name': section,
                    'pages': set(),
                    'field_count': 0,
                    'applies_to': ['all']
                }
            sections[section]['pages'].add(page_num)
            sections[section]['field_count'] += 1

    # Convert section page sets to sorted lists
    sections_list = []
    for section_name, section_data in sorted(sections.items()):
        section_data['pages'] = sorted(list(section_data['pages']))
        sections_list.append(section_data)

    # Sort fields by page then by field name
    fields.sort(key=lambda x: (x['page'], x['field_id']))

    result = {
        'form_name': form_name,
        'form_edition': 'Unknown',  # Will be updated from PDF metadata
        'form_url': form_url,
        'total_pages': len(reader.pages),
        'total_fields': len(fields),
        'extracted_at': datetime.utcnow().isoformat() + 'Z',
        'fields': fields,
        'sections': sections_list
    }

    return result


def extract_i129_with_supplements(pdf_path):
    """Special extraction for I-129 that identifies supplement sections."""
    reader = PdfReader(pdf_path)

    # I-129 specific section mapping based on page ranges (typical structure)
    # These may need adjustment based on actual form version
    i129_sections = {
        'main': {
            'name': 'Main Form (Parts 1-9)',
            'page_range': (1, 14),
            'applies_to': ['all']
        },
        'h': {
            'name': 'H Classification Supplement',
            'page_range': (15, 22),
            'applies_to': ['H-1B', 'H-1B1', 'H-2A', 'H-2B', 'H-3']
        },
        'l': {
            'name': 'L Classification Supplement',
            'page_range': (23, 26),
            'applies_to': ['L-1A', 'L-1B']
        },
        'o': {
            'name': 'O Classification Supplement',
            'page_range': (27, 30),
            'applies_to': ['O-1A', 'O-1B', 'O-2']
        },
        'p': {
            'name': 'P Classification Supplement',
            'page_range': (31, 34),
            'applies_to': ['P-1A', 'P-1B', 'P-1S', 'P-2', 'P-2S', 'P-3', 'P-3S']
        },
        'e': {
            'name': 'E Classification Supplement',
            'page_range': (35, 36),
            'applies_to': ['E-1', 'E-2', 'E-3']
        }
    }

    return i129_sections


def main():
    """Main function to extract fields from all forms."""
    base_dir = '/home/sherrod/immigration-forms-system'
    forms_dir = os.path.join(base_dir, 'forms')
    output_dir = os.path.join(base_dir, 'field_mappings')

    forms = [
        {
            'filename': 'i-129.pdf',
            'name': 'I-129',
            'url': 'https://www.uscis.gov/sites/default/files/document/forms/i-129.pdf'
        },
        {
            'filename': 'i-140.pdf',
            'name': 'I-140',
            'url': 'https://www.uscis.gov/sites/default/files/document/forms/i-140.pdf'
        },
        {
            'filename': 'i-907.pdf',
            'name': 'I-907',
            'url': 'https://www.uscis.gov/sites/default/files/document/forms/i-907.pdf'
        },
        {
            'filename': 'g-28.pdf',
            'name': 'G-28',
            'url': 'https://www.uscis.gov/sites/default/files/document/forms/g-28.pdf'
        },
        {
            'filename': 'i-539.pdf',
            'name': 'I-539',
            'url': 'https://www.uscis.gov/sites/default/files/document/forms/i-539.pdf'
        }
    ]

    for form in forms:
        pdf_path = os.path.join(forms_dir, form['filename'])
        print(f"\nProcessing {form['name']}...")

        if not os.path.exists(pdf_path):
            print(f"  ERROR: File not found: {pdf_path}")
            continue

        try:
            result = extract_form_fields(pdf_path, form['name'], form['url'])

            # Output to JSON
            output_file = os.path.join(output_dir, f"{form['name'].lower()}-fields.json")
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)

            print(f"  Total pages: {result['total_pages']}")
            print(f"  Total fields: {result['total_fields']}")
            print(f"  Sections found: {len(result['sections'])}")
            print(f"  Output: {output_file}")

        except Exception as e:
            print(f"  ERROR: {str(e)}")
            import traceback
            traceback.print_exc()


if __name__ == '__main__':
    main()
