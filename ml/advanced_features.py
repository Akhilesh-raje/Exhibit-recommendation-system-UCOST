"""
Advanced feature engineering for 90%+ accuracy.
Includes query expansion, embedding features, and advanced matching.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Set

# Interest synonyms and expansions for query expansion
INTEREST_SYNONYMS: Dict[str, List[str]] = {
    "ai": ["artificial intelligence", "machine learning", "ml", "neural network", "deep learning"],
    "robotics": ["robot", "automation", "mechanical", "engineering"],
    "physics": ["mechanics", "force", "motion", "energy", "waves", "electricity"],
    "astronomy": ["space", "stars", "planets", "cosmos", "universe", "celestial", "planetarium", "taramandal", "stellar", "solar system"],
    "biology": ["biological", "life", "organism", "cell", "genetics", "evolution", "ecosystem", "nature", "living"],
    "environment": ["environmental", "ecology", "ecological", "climate", "nature", "sustainability", "green", "earth", "ecosystem"],
    "technology": ["tech", "innovation", "engineering", "stem", "computing"],
    "science": ["scientific", "research", "experiment", "discovery"],
    "interactive": ["hands-on", "experiment", "participatory", "engagement"],
    "family": ["children", "kids", "educational", "fun"],
    "innovation": ["creative", "inventive", "design", "development"],
    "space": ["astronomy", "cosmic", "stellar", "planetary", "universe", "stars", "planets"],
    "stars": ["astronomy", "constellation", "celestial", "night sky"],
    "planets": ["solar system", "astronomy", "space"],
    "taramandal": ["planetarium", "stars", "astronomy", "night sky"],
    "wave": ["motion", "physics", "oscillation", "vibration"],
    "motion": ["movement", "physics", "mechanics", "kinematics"],
}

def expand_query(interests: List[str]) -> List[str]:
    """Expand user interests with synonyms and related terms."""
    expanded = set()
    for interest in interests:
        if not interest:
            continue
        interest_lower = interest.lower().strip()
        expanded.add(interest_lower)
        
        # Add synonyms
        if interest_lower in INTEREST_SYNONYMS:
            expanded.update(INTEREST_SYNONYMS[interest_lower])
        
        # Add partial matches (e.g., "ai" matches "artificial intelligence")
        for key, synonyms in INTEREST_SYNONYMS.items():
            if key in interest_lower or interest_lower in key:
                expanded.update(synonyms)
                expanded.add(key)
    
    return list(expanded)


def calculate_tf_idf_score(query_terms: List[str], text: str) -> float:
    """Calculate TF-IDF-like score for query terms in text."""
    if not query_terms or not text:
        return 0.0
    
    text_lower = text.lower()
    text_words = set(re.findall(r'\b[a-z]{3,}\b', text_lower))
    
    matches = 0
    for term in query_terms:
        term_lower = term.lower()
        # Exact word match
        if term_lower in text_words:
            matches += 1
        # Substring match
        elif term_lower in text_lower:
            matches += 0.5
    
    return matches / len(query_terms) if query_terms else 0.0


def calculate_coverage_score(query_terms: List[str], text: str) -> float:
    """Calculate how many query terms are covered in text."""
    if not query_terms or not text:
        return 0.0
    
    text_lower = text.lower()
    covered = sum(1 for term in query_terms if term.lower() in text_lower)
    return covered / len(query_terms) if query_terms else 0.0


def extract_ngrams(text: str, n: int = 2) -> Set[str]:
    """Extract n-grams from text."""
    if not text:
        return set()
    words = re.findall(r'\b[a-z]{2,}\b', text.lower())
    ngrams = set()
    for i in range(len(words) - n + 1):
        ngram = ' '.join(words[i:i+n])
        ngrams.add(ngram)
    return ngrams


def ngram_overlap(text1: str, text2: str, n: int = 2) -> float:
    """Calculate n-gram overlap between two texts."""
    ngrams1 = extract_ngrams(text1, n)
    ngrams2 = extract_ngrams(text2, n)
    if not ngrams1 or not ngrams2:
        return 0.0
    intersection = ngrams1 & ngrams2
    union = ngrams1 | ngrams2
    return len(intersection) / len(union) if union else 0.0


def build_advanced_features(user: Dict[str, Any], exhibit: Dict[str, Any]) -> Dict[str, float]:
    """Build advanced features including query expansion and n-grams."""
    # Import here to avoid circular imports
    import sys
    from pathlib import Path
    ml_dir = Path(__file__).parent
    if str(ml_dir) not in sys.path:
        sys.path.insert(0, str(ml_dir))
    
    from features import build_feature_vector
    
    # Get base features
    base_features = build_feature_vector(user, exhibit)
    
    # Query expansion
    interests = [x.strip() for x in (user.get("interests") or []) if x]
    expanded_interests = expand_query(interests)
    
    # Exhibit text
    name_text = str(exhibit.get("name", ""))
    desc_text = str(exhibit.get("description", ""))
    category = exhibit.get("category") or exhibit.get("exhibitType") or ""
    full_text = " ".join([name_text, desc_text, category]).lower()
    
    # Advanced matching with expanded query
    expanded_query_text = " ".join(expanded_interests).lower()
    
    # TF-IDF like scores
    tf_idf_name = calculate_tf_idf_score(expanded_interests, name_text)
    tf_idf_desc = calculate_tf_idf_score(expanded_interests, desc_text)
    tf_idf_full = calculate_tf_idf_score(expanded_interests, full_text)
    
    # Coverage scores
    coverage_name = calculate_coverage_score(expanded_interests, name_text)
    coverage_desc = calculate_coverage_score(expanded_interests, desc_text)
    coverage_full = calculate_coverage_score(expanded_interests, full_text)
    
    # N-gram overlap
    bigram_overlap = ngram_overlap(expanded_query_text, full_text, n=2)
    trigram_overlap = ngram_overlap(expanded_query_text, full_text, n=3)
    
    # Expanded interest hits
    expanded_hits = sum(1 for term in expanded_interests if term.lower() in full_text)
    expanded_hits_normalized = expanded_hits / len(expanded_interests) if expanded_interests else 0.0
    
    # Combine with base features
    advanced_features = {
        **base_features,
        "expanded_tf_idf_name": tf_idf_name,
        "expanded_tf_idf_desc": tf_idf_desc,
        "expanded_tf_idf_full": tf_idf_full,
        "expanded_coverage_name": coverage_name,
        "expanded_coverage_desc": coverage_desc,
        "expanded_coverage_full": coverage_full,
        "bigram_overlap": bigram_overlap,
        "trigram_overlap": trigram_overlap,
        "expanded_hits": float(expanded_hits),
        "expanded_hits_normalized": expanded_hits_normalized,
    }
    
    return advanced_features


# Export feature keys for training
ADVANCED_FEATURE_KEYS = [
    "interest_hits",
    "interest_jaccard",
    "name_hits",
    "desc_hits",
    "tag_hits",
    "category_hits",
    "category_match",
    "desc_similarity",
    "name_similarity",
    "category_similarity",
    "age_match",
    "group_match",
    "category_known",
    "time_budget",
    "mobility_none",
    "crowd_low",
    "crowd_medium",
    "crowd_high",
    "expanded_tf_idf_name",
    "expanded_tf_idf_desc",
    "expanded_tf_idf_full",
    "expanded_coverage_name",
    "expanded_coverage_desc",
    "expanded_coverage_full",
    "bigram_overlap",
    "trigram_overlap",
    "expanded_hits",
    "expanded_hits_normalized",
]

