#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List

import lightgbm as lgb
from fastapi import FastAPI
from pydantic import BaseModel

from features import build_feature_vector, FEATURE_KEYS

# Try ensemble ranker
try:
    from ensemble_ranker import EnsembleRanker
    HAS_ENSEMBLE = True
except ImportError:
    HAS_ENSEMBLE = False


class UserProfile(BaseModel):
    interests: List[str] = []
    ageBand: str = ""
    groupType: str = ""
    groupSize: int | None = None
    timeBudget: int | None = None
    mobility: str = ""
    crowdTolerance: str = ""


class Exhibit(BaseModel):
    id: str
    name: str | None = None
    description: str | None = None
    category: str | None = None
    exhibitType: str | None = None
    ageRange: str | None = None
    features: List[str] | None = None
    interactiveFeatures: List[str] | None = None
    rating: float | None = None
    tags: List[str] | None = None


class RankRequest(BaseModel):
    userProfile: UserProfile
    exhibits: List[Exhibit]
    topK: int = 20


base = Path(__file__).resolve().parent
model_path = base / "models" / "ranker.txt"

if not model_path.exists():
    raise RuntimeError(f"Ranker model not found at {model_path}. Please run train_ranker.py")

# Try to use ensemble, fallback to single model
if HAS_ENSEMBLE:
    try:
        ensemble = EnsembleRanker(base / "models")
        use_ensemble = True
        model = None  # Will use ensemble instead
    except Exception as e:
        print(f"Warning: Could not load ensemble, using single model: {e}")
        use_ensemble = False
        model = lgb.Booster(model_file=str(model_path))
else:
    use_ensemble = False
model = lgb.Booster(model_file=str(model_path))

app = FastAPI(title="UC Ranker Service", version="1.0.0")


