# Broadcast Content Intelligence Auditor

**One slip in broadcast content can cost reputation, revenue, and regulatory fines.**  
This system turns any video into a **professional, evidence-based audit report**—so you know exactly where you stand before you publish.

---

## The Problem

Broadcasters, brands, and platforms face a constant tension: **move fast** vs **stay compliant**. A single clip with inappropriate content, undisclosed sponsorships, or age-unsuitable material can trigger:

- **Regulatory action** (FTC, Ofcom, local authorities)
- **Brand safety** and advertiser concerns
- **Platform takedowns** and demonetization
- **Public backlash** and loss of trust

Manual review doesn’t scale. Simple “pass/fail” tools don’t give enough detail to act. What’s needed is **structured intelligence**: a clear risk score, evidence-backed findings, timestamps, and concrete recommendations—the kind of report an auditor would produce.

---

## The Solution: Broadcast Content Intelligence Auditor

This project is an **end-to-end Broadcast Content Intelligence Auditor**. You give it a **video** (e.g. a YouTube URL). It:

1. **Ingests** the video (download → upload to Azure Video Indexer).
2. **Extracts** speech, on-screen text, labels, keywords, brands, topics, faces, sentiments, and metadata.
3. **Audits** that evidence against your **regulatory and policy rules** (stored in a searchable knowledge base).
4. **Produces** a **professional audit report**—not just pass/fail, but a full, structured assessment you can hand to legal, compliance, or management.

So both **technical** and **non-technical** readers get: one pipeline, one report, full transparency.

---

## What You Get: The Audit Report

Every run produces a **single, detailed report** that includes:

| Section | What it tells you |
|--------|--------------------|
| **Executive summary** | High-level narrative of the audit and main conclusions. |
| **Overall risk score** | 0–100 score plus a verdict: LOW_RISK, MEDIUM_RISK, HIGH_RISK, or CRITICAL_RISK. |
| **Final verdict** | Clear outcome (e.g. PASS/FAIL) for integration with other systems. |
| **Age rating assessment** | Suitability for age groups, with evidence and findings. |
| **Brand safety assessment** | Alignment with brand guidelines; unsuitable or risky content. |
| **Harmful content assessment** | Hate speech, violence, harmful or sensitive content. |
| **Accessibility and distribution assessment** | Accessibility and distribution suitability. |
| **Positive findings** | What the video did well (e.g. clear disclosures, appropriate tone). |
| **Flagged segments with timestamps** | Exact time ranges (start–end) where issues were found, with category, severity, evidence, and rationale. |
| **Recommendations** | Concrete next steps (e.g. cut segment, add disclaimer, change rating). |

The report is **evidence-based**: each finding ties back to transcript, OCR, labels, or other extracted data, so it’s auditable and defensible.

---

## How It Works (Plain Language)

1. **You provide** a video (e.g. YouTube link) and a short identifier.
2. **The system downloads** the video and sends it to **Azure Video Indexer**, which turns it into structured data: speech, text on screen, detected objects, brands, topics, faces, and sentiment.
3. **That data** is combined with **your rules** (e.g. from compliance docs, brand safety guides) stored in **Azure AI Search**. The system finds the most relevant rules for this video.
4. **An AI auditor** (Azure OpenAI) reads both the video evidence and the rules, then writes the full audit report in a fixed, structured format.
5. **You receive** one report: score, verdict, all sections above, timestamps, and recommendations.

No manual tagging, no black-box “approved/not approved” only—you get a **document** you can file, share, or act on.

---

## Workflow: Step by Step (Technical)

The pipeline is implemented as a **LangGraph** workflow: a small graph with two nodes and a shared state.

### High-level flow

```
[START] → [Indexer] → [Auditor] → [END]
```

- **Indexer**  
  - Input: `video_url`, `video_id` (from state).  
  - Downloads the video (e.g. via yt-dlp for YouTube), uploads it to **Azure Video Indexer**, waits for processing, then **extracts** transcript, OCR, labels, keywords, brands, topics, faces, named people, sentiments, and basic metadata into the shared state.

- **Auditor**  
  - Input: All extracted data from state.  
  - Builds a **RAG** query from that data, retrieves relevant **regulatory/policy** chunks from **Azure AI Search**, then calls **Azure OpenAI** with a strict prompt so the model returns **valid JSON** for the full audit.  
  - That JSON is turned into the **human-readable report** (executive summary, risk score, verdict, all sections, flagged timestamps, recommendations) and written back into state (`final_report`, `final_status`, etc.).

State is defined in `backend/src/graph/state.py` (`VideoAuditState`). The graph is built in `backend/src/graph/workflow.py` and the node logic lives in `backend/src/graph/nodes.py`.

### Data flow (simplified)

1. **Input**  
   - `video_url`, `video_id` set (e.g. by API or CLI).

2. **After Indexer**  
   - State is filled with: `transcript`, `ocr_text`, `video_metadata`, `labels`, `keywords`, `topics`, `brands`, `faces`, `named_people`, `sentiments`.  
   - On failure: `errors` and `final_status: "FAIL"` (and no audit).

3. **After Auditor**  
   - State gets: `executive_summary`, `overall_risk_score`, `final_verdict`, `final_status` (PASS/FAIL), all assessment sections, `positive_findings`, `flagged_segments_with_timestamps`, `recommendations`, and the full text `final_report`.

4. **Output**  
   - The same state; consumers (API, UI, scripts) read `final_report` and the structured fields.

---

## Project Structure

