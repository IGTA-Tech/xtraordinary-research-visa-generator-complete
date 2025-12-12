"""
Pydantic models for API request/response
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class VisaType(str, Enum):
    O1A = "O-1A"
    O1B = "O-1B"
    P1A = "P-1A"
    EB1A = "EB-1A"
    EB2_NIW = "EB-2 NIW"


class BriefType(str, Enum):
    STANDARD = "standard"
    COMPREHENSIVE = "comprehensive"


class BeneficiaryInfo(BaseModel):
    full_name: str
    profession: str
    visa_type: VisaType
    brief_type: BriefType = BriefType.COMPREHENSIVE
    email: Optional[EmailStr] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[str] = None
    passport_number: Optional[str] = None
    phone: Optional[str] = None
    mailing_address: Optional[str] = None
    current_status: Optional[str] = None
    field_of_expertise: Optional[str] = None
    background_info: Optional[str] = None
    additional_info: Optional[str] = None
    petitioner_name: Optional[str] = None
    petitioner_organization: Optional[str] = None
    petitioner_address: Optional[str] = None
    petitioner_phone: Optional[str] = None


class UploadedFile(BaseModel):
    filename: str
    file_type: str
    extracted_text: str
    word_count: int


class URLSource(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    source_name: Optional[str] = None
    tier: Optional[int] = None
    confidence: Optional[str] = None


# Request Models
class GenerateRequest(BaseModel):
    beneficiary_info: BeneficiaryInfo
    urls: List[URLSource] = []
    uploaded_files: List[UploadedFile] = []


class LookupRequest(BaseModel):
    name: str
    profession: str
    visa_type: Optional[VisaType] = None
    additional_info: Optional[str] = None


class BackgroundRequest(BaseModel):
    name: str
    profession: str
    visa_type: Optional[VisaType] = None


class BackgroundResponse(BaseModel):
    success: bool
    background: str
    word_count: int


# Response Models
class GenerateResponse(BaseModel):
    case_id: str
    status: str
    message: str


class StatusResponse(BaseModel):
    case_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    progress: int
    current_stage: str
    current_message: Optional[str] = None
    error_message: Optional[str] = None
    documents: Optional[List[dict]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class LookupResponse(BaseModel):
    success: bool
    sources: List[URLSource]
    total_found: int
    search_strategy: str


class UploadResponse(BaseModel):
    success: bool
    files: List[UploadedFile]
    failed: Optional[List[dict]] = None


class DocumentInfo(BaseModel):
    number: int
    name: str
    word_count: int
    page_count: int
