import json
import os
import logging
import re
from typing import Dict, Any, List

from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings
from langchain_community.vectorstores import AzureSearch
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

from backend.src.graph.state import VideoAuditState, ComplianceIssue
from backend.src.services.video_indexer import VideoIndexerService

logger = logging.getLogger("brand-guardian")
logging.basicConfig(level=logging.INFO)


def _clean_llm_json(content: str) -> str:
    """
    Cleans markdown-wrapped JSON if the model returns ```json ... ```
    """
    if not content:
        return "{}"

    if "```" in content:
        match = re.search(r"```(?:json)?(.*?)```", content, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return content.strip()


def _build_impressive_final_report(audit_data: Dict[str, Any]) -> str:
    """
    Converts structured JSON into a professional detailed audit report string.
    """
    executive_summary = audit_data.get("executive_summary", "No executive summary generated.")
    overall_risk_score = audit_data.get("overall_risk_score", 0)
    final_verdict = audit_data.get("final_verdict", "LOW_RISK")

    age_rating = audit_data.get("age_rating_assessment", {})
    brand_safety = audit_data.get("brand_safety_assessment", {})
    harmful_content = audit_data.get("harmful_content_assessment", {})
    accessibility = audit_data.get("accessibility_and_distribution_assessment", {})

    positive_findings = audit_data.get("positive_findings", [])
    flagged_segments = audit_data.get("flagged_segments_with_timestamps", [])
    recommendations = audit_data.get("recommendations", [])

    def format_findings(section_name: str, section_data: Dict[str, Any]) -> str:
        score = section_data.get("score", "N/A")
        summary = section_data.get("summary", "No summary available.")
        findings = section_data.get("findings", [])

        lines = [
            f"{section_name}:",
            f"- Score: {score}",
            f"- Summary: {summary}",
        ]

        if findings:
            lines.append("- Findings:")
            for finding in findings:
                lines.append(
                    f"  • [{finding.get('severity', 'N/A')}] {finding.get('category', 'General')}: "
                    f"{finding.get('description', 'No description.')}"
                )
                evidence = finding.get("evidence", "")
                if evidence:
                    lines.append(f"    Evidence: {evidence}")
        else:
            lines.append("- Findings: None identified")

        return "\n".join(lines)

    report_parts = [
        "BROADCAST CONTENT INTELLIGENCE AUDIT REPORT",
        "=" * 50,
        f"Overall Risk Score: {overall_risk_score}/100",
        f"Final Verdict: {final_verdict}",
        "",
        "Executive Summary:",
        executive_summary,
        "",
        format_findings("1. Age Rating Assessment", age_rating),
        "",
        format_findings("2. Brand Safety Assessment", brand_safety),
        "",
        format_findings("3. Harmful Content Assessment", harmful_content),
        "",
        format_findings("4. Accessibility and Distribution Assessment", accessibility),
        "",
        "5. Positive Findings:",
    ]

    if positive_findings:
        for item in positive_findings:
            report_parts.append(f"- {item}")
    else:
        report_parts.append("- No notable positive findings identified.")

    report_parts.append("")
    report_parts.append("6. Flagged Segments with Timestamps:")

    if flagged_segments:
        for seg in flagged_segments:
            report_parts.append(
                f"- [{seg.get('start_time', 'N/A')} - {seg.get('end_time', 'N/A')}] "
                f"{seg.get('category', 'General')} ({seg.get('severity', 'N/A')}): "
                f"{seg.get('evidence', 'No evidence.')}"
            )
            rationale = seg.get("rationale", "")
            if rationale:
                report_parts.append(f"  Rationale: {rationale}")
    else:
        report_parts.append("- No flagged segments identified.")

    report_parts.append("")
    report_parts.append("7. Recommendations:")

    if recommendations:
        for item in recommendations:
            report_parts.append(f"- {item}")
    else:
        report_parts.append("- No specific recommendations generated.")

    return "\n".join(report_parts)


def _map_verdict_to_status(final_verdict: str) -> str:
    """
    Keeps backward compatibility with old PASS/FAIL flow.
    """
    if final_verdict in ["LOW_RISK"]:
        return "PASS"
    return "FAIL"


# --- NODE 1: THE INDEXER ---
def index_video_node(state: VideoAuditState) -> Dict[str, Any]:
    """
    Downloads YouTube video, uploads to Azure VI, and extracts insights.
    """
    video_url = state.get("video_url")
    video_id_input = state.get("video_id", "vid_demo")

    logger.info(f"--- [Node: Indexer] Processing: {video_url} ---")

    local_filename = "temp_audit_video.mp4"

    try:
        vi_service = VideoIndexerService()

        # 1. DOWNLOAD
        if "youtube.com" in video_url or "youtu.be" in video_url:
            local_path = vi_service.download_youtube_video(video_url, output_path=local_filename)
        else:
            raise Exception("Please provide a valid YouTube URL for this test.")

        # 2. UPLOAD
        azure_video_id = vi_service.upload_video(local_path, video_name=video_id_input)
        logger.info(f"Upload Success. Azure ID: {azure_video_id}")

        # 3. CLEANUP
        if os.path.exists(local_path):
            os.remove(local_path)

        # 4. WAIT
        raw_insights = vi_service.wait_for_processing(azure_video_id)

        # 5. EXTRACT
        clean_data = vi_service.extract_data(raw_insights)

        logger.info("--- [Node: Indexer] Extraction Complete ---")
        return clean_data

    except Exception as e:
        logger.error(f"Video Indexer Failed: {e}")
        return {
            "errors": [str(e)],
            "final_status": "FAIL",
            "transcript": "",
            "ocr_text": []
        }


# --- NODE 2: THE BROADCAST CONTENT INTELLIGENCE AUDITOR ---
def audit_content_node(state: VideoAuditState) -> Dict[str, Any]:
    """
    Performs Retrieval-Augmented Generation (RAG) to generate
    a professional audit report instead of only pass/fail.
    """
    logger.info("--- [Node: Auditor] Querying Knowledge Base & LLM ---")

    transcript = state.get("transcript", "")
    ocr_text = state.get("ocr_text", [])

    if not transcript and not ocr_text:
        logger.warning("No transcript/OCR available. Skipping Audit.")
        return {
            "final_status": "FAIL",
            "final_verdict": "CRITICAL_RISK",
            "overall_risk_score": 100,
            "executive_summary": "Audit skipped because video processing failed and no usable content was extracted.",
            "final_report": "Audit skipped because video processing failed (No Transcript/OCR)."
        }

    # Initialize Clients
    llm = AzureChatOpenAI(
        azure_deployment=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
        openai_api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        temperature=0.0
    )

    embeddings = AzureOpenAIEmbeddings(
        azure_deployment="text-embedding-3-small",
        openai_api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    )

    vector_store = AzureSearch(
        azure_search_endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
        azure_search_key=os.getenv("AZURE_SEARCH_API_KEY"),
        index_name=os.getenv("AZURE_SEARCH_INDEX_NAME"),
        embedding_function=embeddings.embed_query
    )

    # RAG Retrieval
    labels = state.get("labels", [])
    keywords = state.get("keywords", [])
    brands = state.get("brands", [])
    sentiments = state.get("sentiments", [])
    topics = state.get("topics", [])
    faces = state.get("faces", [])
    named_people = state.get("named_people", [])
    video_metadata = state.get("video_metadata", {})

    query_text = f"""
    Transcript: {transcript}
    OCR: {' '.join(ocr_text)}
    Labels: {' '.join(labels)}
    Keywords: {' '.join(keywords)}
    Brands: {' '.join(brands)}
    Topics: {' '.join(topics)}
    """.strip()

    docs = vector_store.similarity_search(query_text, k=3)
    retrieved_rules = "\n\n".join([doc.page_content for doc in docs])

    # --- UPDATED PROMPT: FULL AUDIT REPORT, SAME WORKFLOW ---
    system_prompt = f"""
    You are a Senior Broadcast Content Intelligence Auditor.

    OFFICIAL REGULATORY / POLICY RULES:
    {retrieved_rules}

    YOUR JOB:
    Analyze the provided video evidence and generate a professional, structured broadcast content audit report.

    IMPORTANT:
    - Do NOT return a simple pass/fail-only response.
    - Return a full audit report with professional detail.
    - Be evidence-based.
    - Consider transcript, OCR, labels, keywords, brands, sentiments, topics, people, and metadata.
    - If timestamps are unavailable, use "N/A".
    - Return strictly valid JSON only, with no markdown and no extra explanation.

    REQUIRED JSON FORMAT:
    {{
        "overall_risk_score": 0,
        "final_verdict": "LOW_RISK",
        "executive_summary": "Professional summary of the overall audit findings.",
        "age_rating_assessment": {{
            "score": 0,
            "summary": "Short professional summary.",
            "findings": [
                {{
                    "category": "Age Rating",
                    "severity": "LOW",
                    "description": "Detailed explanation.",
                    "evidence": "Evidence from transcript/OCR/visual context."
                }}
            ]
        }},
        "brand_safety_assessment": {{
            "score": 0,
            "summary": "Short professional summary.",
            "findings": [
                {{
                    "category": "Brand Safety",
                    "severity": "MEDIUM",
                    "description": "Detailed explanation.",
                    "evidence": "Evidence from transcript/OCR/visual context."
                }}
            ]
        }},
        "harmful_content_assessment": {{
            "score": 0,
            "summary": "Short professional summary.",
            "findings": [
                {{
                    "category": "Hate Speech / Violence / Harm",
                    "severity": "HIGH",
                    "description": "Detailed explanation.",
                    "evidence": "Evidence from transcript/OCR/visual context."
                }}
            ]
        }},
        "accessibility_and_distribution_assessment": {{
            "score": 0,
            "summary": "Short professional summary.",
            "findings": [
                {{
                    "category": "Accessibility / Distribution",
                    "severity": "LOW",
                    "description": "Detailed explanation.",
                    "evidence": "Evidence from transcript/OCR/visual context."
                }}
            ]
        }},
        "positive_findings": [
            "Positive aspect found in the video."
        ],
        "flagged_segments_with_timestamps": [
            {{
                "start_time": "00:00:00",
                "end_time": "00:00:10",
                "category": "Brand Safety",
                "severity": "HIGH",
                "evidence": "What was detected.",
                "rationale": "Why this matters."
            }}
        ],
        "recommendations": [
            "Concrete action recommendation."
        ]
    }}

    SCORING GUIDANCE:
    - 0 to 24 = LOW_RISK
    - 25 to 49 = MEDIUM_RISK
    - 50 to 74 = HIGH_RISK
    - 75 to 100 = CRITICAL_RISK

    If no major issue exists, still provide positive findings and a professional summary.
    """

    user_message = f"""
    VIDEO METADATA:
    {json.dumps(video_metadata, indent=2)}

    TRANSCRIPT:
    {transcript}

    ON-SCREEN TEXT (OCR):
    {json.dumps(ocr_text, indent=2)}

    LABELS:
    {json.dumps(labels, indent=2)}

    KEYWORDS:
    {json.dumps(keywords, indent=2)}

    BRANDS:
    {json.dumps(brands, indent=2)}

    SENTIMENTS:
    {json.dumps(sentiments, indent=2)}

    TOPICS:
    {json.dumps(topics, indent=2)}

    FACES:
    {json.dumps(faces, indent=2)}

    NAMED PEOPLE:
    {json.dumps(named_people, indent=2)}
    """

    response_content = None

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ])

        response_content = response.content
        cleaned_content = _clean_llm_json(response_content)
        audit_data = json.loads(cleaned_content)

        overall_risk_score = audit_data.get("overall_risk_score", 0)
        final_verdict = audit_data.get("final_verdict", "LOW_RISK")
        final_status = _map_verdict_to_status(final_verdict)

        detailed_final_report = _build_impressive_final_report(audit_data)

        return {
            # New rich audit fields
            "overall_risk_score": overall_risk_score,
            "final_verdict": final_verdict,
            "executive_summary": audit_data.get("executive_summary", ""),
            "age_rating_assessment": audit_data.get("age_rating_assessment", {}),
            "brand_safety_assessment": audit_data.get("brand_safety_assessment", {}),
            "harmful_content_assessment": audit_data.get("harmful_content_assessment", {}),
            "accessibility_and_distribution_assessment": audit_data.get("accessibility_and_distribution_assessment", {}),
            "positive_findings": audit_data.get("positive_findings", []),
            "flagged_segments_with_timestamps": audit_data.get("flagged_segments_with_timestamps", []),
            "recommendations": audit_data.get("recommendations", []),

            # Backward-compatible fields
            "compliance_results": audit_data.get("brand_safety_assessment", {}).get("findings", [])
                                  + audit_data.get("harmful_content_assessment", {}).get("findings", [])
                                  + audit_data.get("age_rating_assessment", {}).get("findings", []),
            "final_status": final_status,
            "final_report": detailed_final_report
        }

    except Exception as e:
        logger.error(f"System Error in Auditor Node: {str(e)}")
        logger.error(f"Raw LLM Response: {response_content if response_content else 'None'}")
        return {
            "errors": [str(e)],
            "final_status": "FAIL",
            "final_verdict": "CRITICAL_RISK",
            "overall_risk_score": 100,
            "final_report": "Audit generation failed due to a system or parsing error."
        }