```
Broadcast-Content-Intelligence-Auditor/
├── .env                          # Configuration (Azure, OpenAI, Search, VI, etc.) — not committed
├── .gitignore
├── README.md                     # This file
├── main.py                       # Entry point / CLI
├── pyproject.toml                # Project metadata and dependencies (uv/pip)
├── startup.sh                    # One-time setup: create dirs and placeholder files
│
├── backend/
│   ├── data/                     # PDFs and assets for the knowledge base
│   ├── scripts/
│   │   └── index_documents.py   # Index regulatory/policy docs into Azure AI Search
│   ├── src/
│   │   ├── api/                  # API layer (e.g. server, telemetry)
│   │   │   ├── server.py
│   │   │   └── telemetry.py
│   │   ├── graph/                # Core workflow
│   │   │   ├── state.py          # VideoAuditState, ComplianceIssue
│   │   │   ├── nodes.py          # index_video_node, audit_content_node, report builder
│   │   │   └── workflow.py       # create_graph(), LangGraph definition
│   │   └── services/
│   │       ├── video_indexer.py  # Video Indexer: download, upload, wait, extract_data
│   │       └── __init__.py
│   └── tests/
│
└── azure_functions/              # Azure Functions entry (e.g. HTTP trigger)
    └── function_app.py
```

- **Workflow and report logic:** `backend/src/graph/` (state, nodes, workflow).  
- **Video ingestion and extraction:** `backend/src/services/video_indexer.py`.  
- **Knowledge base:** `backend/scripts/index_documents.py` + `backend/data/` (e.g. PDFs) → Azure AI Search index used by the Auditor.

---

## Prerequisites

- **Python** 3.12+ (recommended: use **uv** for installs and env).
- **Azure** resources (all config via `.env`):
  - **Video Indexer** (account, location, subscription, resource group).
  - **Azure OpenAI** (endpoint, API key, chat and embedding deployments).
  - **Azure AI Search** (endpoint, API key, index name)—used for RAG over your rules.
  - Optional: Storage, Application Insights, etc., as needed.
- **Regulatory/policy documents** in `backend/data/` (e.g. PDFs), then run `index_documents.py` once to populate the search index.

---

## Configuration (`.env`)

Copy or create `.env` in the project root. Required (and commonly used) variables include:

- **Azure Video Indexer:** `AZURE_VI_ACCOUNT_ID`, `AZURE_VI_LOCATION`, `AZURE_VI_NAME`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`
- **Azure OpenAI (chat):** `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_CHAT_DEPLOYMENT`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`
- **Azure OpenAI (embeddings, optional separate resource):** `AZURE_OPENAI_EMBEDDING_ENDPOINT`, `AZURE_OPENAI_EMBEDDING_API_VERSION`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`, `AZURE_OPENAI_EMBEDDING_API_KEY`
- **Azure AI Search:** `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY`, `AZURE_SEARCH_INDEX_NAME`

See `.env.example` or the repo for a full list. Never commit real `.env` (it’s in `.gitignore`).

---

## Setup and Run

1. **Clone and install**
   - From repo root:  
     `uv sync`  
     (or create a venv and `pip install -e .`).

2. **Configure**
   - Fill `.env` with your Azure and OpenAI settings.

3. **Index your rules (one-time or when docs change)**
   - Run:  
     `uv run python backend/scripts/index_documents.py`  
     (or the equivalent from your environment).  
   - This fills the Azure AI Search index used by the Auditor.

4. **Run the workflow (CLI)**
   - From the project root:
     ```bash
     uv run python main.py
     ```
   - The CLI prints a single, fully formatted **Broadcast Content Intelligence Audit Report** for the configured `video_url`.

5. **Run as an API (FastAPI)**
   - Start the API server with:
     ```bash
     uv run uvicorn backend.src.api.server:app --reload
     ```
   - Endpoints:
     - `GET /health` – health check.
     - `POST /audit` – body: `{"video_url": "<youtube_url>"}` → JSON `AuditResponse` with `final_report`, `final_status`, and `compliance_results`.
     - Interactive docs at `http://localhost:8000/docs`.

6. **Run the audit dashboard (frontend)**
   - From the project root:
     ```bash
     cd frontend && npm install && npm run dev
     ```
   - Open [http://localhost:3000](http://localhost:3000) for the enterprise audit dashboard (video URL input, risk summary, sections, evidence, export as TXT/JSON/PDF, audit history). Ensure the API is running on port 8000.

7. **Optional: one-time project layout**
   - `bash startup.sh` creates the expected directories and placeholder files if you start from an empty clone.

---

## Tech Stack (Summary)

| Layer | Technology |
|-------|------------|
| **Video ingestion & analysis** | yt-dlp, Azure Video Indexer |
| **Rules / RAG** | Azure AI Search, Azure OpenAI Embeddings |
| **Audit generation** | Azure OpenAI (chat), structured JSON → report |
| **Orchestration** | LangGraph (StateGraph, two nodes) |
| **Language / runtime** | Python 3.12+, uv for dependency management |
| **Observability** | Optional: Azure Monitor / Application Insights, LangSmith |

---

## Summary

- **Problem:** Broadcast and brand content needs compliant, auditable decisions—not just a binary pass/fail.  
- **Solution:** Broadcast Content Intelligence Auditor: video in → **one professional audit report** (risk score, verdict, age/brand/harm/accessibility, positive findings, **flagged timestamps**, recommendations).  
- **Workflow:** LangGraph with two steps: **Indexer** (download, Azure VI, extract) → **Auditor** (RAG over your rules + LLM → structured report).  
- **Audience:** Written so both **technical** (workflow, state, nodes, stack) and **non-technical** (problem, solution, what you get, plain-language “how it works”) readers can understand and use the system.

Use the report to decide before publish, to document compliance, or to drive edits—with full transparency and evidence at every step.
