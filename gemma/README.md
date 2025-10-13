Gemma 2B Recommender – Project Plan

This module will fine-tune a Gemma 2B model to recommend exhibits using all available modalities:
- Text: names, descriptions, categories, tags
- Images: exhibit images
- Metadata: location (floor/x/y), average time, rating, features

Milestones
1) Dataset prep
- Consolidate exhibits from backend DB/json
- Extract text, tags, metadata; collect image paths
- Write train/val/test splits, JSONL manifest

2) Training (LoRA/QLoRA)
- Text-only baseline → instruction-tuned ranking/regression
- Multimodal: add image encoder (CLIP/ViT) with projection to Gemma hidden size
- Objective: pairwise ranking + score regression

3) Evaluation
- Hit-rate@K, NDCG, MAP; qualitative checks by interest prompts

4) Inference service
- Export adapter + tokenizer; provide HTTP API: /recommend

Directory
- data/: manifests and cached features
- scripts/: dataset build, eval
- train/: training entrypoints and config
- infer/: inference server

See SETUP.md for environment and weights.

