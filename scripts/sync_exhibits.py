#!/usr/bin/env python3
"""
Convert the authoritative exhibit catalog into the chatbot CSV format.

Source: project/docs/exhibits_detailed.csv (or compatible schema)
Target: project/chatbot-mini/docs/exhibits.csv
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
SOURCE = BASE_DIR / "project" / "docs" / "exhibits_detailed.csv"
TARGET = BASE_DIR / "project" / "chatbot-mini" / "docs" / "exhibits.csv"

COLUMNS = [
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


def first_non_empty(row: dict[str, str], *keys: str) -> str:
    for key in keys:
        value = row.get(key, "")
        if value:
            return value
    return ""


def normalize_features(raw: str | list[str] | dict[str, str]) -> str:
    if isinstance(raw, list):
        return ", ".join(str(item).strip() for item in raw if str(item).strip())
    if isinstance(raw, dict):
        return ", ".join(f"{k}:{v}" for k, v in raw.items())
    if isinstance(raw, str) and raw.strip():
        text = raw.strip()
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return text
        else:
            return normalize_features(parsed)
    return ""


def compute_images_count(row: dict[str, str]) -> str:
    images_count = first_non_empty(row, "imagesCount", "images_count", "imageCount")
    if images_count:
        return str(images_count).strip()

    images_raw = row.get("images")
    if not images_raw:
        return "0"
    try:
        parsed = json.loads(images_raw)
    except json.JSONDecodeError:
        return "0"
    if isinstance(parsed, list):
        return str(len(parsed))
    if isinstance(parsed, dict):
        return str(len(parsed))
    return "0"


def convert_catalog() -> int:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Authoritative dataset not found: {SOURCE}")

    rows_out: list[dict[str, str]] = []
    with SOURCE.open("r", encoding="utf-8-sig", newline="") as src:
        reader = csv.DictReader(src)
        for row in reader:
            exhibit_id = (row.get("id") or "").strip()
            name = (row.get("name") or "").strip()
            if not exhibit_id or not name:
                continue

            features_raw = first_non_empty(row, "features", "interactiveFeatures")
            features = normalize_features(features_raw) if features_raw else ""

            rows_out.append(
                {
                    "id": exhibit_id,
                    "name": name,
                    "category": first_non_empty(row, "category", "exhibitType"),
                    "floor": first_non_empty(row, "floor", "location"),
                    "ageRange": first_non_empty(row, "ageRange", "age_group"),
                    "type": first_non_empty(row, "type", "exhibitType"),
                    "environment": first_non_empty(row, "environment"),
                    "features": features,
                    "imagesCount": compute_images_count(row),
                    "createdAt": first_non_empty(row, "createdAt"),
                    "updatedAt": first_non_empty(row, "updatedAt"),
                    "description": row.get("description", ""),
                }
            )

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with TARGET.open("w", encoding="utf-8", newline="") as dst:
        writer = csv.DictWriter(dst, fieldnames=COLUMNS)
        writer.writeheader()
        for row in rows_out:
            writer.writerow(row)

    print(f"Wrote {len(rows_out)} exhibits to {TARGET}")
    return len(rows_out)


if __name__ == "__main__":
    convert_catalog()

