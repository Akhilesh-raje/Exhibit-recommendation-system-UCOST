#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str], cwd: Path | None = None) -> None:
	print(f"\n=== Running: {' '.join(cmd)} ===")
	res = subprocess.run(cmd, cwd=str(cwd or ROOT))
	if res.returncode != 0:
		raise SystemExit(res.returncode)


def main() -> int:
	# 1) Train the ranker (uses BACKEND_URL if set)
	ranker_script = ROOT / "ml" / "train_ranker.py"
	if not ranker_script.exists():
		print("Missing ml/train_ranker.py")
		return 1
	run([sys.executable, str(ranker_script)])

	# 2) Rebuild embeddings and FAISS for retriever/chatbot
	build_emb = ROOT / "gemma" / "scripts" / "build_embeddings.py"
	if build_emb.exists():
		run([sys.executable, str(build_emb)])
	rows_json = ROOT / "gemma" / "scripts" / "create_rows_json.py"
	if rows_json.exists():
		run([sys.executable, str(rows_json)])

	# 3) (Optional) LoRA fine-tune if dataset available and access granted
	lora_train = ROOT / "gemma" / "train" / "train_lora.py"
	dataset_default = ROOT / "gemma" / "dataset" / "training_data.jsonl"
	if lora_train.exists() and dataset_default.exists():
		print("Found LoRA trainer and dataset; attempting LoRA fine-tuning...")
		print("Note: Gemma models require HuggingFace access token. Skipping if not available.")
		try:
			run([sys.executable, str(lora_train), "--model", "google/gemma-2b", "--data", str(dataset_default)])
		except SystemExit:
			print("⚠️  LoRA training skipped (may require HuggingFace access token)")
	else:
		print("Skipping LoRA: trainer or dataset not found.")

	# 4) Evaluate ranker accuracy
	test_ranker = ROOT / "scripts" / "test_ranker_accuracy.py"
	if test_ranker.exists():
		run([sys.executable, str(test_ranker)])
	else:
		print("Ranker test script not found; skipping evaluation.")

	print("\nAll steps completed.")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
