#!/usr/bin/env python3
"""
Export all exhibits from the backend API to CSV and Markdown table.

Outputs:
 - docs/exhibits.csv
 - docs/EXHIBITS_TABLE.md

Environment:
 - BACKEND_URL (default: http://localhost:5000/api)

Usage:
 - Windows PowerShell:
     $env:BACKEND_URL="http://localhost:5000/api"; python scripts/export_exhibits_table.py
 - macOS/Linux:
     BACKEND_URL="http://localhost:5000/api" python scripts/export_exhibits_table.py
"""

import csv
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List

import requests


def get_backend_url() -> str:
    backend_url = os.getenv("BACKEND_URL", "http://localhost:5000/api")
    return backend_url.rstrip("/")


def fetch_exhibits(backend_url: str) -> List[Dict[str, Any]]:
    url = f"{backend_url}/exhibits"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        # Support multiple shapes: { exhibits: [...] } or { data: [...] } or [...]
        if isinstance(data, list):
            return data
        return data.get("exhibits") or data.get("data") or []
    except Exception as exc:
        print(f"❌ Failed to fetch exhibits from {url}: {exc}")
        return []


def ensure_docs_dir(base_dir: str) -> str:
    docs_dir = os.path.join(base_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    return docs_dir


def to_flat_feature_text(features: Any) -> str:
    if isinstance(features, list):
        return ", ".join(str(x) for x in features)
    if isinstance(features, dict):
        return ", ".join(f"{k}:{v}" for k, v in features.items())
    return str(features) if features is not None else ""


def normalize_exhibit(ex: Dict[str, Any]) -> Dict[str, Any]:
    images = ex.get("images") or ex.get("imageUrls") or []
    if isinstance(images, str):
        try:
            images = json.loads(images)
        except Exception:
            images = [images]
    features = ex.get("features") or ex.get("interactiveFeatures") or []

    raw_location = ex.get("location")
    if isinstance(raw_location, dict):
        floor = raw_location.get("floor") or ""
        location_out = json.dumps(raw_location, ensure_ascii=False)
    else:
        floor = ex.get("floor") or ""
        location_out = str(raw_location) if raw_location is not None else ""

    return {
        "id": ex.get("id") or ex.get("_id") or "",
        "name": ex.get("name") or "",
        "category": ex.get("category") or ex.get("exhibitType") or "",
        "floor": floor,
        "location": location_out,
        "ageRange": ex.get("ageRange") or ex.get("ageBand") or "",
        "type": ex.get("type") or ex.get("exhibitType") or "",
        "environment": ex.get("environment") or "",
        "features": to_flat_feature_text(features),
        "imagesCount": len(images) if isinstance(images, list) else 0,
        "createdAt": ex.get("createdAt") or "",
        "updatedAt": ex.get("updatedAt") or "",
        "description": ex.get("description") or "",
    }


def write_csv(rows: List[Dict[str, Any]], out_path: str) -> None:
    fieldnames = [
        "id",
        "name",
        "category",
        "floor",
        "ageRange",
        "type",
        "environment",
        "features",
        "imagesCount",
        "createdAt",
        "updatedAt",
        "description",
    ]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow({k: r.get(k, "") for k in fieldnames})


def write_markdown(rows: List[Dict[str, Any]], out_path: str, backend_url: str) -> None:
    headers = [
        "ID",
        "Name",
        "Category",
        "Floor",
        "Age",
        "Type",
        "Env",
        "Features",
        "Images",
        "Created",
        "Updated",
    ]
    # Build the table
    lines: List[str] = []
    lines.append("# Exhibits Table\n")
    lines.append(f"_Generated: {datetime.now().isoformat(timespec='seconds')}_  ")
    lines.append(f"Source: `{backend_url}/exhibits`\n")
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")

    def short(text: Any, max_len: int = 80) -> str:
        s = str(text) if text is not None else ""
        return (s[: max_len - 1] + "…") if len(s) > max_len else s

    for r in rows:
        lines.append(
            "| "
            + " | ".join(
                [
                    short(r.get("id")),
                    short(r.get("name")),
                    short(r.get("category")),
                    short(r.get("floor")),
                    short(r.get("ageRange")),
                    short(r.get("type")),
                    short(r.get("environment")),
                    short(r.get("features"), 60),
                    str(r.get("imagesCount", 0)),
                    short(r.get("createdAt")),
                    short(r.get("updatedAt")),
                ]
            )
            + " |"
        )

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main() -> int:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    docs_dir = ensure_docs_dir(base_dir)

    backend_url = get_backend_url()
    print(f"📥 Fetching exhibits from: {backend_url}/exhibits")
    exhibits = fetch_exhibits(backend_url)
    print(f"✅ Received {len(exhibits)} exhibits")

    normalized = [normalize_exhibit(ex) for ex in exhibits]

    csv_path = os.path.join(docs_dir, "exhibits.csv")
    md_path = os.path.join(docs_dir, "EXHIBITS_TABLE.md")

    print(f"📝 Writing CSV: {csv_path}")
    write_csv(normalized, csv_path)
    print(f"📝 Writing Markdown table: {md_path}")
    write_markdown(normalized, md_path, backend_url)

    print("\n🎉 Done! Outputs:")
    print(f" - {csv_path}")
    print(f" - {md_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())


