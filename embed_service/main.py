from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="UCOST Embed Service", version="1.0.0")

_model = None

class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    vectors: List[List[float]]

def _lazy_load():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        # Small, fast model; downloads once and caches
        _model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    return _model

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    model = _lazy_load()
    if not req.texts:
        return {"vectors": []}
    embeddings = model.encode(req.texts, normalize_embeddings=True)
    return {"vectors": [list(map(float, v)) for v in embeddings]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

