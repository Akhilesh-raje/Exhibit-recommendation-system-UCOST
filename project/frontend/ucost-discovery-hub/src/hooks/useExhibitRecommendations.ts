import { useMemo } from "react";

type FloorKey = 'outside' | 'ground' | 'first';

interface ExhibitLike {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  averageTime?: number | null;
  rating?: number | null;
  mapLocation?: { floor: FloorKey; x: number; y: number } | null;
}

interface RecommendationOptions {
  userProfile: { group: string; interests: string[] } | null;
  selectedFloor: FloorKey;
}

interface MatchBreakdown {
  audienceAlignment: number;
  interestMatch: number;
  ageSuitability: number;
  groupSizeFit: number;
  timeFit: number;
  mobilityFit: number;
  crowdFit: number;
}

interface ExhibitReport {
  exhibitId: string;
  name: string;
  floor?: FloorKey;
  coordinates?: { x: number; y: number } | null;
  facets: {
    topics: string[];
    interactivity: 'interactive' | 'hands-on' | 'passive' | 'unknown';
    familyFriendliness: 'low' | 'medium' | 'high';
    depthLevel: 'introductory' | 'intermediate' | 'advanced';
    accessibility: 'poor' | 'average' | 'good';
    noiseLevel: 'low' | 'medium' | 'high';
    duration: number | null;
  };
  match: MatchBreakdown;
  finalScore: number; // 0..1
  reasons: string[];
}

interface RecommendationResult {
  recommended: (ExhibitLike & { score: number; reasons: string[] })[];
  reports: Record<string, ExhibitReport>;
}

function contains(text: string | null | undefined, term: string): boolean {
  return (text || '').toLowerCase().includes(term.toLowerCase());
}

function extractTopics(texts: string[]): string[] {
  const text = texts.join(' ').toLowerCase();
  const keywords = ['geology','rock','strata','mountain','earth','robot','ai','technology','physics','space','astronomy','planet','environment','nature','biology','chemistry','history'];
  return keywords.filter(k => text.includes(k));
}

function normalizeInteractivity(cat: string, desc: string): 'interactive' | 'hands-on' | 'passive' | 'unknown' {
  if (cat.includes('hands') || desc.includes('hands-on')) return 'hands-on';
  if (cat.includes('interactive') || desc.includes('interactive')) return 'interactive';
  if (cat.includes('passive') || desc.includes('observational')) return 'passive';
  return 'unknown';
}

function estimateFamilyFriendliness(interactivity: string, desc: string): 'low' | 'medium' | 'high' {
  if (desc.includes('safety') || desc.includes('safe')) return 'high';
  if (interactivity === 'hands-on') return 'high';
  if (interactivity === 'interactive') return 'medium';
  return 'medium';
}

function estimateDepthLevel(desc: string, avgTime?: number | null): 'introductory' | 'intermediate' | 'advanced' {
  if ((avgTime || 0) >= 8 || desc.includes('advanced') || desc.includes('in-depth')) return 'advanced';
  if ((avgTime || 0) >= 5) return 'intermediate';
  return 'introductory';
}

function estimateAccessibility(desc: string): 'poor' | 'average' | 'good' {
  if (desc.includes('wheelchair') || desc.includes('accessible')) return 'good';
  return 'average';
}

function estimateNoiseLevel(interactivity: string): 'low' | 'medium' | 'high' {
  if (interactivity === 'hands-on' || interactivity === 'interactive') return 'medium';
  return 'low';
}

