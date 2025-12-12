"""
Knowledge Base Loader - Loads visa-specific markdown files
"""
import os
from pathlib import Path
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

# Knowledge base directory
KB_DIR = Path(__file__).parent.parent.parent / "knowledge_base"

# Visa type to file mapping (priority order)
VISA_TYPE_FILES: Dict[str, List[str]] = {
    "O-1A": [
        "O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md",
        "O-1a knowledge base.md",
        "O-1a visa complete guide.md",
        "O-1A Evlaution Rag.md",
        "DIY O1A RAG.md",
        "Master mega prompt Visa making.md",
        "policy memeos visas EB1a and O-1.md",
        "policy memeos visas.md",
    ],
    "O-1B": [
        "O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md",
        "O-1B knowledge base.md",
        "DIY O1B Rag.md",
        "Master mega prompt Visa making.md",
        "policy memeos visas.md",
    ],
    "P-1A": [
        "O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md",
        "P-1 A Knowledge Base.md",
        "P-1A Itienrary document.md",
        "DIY P1A RAG.md",
        "Master mega prompt Visa making.md",
        "policy memeos visas.md",
    ],
    "EB-1A": [
        "O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md",
        "EB-1A knowledge base.md",
        "EB1A_petition_Brief.md",
        "EB1A_petition_Brief.mddive analysis example.md",
        "EB1A_Tech_Marathon_Runner_Comprehensive_Analysis (1).md",
        "Master mega prompt Visa making.md",
        "policy memeos visas EB1a and O-1.md",
    ],
    "EB-2 NIW": [
        "O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md",
        "Master mega prompt Visa making.md",
        "policy memeos visas.md",
    ],
}

# Section markers for extracting relevant content
SECTION_MARKERS: Dict[str, List[str]] = {
    "O-1A": ["SECTION 3: O-1A", "O-1A CRITERIA", "SECTION 6: PUBLICATION", "SECTION 8: LEGAL BRIEF"],
    "O-1B": ["SECTION 4: O-1B", "O-1B CRITERIA", "SECTION 6: PUBLICATION", "SECTION 8: LEGAL BRIEF"],
    "P-1A": ["SECTION 5: P-1A", "P-1A CRITERIA", "SECTION 6: PUBLICATION", "SECTION 8: LEGAL BRIEF"],
    "EB-1A": ["SECTION 2: EB-1A", "EB-1A CRITERIA", "SECTION 6: PUBLICATION", "SECTION 8: LEGAL BRIEF", "KAZARIAN"],
    "EB-2 NIW": ["NATIONAL INTEREST", "NIW", "SECTION 6: PUBLICATION", "SECTION 8: LEGAL BRIEF"],
}


def extract_relevant_sections(content: str, visa_type: str) -> str:
    """Extract sections relevant to the visa type"""
    markers = SECTION_MARKERS.get(visa_type, [])
    sections = []

    for marker in markers:
        marker_idx = content.upper().find(marker.upper())
        if marker_idx != -1:
            # Extract chunk around marker
            start = max(0, marker_idx - 500)
            end = min(len(content), marker_idx + 5000)
            sections.append(content[start:end])

    return "\n\n---\n\n".join(sections) if sections else content


async def load_knowledge_base(visa_type: str) -> str:
    """
    Load and combine knowledge base files for a visa type.

    Args:
        visa_type: The visa type (O-1A, O-1B, P-1A, EB-1A, EB-2 NIW)

    Returns:
        Combined knowledge base content
    """
    file_names = VISA_TYPE_FILES.get(visa_type, [])
    if not file_names:
        logger.warning(f"No knowledge base files defined for visa type: {visa_type}")
        return ""

    context = f"# VISA PETITION KNOWLEDGE BASE - {visa_type}\n\n"
    context += f"This knowledge base contains comprehensive information for generating {visa_type} visa petition documents.\n\n"
    context += "Files loaded (in priority order):\n"

    loaded_files = []
    for idx, filename in enumerate(file_names):
        file_path = KB_DIR / filename
        if file_path.exists():
            loaded_files.append(filename)
            context += f"{idx + 1}. {filename}\n"

    context += "\n---\n\n"

    for idx, filename in enumerate(loaded_files):
        file_path = KB_DIR / filename
        try:
            content = file_path.read_text(encoding="utf-8")
            relevant = extract_relevant_sections(content, visa_type)

            context += f"## FILE {idx + 1}: {filename}\n\n"
            context += relevant
            context += "\n\n---\n\n"

            logger.info(f"Loaded KB file: {filename} ({len(content)} chars)")

        except Exception as e:
            logger.error(f"Error reading {filename}: {e}")

    logger.info(f"Total KB size for {visa_type}: {len(context)} chars")
    return context


