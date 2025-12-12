"""
PDF Handler - PDF manipulation and generation
Handles merging, numbering, TOC generation, compression
"""

import os
from typing import List, Dict, Optional
from datetime import datetime
from PyPDF2 import PdfReader, PdfWriter, PdfMerger
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from io import BytesIO
import tempfile

# Import compression handler
try:
    from compress_handler import USCISPDFCompressor
    COMPRESSION_AVAILABLE = True
except ImportError:
    COMPRESSION_AVAILABLE = False


class PDFHandler:
    """Handle all PDF operations including compression"""

    def __init__(
        self,
        enable_compression: bool = False,
        quality_preset: str = 'high',
        smallpdf_api_key: Optional[str] = None
    ):
        """
        Initialize PDF Handler

        Args:
            enable_compression: Whether to compress PDFs before processing
            quality_preset: Compression quality ('high', 'balanced', 'maximum')
            smallpdf_api_key: Optional SmallPDF API key for premium compression
        """
        self.temp_dir = tempfile.gettempdir()
        self.enable_compression = enable_compression and COMPRESSION_AVAILABLE
        self.compressor = None

        if self.enable_compression:
            self.compressor = USCISPDFCompressor(
                quality_preset=quality_preset,
                smallpdf_api_key=smallpdf_api_key
            )

    def add_exhibit_number(self, pdf_path: str, exhibit_number: str) -> str:
        """
        Add exhibit number to PDF header (compresses first if enabled)

        Args:
            pdf_path: Path to original PDF
            exhibit_number: Exhibit number (A, B, C, etc.)

        Returns:
            Path to numbered PDF with compression info
        """
        try:
            # STEP 1: Compress PDF first if compression is enabled
            working_path = pdf_path
            compression_info = None

            if self.enable_compression and self.compressor:
                compress_result = self.compressor.compress(pdf_path)
                if compress_result['success']:
                    working_path = compress_result['output_path']
                    compression_info = compress_result
                    print(f"✓ Compressed {os.path.basename(pdf_path)}: "
                          f"{compress_result['reduction_percent']:.1f}% reduction "
                          f"({compress_result['method']})")

            # STEP 2: Read PDF (compressed or original)
            reader = PdfReader(working_path)
            writer = PdfWriter()

            # Create header with exhibit number
            for page_num, page in enumerate(reader.pages):
                # Create overlay with exhibit number
                packet = BytesIO()
                can = canvas.Canvas(packet, pagesize=letter)

                # Add exhibit number at top center
                can.setFont("Helvetica-Bold", 10)
                can.drawCentredString(
                    letter[0] / 2,  # Center of page
                    letter[1] - 0.5 * inch,  # 0.5 inch from top
                    f"Exhibit {exhibit_number}"
                )

                # Add page number at bottom
                can.setFont("Helvetica", 9)
                can.drawCentredString(
                    letter[0] / 2,
                    0.5 * inch,
                    f"Page {page_num + 1} of {len(reader.pages)}"
                )

                can.save()

                # Merge overlay with original page
                packet.seek(0)
                overlay = PdfReader(packet)
                page.merge_page(overlay.pages[0])
                writer.add_page(page)

            # Save numbered PDF
            output_path = os.path.join(
                self.temp_dir,
                f"Exhibit_{exhibit_number}_{os.path.basename(pdf_path)}"
            )

            with open(output_path, 'wb') as output_file:
                writer.write(output_file)

            return output_path

        except Exception as e:
            print(f"Error adding exhibit number: {e}")
            return pdf_path  # Return original if numbering fails

    def merge_pdfs(self, pdf_paths: List[str], output_name: str) -> str:
        """
        Merge multiple PDFs into single file

        Args:
            pdf_paths: List of PDF file paths
            output_name: Name for output file

        Returns:
            Path to merged PDF
        """
        merger = PdfMerger()

        for pdf_path in pdf_paths:
            if os.path.exists(pdf_path):
                merger.append(pdf_path)

        output_path = os.path.join(self.temp_dir, f"{output_name}_Complete.pdf")
        merger.write(output_path)
        merger.close()

        return output_path

    def generate_toc(
        self,
        exhibits: List[Dict],
        case_name: str,
        beneficiary_name: Optional[str] = None
    ) -> str:
        """
        Generate professional Table of Contents

        Args:
            exhibits: List of exhibit dictionaries
            case_name: Case name/ID
            beneficiary_name: Optional beneficiary name

        Returns:
            Path to TOC PDF
        """
        output_path = os.path.join(self.temp_dir, f"{case_name}_TOC.pdf")

        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )

        # Container for elements
        elements = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1f77b4'),
            spaceAfter=30,
            alignment=1  # Center
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12,
            spaceBefore=12
        )

        # Title
        elements.append(Paragraph("EXHIBIT PACKAGE", title_style))
        elements.append(Paragraph("TABLE OF CONTENTS", title_style))
        elements.append(Spacer(1, 0.3 * inch))

        # Case information box
        case_info = [
            ["Case ID:", case_name],
            ["Generated:", datetime.now().strftime("%B %d, %Y")],
            ["Total Exhibits:", str(len(exhibits))]
        ]

        if beneficiary_name:
            case_info.insert(1, ["Beneficiary:", beneficiary_name])

        info_table = Table(case_info, colWidths=[2 * inch, 4 * inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        elements.append(info_table)
        elements.append(Spacer(1, 0.5 * inch))

        # Exhibit List heading
        elements.append(Paragraph("Exhibit List", heading_style))
        elements.append(Spacer(1, 0.2 * inch))

        # Exhibit table
        exhibit_data = [["Exhibit", "Title/Description", "Status"]]

        for exhibit in exhibits:
            status = "✓ Generated" if exhibit.get('path') or exhibit.get('pdf_path') else "✗ Failed"
            exhibit_data.append([
                f"Exhibit {exhibit['number']}",
                exhibit['name'][:60] + "..." if len(exhibit['name']) > 60 else exhibit['name'],
                status
            ])

        exhibit_table = Table(
            exhibit_data,
            colWidths=[1.2 * inch, 4.3 * inch, 1 * inch]
        )

        exhibit_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f77b4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),

            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),

            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(exhibit_table)

        # Archive URLs section (if any exhibits have URLs)
        archived_exhibits = [ex for ex in exhibits if ex.get('archive_url') or ex.get('original_url')]

        if archived_exhibits:
            elements.append(Spacer(1, 0.5 * inch))
            elements.append(Paragraph("Archived URLs (archive.org)", heading_style))
            elements.append(Spacer(1, 0.2 * inch))

            url_data = [["Exhibit", "Original URL", "Archived URL"]]

            for exhibit in archived_exhibits:
                url_data.append([
                    f"Exhibit {exhibit['number']}",
                    exhibit.get('original_url', 'N/A')[:40] + "...",
                    exhibit.get('archive_url', 'N/A')[:40] + "..."
                ])

            url_table = Table(url_data, colWidths=[1 * inch, 2.5 * inch, 2.5 * inch])
            url_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f77b4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))

            elements.append(url_table)

        # Footer
        elements.append(Spacer(1, 0.5 * inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.grey,
            alignment=1  # Center
        )

        elements.append(Paragraph(
            "This exhibit package was generated automatically.",
            footer_style
        ))
        elements.append(Paragraph(
            "All source URLs have been archived to archive.org for preservation.",
            footer_style
        ))

        # Build PDF
        doc.build(elements)

        return output_path

    def url_to_pdf(self, url: str) -> Optional[str]:
        """
        Convert URL to PDF (requires external service or API2PDF)

        Args:
            url: URL to convert

        Returns:
            Path to generated PDF or None
        """
        # This would require API2PDF or similar service
        # For now, return None - implement when API key available
        print(f"URL to PDF conversion requires API2PDF: {url}")
        return None

    def generate_table_of_contents(
        self,
        exhibit_list: List[Dict],
        visa_type: str,
        output_path: str
    ) -> str:
        """
        Generate Table of Contents PDF

        Args:
            exhibit_list: List of exhibit dictionaries with number, title, pages
            visa_type: Visa category (O-1A, P-1A, etc.)
            output_path: Path for output PDF

        Returns:
            Path to generated TOC PDF
        """
        doc = SimpleDocTemplate(output_path, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1f77b4'),
            spaceAfter=30,
            alignment=1  # Center
        )
        story.append(Paragraph("EXHIBIT PACKAGE", title_style))
        story.append(Paragraph("TABLE OF CONTENTS", title_style))
        story.append(Spacer(1, 0.5*inch))

        # Case info
        info_style = ParagraphStyle(
            'Info',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=20
        )
        info_text = f"""
        <b>Visa Type:</b> {visa_type}<br/>
        <b>Generated:</b> {datetime.now().strftime('%B %d, %Y')}<br/>
        <b>Total Exhibits:</b> {len(exhibit_list)}
        """
        story.append(Paragraph(info_text, info_style))
        story.append(Spacer(1, 0.3*inch))

        # Exhibit table
        table_data = [['Exhibit', 'Title', 'Pages']]

        for exhibit in exhibit_list:
            table_data.append([
                f"Exhibit {exhibit['number']}",
                exhibit['title'][:50],  # Truncate long titles
                str(exhibit.get('pages', '-'))
            ])

        table = Table(table_data, colWidths=[1.5*inch, 4*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))

        story.append(table)

        # Build PDF
        doc.build(story)
        return output_path