@app.post("/rank")
def rank(req: RankRequest):
    try:
    user = req.userProfile.model_dump()
        interests = user.get("interests") or []
        
        # Determine if we should use ensemble (check if it's available)
        current_use_ensemble = use_ensemble and ensemble is not None
        
        # Fallback for empty interests: use popularity/rating-based ranking
        if not interests or len(interests) == 0:
            # Multi-factor scoring for general recommendations
            scored = []
            for ex in req.exhibits:
                ex_dict = ex.model_dump()
                # Factor 1: Rating (if available)
                rating = ex_dict.get("rating", 0) or 0
                rating_score = float(rating) if isinstance(rating, (int, float)) else 0.0
                
                # Factor 2: Category diversity (prefer popular categories)
                category = ex_dict.get("category", "") or ""
                category_bonus = 0.5 if category else 0.0
                
                # Factor 3: Has description (more informative)
                desc = ex_dict.get("description", "") or ""
                desc_bonus = 0.3 if len(desc) > 50 else 0.0
                
                # Factor 4: Interactive features (more engaging)
                features = ex_dict.get("features") or ex_dict.get("interactiveFeatures") or []
                features_bonus = min(0.2 * len(features), 1.0) if features else 0.0
                
                # Combined score
                score = rating_score * 0.5 + category_bonus * 0.2 + desc_bonus * 0.2 + features_bonus * 0.1
                
                scored.append({"id": ex.id, "score": score})
            scored.sort(key=lambda x: x["score"], reverse=True)
            return {"success": True, "results": scored[: max(1, req.topK)]}
        
        # Normal ranking with ML model (ensemble if available)
        scored = []
        if current_use_ensemble:
            try:
                # Use ensemble ranker
                exhibits_list = [ex.model_dump() for ex in req.exhibits]
                ranked_results = ensemble.rank(user, exhibits_list, use_advanced=True)
                print(f"DEBUG: Ensemble returned {len(ranked_results)} results")
                if ranked_results:
                    print(f"DEBUG: Top score: {ranked_results[0].get('score', 0):.6f}")
                # Convert to expected format
                scored = [
                    {
                        "id": r["id"],
                        "score": r["score"],
                        "confidence": r.get("confidence", 0)
                    }
                    for r in ranked_results
                ]
                print(f"DEBUG: Scored {len(scored)} exhibits")
                current_use_ensemble = True  # Successfully used ensemble
            except Exception as e:
                print(f"WARNING: Ensemble ranking failed, falling back to single model: {e}")
                import traceback
                traceback.print_exc()
                current_use_ensemble = False
                # Fall through to single model code
        
        if not current_use_ensemble or len(scored) == 0:
            # Use single model
    feats = []
    for ex in req.exhibits:
        fv = build_feature_vector(user, ex.model_dump())
                feats.append([fv.get(k, 0.0) for k in FEATURE_KEYS])
    preds = model.predict(feats)
            
            # Calculate confidence scores
            if len(scored) == 0:
                scored = []
                for i, ex in enumerate(req.exhibits):
                    score = float(preds[i])
                    ex_dict = ex.model_dump()
                    fv = build_feature_vector(user, ex_dict)
                    
                    confidence = (
                        fv.get("tag_hits", 0) * 0.3 +
                        fv.get("category_hits", 0) * 0.25 +
                        fv.get("desc_similarity", 0) * 0.2 +
                        fv.get("interest_jaccard", 0) * 0.15 +
                        fv.get("category_similarity", 0) * 0.1
                    )
                    
                    scored.append({
                        "id": ex.id,
                        "score": score,
                        "confidence": confidence
                    })
        
        # Sort by score
    scored.sort(key=lambda x: x["score"], reverse=True)
        
        # Multi-stage reranking with STRICT interest matching - top 10-15 MUST match interests
        if len(scored) > 0:
            # Check if user has interests - if yes, STRICT matching required
            has_interests = interests and len(interests) > 0
            
            # Stage 1: STRICT filtering - prioritize exhibits that match user interests
            # Calculate interest match scores for each exhibit
            interest_matched = []
            non_matched = []
            taramandal_exhibit = None  # Special handling for taramandal
            
            # Check if interests include astronomy/space-related terms
            # STRICT: Check each interest individually (case-insensitive)
            interests_lower = [i.lower().strip() for i in interests if i]
            astronomy_keywords = ["stars", "star", "astronomy", "space", "planets", "planet", "taramandal"]
            has_astronomy_interest = any(
                any(kw in interest for kw in astronomy_keywords)
                for interest in interests_lower
            )
            
            print(f"DEBUG: Interests: {interests}")
            print(f"DEBUG: Has astronomy interest: {has_astronomy_interest}")
            
            for r in scored:
                ex_id = r["id"]
                ex_data = next((ex for ex in req.exhibits if ex.id == ex_id), None)
                if ex_data:
                    ex_dict = ex_data.model_dump()
                    ex_name = ex_dict.get("name", "").lower()
                    ex_category = ex_dict.get("category", "").lower()
                    
                    # SPECIAL: Check if this is taramandal exhibit (case-insensitive)
                    is_taramandal_exhibit = (
                        "taramandal" in ex_name or 
                        "taramandal" in ex_category or
                        ex_id == "cmf97ohja0003snwdwzd9jhb7"  # Known taramandal ID
                    )
                    
                    if is_taramandal_exhibit:
                        print(f"DEBUG: Found Taramandal exhibit: {ex_name} (ID: {ex_id})")
                        taramandal_exhibit = r
                        # ALWAYS mark taramandal as interest-matched if astronomy interest exists
                        if has_astronomy_interest:
                            fv = build_feature_vector(user, ex_dict)
                            r["interest_match_score"] = 100.0  # Maximum score for taramandal (increased from 10.0)
                            r["is_taramandal"] = True
                            r["taramandal_priority"] = True
                            interest_matched.append(r)
                            print(f"DEBUG: Taramandal added to interest_matched with score 100.0")
                            continue
                        else:
                            # Even without astronomy interest, mark it for potential matching
                            r["is_taramandal"] = True
                            r["taramandal_priority"] = False
                    
                    # Check if exhibit matches user interests
                    fv = build_feature_vector(user, ex_dict)
                    tag_hits = fv.get("tag_hits", 0)
                    category_hits = fv.get("category_hits", 0)
                    interest_jaccard = fv.get("interest_jaccard", 0)
                    
                    # STRICT: Has direct match if tag hits, category hits, or good jaccard
                    has_match = tag_hits > 0 or category_hits > 0 or interest_jaccard > 0.25
                    
                    if has_match:
                        # Boost score for interest-matched exhibits
                        r["interest_match_score"] = tag_hits * 2.0 + category_hits * 1.5 + interest_jaccard * 1.0
                        r["is_taramandal"] = False
                        interest_matched.append(r)
                    else:
                        r["interest_match_score"] = 0.0
                        r["is_taramandal"] = False
                        non_matched.append(r)
                else:
                    non_matched.append(r)
            
            # STRICT: Prioritize interest-matched exhibits
            # Sort interest-matched by match score + model score
            for r in interest_matched:
                r["priority_score"] = r.get("score", 0) + r.get("interest_match_score", 0) * 2.0
            
            # SPECIAL: If astronomy interest and taramandal exists, ensure it's FIRST
            if has_astronomy_interest and taramandal_exhibit and taramandal_exhibit.get("taramandal_priority", False):
                print(f"DEBUG: Astronomy interest detected - prioritizing Taramandal FIRST")
                # Remove taramandal from interest_matched if it's there
                interest_matched = [r for r in interest_matched if not (r.get("is_taramandal", False) and r.get("id") == taramandal_exhibit.get("id"))]
                # Sort remaining
                interest_matched.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
                # Put taramandal FIRST - no exceptions
                filtered = [taramandal_exhibit] + interest_matched
                print(f"DEBUG: Taramandal placed FIRST, {len(interest_matched)} other interest-matched exhibits follow")
            else:
                interest_matched.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
                filtered = interest_matched.copy()
                if taramandal_exhibit and not has_astronomy_interest:
                    print(f"DEBUG: No astronomy interest - Taramandal not prioritized")
            
            # Sort non-matched by score only
            non_matched.sort(key=lambda x: x.get("score", 0), reverse=True)
            
            # STRICT RULE: If user has interests, top 10-15 MUST be interest-matched ONLY
            strict_top_k = min(15, max(10, req.topK))  # Top 10-15 must be strict
            
            if has_interests:
                # User has interests - STRICT matching required
                if len(filtered) >= strict_top_k:
                    # We have enough interest-matched, use ONLY those for top 10-15
                    filtered = filtered[:strict_top_k]
                elif len(filtered) >= req.topK:
                    # We have enough for requested topK, use only those
                    filtered = filtered[:req.topK]
                elif len(filtered) > 0:
                    # We have some interest-matched but not enough
                    # Still use ONLY interest-matched (don't add non-matched)
                    filtered = filtered[:len(filtered)]  # Use all we have
                else:
                    # No interest-matched found - this shouldn't happen with good data
                    # Fall back to non-matched but mark as low quality
                    filtered = non_matched[:req.topK]
                    for r in filtered:
                        r["priority_score"] = r.get("score", 0) * 0.2  # Very heavy penalty
            else:
                # No interests specified - use all results
                if len(filtered) >= req.topK:
                    filtered = filtered[:req.topK]
                else:
                    remaining = req.topK - len(filtered)
                    for r in non_matched[:remaining]:
                        r["priority_score"] = r.get("score", 0) * 0.5
                        filtered.append(r)
            
            # Stage 2: Re-rank with STRICT interest matching priority
            for r in filtered:
                base_score = r.get("priority_score", r.get("score", 0))
                confidence = r.get("confidence", 0)
                interest_match = r.get("interest_match_score", 0)
                is_taramandal = r.get("is_taramandal", False)
                
                # SPECIAL: Taramandal gets maximum priority when astronomy interest exists
                if is_taramandal and has_astronomy_interest:
                    r["final_score"] = 10000.0  # EXTREME maximum score to ensure it's ALWAYS first
                    print(f"DEBUG: Taramandal final_score set to 10000.0 (maximum priority)")
                elif interest_match > 0:
                    # Interest-matched: Higher weight on interest match
                    # 55% priority score + 15% confidence + 30% interest match
                    r["final_score"] = base_score * 0.55 + confidence * 0.15 + interest_match * 0.30
                else:
                    # Non-matched: Much lower score (shouldn't appear if has_interests)
                    if not current_use_ensemble:
                        r["final_score"] = base_score * 0.40 + confidence * 0.10
                    else:
                        r["final_score"] = base_score * 0.45 + confidence * 0.08
            
            # Stage 3: Diversity boost (avoid clustering similar exhibits) - only if we have enough results
            if len(filtered) > req.topK * 1.5:  # Only apply if we have significantly more than needed
                final_results = []
                seen_categories = set()
                for r in filtered:
                    # Try to get category from exhibit data
                    ex_id = r["id"]
                    ex_data = next((ex for ex in req.exhibits if ex.id == ex_id), None)
                    if ex_data:
                        category = ex_data.category or ""
                        if category and category in seen_categories and len(final_results) < req.topK * 0.8:
                            # Small penalty for duplicate category (only in top 80%)
                            r["final_score"] *= 0.98  # Very small penalty
                        seen_categories.add(category)
                    final_results.append(r)
                filtered = final_results
            
            # Final sort - ensure taramandal is first if astronomy interest
            filtered.sort(key=lambda x: x.get("final_score", 0), reverse=True)
            
            # CRITICAL: Double-check - if astronomy interest and taramandal exists, ensure it's FIRST
            if has_astronomy_interest:
                taramandal_idx = None
                for i, r in enumerate(filtered):
                    if r.get("is_taramandal", False) or "taramandal" in str(r.get("id", "")).lower():
                        taramandal_idx = i
                        break
                    # Also check by name if we have exhibit data
                    ex_id = r.get("id", "")
                    ex_data = next((ex for ex in req.exhibits if ex.id == ex_id), None)
                    if ex_data:
                        ex_name = ex_data.model_dump().get("name", "").lower()
                        if "taramandal" in ex_name:
                            taramandal_idx = i
                            break
                
                if taramandal_idx is not None and taramandal_idx > 0:
                    # Move taramandal to first position - ABSOLUTE PRIORITY
                    print(f"DEBUG: Moving Taramandal from position {taramandal_idx + 1} to position 1")
                    taramandal = filtered.pop(taramandal_idx)
                    filtered.insert(0, taramandal)
                    # Set maximum score to ensure it stays first
                    taramandal["final_score"] = 10000.0
                elif taramandal_idx is None:
                    print(f"DEBUG: WARNING - Astronomy interest present but Taramandal not found in filtered results")
                else:
                    print(f"DEBUG: Taramandal already at position 1 (correct)")
        else:
            filtered = scored
        
        # Return top-K, using final_score if available, otherwise score
        results = []
        for r in filtered[:max(1, req.topK)]:
            score_to_use = r.get("final_score", r.get("score", 0))
            results.append({"id": r["id"], "score": score_to_use})
        
        print(f"DEBUG: Returning {len(results)} results (requested topK={req.topK})")
        if results:
            print(f"DEBUG: Top result: id={results[0]['id']}, score={results[0]['score']:.6f}")
        
        return {"success": True, "results": results}
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        print(f"ERROR in rank endpoint: {error_msg}")
        return {"success": False, "error": error_msg, "results": []}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("RANKER_PORT", "8012"))
    uvicorn.run(app, host="0.0.0.0", port=port)


