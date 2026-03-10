"""
Main execution entry point for the Broadcast Content Intelligence Auditor.

This module starts the end-to-end audit workflow:
1. Prepares the video audit request
2. Runs the LangGraph workflow
3. Displays the final structured audit report
"""

import uuid
import json
import logging

from dotenv import load_dotenv

from backend.src.graph.workflow import app

load_dotenv(override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("broadcast-audit-runner")


def _print_section_assessment(title: str, section_data: dict) -> None:
    """
    Prints a single assessment section in a professional readable format.
    """
    if not section_data:
        print(f"\n{title}")
        print("No assessment data available.")
        return

    print(f"\n{title}")
    print(f"Score:   {section_data.get('score', 'N/A')}")
    print(f"Summary: {section_data.get('summary', 'No summary available.')}")

    findings = section_data.get("findings", [])
    if findings:
        print("Findings:")
        for finding in findings:
            severity = finding.get("severity", "N/A")
            category = finding.get("category", "General")
            description = finding.get("description", "No description provided.")
            evidence = finding.get("evidence", "")

            print(f"- [{severity}] {category}: {description}")
            if evidence:
                print(f"  Evidence: {evidence}")
    else:
        print("Findings: None identified.")


def _print_list_section(title: str, items: list, empty_message: str) -> None:
    """
    Prints a simple bullet list section.
    """
    print(f"\n{title}")
    if items:
        for item in items:
            print(f"- {item}")
    else:
        print(empty_message)


def _print_flagged_segments(flagged_segments: list) -> None:
    """
    Prints flagged segments with timestamps.
    """
    print("\nFlagged Segments with Timestamps")
    if not flagged_segments:
        print("No flagged segments identified.")
        return

    for segment in flagged_segments:
        start_time = segment.get("start_time", "N/A")
        end_time = segment.get("end_time", "N/A")
        category = segment.get("category", "General")
        severity = segment.get("severity", "N/A")
        evidence = segment.get("evidence", "No evidence provided.")
        rationale = segment.get("rationale", "")

        print(f"- [{start_time} - {end_time}] [{severity}] {category}: {evidence}")
        if rationale:
            print(f"  Rationale: {rationale}")


def _print_final_report(final_state: dict) -> None:
    """
    Prints the full professional audit output.
    """
    print("\n=== BROADCAST CONTENT INTELLIGENCE AUDIT REPORT ===")

    print(f"Video ID:            {final_state.get('video_id', 'N/A')}")
    print(f"Final Status:        {final_state.get('final_status', 'N/A')}")
    print(f"Overall Risk Score:  {final_state.get('overall_risk_score', 'N/A')}/100")
    print(f"Final Verdict:       {final_state.get('final_verdict', 'N/A')}")

    executive_summary = final_state.get("executive_summary")
    if executive_summary:
        print("\nExecutive Summary")
        print(executive_summary)

    _print_section_assessment(
        "Age Rating Assessment",
        final_state.get("age_rating_assessment", {})
    )
    _print_section_assessment(
        "Brand Safety Assessment",
        final_state.get("brand_safety_assessment", {})
    )
    _print_section_assessment(
        "Harmful Content Assessment",
        final_state.get("harmful_content_assessment", {})
    )
    _print_section_assessment(
        "Accessibility and Distribution Assessment",
        final_state.get("accessibility_and_distribution_assessment", {})
    )

    _print_list_section(
        "Positive Findings",
        final_state.get("positive_findings", []),
        "No notable positive findings identified."
    )

    _print_flagged_segments(final_state.get("flagged_segments_with_timestamps", []))

    _print_list_section(
        "Recommendations",
        final_state.get("recommendations", []),
        "No specific recommendations generated."
    )

    final_report = final_state.get("final_report")
    if final_report:
        print("\nFull Report Summary")
        print(final_report)

    errors = final_state.get("errors", [])
    if errors:
        print("\nErrors")
        for error in errors:
            print(f"- {error}")


def run_cli_simulation():
    """
    Simulates a broadcast content audit request.
    """
    session_id = str(uuid.uuid4())
    logger.info(f"Starting Audit Session: {session_id}")

    initial_inputs = {
        "video_url": "https://youtu.be/dT7S75eYhcQ",
        "video_id": f"vid_{session_id[:8]}",
        "compliance_results": [],
        "errors": []
    }

    print("\n--- 1. Input Payload: Initializing Workflow ---")
    print(json.dumps(initial_inputs, indent=2))

    try:
        final_state = app.invoke(initial_inputs)

        print("\n--- 2. Workflow Execution Complete ---")
        _print_final_report(final_state)

    except Exception as e:
        logger.error(f"Workflow Execution Failed: {str(e)}")
        raise e


if __name__ == "__main__":
    run_cli_simulation()