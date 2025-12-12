import sgMail from '@sendgrid/mail';
import { BeneficiaryInfo } from '../types';
import { convertDocumentsToPDFs } from './pdf-generator';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendDocumentsEmail(
  beneficiaryInfo: BeneficiaryInfo,
  documents: Array<{ name: string; content: string; pageCount: number }>
): Promise<boolean> {
  try {
    // Convert markdown documents to PDFs
    console.log('Converting documents to PDF format...');
    const pdfDocuments = await convertDocumentsToPDFs(documents);

    const attachments = pdfDocuments.map((doc) => ({
      content: doc.buffer.toString('base64'),
      filename: doc.name,
      type: 'application/pdf',
      disposition: 'attachment',
    }));

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; background: #f9fafb; }
    .document { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
    h3 { color: #1f2937; margin-top: 0; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏆 Visa Petition Documents Ready</h1>
    <p style="font-size: 1.2em; margin: 10px 0 0 0;">Generated for: ${beneficiaryInfo.fullName}</p>
    <p style="margin: 5px 0 0 0;">Visa Type: ${beneficiaryInfo.visaType}</p>
  </div>

  <div class="content">
    <h2>Your Complete ${beneficiaryInfo.visaType} Visa Petition Package</h2>
    <p>Hello,</p>
    <p>Your comprehensive visa petition documentation has been successfully generated using AI analysis of your credentials and our extensive immigration law knowledge base.</p>

    <p style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
      <strong>✨ Professional Package:</strong> Your petition includes <strong>8 comprehensive documents</strong> totaling 200+ pages of analysis, evidence organization, and USCIS-ready materials.
    </p>

    <div class="document">
      <h3>📄 Document 1: Comprehensive Analysis</h3>
      <p><strong>75+ pages</strong> - Complete criterion-by-criterion evaluation with:</p>
      <ul>
        <li>Evidence scoring and weighting</li>
        <li>Approval probability assessment</li>
        <li>Strengths and weaknesses analysis</li>
        <li>Specific recommendations</li>
      </ul>
    </div>

    <div class="document">
      <h3>📊 Document 2: Publication Significance Analysis</h3>
      <p><strong>40+ pages</strong> - Detailed assessment including:</p>
      <ul>
        <li>Every media mention analyzed</li>
        <li>Circulation and reach data</li>
        <li>Editorial standards evaluation</li>
        <li>Aggregate impact analysis</li>
      </ul>
    </div>

    <div class="document">
      <h3>🔗 Document 3: URL Reference Document</h3>
      <p>Organized reference list featuring:</p>
      <ul>
        <li>All evidence sources by criterion</li>
        <li>Complete verified links</li>
        <li>Quality indicators</li>
        <li>Easy exhibit organization</li>
      </ul>
    </div>

    <div class="document">
      <h3>⚖️ Document 4: Legal Brief</h3>
      <p><strong>30+ pages</strong> - Professional petition brief with:</p>
      <ul>
        <li>USCIS-ready format</li>
        <li>Detailed legal arguments</li>
        <li>Exhibit organization guide</li>
        <li>Executive summary</li>
      </ul>
    </div>

    <div class="document">
      <h3>🔍 Document 5: Evidence Gap Analysis <span style="color: #059669; font-size: 0.9em;">NEW!</span></h3>
      <p><strong>25-30 pages</strong> - Professional evidence assessment:</p>
      <ul>
        <li>Evidence-by-evidence scoring (1-10 scale)</li>
        <li>RFE risk analysis by criterion</li>
        <li>Specific action items to strengthen case</li>
        <li>USCIS adjudicator perspective</li>
      </ul>
    </div>

    <div class="document">
      <h3>📬 Document 6: USCIS Cover Letter <span style="color: #dc2626; font-size: 0.9em;">REQUIRED!</span></h3>
      <p><strong>2-3 pages</strong> - Professional submission letter:</p>
      <ul>
        <li>Formal USCIS petition cover letter</li>
        <li>Criteria checklist with qualifications summary</li>
        <li>Petition contents overview</li>
        <li>Ready for attorney signature</li>
      </ul>
    </div>

    <div class="document">
      <h3>✅ Document 7: Visa Checklist <span style="color: #059669; font-size: 0.9em;">NEW!</span></h3>
      <p><strong>1-2 pages</strong> - Quick reference scorecard:</p>
      <ul>
        <li>Instant case strength assessment</li>
        <li>Top 5 strengths and weaknesses</li>
        <li>Critical action items with timelines</li>
        <li>Filing readiness evaluation</li>
      </ul>
    </div>

    <div class="document">
      <h3>📋 Document 8: Exhibit Assembly Guide <span style="color: #059669; font-size: 0.9em;">NEW!</span></h3>
      <p><strong>15-20 pages</strong> - Professional organization guide:</p>
      <ul>
        <li>Detailed exhibit list by criterion</li>
        <li>Highlighting instructions for each document</li>
        <li>Assembly and binding instructions</li>
        <li>Quality control checklist</li>
      </ul>
    </div>

    <h3>📎 Documents Attached (PDF Format)</h3>
    <p>All eight documents are attached to this email as <strong>professional PDF files</strong>. You can:</p>
    <ul>
      <li>Open and review each PDF document immediately</li>
      <li>Share with your immigration attorney</li>
      <li>Print for physical review and annotation</li>
      <li>Use as foundation for USCIS petition</li>
      <li>Import into Word/Adobe for editing if needed</li>
    </ul>
    <p style="background: #dbeafe; padding: 10px; border-radius: 5px; margin-top: 10px;">
      <strong>💡 Tip:</strong> PDFs are ready to print and submit. They maintain professional formatting and are universally compatible.
    </p>

    <h3>⚠️ IMPORTANT: Next Steps</h3>
    <ol>
      <li><strong>Start with Document 7 (Visa Checklist)</strong>: Review the 1-page scorecard first for an instant assessment of your case strength.</li>
      <li><strong>Review Document 5 (Evidence Gap Analysis)</strong>: Check the specific action items and RFE risks identified.</li>
      <li><strong>Attorney Review Required</strong>: These are AI-generated drafts. Have a qualified immigration professional review all documents before submission.</li>
      <li><strong>Gather Additional Evidence</strong>: Follow recommendations in Documents 1 and 5 for strengthening your case.</li>
      <li><strong>Use Document 8 for Organization</strong>: Follow the Exhibit Assembly Guide to professionally organize all evidence.</li>
      <li><strong>Document 6 is REQUIRED</strong>: The USCIS Cover Letter must be included with every petition filing.</li>
    </ol>

    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #92400e;">⚖️ Legal Disclaimer</h3>
      <p style="color: #92400e; margin: 0;"><strong>Important:</strong> These documents are AI-assisted drafts for petition preparation. They are NOT legal advice and should ALWAYS be reviewed by a qualified immigration attorney before submission to USCIS. Success of your petition depends on many factors including proper evidence collection, presentation, and compliance with current USCIS policies.</p>
    </div>
  </div>

  <div class="footer">
    <p><strong>Innovative Automations - Visa Petition Document Generator</strong></p>
    <p>Specialized in O-1A, O-1B, P-1A, and EB-1A Visa Petitions</p>
    <p style="margin-top: 15px;">© 2025 Innovative Automations. All rights reserved.</p>
    <p style="margin-top: 10px;">
      Questions? Reply to this email or contact us at
      <a href="mailto:info@innovativeglobaltalent.com" style="color: #93c5fd; text-decoration: none;">info@innovativeglobaltalent.com</a>
    </p>
    <p style="margin-top: 5px; font-size: 0.9em;">Powered by Claude AI</p>
  </div>
</body>
</html>`;

    const msg = {
      to: beneficiaryInfo.recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'applications@innovativeautomations.dev',
      replyTo: process.env.SENDGRID_REPLY_TO_EMAIL || 'info@innovativeglobaltalent.com',
      subject: `Your ${beneficiaryInfo.visaType} Visa Petition Documents - ${beneficiaryInfo.fullName}`,
      html: emailHtml,
      attachments,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
