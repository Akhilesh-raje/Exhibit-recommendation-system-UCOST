# Embed Service

> For an integrated overview, see the root `README.md` (**Subsystem Guides → Embed Service**). This file captures service-specific commands and context.

FastAPI-based embedding service for semantic search and AI-powered tour recommendations.

## ✅ **Status: 100% Complete & Working**

**The embedding service is fully operational with FAISS indexing and semantic search working correctly.**

## Setup

### Option 1: Install with pre-built wheels (Recommended)

If you encounter Rust compilation errors, use pre-built wheels:

```bash
# Install core dependencies first
pip install fastapi uvicorn[standard] pydantic

# Install PyTorch (CPU version, has pre-built wheels)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install sentence-transformers and dependencies
pip install sentence-transformers transformers

# OR force only pre-built wheels for everything:
pip install --only-binary :all: fastapi uvicorn[standard] pydantic sentence-transformers
```

### Option 2: Standard installation

```bash
pip install -r requirements.txt
```

**If you get Rust compilation errors**, use Option 1 instead.

## Running the Service

### Manual Start
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Using npm (from project root)
```bash
npm run dev:embed
```

The service will start on `http://localhost:8001`

## Endpoints

- `GET /health` - Health check endpoint
- `POST /embed` - Generate embeddings for text(s)

## Integration

The backend checks this service automatically. If it's not running, the system falls back to heuristics-based recommendations (which still work).

## Notes

- First run will download the sentence-transformers model (~80MB)
- Model is cached after first use for faster subsequent requests
- Service runs on port 8001 by default

