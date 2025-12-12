"""
PDF Converter - Convert generated documents to PDF using Api2Pdf
"""
import logging
from typing import Optional
import httpx
import markdown

from app.config import settings

logger = logging.getLogger(__name__)


async def convert_markdown_to_html(md_content: str) -> str:
    """
    Convert markdown content to styled HTML for PDF generation.
    """
    # Convert markdown to HTML
    html_body = markdown.markdown(
        md_content,
        extensions=['tables', 'fenced_code', 'toc', 'nl2br']
    )

    # Wrap in styled HTML document
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: letter;
                margin: 1in;
            }}
            body {{
                font-family: 'Times New Roman', Times, serif;
                font-size: 12pt;
                line-height: 1.6;
                color: #000;
                max-width: 100%;
            }}
            h1 {{
                font-size: 18pt;
                font-weight: bold;
                margin-top: 24pt;
                margin-bottom: 12pt;
                text-align: center;
            }}
            h2 {{
                font-size: 14pt;
                font-weight: bold;
                margin-top: 18pt;
                margin-bottom: 8pt;
                border-bottom: 1px solid #333;
                padding-bottom: 4pt;
            }}
            h3 {{
                font-size: 12pt;
                font-weight: bold;
                margin-top: 14pt;
                margin-bottom: 6pt;
            }}
            p {{
                margin-bottom: 10pt;
                text-align: justify;
            }}
            ul, ol {{
                margin-left: 20pt;
                margin-bottom: 10pt;
            }}
            li {{
                margin-bottom: 4pt;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 12pt 0;
            }}
            th, td {{
                border: 1px solid #333;
                padding: 6pt 8pt;
                text-align: left;
            }}
            th {{
                background-color: #f0f0f0;
                font-weight: bold;
            }}
            blockquote {{
                margin: 12pt 20pt;
                padding-left: 12pt;
                border-left: 3px solid #666;
                font-style: italic;
            }}
            .page-break {{
                page-break-after: always;
            }}
            hr {{
                border: none;
                border-top: 1px solid #999;
                margin: 18pt 0;
            }}
        </style>
    </head>
    <body>
        {html_body}
    </body>
    </html>
    """

    return html


async def convert_to_pdf(
    content: str,
    filename: str,
    is_markdown: bool = True
) -> Optional[bytes]:
    """
    Convert text/markdown content to PDF using Api2Pdf.

    Args:
        content: Text or markdown content
        filename: Output filename (for logging)
        is_markdown: Whether to process as markdown

    Returns:
        PDF bytes or None if conversion failed
    """
    if not settings.API2PDF_API_KEY:
        logger.warning("API2PDF_API_KEY not set - returning None")
        return None

    try:
        # Convert to HTML
        if is_markdown:
            html = await convert_markdown_to_html(content)
        else:
            # Plain text - wrap in basic HTML
            escaped = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{
                        font-family: 'Courier New', monospace;
                        font-size: 11pt;
                        line-height: 1.4;
                        white-space: pre-wrap;
                        margin: 1in;
                    }}
                </style>
            </head>
            <body>{escaped}</body>
            </html>
            """

        # Call Api2Pdf
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://v2.api2pdf.com/chrome/pdf/html",
                headers={
                    "Authorization": settings.API2PDF_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "html": html,
                    "inline": False,
                    "filename": filename,
                    "options": {
                        "printBackground": True,
                        "marginTop": "1in",
                        "marginBottom": "1in",
                        "marginLeft": "1in",
                        "marginRight": "1in"
                    }
                }
            )

            if response.status_code != 200:
                logger.error(f"Api2Pdf error: {response.status_code} - {response.text}")
                return None

            result = response.json()

            if not result.get("success"):
                logger.error(f"Api2Pdf failed: {result}")
                return None

            # Download the PDF
            pdf_url = result.get("pdf") or result.get("FileUrl")
            if not pdf_url:
                logger.error("No PDF URL in response")
                return None

            pdf_response = await client.get(pdf_url)
            if pdf_response.status_code != 200:
                logger.error(f"Failed to download PDF: {pdf_response.status_code}")
                return None

            logger.info(f"Successfully converted {filename} to PDF ({len(pdf_response.content)} bytes)")
            return pdf_response.content

    except Exception as e:
        logger.error(f"PDF conversion failed for {filename}: {e}")
        return None


async def convert_documents_to_pdf(documents: list) -> list:
    """
    Convert a list of document dicts to PDFs.

    Args:
        documents: List of dicts with 'number', 'name', 'content' keys

    Returns:
        List of dicts with 'number', 'name', 'content' (as PDF bytes), 'format'
    """
    pdf_documents = []

    for doc in documents:
        filename = f"Document_{doc['number']}_{doc['name'].replace(' ', '_')}.pdf"

        pdf_bytes = await convert_to_pdf(
            content=doc["content"],
            filename=filename,
            is_markdown=True  # Our docs use markdown formatting
        )

        if pdf_bytes:
            pdf_documents.append({
                "number": doc["number"],
                "name": doc["name"],
                "content": pdf_bytes,
                "format": "pdf",
                "filename": filename
            })
        else:
            # Fallback to text if PDF conversion fails
            logger.warning(f"PDF conversion failed for doc {doc['number']}, using text")
            pdf_documents.append({
                "number": doc["number"],
                "name": doc["name"],
                "content": doc["content"].encode("utf-8"),
                "format": "txt",
                "filename": filename.replace(".pdf", ".txt")
            })

    return pdf_documents
