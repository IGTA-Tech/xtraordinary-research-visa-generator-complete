"""
Visa Exhibit Generator V2.0
===========================

Professional exhibit package generator for visa petitions.
Features 6-stage workflow with AI classification.

Stages:
1. Context (optional) - Case information
2. Upload - PDFs, URLs, Google Drive
3. Classify - AI auto-categorization
4. Review - Manual reorder + text commands
5. Generate - Background processing
6. Complete - Download, email, share link

EXHIBIT ORGANIZATION REFERENCE:
../VISA_EXHIBIT_RAG_COMPREHENSIVE_INSTRUCTIONS.md
"""

import streamlit as st
import os
import tempfile
from pathlib import Path
from typing import List, Dict, Optional, Any
import zipfile
from datetime import datetime
import shutil

# Import our modules
from pdf_handler import PDFHandler
from exhibit_processor import ExhibitProcessor
from google_drive import GoogleDriveHandler
from archive_handler import ArchiveHandler

# Import V2 components
from components.stage_navigator import StageNavigator, STAGES, render_stage_header
from components.intake_form import render_intake_form, get_case_context, render_context_summary
from components.url_manager import render_url_manager, get_url_list, URLManager
from components.ai_classifier import (
    AIClassifier, ClassificationResult,
    render_classification_ui, get_classifications, save_classifications
)
from components.exhibit_editor import (
    render_exhibit_editor, get_exhibits, set_exhibits_from_classifications
)
from components.background_processor import (
    BackgroundProcessor, render_processing_ui, get_processor
)
from components.email_sender import render_email_form
from components.link_generator import render_link_generator

# Check if compression is available
try:
    from compress_handler import USCISPDFCompressor, compress_pdf_batch
    COMPRESSION_AVAILABLE = True
except ImportError:
    COMPRESSION_AVAILABLE = False

# Page config
st.set_page_config(
    page_title="Visa Exhibit Generator V2",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.2rem;
        color: #666;
        text-align: center;
        margin-bottom: 1rem;
    }
    .version-badge {
        background: #28a745;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        display: inline-block;
    }
    .feature-box {
        padding: 1.5rem;
        border-radius: 0.5rem;
        background-color: #f0f2f6;
        margin: 1rem 0;
    }
    .success-box {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
    }
    .info-box {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #d1ecf1;
        border: 1px solid #bee5eb;
        color: #0c5460;
    }
    .warning-box {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
    }
    .stat-card {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: white;
        border: 1px solid #ddd;
        text-align: center;
    }
    .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: #1f77b4;
    }
    .stat-label {
        font-size: 0.9rem;
        color: #666;
    }
    .stage-container {
        padding: 1.5rem;
        background: #fafafa;
        border-radius: 0.5rem;
        min-height: 400px;
    }
