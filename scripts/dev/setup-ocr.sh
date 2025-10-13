#!/usr/bin/env bash
set -euo pipefail

# Portable OCR environment setup for Git Bash / macOS / Linux

REPO_ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd -P)
OCR_DIR="$REPO_ROOT_DIR/project/ocr-engine"
VENV_DIR="$OCR_DIR/.venv"

echo "[setup-ocr] Repo: $REPO_ROOT_DIR"
echo "[setup-ocr] OCR dir: $OCR_DIR"

if [ ! -d "$OCR_DIR" ]; then
  echo "[setup-ocr] ERROR: OCR directory not found: $OCR_DIR" >&2
  exit 1
fi

echo "[setup-ocr] Creating virtual environment..."
python -m venv "$VENV_DIR"

if [ -x "$VENV_DIR/Scripts/python.exe" ]; then
  PY_BIN="$VENV_DIR/Scripts/python.exe"
  ACTIVATE_CMD="source \"$VENV_DIR/Scripts/activate\""
elif [ -x "$VENV_DIR/bin/python" ]; then
  PY_BIN="$VENV_DIR/bin/python"
  ACTIVATE_CMD="source \"$VENV_DIR/bin/activate\""
else
  echo "[setup-ocr] ERROR: Could not find python in venv" >&2
  exit 1
fi

echo "[setup-ocr] Using Python: $PY_BIN"
eval "$ACTIVATE_CMD"

echo "[setup-ocr] Installing requirements..."
pip install --upgrade pip
pip install -r "$OCR_DIR/requirements.txt"

echo "[setup-ocr] Writing .env updates..."
ENV_FILE="$REPO_ROOT_DIR/project/backend/backend/.env"
touch "$ENV_FILE"
grep -q '^OCR_SCRIPT_PATH=' "$ENV_FILE" || echo "OCR_SCRIPT_PATH=project/ocr-engine/simple_ocr.py" >> "$ENV_FILE"
grep -q '^OCR_PYTHON_BIN=' "$ENV_FILE" || echo "OCR_PYTHON_BIN=$PY_BIN" >> "$ENV_FILE"
grep -q '^OCR_TIMEOUT_MS=' "$ENV_FILE" || echo "OCR_TIMEOUT_MS=45000" >> "$ENV_FILE"

echo "[setup-ocr] Done. You can now run backend and call /api/ocr/describe"
