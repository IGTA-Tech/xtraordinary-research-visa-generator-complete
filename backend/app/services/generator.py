"""
Document Generation Orchestrator
Handles parallel generation of all 8 documents
Target: 6-7 minutes total
"""
import asyncio
from typing import Callable, Optional
from datetime import datetime
import logging

from app.models import GenerateRequest, BeneficiaryInfo
from app.services.knowledge_base import load_knowledge_base
from app.services.url_fetcher import fetch_urls
from app.services.file_processor import process_files
from app.services.perplexity import lookup_beneficiary, conduct_deep_research
from app.services.email_service import send_documents_email
from app.services.documents import (
    generate_doc1,
    generate_doc2,
    generate_doc3,
    generate_doc4,
    generate_doc5,
    generate_doc6,
    generate_doc7,
    generate_doc8,
)

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[str, int, str], None]


class GenerationContext:
    """Context object shared across all document generators"""

    def __init__(
        self,
        beneficiary: BeneficiaryInfo,
        knowledge_base: str,
        urls: list,
        files: list,
    ):
        self.beneficiary = beneficiary
        self.knowledge_base = knowledge_base
        self.urls = urls
        self.files = files

    def to_dict(self) -> dict:
        return {
            "beneficiary": self.beneficiary,
            "knowledge_base": self.knowledge_base,
            "urls": self.urls,
            "files": self.files,
        }


async def generate_all_documents(
    request: GenerateRequest,
    on_progress: Optional[ProgressCallback] = None,
) -> dict:
    """
    Main orchestration function - generates all 8 documents with parallel execution.

    Target time: 6-7 minutes total

    Args:
        request: The generation request with beneficiary info, URLs, files
        on_progress: Optional callback for progress updates

    Returns:
        Dict with documents list and metadata
    """
    start_time = datetime.utcnow()

    def progress(stage: str, pct: int, msg: str):
        if on_progress:
            try:
                on_progress(stage, pct, msg)
            except Exception as e:
                logger.error(f"Progress callback error: {e}")
        logger.info(f"[{pct}%] {stage}: {msg}")

    beneficiary = request.beneficiary_info

    # ============================================
    # PHASE 1: PREPARATION (60 seconds)
    # ============================================
    progress("Preparation", 5, "Loading knowledge base and processing evidence...")

    # Run preparation tasks in parallel
    kb_task = load_knowledge_base(beneficiary.visa_type)

    # Convert URL sources to list of URL strings
    url_strings = [u.url for u in request.urls if u.url]

    urls_task = fetch_urls(url_strings) if url_strings else asyncio.coroutine(lambda: [])()

    # Process uploaded files (already have extracted text)
    files_data = [
        {
            "filename": f.filename,
            "file_type": f.file_type,
            "extracted_text": f.extracted_text,
            "word_count": f.word_count,
        }
        for f in request.uploaded_files
    ]

    knowledge_base, fetched_urls = await asyncio.gather(kb_task, urls_task)

    # Convert fetched URLs to dict format
    urls_dict = [
        {
            "url": u.url,
            "title": u.title,
            "content": u.content,
            "domain": u.domain,
            "tier": u.tier,
        }
        for u in fetched_urls
    ] if fetched_urls else []

    progress("Preparation", 10, f"Loaded KB, fetched {len(urls_dict)} URLs")

    # Build context
    context = GenerationContext(
        beneficiary=beneficiary,
        knowledge_base=knowledge_base,
        urls=urls_dict,
        files=files_data,
    ).to_dict()

    # ============================================
    # PHASE 2: DOCUMENT 1 - FOUNDATION (3-4 minutes)
    # ============================================
    progress("Document 1", 15, "Generating Comprehensive Analysis (this takes ~3-4 min)...")

    doc1 = await generate_doc1(context)

    progress("Document 1", 35, f"Comprehensive Analysis complete ({len(doc1)} chars)")

    # ============================================
    # PHASE 3: PARALLEL GENERATION (2-3 minutes)
    # Documents 2, 3, 5, 6, 7 can run simultaneously
    # ============================================
    progress("Parallel", 40, "Generating 5 documents in parallel...")

    doc2_task = generate_doc2(context, doc1)
    doc3_task = generate_doc3(context)
    doc5_task = generate_doc5(context, doc1)
    doc6_task = generate_doc6(context, doc1)
    doc7_task = generate_doc7(context, doc1)

    doc2, doc3, doc5, doc6, doc7 = await asyncio.gather(
        doc2_task, doc3_task, doc5_task, doc6_task, doc7_task
    )

    progress("Parallel", 75, "5 documents complete")

    # ============================================
    # PHASE 4: DEPENDENT DOCUMENTS (2 minutes)
    # Document 4 needs Doc1 + Doc2
    # Document 8 needs Doc4
    # ============================================
    progress("Document 4", 80, "Generating Legal Brief...")

    doc4 = await generate_doc4(context, doc1, doc2)

    progress("Document 8", 90, "Generating Exhibit Guide...")

    doc8 = await generate_doc8(context, doc4, urls_dict)

    # ============================================
    # PHASE 5: FINALIZATION
    # ============================================
    progress("Finalizing", 95, "Preparing documents...")

    def get_stats(content: str) -> dict:
        words = len(content.split()) if content else 0
        pages = max(1, words // 500)
        return {"word_count": words, "page_count": pages}

    documents = [
        {"number": 1, "name": "Comprehensive Analysis", "content": doc1, **get_stats(doc1)},
        {"number": 2, "name": "Publication Analysis", "content": doc2, **get_stats(doc2)},
        {"number": 3, "name": "URL Reference", "content": doc3, **get_stats(doc3)},
        {"number": 4, "name": "Legal Brief", "content": doc4, **get_stats(doc4)},
        {"number": 5, "name": "Evidence Gap Analysis", "content": doc5, **get_stats(doc5)},
        {"number": 6, "name": "Cover Letter", "content": doc6, **get_stats(doc6)},
        {"number": 7, "name": "Visa Checklist", "content": doc7, **get_stats(doc7)},
        {"number": 8, "name": "Exhibit Assembly Guide", "content": doc8, **get_stats(doc8)},
    ]

    # Send email if provided
    email_sent = False
    logger.info(f"Email check: beneficiary.email = '{beneficiary.email}'")
    if beneficiary.email:
        progress("Email", 98, f"Sending documents to {beneficiary.email}...")
        logger.info(f"Attempting to send {len(documents)} documents to {beneficiary.email}")
        try:
            email_sent = await send_documents_email(
                to_email=beneficiary.email,
                beneficiary_name=beneficiary.full_name,
                documents=documents,
                visa_type=beneficiary.visa_type,
            )
            logger.info(f"Email send result: {email_sent}")
        except Exception as e:
            logger.error(f"Email failed with exception: {type(e).__name__}: {e}")
            import traceback
            logger.error(f"Email traceback: {traceback.format_exc()}")
    else:
        logger.warning("No email provided - skipping email delivery")

    progress("Complete", 100, "All 8 documents generated!")

    # Calculate total time
    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()

    return {
        "documents": documents,
        "total_documents": 8,
        "total_words": sum(d["word_count"] for d in documents),
        "total_pages": sum(d["page_count"] for d in documents),
        "duration_seconds": duration,
        "email_sent": email_sent,
    }
