"""
Main execution entry point for the Broadcast Content Intelligence Auditor.

This module starts the end-to-end audit workflow:
1. Prepares the video audit request (URL, video ID).
2. Runs the LangGraph workflow (Indexer → Auditor).
3. Displays the final structured audit report in the console.
"""

import uuid
import json
import logging

from dotenv import load_dotenv

from backend.src.graph.workflow import app

# Load environment variables from .env (Azure, OpenAI, Search, etc.)
load_dotenv(override=True)

# Configure logging for the CLI run
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("broadcast-audit-runner")


# -----------------------------------------------------------------------------
# Report formatting helpers: turn workflow state into readable console output
# -----------------------------------------------------------------------------


def _print_section_assessment(title: str, section_data: dict) -> None:
    """
    Prints one assessment block (e.g. Age Rating, Brand Safety) with score,
    summary, and a list of findings (severity, category, description, evidence).
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
    Prints a section that is just a list of items (e.g. Positive Findings,
    Recommendations). Shows empty_message when the list is empty.
    """
    print(f"\n{title}")
    if items:
        for item in items:
            print(f"- {item}")
    else:
        print(empty_message)


def _print_flagged_segments(flagged_segments: list) -> None:
    """
    Prints each flagged segment with start/end time, category, severity,
    evidence, and rationale so users can locate issues in the video.
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
    Prints only the final, fully formatted audit report string produced by the
    Auditor node, plus any errors captured in state. This avoids duplicating
    a partial header with N/A fields and treats the LLM report as the single
    source of truth for human readers.
    """
    final_report = final_state.get("final_report")
    if final_report:
        print("\n" + final_report)
    else:
        print("\nNo final report was generated.")

    # Any workflow or API errors encountered
    errors = final_state.get("errors", [])
    if errors:
        print("\nErrors")
        for error in errors:
            print(f"- {error}")


# -----------------------------------------------------------------------------
# CLI entry: run the workflow and print the audit report
# -----------------------------------------------------------------------------


def run_cli_simulation():
    """
    Runs one full audit: builds initial state (video URL, video ID), invokes
    the LangGraph workflow (Indexer then Auditor), and prints the final
    report to the console.
    """
    session_id = str(uuid.uuid4())
    logger.info(f"Starting Audit Session: {session_id}")

    # Required inputs for the workflow; compliance_results and errors are
    # append-only lists populated by the graph nodes
    initial_inputs = {
        "video_url": "https://youtu.be/dT7S75eYhcQ",
        "video_id": f"vid_{session_id[:8]}",
        "compliance_results": [],
        "errors": []
    }

    print("\n--- 1. Input Payload: Initializing Workflow ---")
    print(json.dumps(initial_inputs, indent=2))

    try:
        # Run the graph: index_video_node → audit_content_node
        final_state = app.invoke(initial_inputs)

        print("\n--- 2. Workflow Execution Complete ---")
        _print_final_report(final_state)

    except Exception as e:
        logger.error(f"Workflow Execution Failed: {str(e)}")
        raise e


if __name__ == "__main__":
    run_cli_simulation()