"""
SQLAlchemy database models
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Beneficiary Info
    beneficiary_name = Column(String(255), nullable=False)
    profession = Column(String(255))
    visa_type = Column(String(20), nullable=False)
    brief_type = Column(String(20), default="comprehensive")
    email = Column(String(255))
    nationality = Column(String(100))
    current_status = Column(String(100))
    field_of_expertise = Column(String(255))
    background_info = Column(Text)
    additional_info = Column(Text)
    petitioner_name = Column(String(255))
    petitioner_organization = Column(String(255))

    # Status tracking
    status = Column(String(20), default="pending")
    progress = Column(Integer, default=0)
    current_stage = Column(String(100))
    current_message = Column(Text)
    error_message = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    urls = relationship("CaseURL", back_populates="case", cascade="all, delete-orphan")
    files = relationship("CaseFile", back_populates="case", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_cases_status", "status"),
    )


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)

    document_number = Column(Integer, nullable=False)
    document_name = Column(String(100), nullable=False)
    content = Column(Text)
    word_count = Column(Integer)
    page_count = Column(Integer)

    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="documents")

    __table_args__ = (
        Index("idx_documents_case", "case_id"),
    )


class CaseURL(Base):
    __tablename__ = "case_urls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)

    url = Column(Text, nullable=False)
    title = Column(String(500))
    description = Column(Text)
    source_name = Column(String(200))
    tier = Column(Integer)
    fetched_content = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="urls")

    __table_args__ = (
        Index("idx_urls_case", "case_id"),
    )


class CaseFile(Base):
    __tablename__ = "case_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)

    filename = Column(String(255), nullable=False)
    file_type = Column(String(50))
    file_size = Column(Integer)
    extracted_text = Column(Text)
    word_count = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="files")

    __table_args__ = (
        Index("idx_files_case", "case_id"),
    )
