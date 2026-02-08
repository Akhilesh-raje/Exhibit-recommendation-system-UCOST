# Gemma 2B Recommender System

✅ **100% Complete & Working**

> High-level context now sits in the monorepo root `README.md` (**Subsystem Guides → Gemma Recommender**). Keep this document focused on deep component details.

## 🎯 Overview

This module provides multimodal exhibit recommendations using Gemma 2B with all available modalities:
- **Text**: names, descriptions, categories, tags
- **Images**: exhibit images via CLIP/ViT encoders
- **Metadata**: location (floor/x/y), average time, rating, features

## ✅ **Status: Fully Operational**

**The Gemma inference server is running and embeddings are built. The recommendation service is integrated and working.**

## 🏗️ Architecture

### Multimodal Recommendation Pipeline

1. **Text Processing**: Extract and encode exhibit text features
2. **Image Encoding**: Use CLIP/ViT to encode exhibit images
3. **Metadata Fusion**: Combine location, time, rating, and feature metadata
4. **Gemma 2B Fine-tuning**: LoRA/QLoRA fine-tuned model for ranking
5. **FAISS Search**: Fast similarity search in embedding space
6. **Reranking**: Logistic reranker for final result quality

## 📁 Directory Structure

```
gemma/
├── data/                    # Training data, manifests, cached features
│   ├── exhibits.csv        # Exhibit dataset
│   ├── metadata.json       # Metadata definitions
│   └── training_data.jsonl # Training data in JSONL format
├── embeddings/             # FAISS index and metadata
│   ├── faiss.index        # FAISS vector index
│   ├── meta.json          # Index metadata
│   └── rows.json          # Row mappings
├── scripts/                # Dataset building, evaluation utilities
│   ├── build_dataset.py   # Dataset preparation
│   ├── evaluate.py        # Model evaluation
│   ├── rebuild_embeddings.py  # Rebuild FAISS index
│   └── test_server.py     # Server testing
├── train/                  # Training scripts and configuration
│   └── train_lora.py      # LoRA/QLoRA training script
├── infer/                  # Inference server
│   └── server.py          # FastAPI inference server
├── config/                 # Configuration files
│   ├── paths.yaml         # Path configurations
│   ├── search.yaml        # Search parameters
│   └── training.yaml      # Training hyperparameters
├── README.md              # This file
└── SETUP.md               # Environment setup guide
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- CUDA 11.8+ (for GPU training) or CPU fallback
- Required packages: `torch`, `transformers`, `datasets`, `peft`, `accelerate`, `bitsandbytes` (if CUDA), `sentencepiece`, `pillow`, `scikit-learn`, `fastapi`, `uvicorn`

### Installation

```bash
# Create conda environment (recommended)
conda create -n ucost-gemma python=3.10
conda activate ucost-gemma

# Install dependencies
pip install torch transformers datasets peft accelerate sentencepiece pillow scikit-learn fastapi uvicorn

# For GPU support (optional)
pip install bitsandbytes
```

### Running the Inference Server

```bash
cd gemma
conda activate ucost-gemma
python infer/server.py --port 8011

# Or use npm from project root
npm run dev:gemma
```

The server will be available at `http://localhost:8011`

## 📊 Development Milestones

### 1. Dataset Preparation
- Consolidate exhibits from backend DB/JSON
- Extract text, tags, metadata; collect image paths
- Write train/val/test splits, JSONL manifest
- Generate FAISS embeddings for fast search

### 2. Training (LoRA/QLoRA)
- Text-only baseline → instruction-tuned ranking/regression
- Multimodal: add image encoder (CLIP/ViT) with projection to Gemma hidden size
- Objective: pairwise ranking + score regression
- Use QLoRA for 2B model on single GPU
- Mixed precision (fp16/bf16) when supported

### 3. Evaluation
- Hit-rate@K, NDCG, MAP metrics
- Qualitative checks by interest prompts
- A/B testing with real user interactions

### 4. Inference Service
- Export adapter + tokenizer
- Provide HTTP API: `/recommend`
- FAISS-based fast retrieval
- Logistic reranking for quality

## 🔧 Configuration

### Training Configuration (`config/training.yaml`)
- Model: Gemma 2B
- Fine-tuning: LoRA/QLoRA
- Learning rate, batch size, epochs
- Mixed precision settings

### Search Configuration (`config/search.yaml`)
- FAISS index parameters
- Top-K retrieval settings
- Reranking thresholds
- Similarity metrics

## 📡 API Endpoints

### `/recommend`
- **Method**: POST
- **Body**: 
  ```json
  {
    "query": "interactive science exhibits for kids",
    "top_k": 5,
    "filters": {
      "category": "physics",
      "floor": "first"
    }
  }
  ```
- **Response**: 
  ```json
  {
    "recommendations": [
      {
        "exhibit_id": "...",
        "score": 0.92,
        "reason": "..."
      }
    ]
  }
  ```

## 🧪 Testing

```bash
# Test the server
python scripts/test_server.py

# Evaluate model performance
python scripts/evaluate.py

# Rebuild embeddings
python scripts/rebuild_embeddings.py
```

## 📚 Documentation

- **SETUP.md**: Detailed environment setup and model weights
- **Root README.md**: High-level overview and integration guide
- **Code comments**: Inline documentation in all scripts

## 🔮 Future Enhancements

- [ ] Real-time learning from user feedback
- [ ] Multi-lingual support (Hindi + English)
- [ ] Explainable recommendations
- [ ] A/B testing framework
- [ ] Model versioning and rollback

