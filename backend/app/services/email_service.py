"""
Email Service - Send documents via SendGrid
"""
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
from app.config import settings
import base64
import logging

logger = logging.getLogger(__name__)


async def send_documents_email(
    to_email: str,
    beneficiary_name: str,
    documents: list,
    visa_type: str = "Visa",
) -> bool:
    """
    Send generated documents via email.

    Args:
        to_email: Recipient email address
        beneficiary_name: Name of the beneficiary
        documents: List of document dicts with 'name' and 'content'
        visa_type: Type of visa for email subject

    Returns:
        True if email sent successfully
    """
    logger.info(f"Attempting to send email to {to_email} for {beneficiary_name}")

    if not settings.SENDGRID_API_KEY:
        logger.warning("SendGrid API key not configured - SENDGRID_API_KEY is empty")
        return False

    if not settings.SENDGRID_API_KEY.startswith("SG."):
        logger.error(f"Invalid SendGrid API key format - key starts with: {settings.SENDGRID_API_KEY[:10]}...")
        return False

    if not settings.SENDGRID_FROM_EMAIL:
        logger.error("SENDGRID_FROM_EMAIL not configured")
        return False

    logger.info(f"SendGrid configured - From: {settings.SENDGRID_FROM_EMAIL}, API Key: SG.***")

    try:
        # Create email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Visa Petition Documents</h1>
            </div>

            <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937;">Hello,</h2>

                <p style="color: #4b5563; line-height: 1.6;">
                    Your {visa_type} visa petition documents for <strong>{beneficiary_name}</strong>
                    have been generated successfully.
                </p>

                <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin-top: 0;">Documents Included:</h3>
                    <ul style="color: #4b5563;">
        """

        for doc in documents:
            word_count = len(doc.get("content", "").split())
            page_est = max(1, word_count // 500)
            html_content += f"""
                        <li style="margin: 8px 0;">
                            <strong>{doc.get('name', 'Document')}</strong>
                            <span style="color: #9ca3af;">({word_count:,} words, ~{page_est} pages)</span>
                        </li>
            """

        html_content += """
                    </ul>
                </div>

                <p style="color: #4b5563; line-height: 1.6;">
                    All documents are attached to this email as text files.
                    You can copy the content into your preferred document editor for formatting.
                </p>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="color: #92400e; margin: 0;">
                        <strong>Important:</strong> Please review all documents carefully before submission.
                        These are AI-generated drafts that may require attorney review and customization.
                    </p>
                </div>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    Best regards,<br>
                    Visa Petition Generator
                </p>
            </div>

            <div style="background: #1f2937; padding: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    This email was sent by Visa Petition Generator.
                </p>
            </div>
        </body>
        </html>
        """

        message = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject=f"{visa_type} Petition Documents - {beneficiary_name}",
            html_content=html_content,
        )

        # Add documents as attachments
        for idx, doc in enumerate(documents):
            content = doc.get("content", "")
            name = doc.get("name", f"Document {idx + 1}")

            # Create safe filename
            safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in name)
            filename = f"{safe_name}.txt"

            attachment = Attachment(
                FileContent(base64.b64encode(content.encode()).decode()),
                FileName(filename),
                FileType("text/plain"),
                Disposition("attachment"),
            )
            message.add_attachment(attachment)

        # Send email
        logger.info(f"Sending email with {len(documents)} attachments...")
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)

        if response.status_code in [200, 201, 202]:
            logger.info(f"Email sent successfully to {to_email}, status: {response.status_code}")
            return True
        else:
            logger.error(f"SendGrid returned non-success status: {response.status_code}, body: {response.body}")
            return False

    except Exception as e:
        logger.error(f"Failed to send email: {type(e).__name__}: {e}")
        # Try to get more details if it's a SendGrid error
        if hasattr(e, 'body'):
            logger.error(f"SendGrid error body: {e.body}")
        if hasattr(e, 'status_code'):
            logger.error(f"SendGrid error status: {e.status_code}")
        return False