function scoreExhibit(ex: ExhibitLike, options: RecommendationOptions): { score: number; reasons: string[]; breakdown: MatchBreakdown; report: ExhibitReport } {
  const reasons: string[] = [];
  let rawScore = 0;

  const group = (options.userProfile?.group || '').toLowerCase();
  const interests = (options.userProfile?.interests || []).map(i => i.toLowerCase());
  const name = ex.name?.toLowerCase() || '';
  const desc = ex.description?.toLowerCase() || '';
  const cat = ex.category?.toLowerCase() || '';

  // Floor constraint: only current floor is eligible
  if (ex.mapLocation?.floor === options.selectedFloor) {
    rawScore += 40; reasons.push('On current floor');
  } else {
    // hard exclusion: do not recommend far-away floors in this view
    const breakdown: MatchBreakdown = { audienceAlignment: 0, interestMatch: 0, ageSuitability: 0, groupSizeFit: 0, timeFit: 0, mobilityFit: 0, crowdFit: 0 };
    const report: ExhibitReport = {
      exhibitId: ex.id,
      name: ex.name,
      floor: ex.mapLocation?.floor,
      coordinates: ex.mapLocation ? { x: ex.mapLocation.x, y: ex.mapLocation.y } : null,
      facets: {
        topics: [],
        interactivity: 'unknown',
        familyFriendliness: 'medium',
        depthLevel: 'introductory',
        accessibility: 'average',
        noiseLevel: 'low',
        duration: ex.averageTime ?? null,
      },
      match: breakdown,
      finalScore: 0,
      reasons: ['Different floor']
    };
    return { score: -Infinity, reasons: ['Different floor'], breakdown, report };
  }

  // Facet extraction
  const topics = extractTopics([name, desc, cat]);
  const interactivity = normalizeInteractivity(cat, desc);
  const familyFriendliness = estimateFamilyFriendliness(interactivity, desc);
  const depthLevel = estimateDepthLevel(desc, ex.averageTime);
  const accessibility = estimateAccessibility(desc);
  const noiseLevel = estimateNoiseLevel(interactivity);

  // Group-based scoring
  if (group.includes('family') || group.includes('children') || group.includes('kids')) {
    // Prefer interactive, engaging, safe exhibits
    if (interactivity === 'hands-on') { rawScore += 20; reasons.push('Hands-on for families'); }
    if (interactivity === 'interactive') { rawScore += 12; reasons.push('Interactive for families'); }
    if (familyFriendliness === 'high') { rawScore += 6; reasons.push('Family-friendly'); }
    if (topics.includes('environment') || topics.includes('nature')) { rawScore += 4; reasons.push('Nature themed'); }
  }

  if (group.includes('research') || group.includes('researcher') || interests.includes('geology')) {
    // Prefer geology, mountain, earth sciences, detailed descriptions
    if (topics.includes('geology') || topics.includes('earth') || topics.includes('mountain') || name.includes('rock') || desc.includes('strata')) {
      rawScore += 20; reasons.push('Geology focused');
    }
    if ((ex.averageTime || 0) >= 5) { rawScore += 5; reasons.push('Deeper content'); }
  }

  // Interest keywords boost
  for (const interest of interests) {
    if (contains(name, interest) || contains(desc, interest) || contains(cat, interest)) {
      rawScore += 6; reasons.push(`Matches interest: ${interest}`);
    }
  }

  // General quality signals
  if (typeof ex.rating === 'number') {
    rawScore += Math.min(10, Math.max(0, ex.rating)); reasons.push('High rating');
  }
  if (typeof ex.averageTime === 'number' && ex.averageTime > 0) {
    // moderate preference to longer exhibits if we're recommending a focused route
    rawScore += Math.min(10, ex.averageTime / 2); reasons.push('Good time value');
  }

  // Compute normalized breakdown (0..1) for transparency
  const breakdown: MatchBreakdown = {
    audienceAlignment: Math.min(1, (group ? 0.7 : 0.4)),
    interestMatch: Math.min(1, (interests.length > 0 ? (Math.min(1, topics.length / 3)) : 0.3)),
    ageSuitability: Math.min(1, group.includes('children') ? (familyFriendliness === 'high' ? 1 : 0.6) : 0.7),
    groupSizeFit: 0.7, // placeholder until capacity/noise data exists
    timeFit: Math.min(1, (ex.averageTime || 5) / 10),
    mobilityFit: accessibility === 'good' ? 0.9 : 0.6,
    crowdFit: noiseLevel === 'low' ? 0.9 : 0.6,
  };

  // Weighting to final 0..1 score
  const weighted =
    breakdown.interestMatch * 0.3 +
    breakdown.ageSuitability * 0.15 +
    breakdown.audienceAlignment * 0.15 +
    breakdown.groupSizeFit * 0.07 +
    breakdown.timeFit * 0.12 +
    breakdown.mobilityFit * 0.1 +
    breakdown.crowdFit * 0.11;

  const finalScore = Math.max(0, Math.min(1, weighted));

  const report: ExhibitReport = {
    exhibitId: ex.id,
    name: ex.name,
    floor: ex.mapLocation?.floor,
    coordinates: ex.mapLocation ? { x: ex.mapLocation.x, y: ex.mapLocation.y } : null,
    facets: {
      topics,
      interactivity,
      familyFriendliness,
      depthLevel,
      accessibility,
      noiseLevel,
      duration: ex.averageTime ?? null,
    },
    match: breakdown,
    finalScore,
    reasons,
  };

  return { score: rawScore, reasons, breakdown, report };
}

export function useExhibitRecommendations(exhibits: ExhibitLike[], options: RecommendationOptions): RecommendationResult {
  return useMemo(() => {
    const reports: Record<string, ExhibitReport> = {};
    const scored = (exhibits || []).map(ex => {
      const { score, reasons, report } = scoreExhibit(ex, options);
      reports[ex.id] = report;
      return { ...ex, score, reasons };
    }).filter(ex => Number.isFinite(ex.score) && (ex.score as number) > 0);

    scored.sort((a, b) => (b.score as number) - (a.score as number));
    return { recommended: scored, reports };
  }, [exhibits, options.userProfile, options.selectedFloor]);
}

export type { RecommendationResult };

