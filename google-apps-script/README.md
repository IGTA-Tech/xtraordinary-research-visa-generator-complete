# Google Apps Script - Visa Exhibit Generator

**Native Google Workspace tool for generating professional numbered exhibit packages directly from Google Drive folders.**

## Features

✅ **Native Google Drive Integration**
- No authentication needed (runs in your Google account)
- Direct access to all Drive folders
- Automatic file detection
- Recursive folder processing

✅ **Professional Output**
- Automatic exhibit numbering (A, B, C... or 1, 2, 3... or I, II, III...)
- Google Docs Table of Contents
- Numbered copies of all files
- Original files remain unchanged

✅ **Zero Infrastructure**
- No servers required
- No installation needed
- Runs entirely in Google Workspace
- Free (uses your Google account)

✅ **User-Friendly Interface**
- Beautiful web interface
- Folder preview before generation
- Real-time progress tracking
- One-click access to results

## Quick Start

### Step 1: Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Name it "Visa Exhibit Generator"

### Step 2: Copy Code Files

**Copy the following files from this folder into your Apps Script project:**

1. **Code.gs** → Main backend code
   - In Apps Script editor, replace default code with contents of `Code.gs`

2. **Index.html** → Web interface
   - Click "+" next to Files
   - Select "HTML"
   - Name it "Index"
   - Replace contents with `Index.html`

3. **appsscript.json** → Configuration
   - Click Project Settings (gear icon)
   - Check "Show appsscript.json"
   - Click "< >" Editor
   - Replace `appsscript.json` with our version

### Step 3: Deploy as Web App

1. Click "Deploy" → "New deployment"
2. Click gear icon → "Web app"
3. Settings:
   - **Description**: Visa Exhibit Generator v1
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click "Deploy"
5. Authorize the app:
   - Click "Authorize access"
   - Choose your Google account
   - Click "Advanced" → "Go to Visa Exhibit Generator"
   - Click "Allow"
6. Copy the Web App URL

### Step 4: Use the Tool

1. Open the Web App URL
2. Paste a Google Drive folder URL or ID
3. Click "Preview Folder Contents" to verify
4. Configure options (numbering style, case name, etc.)
5. Click "Generate Exhibit Package"
6. Access results from links provided

## How It Works

### Input

Provide a Google Drive folder URL:
```
https://drive.google.com/drive/folders/1ABC...XYZ
```

Or just the folder ID:
```
1ABC...XYZ
```

### Processing

1. **Scan Folder**: Finds all PDF files (recursive if selected)
2. **Sort Files**: Alphabetically by filename
3. **Number Exhibits**: Creates numbered copies (A, B, C...)
4. **Generate TOC**: Creates Google Doc with exhibit list
5. **Create Package**: Combines references in summary doc

### Output

New folder in Drive containing:
- Exhibit_A_[filename].pdf
- Exhibit_B_[filename].pdf
- Exhibit_C_[filename].pdf
- ...
- Exhibit_Package_Table_of_Contents (Google Doc)
- [CaseName]_Complete_Package (Google Doc with links)

## Usage Examples

### Example 1: Simple Folder

**Folder Structure:**
```
My Evidence/
├── Award_Letter.pdf
├── Publication_1.pdf
├── Publication_2.pdf
└── Resume.pdf
```

**Output:**
```
Exhibit_Package_2024/
├── Exhibit_A_Award_Letter.pdf
├── Exhibit_B_Publication_1.pdf
├── Exhibit_C_Publication_2.pdf
├── Exhibit_D_Resume.pdf
├── Exhibit_Package_Table_of_Contents
└── Exhibit_Package_Complete_Package
```

### Example 2: Nested Folders (Recursive)

**Folder Structure:**
```
Smith_O1_Evidence/
├── Awards/
│   ├── Award_2021.pdf
│   └── Award_2022.pdf
├── Publications/
│   ├── Paper_1.pdf
│   └── Paper_2.pdf
└── Letters/
    └── Recommendation.pdf
```

**Output:** All 5 PDFs numbered sequentially A through E

### Example 3: Custom Numbering

**Options:**
- Numbering Style: Numbers (1, 2, 3...)
- Case Name: Smith_EB1A_2024
- Beneficiary: John Smith