</style>
""", unsafe_allow_html=True)


def init_session_state():
    """Initialize all session state variables"""
    defaults = {
        'exhibits_generated': False,
        'compression_stats': None,
        'exhibit_list': [],
        'uploaded_files': [],
        'file_paths': [],
        'output_file': None,
        'processing_complete': False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def render_sidebar():
    """Render sidebar configuration"""
    with st.sidebar:
        st.header("⚙️ Configuration")

        # Visa type selection
        visa_type = st.selectbox(
            "Visa Type",
            ["O-1A", "O-1B", "O-2", "P-1A", "P-1B", "P-1S", "EB-1A", "EB-1B", "EB-2 NIW"],
            help="Select the visa category for your petition"
        )

        # Exhibit numbering style
        numbering_style = st.selectbox(
            "Exhibit Numbering",
            ["Letters (A, B, C...)", "Numbers (1, 2, 3...)", "Roman (I, II, III...)"],
            help="How to number your exhibits"
        )

        # Convert numbering style to code
        numbering_map = {
            "Letters (A, B, C...)": "letters",
            "Numbers (1, 2, 3...)": "numbers",
            "Roman (I, II, III...)": "roman"
        }
        numbering_code = numbering_map[numbering_style]

        st.divider()

        # Compression settings
        st.header("🗜️ PDF Compression")

        if not COMPRESSION_AVAILABLE:
            st.warning("⚠️ Compression not available. Install PyMuPDF.")
            enable_compression = False
            quality_code = "high"
            smallpdf_key = None
        else:
            enable_compression = st.checkbox(
                "Enable PDF Compression",
                value=True,
                help="Compress PDFs to reduce file size (50-75% reduction)"
            )

            if enable_compression:
                quality_preset = st.selectbox(
                    "Compression Quality",
                    ["High Quality (USCIS Recommended)", "Balanced", "Maximum Compression"]
                )
                quality_map = {
                    "High Quality (USCIS Recommended)": "high",
                    "Balanced": "balanced",
                    "Maximum Compression": "maximum"
                }
                quality_code = quality_map[quality_preset]

                with st.expander("🔑 SmallPDF API Key (Optional)"):
                    smallpdf_key = st.text_input("SmallPDF API Key", type="password")
            else:
                quality_code = "high"
                smallpdf_key = None

        st.divider()

        # AI Classification settings
        st.header("🤖 AI Classification")

        enable_ai = st.checkbox(
            "Enable AI Classification",
            value=True,
            help="Use Claude API to auto-classify documents"
        )

        if enable_ai:
            with st.expander("🔑 Anthropic API Key"):
                anthropic_key = st.text_input(
                    "API Key",
                    type="password",
                    help="Get key at console.anthropic.com"
                )
                if anthropic_key:
                    st.session_state['anthropic_api_key'] = anthropic_key
                    st.success("✓ API key set")
                else:
                    st.info("Using rule-based classification")
        else:
            st.session_state['anthropic_api_key'] = None

        st.divider()

        # Output options
        st.header("📋 Options")

        add_toc = st.checkbox("Generate Table of Contents", value=True)
        add_archive = st.checkbox("Archive URLs (archive.org)", value=False)
        merge_pdfs = st.checkbox("Merge into single PDF", value=True)

        st.divider()

        # Documentation
        with st.expander("📚 Help"):
            st.markdown("""
            **6-Stage Workflow:**
            1. **Context** - Optional case info
            2. **Upload** - Add documents
            3. **Classify** - AI categorization
            4. **Review** - Reorder exhibits
            5. **Generate** - Create package
            6. **Complete** - Download & share

            **Supported Visa Types:**
            O-1A, O-1B, O-2, P-1A, P-1B, P-1S, EB-1A, EB-1B, EB-2 NIW
            """)

    return {
        'visa_type': visa_type,
        'numbering_style': numbering_code,
        'enable_compression': enable_compression,
        'quality_preset': quality_code,
        'smallpdf_api_key': smallpdf_key if enable_compression else None,
        'enable_ai': enable_ai,
        'add_toc': add_toc,
        'add_archive': add_archive,
        'merge_pdfs': merge_pdfs,
    }


def render_stage_1_context(navigator: StageNavigator):
    """Stage 1: Optional Context Form"""
    st.markdown('<div class="stage-container">', unsafe_allow_html=True)

    context = render_intake_form()

    st.markdown('</div>', unsafe_allow_html=True)

    # Navigation
    def on_next():
        # Context is saved automatically
        pass

    navigator.render_navigation_buttons(
        on_next=on_next,
        next_label="Continue to Upload"
    )


def render_stage_2_upload(navigator: StageNavigator, config: Dict):
    """Stage 2: Document Upload"""
    st.markdown('<div class="stage-container">', unsafe_allow_html=True)

    # Show context summary if provided
    render_context_summary()

    # Upload tabs
    tab1, tab2, tab3 = st.tabs(["📁 Upload Files", "📎 URL Documents", "☁️ Google Drive"])

    with tab1:
        st.subheader("Upload PDF Files")

        upload_method = st.radio(
            "Upload Method",
            ["Individual PDFs", "ZIP Archive"],
            horizontal=True
        )

        if upload_method == "Individual PDFs":
            uploaded_files = st.file_uploader(
                "Select PDF files",
                type=["pdf"],
                accept_multiple_files=True
            )
            if uploaded_files:
                st.session_state.uploaded_files = uploaded_files
                st.success(f"✓ {len(uploaded_files)} files uploaded")

        elif upload_method == "ZIP Archive":
            zip_file = st.file_uploader("Select ZIP file", type=["zip"])
            if zip_file:
                with tempfile.TemporaryDirectory() as tmp_dir:
                    zip_path = os.path.join(tmp_dir, "upload.zip")
                    with open(zip_path, 'wb') as f:
                        f.write(zip_file.read())
                    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                        zip_ref.extractall(tmp_dir)
                    pdf_files = list(Path(tmp_dir).rglob("*.pdf"))
                    st.info(f"Found {len(pdf_files)} PDF files in ZIP")
                    st.session_state.zip_files = [str(p) for p in pdf_files]

    with tab2:
        url_list = render_url_manager()

    with tab3:
        st.subheader("Google Drive Integration")
        st.info("💡 Connect to Google Drive to process folders directly")

        drive_url = st.text_input(
            "Google Drive Folder URL",
            placeholder="https://drive.google.com/drive/folders/..."
        )

        if drive_url:
            st.warning("🚧 Google Drive OAuth integration - coming in next update")

    st.markdown('</div>', unsafe_allow_html=True)

    # Check if we have files to proceed
    has_files = (
        len(st.session_state.get('uploaded_files', [])) > 0 or
        len(st.session_state.get('zip_files', [])) > 0 or
        len(get_url_list()) > 0
    )

    navigator.render_navigation_buttons(
        next_label="Move to Classification",
        next_disabled=not has_files
    )


def render_stage_3_classify(navigator: StageNavigator, config: Dict):
    """Stage 3: AI Classification"""
    st.markdown('<div class="stage-container">', unsafe_allow_html=True)

    render_context_summary()

    # Get files to classify
    files = st.session_state.get('uploaded_files', [])
    zip_files = st.session_state.get('zip_files', [])

    if not files and not zip_files:
        st.warning("No files to classify. Go back to upload stage.")
        navigator.render_navigation_buttons()
        return

    # Check if already classified
    classifications = get_classifications()

    if not classifications:
        # Run classification
        st.subheader("🤖 Classifying Documents...")

        api_key = st.session_state.get('anthropic_api_key')
        classifier = AIClassifier(api_key=api_key)

        all_classifications = []
        total_files = len(files) + len(zip_files)

        progress_bar = st.progress(0)
        status_text = st.empty()

        # Process uploaded files
        for i, file in enumerate(files):
            status_text.text(f"Classifying: {file.name}")

            # Read file content
            content = file.read()
            file.seek(0)  # Reset for later use

            result = classifier.classify_document(
                pdf_content=content,
                filename=file.name,
                visa_type=config['visa_type'],
                document_id=f"file_{i}"
            )
            all_classifications.append(result)
            progress_bar.progress((i + 1) / total_files)

        # Process zip files
        for i, file_path in enumerate(zip_files):
            filename = os.path.basename(file_path)
            status_text.text(f"Classifying: {filename}")

            with open(file_path, 'rb') as f:
                content = f.read()

            result = classifier.classify_document(
                pdf_content=content,
                filename=filename,
                visa_type=config['visa_type'],
                document_id=f"zip_{i}"
            )
            all_classifications.append(result)
            progress_bar.progress((len(files) + i + 1) / total_files)

        status_text.text("✓ Classification complete!")
        save_classifications(all_classifications)
        classifications = all_classifications

    # Show classification UI
    updated = render_classification_ui(classifications, config['visa_type'])
    save_classifications(updated)

    st.markdown('</div>', unsafe_allow_html=True)

    navigator.render_navigation_buttons(
        next_label="Review Classification"
    )


def render_stage_4_review(navigator: StageNavigator, config: Dict):
    """Stage 4: Manual Review & Reorder"""
    st.markdown('<div class="stage-container">', unsafe_allow_html=True)

    render_context_summary()

    # Convert classifications to exhibits if not done
    classifications = get_classifications()
    exhibits = get_exhibits()

    if classifications and not exhibits:
        set_exhibits_from_classifications(classifications, config['numbering_style'])

    # Render editor
    updated_exhibits = render_exhibit_editor(config['numbering_style'])

    st.markdown('</div>', unsafe_allow_html=True)

    navigator.render_navigation_buttons(
        next_label="Generate Exhibits",
        next_disabled=len(updated_exhibits) == 0
    )


def render_stage_5_generate(navigator: StageNavigator, config: Dict):
    """Stage 5: Background Processing"""
    st.markdown('<div class="stage-container">', unsafe_allow_html=True)

    render_context_summary()

    processor = get_processor()

    if not processor.is_running and not processor.is_complete:
        # Start processing
        st.info("Click below to generate your exhibit package")

        if st.button("🚀 Generate Exhibit Package", type="primary", use_container_width=True):
            # Perform actual generation
            generate_exhibits_v2(config)

    elif processor.is_running:
        # Show progress
        result = render_processing_ui()
        if result:
            st.session_state.processing_complete = True
            navigator.next_stage()
            st.rerun()

    elif processor.is_complete:
        st.success("✓ Generation complete!")
        navigator.next_stage()
        st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)

    # Don't show nav buttons while processing
    if not processor.is_running:
        navigator.render_navigation_buttons()


def render_stage_6_complete(navigator: StageNavigator, config: Dict):
    """Stage 6: Download & Share"""
    st.markdown('<div class="stage-container">', unsafe_allow_html=True)

    st.markdown('<div class="success-box">✓ Your exhibit package is ready!</div>', unsafe_allow_html=True)

    # Statistics
    if st.session_state.get('exhibit_list'):
        st.subheader("📊 Statistics")

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric("Exhibits", len(st.session_state.exhibit_list))

        with col2:
            total_pages = sum(ex.get('pages', 0) for ex in st.session_state.exhibit_list)
            st.metric("Total Pages", total_pages)

        with col3:
            if st.session_state.compression_stats:
                reduction = st.session_state.compression_stats.get('avg_reduction', 0)
                st.metric("Size Reduction", f"{reduction:.1f}%")
            else:
                st.metric("Size Reduction", "-")

        with col4:
            if st.session_state.compression_stats:
                size_mb = st.session_state.compression_stats.get('compressed_size', 0) / (1024*1024)
                st.metric("Final Size", f"{size_mb:.1f} MB")
            else:
                st.metric("Final Size", "-")

    st.divider()

    # Download section
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("📥 Download")

        if st.session_state.get('output_file') and os.path.exists(st.session_state.output_file):
            with open(st.session_state.output_file, 'rb') as f:
                case_context = get_case_context()
                beneficiary = case_context.beneficiary_name or "Package"

                st.download_button(
                    label="📥 Download Exhibit Package",
                    data=f,
                    file_name=f"Exhibit_Package_{beneficiary}_{datetime.now().strftime('%Y%m%d')}.pdf",
                    mime="application/pdf",
                    type="primary",
                    use_container_width=True
                )

            # Shareable link
            st.divider()
            render_link_generator(st.session_state.output_file)

        else:
            st.warning("Output file not found. Try regenerating.")

    with col2:
        st.subheader("📧 Share")

        case_context = get_case_context()
        case_info = {
            'beneficiary_name': case_context.beneficiary_name or 'N/A',
            'petitioner_name': case_context.petitioner_name or 'N/A',
            'visa_type': config['visa_type'],
            'processing_type': case_context.processing_type or 'Regular',
            'exhibit_count': len(st.session_state.get('exhibit_list', [])),
            'page_count': sum(ex.get('pages', 0) for ex in st.session_state.get('exhibit_list', []))
        }

        render_email_form(
            case_info=case_info,
            file_path=st.session_state.get('output_file'),
            download_link=None  # Would be shareable link URL
        )

    st.markdown('</div>', unsafe_allow_html=True)

    navigator.render_navigation_buttons()


def generate_exhibits_v2(config: Dict):
    """Generate exhibits with V2 processing"""
    processor = get_processor()
    processor.reset()

    # Get files
    files = st.session_state.get('uploaded_files', [])
    zip_files = st.session_state.get('zip_files', [])
    exhibits = get_exhibits()

    def process_func(proc: BackgroundProcessor) -> Dict[str, Any]:
        """Background processing function"""
        import time

        result = {
            'exhibits': [],
            'total_pages': 0,
            'original_size': 0,
            'compressed_size': 0,
            'output_file': None
        }

        # Create temp directory
        tmp_dir = tempfile.mkdtemp()

        try:
            # Step 1: Extract/Save files
            proc.update_step("extract", "running")
            file_paths = []

            for i, file in enumerate(files):
                file_path = os.path.join(tmp_dir, file.name)
                with open(file_path, 'wb') as f:
                    f.write(file.read())
                file_paths.append(file_path)
                proc.set_step_progress("extract", (i + 1) / max(len(files), 1) * 100)

            for file_path in zip_files:
                if os.path.exists(file_path):
                    dest = os.path.join(tmp_dir, os.path.basename(file_path))
                    shutil.copy(file_path, dest)
                    file_paths.append(dest)

            proc.complete_step("extract")

            # Step 2: Compress
            pdf_handler = PDFHandler(
                enable_compression=config['enable_compression'],
                quality_preset=config['quality_preset'],
                smallpdf_api_key=config['smallpdf_api_key']
            )

            compression_results = []
            if config['enable_compression'] and pdf_handler.compressor:
                proc.update_step("compress", "running")

                for i, file_path in enumerate(file_paths):
                    comp_result = pdf_handler.compressor.compress(file_path)
                    if comp_result.get('success'):
                        compression_results.append(comp_result)
                        result['original_size'] += comp_result.get('original_size', 0)
                        result['compressed_size'] += comp_result.get('compressed_size', 0)
                    proc.set_step_progress("compress", (i + 1) / len(file_paths) * 100)

            proc.complete_step("compress")

            # Step 3: Number exhibits
            proc.update_step("number", "running")
            numbered_files = []
            exhibit_list = []

            for i, file_path in enumerate(file_paths):
                # Get exhibit number
                if config['numbering_style'] == "letters":
                    exhibit_num = chr(65 + i) if i < 26 else f"A{chr(65 + i - 26)}"
                elif config['numbering_style'] == "numbers":
                    exhibit_num = str(i + 1)
                else:
                    exhibit_num = to_roman(i + 1)

                # Add exhibit number
                numbered_file = pdf_handler.add_exhibit_number(file_path, exhibit_num)
                numbered_files.append(numbered_file)

                # Track info
                exhibit_info = {
                    'number': exhibit_num,
                    'title': Path(file_path).stem,
                    'filename': os.path.basename(file_path),
                    'pages': get_pdf_page_count(file_path)
                }

                if i < len(compression_results):
                    exhibit_info['compression'] = {
                        'reduction': compression_results[i].get('reduction_percent', 0),
                        'method': compression_results[i].get('method', 'none')
                    }

                exhibit_list.append(exhibit_info)
                result['total_pages'] += exhibit_info['pages']

                proc.set_step_progress("number", (i + 1) / len(file_paths) * 100)

            proc.complete_step("number")

            # Step 4: Generate TOC
            if config['add_toc']:
                proc.update_step("toc", "running")
                toc_file = pdf_handler.generate_table_of_contents(
                    exhibit_list,
                    config['visa_type'],
                    os.path.join(tmp_dir, "TOC.pdf")
                )
                numbered_files.insert(0, toc_file)
            proc.complete_step("toc")

            # Step 5: Merge
            if config['merge_pdfs']:
                proc.update_step("merge", "running")
                output_file = os.path.join(tmp_dir, "final_package.pdf")
                merged_file = pdf_handler.merge_pdfs(numbered_files, output_file)

                # Copy to persistent location
                final_output = os.path.join(
                    tempfile.gettempdir(),
                    f"exhibit_package_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                )
                shutil.copy(merged_file, final_output)
                result['output_file'] = final_output

            proc.complete_step("merge")

            # Step 6: Finalize
            proc.update_step("finalize", "running")

            # Save results to session state
            st.session_state.output_file = result['output_file']
            st.session_state.exhibit_list = exhibit_list

            if compression_results:
                avg_reduction = (
                    (1 - result['compressed_size'] / max(result['original_size'], 1)) * 100
                    if result['original_size'] > 0 else 0
                )
                st.session_state.compression_stats = {
                    'original_size': result['original_size'],
                    'compressed_size': result['compressed_size'],
                    'avg_reduction': avg_reduction,
                    'method': compression_results[0].get('method', 'unknown'),
                    'quality': config['quality_preset']
                }

            st.session_state.exhibits_generated = True
            proc.complete_step("finalize")

            return result

        except Exception as e:
            raise e

    processor.start_processing(process_func)


def get_pdf_page_count(pdf_path: str) -> int:
    """Get number of pages in PDF"""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(pdf_path)
        return len(reader.pages)
    except:
        return 0


def to_roman(num: int) -> str:
    """Convert number to Roman numeral"""
    val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
    syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
    roman_num = ''
    i = 0
    while num > 0:
        for _ in range(num // val[i]):
            roman_num += syms[i]
            num -= val[i]
        i += 1
    return roman_num


def main():
    """Main application entry point"""
    init_session_state()

    # Header
    st.markdown('<div class="main-header">📄 Visa Exhibit Generator <span class="version-badge">V2.0</span></div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Professional exhibit packages with AI-powered classification</div>', unsafe_allow_html=True)

    # Sidebar config
    config = render_sidebar()

    # Stage Navigator
    navigator = StageNavigator()

    # Render stage header
    render_stage_header(navigator)

    # Render current stage
    current_stage = navigator.current_stage

    if current_stage == 0:
        render_stage_1_context(navigator)
    elif current_stage == 1:
        render_stage_2_upload(navigator, config)
    elif current_stage == 2:
        render_stage_3_classify(navigator, config)
    elif current_stage == 3:
        render_stage_4_review(navigator, config)
    elif current_stage == 4:
        render_stage_5_generate(navigator, config)
    elif current_stage == 5:
        render_stage_6_complete(navigator, config)


if __name__ == "__main__":
    main()
