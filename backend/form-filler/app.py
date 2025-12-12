"""
Streamlit Web App for USCIS Form Filler Tool
Generates I-129, I-907, and G-28 forms for O/P visa petitions.
"""

import streamlit as st
import json
import tempfile
import zipfile
from pathlib import Path
from datetime import datetime
from io import BytesIO

from src.models.case import Case, Beneficiary, Employment, Processing, Address
from src.models.petitioner import PETITIONERS, get_petitioner, list_petitioners
from src.models.attorney import ATTORNEYS, get_attorney, list_attorneys, Attorney
from src.fillers.pdf_filler import fill_all_forms

# Page config
st.set_page_config(
    page_title="USCIS Form Filler",
    page_icon="📋",
    layout="wide"
)

# Custom CSS
st.markdown("""
<style>
    .stApp {
        max-width: 1200px;
        margin: 0 auto;
    }
    .success-box {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

# Header
st.title("📋 USCIS Form Filler")
st.markdown("Generate I-129, I-907, and G-28 forms for O/P visa petitions")
st.divider()

# Initialize session state
if 'generated_files' not in st.session_state:
    st.session_state.generated_files = None

# Sidebar - Quick Info
with st.sidebar:
    st.header("About")
    st.markdown("""
    **Supported Forms:**
    - I-129 (Petition for Nonimmigrant Worker)
    - I-907 (Premium Processing)
    - G-28 (Attorney Appearance)

    **Supported Visa Types:**
    - O-1A (Extraordinary Ability)
    - O-1B (Arts/Entertainment)
    - O-2 (Support Personnel)
    - P-1A (Athletes)
    - P-1B (Entertainment Groups)
    """)

    st.divider()
    st.markdown("**Pre-loaded Petitioners:**")
    for key, name in list_petitioners():
        st.markdown(f"- `{key}`: {name}")

# Main form
tab1, tab2, tab3 = st.tabs(["📝 Case Information", "👤 Beneficiary Details", "⚙️ Generate Forms"])

with tab1:
    st.header("Case Information")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Visa & Processing")
        visa_type = st.selectbox(
            "Visa Classification",
            ["O-1A", "O-1B", "O-2", "P-1A", "P-1B", "P-1S"],
            help="Select the visa classification for this petition"
        )

        premium_processing = st.checkbox("Premium Processing (I-907)", value=True)
        include_g28 = st.checkbox("Include G-28 (Attorney)", value=True)

        action = st.selectbox(
            "Petition Type",
            [
                ("new_employment", "New Employment"),
                ("continuation", "Continuation of Employment"),
                ("change_in_employment", "Change in Employment"),
                ("concurrent", "Concurrent Employment"),
                ("change_employer", "Change of Employer"),
                ("amended", "Amended Petition")
            ],
            format_func=lambda x: x[1]
        )[0]

    with col2:
        st.subheader("Petitioner")
        petitioner_options = [("", "-- Select Pre-loaded --")] + list_petitioners()
        petitioner_key = st.selectbox(
            "Select Petitioner",
            petitioner_options,
            format_func=lambda x: x[1] if x[0] else x[1]
        )[0]

        if petitioner_key:
            p = get_petitioner(petitioner_key)
            st.success(f"✓ {p.company}")
            st.caption(f"FEIN: {p.fein}")
            st.caption(f"Contact: {p.contact_full_name()}")

        st.subheader("Attorney")
        attorney_options = [("", "-- Select Pre-loaded --")] + [(k, f"{a.full_name()} - {a.law_firm}") for k, a in ATTORNEYS.items() if a.last_name]
        attorney_key = st.selectbox(
            "Select Attorney",
            attorney_options,
            format_func=lambda x: x[1] if x else "-- Select Pre-loaded --"
        )
        attorney_key = attorney_key[0] if attorney_key else ""

        if attorney_key:
            a = get_attorney(attorney_key)
            st.success(f"✓ {a.full_name()}")
            st.caption(f"Firm: {a.law_firm}")

with tab2:
    st.header("Beneficiary Information")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Personal Information")
        ben_last_name = st.text_input("Last Name *", placeholder="Smith")
        ben_first_name = st.text_input("First Name *", placeholder="John")
        ben_middle_name = st.text_input("Middle Name", placeholder="Robert")

        col_dob, col_sex = st.columns(2)
        with col_dob:
            ben_dob = st.text_input("Date of Birth *", placeholder="MM/DD/YYYY")
        with col_sex:
            ben_sex = st.selectbox("Sex *", ["Male", "Female"])

        ben_citizenship = st.text_input("Country of Citizenship *", placeholder="United Kingdom")
        ben_birth_country = st.text_input("Country of Birth *", placeholder="United Kingdom")

    with col2:
        st.subheader("Passport Information")
        ben_passport = st.text_input("Passport Number *", placeholder="123456789")

        col_iss, col_exp = st.columns(2)
        with col_iss:
            ben_passport_issued = st.text_input("Issue Date", placeholder="MM/DD/YYYY")
        with col_exp:
            ben_passport_expires = st.text_input("Expiration Date *", placeholder="MM/DD/YYYY")

        ben_passport_country = st.text_input("Country of Issuance", placeholder="United Kingdom")

        st.subheader("Current Status")
        ben_in_us = st.checkbox("Currently in the United States")

        if not ben_in_us:
            st.subheader("Consulate for Visa Issuance")
            consulate_city = st.text_input("Consulate City *", placeholder="London")
            consulate_country = st.text_input("Consulate Country *", placeholder="United Kingdom")
        else:
            consulate_city = ""
            consulate_country = ""

    st.subheader("Foreign Address")
    col1, col2 = st.columns(2)
    with col1:
        foreign_street = st.text_input("Street Address", placeholder="123 London Road")
        foreign_city = st.text_input("City", placeholder="London")
        foreign_province = st.text_input("Province/State", placeholder="Greater London")
    with col2:
        foreign_postal = st.text_input("Postal Code", placeholder="SW1A 1AA")
        foreign_country = st.text_input("Country", placeholder="United Kingdom")

    st.subheader("Employment Information")
    col1, col2 = st.columns(2)
    with col1:
        job_title = st.text_input("Job Title *", placeholder="Professional Athlete")
        emp_start = st.text_input("Start Date *", placeholder="MM/DD/YYYY")
        emp_end = st.text_input("End Date *", placeholder="MM/DD/YYYY")
    with col2:
        full_time = st.checkbox("Full-time Position", value=True)
        wage_amount = st.text_input("Wage Amount", placeholder="See petition")
        wage_frequency = st.selectbox("Wage Frequency", ["Year", "Month", "Week", "Hour", "Piece"])

with tab3:
    st.header("Generate Forms")

    # Validation
    errors = []
    if not petitioner_key:
        errors.append("Select a petitioner")
    if not ben_last_name or not ben_first_name:
        errors.append("Enter beneficiary name")
    if not ben_dob:
        errors.append("Enter date of birth")
    if not ben_citizenship:
        errors.append("Enter country of citizenship")
    if not ben_passport:
        errors.append("Enter passport number")
    if not job_title:
        errors.append("Enter job title")
    if not emp_start or not emp_end:
        errors.append("Enter employment dates")
    if not ben_in_us and (not consulate_city or not consulate_country):
        errors.append("Enter consulate information for visa issuance")

    if errors:
        st.warning("Please complete required fields:")
        for err in errors:
            st.markdown(f"- {err}")
    else:
        st.success("✓ All required fields completed")

        # Preview
        with st.expander("Preview Case Data"):
            preview = {
                "visa_type": visa_type,
                "premium_processing": premium_processing,
                "petitioner": petitioner_key,
                "beneficiary": f"{ben_first_name} {ben_last_name}",
                "job_title": job_title,
                "dates": f"{emp_start} to {emp_end}",
                "consulate": f"{consulate_city}, {consulate_country}" if not ben_in_us else "N/A (In US)"
            }
            st.json(preview)

        # Generate button
        if st.button("🚀 Generate Forms", type="primary", use_container_width=True):
            with st.spinner("Generating forms..."):
                try:
                    # Build case object
                    foreign_address = None
                    if foreign_street:
                        foreign_address = Address(
                            street=foreign_street,
                            city=foreign_city,
                            province=foreign_province,
                            postal_code=foreign_postal,
                            country=foreign_country
                        )

                    beneficiary = Beneficiary(
                        last_name=ben_last_name,
                        first_name=ben_first_name,
                        middle_name=ben_middle_name or "",
                        dob=ben_dob,
                        sex=ben_sex,
                        citizenship=ben_citizenship,
                        birth_country=ben_birth_country or ben_citizenship,
                        passport_number=ben_passport,
                        passport_issued=ben_passport_issued or "",
                        passport_expires=ben_passport_expires or "",
                        passport_country=ben_passport_country or ben_citizenship,
                        in_us=ben_in_us,
                        foreign_address=foreign_address
                    )

                    employment = Employment(
                        job_title=job_title,
                        start_date=emp_start,
                        end_date=emp_end,
                        full_time=full_time,
                        wage_amount=wage_amount or "See petition",
                        wage_frequency=wage_frequency
                    )

                    processing = Processing(
                        consulate_city=consulate_city,
                        consulate_country=consulate_country,
                        action=action
                    )

                    # Get attorney if selected
                    attorney = get_attorney(attorney_key) if attorney_key else None

                    case = Case(
                        visa_type=visa_type,
                        premium_processing=premium_processing,
                        include_g28=include_g28 and attorney is not None,
                        petitioner_key=petitioner_key,
                        beneficiary=beneficiary,
                        employment=employment,
                        processing=processing,
                        attorney=attorney
                    )

                    # Generate forms to temp directory
                    with tempfile.TemporaryDirectory() as tmpdir:
                        output_dir = Path(tmpdir)
                        generated = fill_all_forms(case, output_dir)

                        if generated:
                            # Create ZIP file
                            zip_buffer = BytesIO()
                            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                                for pdf_path in generated:
                                    zf.write(pdf_path, pdf_path.name)

                            zip_buffer.seek(0)

                            # Store in session state
                            st.session_state.generated_files = {
                                'zip': zip_buffer.getvalue(),
                                'filename': f"{ben_last_name}_{ben_first_name}_{visa_type}_forms.zip",
                                'count': len(generated),
                                'files': [p.name for p in generated]
                            }

                            st.rerun()
                        else:
                            st.error("Failed to generate forms. Check that PDF templates exist in /forms directory.")

                except Exception as e:
                    st.error(f"Error generating forms: {str(e)}")
                    import traceback
                    st.code(traceback.format_exc())

    # Download section
    if st.session_state.generated_files:
        st.divider()
        st.success(f"✅ Generated {st.session_state.generated_files['count']} form(s)")

        for fname in st.session_state.generated_files['files']:
            st.markdown(f"- {fname}")

        st.download_button(
            label="📥 Download All Forms (ZIP)",
            data=st.session_state.generated_files['zip'],
            file_name=st.session_state.generated_files['filename'],
            mime="application/zip",
            type="primary",
            use_container_width=True
        )

        if st.button("Clear & Start New", use_container_width=True):
            st.session_state.generated_files = None
            st.rerun()

# Footer
st.divider()
st.caption("Form Filler Tool v1.0 | Sherrod Sports Visas")