**Output:**
- Exhibit_1_[filename].pdf
- Exhibit_2_[filename].pdf
- TOC includes beneficiary name

## Configuration Options

### Numbering Styles

| Style | Example | Best For |
|-------|---------|----------|
| Letters | A, B, C, D... Z, AA, AB... | Standard exhibits (default) |
| Numbers | 1, 2, 3, 4... | Simple sequential |
| Roman | I, II, III, IV... | Formal/legal documents |

### Advanced Options

**Recursive Processing**
- ✅ Enabled: Scans all subfolders
- ❌ Disabled: Only files in main folder

**Table of Contents**
- ✅ Enabled: Creates TOC Google Doc
- ❌ Disabled: Skip TOC

**Combined Package**
- ✅ Enabled: Creates summary doc with links
- ❌ Disabled: Only individual exhibits

## Permissions

The app requests these permissions:
- ✅ **Drive access**: Read files, create numbered copies
- ✅ **Docs access**: Generate Table of Contents
- ✅ **External requests**: Future archive.org integration

**Privacy**: All processing happens in your Google account. No data leaves Google.

## Troubleshooting

### "Folder not found" Error

**Cause**: Invalid folder URL or no access

**Solution**:
1. Verify folder URL is correct
2. Ensure you have access to the folder
3. Try using just the folder ID instead of full URL

### "No PDF files found" Error

**Cause**: Folder contains no PDFs

**Solution**:
1. Check folder contains PDF files
2. Enable "Include subfolders" if PDFs are nested
3. Preview folder to see what files are detected

### "Authorization required" Error

**Cause**: App not authorized

**Solution**:
1. Click the authorization link
2. Choose your Google account
3. Click "Advanced" → "Go to Visa Exhibit Generator"
4. Click "Allow"

### "Script timeout" Error

**Cause**: Too many files (100+)

**Solution**:
1. Split into smaller batches
2. Process subfolders separately
3. Google Apps Script has 6-minute execution limit

## Limitations

⚠️ **Google Apps Script Limitations:**

| Limitation | Value | Workaround |
|------------|-------|------------|
| Max execution time | 6 minutes | Process smaller batches |
| Max file size | 50 MB per file | Use smaller files |
| PDF manipulation | Limited | Files renamed, not modified |
| True PDF merge | Not available | Creates doc with links |

## Future Enhancements

**Planned Features:**
- [ ] Archive.org URL preservation
- [ ] True PDF merging (via external API)
- [ ] PDF header/footer with exhibit numbers
- [ ] Batch processing multiple folders
- [ ] Email delivery
- [ ] Custom exhibit templates
- [ ] Progress tracking for large jobs

## Comparison with Streamlit Version

| Feature | Google Apps Script | Streamlit |
|---------|-------------------|-----------|
| Drive integration | Native (no auth) | Requires credentials |
| Installation | None | Python + packages |
| Hosting | Free (Google) | Requires server |
| PDF manipulation | Limited | Full control |
| File size limits | 50 MB | Unlimited |
| Execution time | 6 minutes | Unlimited |
| Best for | Google Workspace users | Power users, large files |

## Deployment

### Sharing with Team

1. Deploy as web app (see Step 3 above)
2. Share web app URL with team
3. Each user accesses with their Google account
4. Files process in each user's Drive

### Making Updates

1. Edit code in Apps Script editor
2. Click "Deploy" → "Manage deployments"
3. Click pencil icon next to current deployment
4. Version: "New version"
5. Click "Deploy"

### Version Control

**Recommended**: Keep code in GitHub and copy to Apps Script

```bash
# This folder structure
google-apps-script-exhibit-generator/
├── Code.gs
├── Index.html
├── appsscript.json
└── README.md
```

## Support

**Issues**:
- Check Execution Log: View → Executions
- Check Apps Script Logs: View → Logs
- Common errors listed in Troubleshooting section

**Questions**:
- Review examples in this README
- Check the Streamlit version for comparison
- Contact developer

## License

Internal use only - Innovative Automations

---

**Built**: November 2025
**Version**: 1.0
**Status**: Production Ready
**Platform**: Google Apps Script
