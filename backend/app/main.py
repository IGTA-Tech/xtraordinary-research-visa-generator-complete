"""
Visa Petition Generator V2 - FastAPI Application
"""
import uuid
import asyncio
from datetime import datetime
from typing import Dict, List
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io
import zipfile

from app.config import settings
from app.database import init_db
from app.models import (
    GenerateRequest,
    GenerateResponse,
    StatusResponse,
    LookupRequest,
    LookupResponse,
    UploadResponse,
    URLSource,
    BackgroundRequest,
    BackgroundResponse,
)
from app.services.generator import generate_all_documents
from app.services.perplexity import lookup_beneficiary
from app.services.file_processor import process_file
from app.services.ai_client import generate_text
from app.services.pdf_converter import convert_to_pdf, convert_documents_to_pdf

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# In-memory task storage (use Redis/DB for production)
tasks: Dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("Starting Visa Petition Generator V2...")
    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database init skipped: {e}")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Visa Petition Generator V2",
    description="Generate comprehensive visa petition documents using AI",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add validation exception handler for better debugging
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"Validation error: {exc.errors()}")
    logger.error(f"Request body that caused error: {exc.body}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)[:500]},
    )


# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Visa Petition Generator V2",
        "version": "2.0.0",
    }


@app.get("/health")
async def health():
    """Health check for Railway/deployment"""
    return {"status": "ok"}


