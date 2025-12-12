"""
Document 6: USCIS Cover Letter
Target: 2-3 pages
Time: 1 minute
"""
from app.services.ai_client import generate_text
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def generate(context: dict, doc1: str) -> str:
    """
    Generate Document 6: USCIS Cover Letter

    Args:
        context: Generation context
        doc1: Comprehensive analysis (for summary)

    Returns:
        Generated document content
    """
    logger.info("Generating Document 6: Cover Letter")

    beneficiary = context["beneficiary"]

    # Determine form type based on visa
    form_type = "I-140" if "EB" in beneficiary.visa_type else "I-129"
    service_center = "I-140 Unit" if "EB" in beneficiary.visa_type else "I-129 Nonimmigrant Classifications"

    prompt = f"""Generate a professional USCIS cover letter for a {beneficiary.visa_type} visa petition.

# BENEFICIARY INFORMATION
Name: {beneficiary.full_name}
Date of Birth: {beneficiary.date_of_birth or '[Date of Birth]'}
Nationality: {beneficiary.nationality or '[Nationality]'}
Passport Number: {beneficiary.passport_number or '[Passport Number]'}
Visa Type: {beneficiary.visa_type}
Field: {beneficiary.profession}
Petitioner: {beneficiary.petitioner_name or '[U.S. Employer/Agent Required]'}
Organization: {beneficiary.petitioner_organization or '[Organization Name]'}
Petitioner Address: {beneficiary.petitioner_address or '[Petitioner Address]'}
Petitioner Phone: {beneficiary.petitioner_phone or '[Petitioner Phone]'}

# CASE SUMMARY
{doc1[:3000]}

# FORMAT

{datetime.now().strftime('%B %d, %Y')}

U.S. Citizenship and Immigration Services
{service_center}
[Appropriate Service Center]

**Re: Form {form_type} Petition for {beneficiary.visa_type} Classification**
**Petitioner:** {beneficiary.petitioner_name or '[U.S. Employer/Agent Required]'}
**Beneficiary:** {beneficiary.full_name}
**Field of Expertise:** {beneficiary.profession}

Dear Immigration Officer:

## INTRODUCTION
[2-3 paragraphs introducing petition and beneficiary]

## BENEFICIARY QUALIFICATIONS SUMMARY
[2-3 paragraphs highlighting most compelling qualifications]

## CRITERIA SATISFIED
This petition establishes {beneficiary.visa_type} qualification under the following criteria:

[List applicable criteria with checkboxes - mark ☑ for claimed criteria]

## PETITION CONTENTS
**Volume I: Legal Documents**
- Cover Letter
- Legal Brief
- Comprehensive Analysis
- Publication Analysis
- Evidence Gap Analysis
- Visa Checklist
- Exhibit Guide

**Volume II: Supporting Evidence**
- Organized by criterion with exhibit numbers

## REQUEST FOR APPROVAL
[Professional closing requesting approval]

## CONTACT INFORMATION
Email: {beneficiary.email or '[Email address]'}
Phone: {beneficiary.phone or '[Phone Number]'}
Address: {beneficiary.mailing_address or '[Mailing Address]'}

Respectfully submitted,

_____________________________
[Signature]

{beneficiary.petitioner_name or '[Petitioner/Representative Name]'}
{beneficiary.petitioner_organization or '[Organization]'}
{beneficiary.petitioner_address or '[Address]'}
{beneficiary.petitioner_phone or '[Phone]'}

---

REQUIREMENTS:
- Professional, confident tone
- 2-3 pages maximum
- Highlight top 3 strengths
- Formal business letter format

Generate the complete cover letter now:"""

    result = await generate_text(
        prompt=prompt,
        max_tokens=4000,
        temperature=0.2,
    )

    logger.info(f"Document 6 generated: {len(result)} chars")
    return result