def get_criteria_for_visa_type(visa_type: str) -> List[dict]:
    """Get the criteria list for a visa type"""
    criteria_map = {
        "O-1A": [
            {"number": 1, "name": "Awards", "cfr": "8 CFR 214.2(o)(3)(iii)(A)"},
            {"number": 2, "name": "Membership", "cfr": "8 CFR 214.2(o)(3)(iii)(B)"},
            {"number": 3, "name": "Published Material", "cfr": "8 CFR 214.2(o)(3)(iii)(C)"},
            {"number": 4, "name": "Judging", "cfr": "8 CFR 214.2(o)(3)(iii)(D)"},
            {"number": 5, "name": "Original Contributions", "cfr": "8 CFR 214.2(o)(3)(iii)(E)"},
            {"number": 6, "name": "Scholarly Articles", "cfr": "8 CFR 214.2(o)(3)(iii)(F)"},
            {"number": 7, "name": "Critical Employment", "cfr": "8 CFR 214.2(o)(3)(iii)(G)"},
            {"number": 8, "name": "High Salary", "cfr": "8 CFR 214.2(o)(3)(iii)(H)"},
        ],
        "O-1B": [
            {"number": 1, "name": "Lead/Starring Role", "cfr": "8 CFR 214.2(o)(3)(iv)(A)"},
            {"number": 2, "name": "Critical Reviews", "cfr": "8 CFR 214.2(o)(3)(iv)(B)"},
            {"number": 3, "name": "Major Commercial Success", "cfr": "8 CFR 214.2(o)(3)(iv)(C)"},
            {"number": 4, "name": "Significant Recognition", "cfr": "8 CFR 214.2(o)(3)(iv)(D)"},
            {"number": 5, "name": "High Salary", "cfr": "8 CFR 214.2(o)(3)(iv)(E)"},
            {"number": 6, "name": "Testimonials", "cfr": "8 CFR 214.2(o)(3)(iv)(F)"},
        ],
        "P-1A": [
            {"number": 1, "name": "Significant Participation", "cfr": "8 CFR 214.2(p)(4)(ii)(A)"},
            {"number": 2, "name": "International Recognition", "cfr": "8 CFR 214.2(p)(4)(ii)(B)"},
            {"number": 3, "name": "Performance Record", "cfr": "8 CFR 214.2(p)(4)(ii)(C)"},
            {"number": 4, "name": "Significant Honors/Awards", "cfr": "8 CFR 214.2(p)(4)(ii)(D)"},
            {"number": 5, "name": "Written Statements", "cfr": "8 CFR 214.2(p)(4)(ii)(E)"},
        ],
        "EB-1A": [
            {"number": 1, "name": "Awards", "cfr": "8 CFR 204.5(h)(3)(i)"},
            {"number": 2, "name": "Membership", "cfr": "8 CFR 204.5(h)(3)(ii)"},
            {"number": 3, "name": "Published Material", "cfr": "8 CFR 204.5(h)(3)(iii)"},
            {"number": 4, "name": "Judging", "cfr": "8 CFR 204.5(h)(3)(iv)"},
            {"number": 5, "name": "Original Contributions", "cfr": "8 CFR 204.5(h)(3)(v)"},
            {"number": 6, "name": "Scholarly Articles", "cfr": "8 CFR 204.5(h)(3)(vi)"},
            {"number": 7, "name": "Artistic Exhibitions", "cfr": "8 CFR 204.5(h)(3)(vii)"},
            {"number": 8, "name": "Leading/Critical Role", "cfr": "8 CFR 204.5(h)(3)(viii)"},
            {"number": 9, "name": "High Salary", "cfr": "8 CFR 204.5(h)(3)(ix)"},
            {"number": 10, "name": "Commercial Success", "cfr": "8 CFR 204.5(h)(3)(x)"},
        ],
        "EB-2 NIW": [
            {"number": 1, "name": "Substantial Merit and National Importance", "cfr": "Matter of Dhanasar Prong 1"},
            {"number": 2, "name": "Well Positioned to Advance", "cfr": "Matter of Dhanasar Prong 2"},
            {"number": 3, "name": "Balance of Factors", "cfr": "Matter of Dhanasar Prong 3"},
        ],
    }
    return criteria_map.get(visa_type, [])