@app.post("/api/generate", response_model=GenerateResponse)
async def start_generation(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start document generation.
    Returns immediately with a case_id to poll for progress.
    """
    case_id = str(uuid.uuid4())

    # Initialize task state
    tasks[case_id] = {
        "case_id": case_id,
        "status": "processing",
        "progress": 0,
        "current_stage": "Initializing",
        "current_message": "Starting document generation...",
        "documents": None,
        "error_message": None,
        "created_at": datetime.utcnow(),
        "completed_at": None,
    }

    # Start background generation
    background_tasks.add_task(run_generation, case_id, request)

    logger.info(f"Started generation for case {case_id}")

    return GenerateResponse(
        case_id=case_id,
        status="processing",
        message="Document generation started. Poll /api/status/{case_id} for progress.",
    )


async def run_generation(case_id: str, request: GenerateRequest):
    """Background task that runs the full generation pipeline"""
    try:
        def update_progress(stage: str, progress: int, message: str):
            tasks[case_id]["progress"] = progress
            tasks[case_id]["current_stage"] = stage
            tasks[case_id]["current_message"] = message

        result = await generate_all_documents(request, update_progress)

        tasks[case_id]["status"] = "completed"
        tasks[case_id]["progress"] = 100
        tasks[case_id]["current_stage"] = "Complete"
        tasks[case_id]["current_message"] = "All 8 documents generated!"
        tasks[case_id]["documents"] = result["documents"]
        tasks[case_id]["completed_at"] = datetime.utcnow()

        logger.info(f"Generation complete for case {case_id}")

    except Exception as e:
        logger.error(f"Generation failed for case {case_id}: {e}")
        tasks[case_id]["status"] = "failed"
        tasks[case_id]["error_message"] = str(e)
        tasks[case_id]["current_stage"] = "Error"
        tasks[case_id]["current_message"] = f"Generation failed: {str(e)}"


@app.get("/api/status/{case_id}", response_model=StatusResponse)
async def get_status(case_id: str):
    """Get generation progress and status"""
    if case_id not in tasks:
        raise HTTPException(status_code=404, detail="Case not found")

    task = tasks[case_id]

    return StatusResponse(
        case_id=case_id,
        status=task["status"],
        progress=task["progress"],
        current_stage=task["current_stage"],
        current_message=task.get("current_message"),
        error_message=task.get("error_message"),
        documents=[
            {
                "number": d["number"],
                "name": d["name"],
                "word_count": d["word_count"],
                "page_count": d["page_count"],
            }
            for d in task["documents"]
        ] if task.get("documents") else None,
        created_at=task["created_at"],
        completed_at=task.get("completed_at"),
    )


@app.post("/api/lookup", response_model=LookupResponse)
async def lookup(request: LookupRequest):
    """
    Use Perplexity AI to find URLs about a beneficiary.
    """
    logger.info(f"Looking up: {request.name} - {request.profession}")

    sources = await lookup_beneficiary(
        name=request.name,
        profession=request.profession,
        visa_type=request.visa_type,
        additional_info=request.additional_info,
    )

    return LookupResponse(
        success=len(sources) > 0,
        sources=sources,
        total_found=len(sources),
        search_strategy="Perplexity AI search with focus on verifiable evidence",
    )


@app.post("/api/generate-background", response_model=BackgroundResponse)
async def generate_background(request: BackgroundRequest):
    """
    Use AI to generate a professional background summary for the beneficiary.
    """
    logger.info(f"Generating background for: {request.name} - {request.profession}")

    prompt = f"""Generate a professional background summary for a visa petition application.

BENEFICIARY INFORMATION:
- Name: {request.name}
- Profession/Field: {request.profession}
- Visa Type: {request.visa_type or 'O-1A (Extraordinary Ability)'}

Write a compelling 3-5 paragraph professional background summary that would be suitable for a visa petition. The summary should:

1. Introduce the beneficiary and their field of expertise
2. Highlight their professional trajectory and career milestones
3. Mention notable achievements, awards, or recognition (use general language if specifics are unknown)
4. Describe their impact on their field
5. Explain why they would qualify for an extraordinary ability visa

IMPORTANT:
- Write in third person
- Use professional, formal language suitable for USCIS
- Be factual but compelling
- If you don't have specific information, use phrases like "has demonstrated", "is recognized for", etc.
- Aim for 300-500 words

Generate the background summary now:"""

    try:
        background = await generate_text(
            prompt=prompt,
            max_tokens=2000,
            temperature=0.7,
        )

        word_count = len(background.split())
        logger.info(f"Generated background: {word_count} words")

        return BackgroundResponse(
            success=True,
            background=background,
            word_count=word_count,
        )
    except Exception as e:
        logger.error(f"Background generation failed: {e}")
        return BackgroundResponse(
            success=False,
            background="",
            word_count=0,
        )


@app.post("/api/upload", response_model=UploadResponse)
async def upload_files(
    files: List[UploadFile] = File(...),
):
    """
    Upload and process files (PDF, DOCX, TXT, images).
    Returns extracted text for each file.
    """
    processed = []
    failed = []

    for file in files:
        try:
            content = await file.read()
            result = await process_file(file.filename, content)

            processed.append({
                "filename": result["filename"],
                "file_type": result["file_type"],
                "extracted_text": result["extracted_text"],
                "word_count": result["word_count"],
            })

            logger.info(f"Processed file: {file.filename} ({result['word_count']} words)")

        except Exception as e:
            logger.error(f"Failed to process {file.filename}: {e}")
            failed.append({
                "filename": file.filename,
                "error": str(e),
            })

    return UploadResponse(
        success=len(processed) > 0,
        files=processed,
        failed=failed if failed else None,
    )


@app.get("/api/download/{case_id}")
async def download_all(case_id: str, format: str = "pdf"):
    """
    Download all documents as a ZIP file.

    Query params:
        format: "pdf" (default) or "txt"
    """
    if case_id not in tasks:
        raise HTTPException(status_code=404, detail="Case not found")

    task = tasks[case_id]
    if task["status"] != "completed" or not task.get("documents"):
        raise HTTPException(status_code=400, detail="Documents not ready")

    # Create ZIP file in memory
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for doc in task["documents"]:
            doc_name = doc['name'].replace(' ', '_')

            if format == "pdf" and settings.API2PDF_API_KEY:
                # Convert to PDF
                pdf_bytes = await convert_to_pdf(
                    content=doc["content"],
                    filename=f"Document_{doc['number']}_{doc_name}.pdf"
                )
                if pdf_bytes:
                    zip_file.writestr(f"Document_{doc['number']}_{doc_name}.pdf", pdf_bytes)
                else:
                    # Fallback to text if PDF fails
                    zip_file.writestr(f"Document_{doc['number']}_{doc_name}.txt", doc["content"])
            else:
                # Text format
                zip_file.writestr(f"Document_{doc['number']}_{doc_name}.txt", doc["content"])

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=visa_petition_{case_id}.zip"
        },
    )


@app.get("/api/download/{case_id}/{doc_number}")
async def download_document(case_id: str, doc_number: int, format: str = "pdf"):
    """
    Download a single document.

    Query params:
        format: "pdf" (default) or "txt"
    """
    if case_id not in tasks:
        raise HTTPException(status_code=404, detail="Case not found")

    task = tasks[case_id]
    if task["status"] != "completed" or not task.get("documents"):
        raise HTTPException(status_code=400, detail="Documents not ready")

    # Find document
    doc = next((d for d in task["documents"] if d["number"] == doc_number), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc_name = doc['name'].replace(' ', '_')

    if format == "pdf" and settings.API2PDF_API_KEY:
        # Convert to PDF
        pdf_bytes = await convert_to_pdf(
            content=doc["content"],
            filename=f"Document_{doc['number']}_{doc_name}.pdf"
        )
        if pdf_bytes:
            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=Document_{doc['number']}_{doc_name}.pdf"
                },
            )

    # Text format (fallback or explicit)
    return StreamingResponse(
        io.BytesIO(doc["content"].encode()),
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename=Document_{doc['number']}_{doc_name}.txt"
        },
    )


# Run with: uvicorn app.main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
