import uuid
import logging
import threading
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel


# ========== STEP 1: LOAD ENVIRONMENT VARIABLES ==========
# CRITICAL: Must happen BEFORE importing modules that need env vars
from dotenv import load_dotenv
load_dotenv(override=True)  
# Reads .env file and sets environment variables
# override=True = .env values replace system environment variables
# Example .env contents:
#   AZURE_SEARCH_KEY=abc123
#   APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...


# ========== STEP 2: INITIALIZE TELEMETRY ==========
from backend.src.api.telemetry import setup_telemetry
setup_telemetry()  
# ☝️ "Activates the sensors" - starts tracking all API activity
# Must happen AFTER load_dotenv() but BEFORE creating FastAPI app


# ========== STEP 3: IMPORT WORKFLOW GRAPH ==========
from backend.src.graph.workflow import app as compliance_graph
# Imports your LangGraph workflow (Indexer → Auditor)
# Renamed to 'compliance_graph' to avoid confusion with FastAPI's 'app'


# ========== STEP 4: CONFIGURE LOGGING ==========
logging.basicConfig(level=logging.INFO)  
# Sets default log level (INFO = important events, not debug spam)

logger = logging.getLogger("api-server")  
# Creates named logger for this module


# ========== STEP 5: CREATE FASTAPI APPLICATION ==========
app = FastAPI(
    title="Broadcast Content Intelligence Auditor API",
    description="API for generating professional broadcast content intelligence audit reports.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# FastAPI automatically creates:
# - Interactive docs at http://localhost:8000/docs
# - OpenAPI schema at http://localhost:8000/openapi.json


# ========== STEP 6: DEFINE DATA MODELS (PYDANTIC) ==========

# --- REQUEST MODEL ---
class AuditRequest(BaseModel):
    """
    Defines the expected structure of incoming API requests.
    
    Pydantic validates that:
    - The request contains a 'video_url' field
    - The value is a string (not int, list, etc.)
    
    Example valid request:
    {
        "video_url": "https://youtu.be/abc123"
    }
    
    Example invalid request (raises 422 error):
    {
        "video_url": 12345  ← Not a string!
    }
    """
    video_url: str  # Required string field


# --- NESTED MODEL ---
class ComplianceIssue(BaseModel):
    """
    Defines the structure of a single compliance violation.
    
    Used inside AuditResponse to represent each violation found.
    """
    category: str      # Example: "Misleading Claims"
    severity: str      # Example: "CRITICAL"
    description: str   # Example: "Absolute guarantee detected at 00:32"


# --- RESPONSE MODEL ---
class AuditResponse(BaseModel):
    """
    Full audit result: session id, video id, status, text report, and structured fields.
    Returned by sync POST /audit and by GET /audit/jobs/{job_id}/result when the job is completed.
    """
    session_id: str
    video_id: str
    status: str
    final_report: str
    compliance_results: List[ComplianceIssue]
    # Optional structured fields for APIs/clients (aligned with VideoAuditState)
    overall_risk_score: Optional[int] = None
    final_verdict: Optional[str] = None
    executive_summary: Optional[str] = None
    age_rating_assessment: Optional[Dict[str, Any]] = None
    brand_safety_assessment: Optional[Dict[str, Any]] = None
    harmful_content_assessment: Optional[Dict[str, Any]] = None
    accessibility_and_distribution_assessment: Optional[Dict[str, Any]] = None
    positive_findings: Optional[List[str]] = None
    flagged_segments_with_timestamps: Optional[List[Dict[str, Any]]] = None
    recommendations: Optional[List[str]] = None


# --- ASYNC JOB MODELS ---
class JobCreated(BaseModel):
    """Returned when an async audit job is started."""
    job_id: str
    status: str = "pending"
    message: str = "Poll GET /audit/jobs/{job_id}/status for status; GET /audit/jobs/{job_id}/result for the report when completed."


class JobStatus(BaseModel):
    """Job status for polling."""
    job_id: str
    status: str  # pending | running | completed | failed
    created_at: str
    updated_at: Optional[str] = None
    error: Optional[str] = None


# --- IN-MEMORY JOB STORE (for async audits) ---
_job_store: Dict[str, Dict[str, Any]] = {}
_job_lock = threading.Lock()


def _run_audit_job(job_id: str, video_url: str, session_id: str, video_id_short: str) -> None:
    """Runs the compliance graph in a background thread and updates the job store."""
    with _job_lock:
        if job_id not in _job_store:
            return
        _job_store[job_id]["status"] = "running"
        _job_store[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        initial_inputs = {
            "video_url": video_url,
            "video_id": video_id_short,
            "compliance_results": [],
            "errors": [],
        }
        final_state = compliance_graph.invoke(initial_inputs)

        response = AuditResponse(
            session_id=session_id,
            video_id=final_state.get("video_id", video_id_short),
            status=final_state.get("final_status", "UNKNOWN"),
            final_report=final_state.get("final_report", "No report generated."),
            compliance_results=final_state.get("compliance_results", []),
            overall_risk_score=final_state.get("overall_risk_score"),
            final_verdict=final_state.get("final_verdict"),
            executive_summary=final_state.get("executive_summary"),
            age_rating_assessment=final_state.get("age_rating_assessment"),
            brand_safety_assessment=final_state.get("brand_safety_assessment"),
            harmful_content_assessment=final_state.get("harmful_content_assessment"),
            accessibility_and_distribution_assessment=final_state.get("accessibility_and_distribution_assessment"),
            positive_findings=final_state.get("positive_findings"),
            flagged_segments_with_timestamps=final_state.get("flagged_segments_with_timestamps"),
            recommendations=final_state.get("recommendations"),
        )

        with _job_lock:
            if job_id in _job_store:
                _job_store[job_id]["status"] = "completed"
                _job_store[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
                _job_store[job_id]["result"] = response.model_dump()

    except Exception as e:
        logger.exception("Audit job %s failed", job_id)
        with _job_lock:
            if job_id in _job_store:
                _job_store[job_id]["status"] = "failed"
                _job_store[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
                _job_store[job_id]["error"] = str(e)


# ========== STEP 7: AUDIT ENDPOINTS ==========

def _state_to_audit_response(session_id: str, video_id_short: str, final_state: Dict[str, Any]) -> AuditResponse:
    """Build AuditResponse from graph final state (sync and async result)."""
    return AuditResponse(
        session_id=session_id,
        video_id=final_state.get("video_id", video_id_short),
        status=final_state.get("final_status", "UNKNOWN"),
        final_report=final_state.get("final_report", "No report generated."),
        compliance_results=final_state.get("compliance_results", []),
        overall_risk_score=final_state.get("overall_risk_score"),
        final_verdict=final_state.get("final_verdict"),
        executive_summary=final_state.get("executive_summary"),
        age_rating_assessment=final_state.get("age_rating_assessment"),
        brand_safety_assessment=final_state.get("brand_safety_assessment"),
        harmful_content_assessment=final_state.get("harmful_content_assessment"),
        accessibility_and_distribution_assessment=final_state.get("accessibility_and_distribution_assessment"),
        positive_findings=final_state.get("positive_findings"),
        flagged_segments_with_timestamps=final_state.get("flagged_segments_with_timestamps"),
        recommendations=final_state.get("recommendations"),
    )


@app.post("/audit")
async def audit_video(
    request: AuditRequest,
    async_mode: bool = Query(False, description="If true, start a background job and return job_id; poll status/result endpoints."),
):
    """
    Run a compliance audit for the given video URL.

    - **Sync (default):** Waits for the full workflow and returns the audit result (may timeout on long videos).
    - **Async:** Set `?async_mode=true` to get a job_id immediately; poll GET /audit/jobs/{job_id}/status and GET /audit/jobs/{job_id}/result.
    """
    session_id = str(uuid.uuid4())
    video_id_short = f"vid_{session_id[:8]}"

    logger.info("Received audit request: %s (session: %s, async: %s)", request.video_url, session_id, async_mode)

    if async_mode:
        job_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with _job_lock:
            _job_store[job_id] = {
                "job_id": job_id,
                "status": "pending",
                "created_at": now,
                "updated_at": None,
                "result": None,
                "error": None,
            }
        thread = threading.Thread(
            target=_run_audit_job,
            args=(job_id, request.video_url, session_id, video_id_short),
            daemon=True,
        )
        thread.start()
        return JSONResponse(
            status_code=202,
            content={
                "job_id": job_id,
                "status": "pending",
                "message": "Poll GET /audit/jobs/{job_id}/status for status; GET /audit/jobs/{job_id}/result for the report when completed.",
            },
        )

    initial_inputs = {
        "video_url": request.video_url,
        "video_id": video_id_short,
        "compliance_results": [],
        "errors": [],
    }
    try:
        final_state = compliance_graph.invoke(initial_inputs)
        return _state_to_audit_response(session_id, video_id_short, final_state)
    except Exception as e:
        logger.exception("Audit failed")
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


@app.get("/audit/jobs/{job_id}/status", response_model=JobStatus)
def get_job_status(job_id: str):
    """Return the current status of an async audit job (pending, running, completed, failed)."""
    with _job_lock:
        job = _job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatus(
        job_id=job["job_id"],
        status=job["status"],
        created_at=job["created_at"],
        updated_at=job.get("updated_at"),
        error=job.get("error"),
    )


@app.get("/audit/jobs/{job_id}/result")
def get_job_result(job_id: str):
    """
    Return the audit result when the job is completed.
    Returns 202 with status if the job is still pending or running.
    """
    with _job_lock:
        job = _job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] == "completed":
        return job["result"]
    if job["status"] == "failed":
        raise HTTPException(
            status_code=422,
            detail={"job_id": job_id, "status": "failed", "error": job.get("error", "Unknown error")},
        )
    return JSONResponse(
        status_code=202,
        content={"job_id": job_id, "status": job["status"], "message": "Job not yet completed. Poll again later."},
    )


# ========== STEP 8: HEALTH CHECK ENDPOINT ==========
@app.get("/health")
# ↑ GET request at http://localhost:8000/health
def health_check():
    """
    Simple endpoint to verify the API is running.
    
    Used by:
    - Load balancers (to check if server is alive)
    - Monitoring systems (uptime checks)
    - Developers (quick test that server started)
    
    Example usage:
    curl http://localhost:8000/health
    
    Response:
    {
        "status": "healthy",
        "service": "Brand Guardian AI"
    }
    """
    return {"status": "healthy", "service": "Broadcast Content Intelligence Auditor API"}
    # FastAPI automatically converts dict to JSON response


# ========== STEP 9: RUN INSTRUCTIONS (IN COMMENTS) ==========
'''
To execute: 
uv run uvicorn backend.src.api.server:app --reload

Command breakdown:
- uv run          = Run with UV package manager
- uvicorn         = ASGI server (like Gunicorn but async)
- backend.src.api.server:app = Python path to FastAPI app object
- --reload        = Auto-restart server when code changes (dev mode)

Server starts at: http://localhost:8000

Access points:
- API Docs:    http://localhost:8000/docs (interactive Swagger UI)
- Health:      http://localhost:8000/health
- Main API:    POST http://localhost:8000/audit
'''

'''
## How the API Works (Request Flow)
```
1. Client sends POST request:
   POST http://localhost:8000/audit
   Body: {"video_url": "https://youtu.be/abc123"}
   
2. FastAPI receives request:
   - Validates request matches AuditRequest model
   - Calls audit_video() function
   
3. audit_video() executes:
   - Generates session ID
   - Prepares initial_inputs dict
   - Calls compliance_graph.invoke()
   
4. LangGraph workflow runs:
   START → Indexer → Auditor → END
   
5. Function returns AuditResponse:
   - FastAPI validates response matches model
   - Converts Pydantic object to JSON
   - Sends HTTP response to client
   
6. Azure Monitor captures:
   - Request duration
   - HTTP status code
   - Any errors
   - Graph execution trace

'''