#!/usr/bin/env bash
# Broadcast-Content-Intelligence-Auditor — idempotent project bootstrap.
# Run from project root: bash startup.sh (or ./startup.sh after chmod +x).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "== Broadcast Content Intelligence Auditor: startup layout =="

ensure_dir() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    echo "[dir]   created  $dir"
  else
    echo "[dir]   exists   $dir"
  fi
}

ensure_file() {
  local path="$1"
  local template_name="$2"  # only used for logging

  if [ ! -f "$path" ]; then
    # Caller is responsible for redirecting a template into this path.
    echo "[file]  created  $path ($template_name)"
  else
    echo "[file]  exists   $path"
    return 1
  fi
}

append_if_missing() {
  local line="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    echo "$line" > "$file"
    echo "[file]  created  $file (added: $line)"
    return
  fi

  if grep -qxF "$line" "$file"; then
    echo "[file]  unchanged $file (already has: $line)"
  else
    echo "$line" >> "$file"
    echo "[file]  updated  $file (added: $line)"
  fi
}

echo ""
echo "-- Core directories --"
ensure_dir "backend"
ensure_dir "backend/data"
ensure_dir "backend/scripts"
ensure_dir "backend/src"
ensure_dir "backend/src/api"
ensure_dir "backend/src/graph"
ensure_dir "backend/src/services"
ensure_dir "backend/tests"

ensure_dir "frontend"
ensure_dir "frontend/src"
ensure_dir "frontend/src/app"
ensure_dir "frontend/src/components"
ensure_dir "frontend/src/lib"
ensure_dir "frontend/Images"

ensure_dir "azure_functions"

echo ""
echo "-- Root config & env --"

# Ensure .env is present but never committed.
append_if_missing ".env" ".gitignore"
touch ".env"
echo "[file]  touch    .env (secrets/config container)"

echo ""
echo "-- Backend placeholders (only if missing) --"

# backend/scripts/index_documents.py
if ensure_file "backend/scripts/index_documents.py" "index_documents stub"; then
  cat > "backend/scripts/index_documents.py" << 'PY_EOF'
"""
Entry point stub for indexing regulatory/policy documents into Azure AI Search.

Replace this stub with your indexer implementation or run the existing one
if this file already contains code.
"""

if __name__ == "__main__":
    raise SystemExit("Implement document indexing logic in backend/scripts/index_documents.py")
PY_EOF
fi

# backend/src/api/server.py – do NOT overwrite if it already exists
if [ ! -f "backend/src/api/server.py" ]; then
  cat > "backend/src/api/server.py" << 'PY_EOF'
"""
FastAPI entrypoint stub for the Broadcast Content Intelligence Auditor API.

The real implementation lives in backend/src/api/server.py in this repository.
This stub is only used when bootstrapping from scratch.
"""

from fastapi import FastAPI

app = FastAPI(title="Broadcast Content Intelligence Auditor API (stub)")


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Broadcast Content Intelligence Auditor API (stub)"}
PY_EOF
  echo "[file]  created  backend/src/api/server.py (stub)"
else
  echo "[file]  exists   backend/src/api/server.py (real implementation)"
fi

# backend/src/graph files – create empty stubs only if missing
for f in "__init__.py" "state.py" "nodes.py" "workflow.py"; do
  path="backend/src/graph/$f"
  if [ ! -f "$path" ]; then
    cat > "$path" << 'PY_EOF'
"""
Stub module created by startup.sh for the LangGraph workflow.
Replace with the real implementation from the repository.
"""
PY_EOF
    echo "[file]  created  $path (stub)"
  else
    echo "[file]  exists   $path"
  fi
done

# backend/src/services stubs only if missing
for f in "__init__.py" "video_indexer.py" "report_storage.py"; do
  path="backend/src/services/$f"
  if [ ! -f "$path" ]; then
    cat > "$path" << 'PY_EOF'
"""
Service stub created by startup.sh.
Provide concrete implementation for video indexing / report storage here.
"""
PY_EOF
    echo "[file]  created  $path (stub)"
  else
    echo "[file]  exists   $path"
  fi
done

echo ""
echo "-- Azure Functions placeholder (only if missing) --"

if [ ! -f "azure_functions/function_app.py" ]; then
  cat > "azure_functions/function_app.py" << 'PY_EOF'
"""
Azure Functions entry point stub.

Replace this with your actual HTTP trigger or other bindings when deploying
the Broadcast Content Intelligence Auditor as an Azure Function.
"""
PY_EOF
  echo "[file]  created  azure_functions/function_app.py (stub)"
else
  echo "[file]  exists   azure_functions/function_app.py"
fi

echo ""
echo "-- Backend housekeeping --"

# Keep empty dirs tracked if desired
touch "backend/data/.gitkeep"
touch "backend/tests/.gitkeep"
echo "[file]  touch    backend/data/.gitkeep"
echo "[file]  touch    backend/tests/.gitkeep"

echo ""
echo "Startup layout complete."
echo "Existing source files were left untouched; only missing dirs/files were created."

