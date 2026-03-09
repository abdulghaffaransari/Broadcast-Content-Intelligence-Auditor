"""
Workflow Definition for the Broadcast Content Intelligence Auditor.

This module defines the Directed Acyclic Graph (DAG) that orchestrates the
end-to-end broadcast content audit workflow. It connects the functional
nodes using the StateGraph primitive from LangGraph.

Architecture:
    [START] -> [index_video_node] -> [audit_content_node] -> [END]
"""

from langgraph.graph import StateGraph, END

# Import the State Schema
from backend.src.graph.state import VideoAuditState

# Import the Functional Nodes
from backend.src.graph.nodes import (
    index_video_node,
    audit_content_node
)


def create_graph():
    """
    Constructs and compiles the LangGraph workflow.

    Returns:
        CompiledGraph: A runnable graph object ready for execution.
    """
    # 1. Initialize the graph with the shared state schema
    # This ensures all nodes read from and write to the same VideoAuditState structure.
    workflow = StateGraph(VideoAuditState)

    # 2. Add nodes
    # "indexer" handles video ingestion and insight extraction.
    # "auditor" generates the structured broadcast audit report.
    workflow.add_node("indexer", index_video_node)
    workflow.add_node("auditor", audit_content_node)

    # 3. Define execution flow
    # Start with the video indexing stage.
    workflow.set_entry_point("indexer")

    # After indexing and extracting video insights, move to audit report generation.
    workflow.add_edge("indexer", "auditor")

    # Once the audit report is generated, end the workflow.
    workflow.add_edge("auditor", END)

    # 4. Compile the graph into a runnable application
    app = workflow.compile()

    return app


# Expose the runnable app for import by the API or CLI
app = create_graph()