"""Document generators package"""
from app.services.documents.doc1_comprehensive import generate as generate_doc1
from app.services.documents.doc2_publication import generate as generate_doc2
from app.services.documents.doc3_url_reference import generate as generate_doc3
from app.services.documents.doc4_legal_brief import generate as generate_doc4
from app.services.documents.doc5_gap_analysis import generate as generate_doc5
from app.services.documents.doc6_cover_letter import generate as generate_doc6
from app.services.documents.doc7_checklist import generate as generate_doc7
from app.services.documents.doc8_exhibit_guide import generate as generate_doc8

__all__ = [
    "generate_doc1",
    "generate_doc2",
    "generate_doc3",
    "generate_doc4",
    "generate_doc5",
    "generate_doc6",
    "generate_doc7",
    "generate_doc8",
]
