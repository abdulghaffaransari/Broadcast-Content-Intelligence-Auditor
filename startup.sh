#!/usr/bin/env bash
# Broadcast-Content-Intelligence-Auditor — create all directories and files from scratch.
# Run from project root: bash startup.sh (or ./startup.sh on Unix after chmod +x)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Creating directories..."
mkdir -p backend/data
mkdir -p backend/scripts
mkdir -p backend/src/api
mkdir -p backend/src/graph
mkdir -p backend/src/services
mkdir -p backend/tests
mkdir -p azure_functions

echo "Creating root files..."

# .gitignore
cat > .gitignore << 'GITIGNORE_EOF'
.env
GITIGNORE_EOF

# .python-version
cat > .python-version << 'PYVER_EOF'
3.12
PYVER_EOF

# .env (add your env vars here; keep in .gitignore for secrets)
touch .env

# README.md
cat > README.md << 'README_EOF'
# Broadcast-Content-Intelligence-Auditor
README_EOF

# pyproject.toml
cat > pyproject.toml << 'PYPROJECT_EOF'
[project]
name = "broadcast-content-intelligence-auditor"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"
dependencies = []
PYPROJECT_EOF

# main.py
cat > main.py << 'MAIN_EOF'
def main():
    print("Hello from broadcast-content-intelligence-auditor!")


if __name__ == "__main__":
    main()
MAIN_EOF

echo "Creating backend files..."

# backend/scripts/index_documents.py
touch backend/scripts/index_documents.py

# backend/src/api
touch backend/src/api/server.py
touch backend/src/api/telemetry.py

# backend/src/graph
touch backend/src/graph/__init__.py
touch backend/src/graph/nodes.py
touch backend/src/graph/state.py
touch backend/src/graph/workflow.py

# backend/src/services
touch backend/src/services/__init__.py
touch backend/src/services/video_indexer.py

# azure_functions
touch azure_functions/function_app.py

# Keep empty dirs tracked
touch backend/data/.gitkeep
touch backend/tests/.gitkeep

echo "Done. Directories and files created."
