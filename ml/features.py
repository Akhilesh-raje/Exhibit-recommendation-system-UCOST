from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Set


def jaccard(a: List[str], b: List[str]) -> float:
    sa, sb = set([x.lower() for x in a or []]), set([x.lower() for x in b or []])
    if not sa and not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0


def fuzzy_match(a: str, b: str) -> float:
    """Fuzzy string matching with partial word matching."""
    if not a or not b:
        return 0.0
    a_l, b_l = a.lower().strip(), b.lower().strip()
    if a_l == b_l:
        return 1.0
    if a_l in b_l or b_l in a_l:
        return 0.8
    # Word-level matching
    a_words = set(a_l.split())
    b_words = set(b_l.split())
    if a_words & b_words:
        return 0.6
    # Partial word matching
    for aw in a_words:
        for bw in b_words:
            if len(aw) > 3 and len(bw) > 3:
                if aw[:4] == bw[:4] or aw in bw or bw in aw:
                    return 0.4
    return 0.0


def normalize_category(cat: str) -> str:
    """Normalize category name for better matching."""
    if not cat:
        return ""
    # Convert to lowercase, replace hyphens with spaces
    normalized = cat.lower().replace("-", " ").replace("_", " ").strip()
    # Remove extra spaces
    normalized = " ".join(normalized.split())
    return normalized


def match_score(a: str, b: str) -> float:
    """Enhanced matching with fuzzy logic."""
    return fuzzy_match(a, b)


def extract_keywords(text: str, min_length: int = 4) -> Set[str]:
    """Extract meaningful keywords from text."""
    if not text:
        return set()
    # Remove common stop words
    stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'where', 'when', 'what', 'which', 'who', 'how', 'why'}
    # Extract words
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    # Filter stop words and short words
    keywords = {w for w in words if len(w) >= min_length and w not in stop_words}
    return keywords


def text_similarity(text1: str, text2: str) -> float:
    """Calculate text similarity using keyword overlap."""
    if not text1 or not text2:
        return 0.0
    kw1 = extract_keywords(text1)
    kw2 = extract_keywords(text2)
    if not kw1 or not kw2:
        return 0.0
    intersection = kw1 & kw2
    union = kw1 | kw2
    return len(intersection) / len(union) if union else 0.0


def build_feature_vector(user: Dict[str, Any], exhibit: Dict[str, Any]) -> Dict[str, float]:
    interests = [x.strip() for x in (user.get("interests") or []) if x]
    ex_features = exhibit.get("features") or exhibit.get("interactiveFeatures") or []
    # Include generic tags if provided in dataset (e.g., exported metadata)
    ex_tags = exhibit.get("tags") or []
    if isinstance(ex_features, str):
        ex_features = [x.strip() for x in ex_features.split(",") if x.strip()]
    if isinstance(ex_tags, str):
        ex_tags = [x.strip() for x in ex_tags.split(",") if x.strip()]
    
    # Extract keywords from description if tags are empty
    desc_text = str(exhibit.get("description", ""))
    if not ex_features and not ex_tags and desc_text:
        # Auto-extract keywords from description
        desc_keywords = extract_keywords(desc_text)
        ex_features = list(desc_keywords)[:10]  # Top 10 keywords
    
    # Merge features and tags for matching
    combined_tags = list({*(ex_features or []), *(ex_tags or [])})

    # Basic categorical matches with normalization
    category = exhibit.get("category") or exhibit.get("exhibitType") or ""
    category_normalized = normalize_category(category)
    age_match = match_score(user.get("ageBand", ""), exhibit.get("ageRange", ""))
    group_match = match_score(user.get("groupType", ""), exhibit.get("groupType", ""))

    # Enhanced text matching
    name_text = str(exhibit.get("name", ""))
    searchable = " ".join([name_text, desc_text, str(category)]).lower()
    
    # Interest overlap with fuzzy matching
    interest_hits = 0
    name_hits = 0
    desc_hits = 0
    category_hits = 0
    max_category_match = 0.0
    
    for kw in interests:
        kw_lower = kw.lower() if kw else ""
        if not kw_lower:
            continue
        # Exact matches
        if kw_lower in searchable:
            interest_hits += 1
        if kw_lower in name_text.lower():
            name_hits += 1
        if kw_lower in desc_text.lower():
            desc_hits += 1
        # Category fuzzy matching with normalization
        if category_normalized:
            # Try normalized category
            cat_match = fuzzy_match(kw_lower, category_normalized)
            # Also try original category
            if category:
                cat_match = max(cat_match, fuzzy_match(kw_lower, category.lower()))
            max_category_match = max(max_category_match, cat_match)
            if cat_match > 0.3:
                category_hits += 1
            # Also check if interest word is in normalized category
            if kw_lower in category_normalized or category_normalized in kw_lower:
                category_hits += 0.5
    
    # Direct tag hits with fuzzy matching
    tag_hits = 0
    tag_jaccard = jaccard(interests, combined_tags)
    combined_lower = [t.lower() for t in combined_tags]
    for kw in interests:
        kw_lower = kw.lower() if kw else ""
        if not kw_lower:
            continue
        # Exact match
        if kw_lower in combined_lower:
            tag_hits += 1
        else:
            # Fuzzy match
            for tag in combined_tags:
                if fuzzy_match(kw_lower, tag.lower()) > 0.3:
                    tag_hits += 0.5  # Partial credit for fuzzy match
                    break
    
    # Text similarity features with normalized category
    user_interests_text = " ".join(interests).lower()
    desc_similarity = text_similarity(user_interests_text, desc_text)
    name_similarity = text_similarity(user_interests_text, name_text)
    category_similarity = text_similarity(user_interests_text, category_normalized) if category_normalized else 0.0

    # Rule-inspired features
    time_budget = float(user.get("timeBudget") or 0)
    mobility = user.get("mobility") or ""
    crowd_tol = user.get("crowdTolerance") or ""

    return {
        "interest_hits": float(interest_hits),
        "interest_jaccard": tag_jaccard if 'tag_jaccard' in locals() else jaccard(interests, combined_tags),
        "name_hits": float(name_hits),
        "desc_hits": float(desc_hits),
        "tag_hits": float(tag_hits),
        "category_hits": float(category_hits),
        "category_match": max_category_match,  # Enhanced category matching
        "desc_similarity": desc_similarity,  # New: text similarity
        "name_similarity": name_similarity,  # New: name similarity
        "category_similarity": category_similarity,  # New: category similarity
        "age_match": age_match,
        "group_match": group_match,
        "category_known": 1.0 if category else 0.0,
        "time_budget": time_budget,
        "mobility_none": 1.0 if mobility == "none" else 0.0,
        "crowd_low": 1.0 if crowd_tol == "low" else 0.0,
        "crowd_medium": 1.0 if crowd_tol == "medium" else 0.0,
        "crowd_high": 1.0 if crowd_tol == "high" else 0.0,
    }


FEATURE_KEYS = [
    "interest_hits",
    "interest_jaccard",
    "name_hits",
    "desc_hits",
    "tag_hits",
    "category_hits",  # New
    "category_match",
    "desc_similarity",  # New
    "name_similarity",  # New
    "category_similarity",  # New
    "age_match",
    "group_match",
    "category_known",
    "time_budget",
    "mobility_none",
    "crowd_low",
    "crowd_medium",
    "crowd_high",
]


