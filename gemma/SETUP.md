Environment & Weights

Requirements (Linux/Windows WSL recommended)
- Python 3.10+
- CUDA 11.8+ (for GPU training) or CPU fallback
- pip install: torch, transformers, datasets, peft, accelerate, bitsandbytes (if CUDA), sentencepiece, pillow, scikit-learn

Model
- Base: Gemma 2B (text); multimodal via external image encoder (CLIP/ViT)
- Download via transformers AutoModel + AutoTokenizer

Notes
- Use QLoRA for 2B on single GPU; otherwise LoRA with gradient checkpointing
- Mixed precision (fp16/bf16) when supported

