import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { gemmaHealth, gemmaRecommend, buildGemmaQuery } from '../services/gemmaClient';

const router = Router();
const prisma = new PrismaClient();

// Temporary file path for recommended exhibits
// CRITICAL: Use writable directory (AppData in production, local temp in dev)
const getTempPath = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const os = require('os');
    const appDataPath = process.env.APPDATA || os.homedir();
    return path.join(appDataPath, 'UCOST Discovery Hub', 'temp', 'recommended_exhibits.json');
  } else {
    return path.join(__dirname, '../../temp', 'recommended_exhibits.json');
  }
};
const TEMP_RECOMMENDATIONS_FILE = getTempPath();

// Optional offline embeddings (if present)
type EmbeddedExhibit = {
  id: string;
  vector: number[];
  category?: string;
};
const EMBEDDINGS_PATH = path.resolve(__dirname, '../../../../data/exhibit_embeddings.json');
let EMBEDDINGS: EmbeddedExhibit[] | null = null;
let VECTOR_DIM = 0;

function tryLoadEmbeddings() {
  try {
    if (fs.existsSync(EMBEDDINGS_PATH)) {
      const raw = fs.readFileSync(EMBEDDINGS_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0].vector)) {
        EMBEDDINGS = data as EmbeddedExhibit[];
        VECTOR_DIM = (EMBEDDINGS[0].vector || []).length;
        console.log(`Embeddings loaded: ${EMBEDDINGS.length} vectors (dim=${VECTOR_DIM})`);
      }
    }
  } catch (e) {
    console.warn('Could not load embeddings:', (e as Error).message);
    EMBEDDINGS = null;
  }
}

tryLoadEmbeddings();

// Lightweight per-IP rate limiting for recommend endpoint
const RECOMMEND_WINDOW_MS = Number(process.env.RECOMMEND_RATE_WINDOW_MS || 60_000);
const RECOMMEND_MAX_REQUESTS = Number(process.env.RECOMMEND_RATE_MAX || 30);
const recommendRateBucket = new Map<string, { count: number; resetAt: number }>();

function rateLimitRecommend(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = recommendRateBucket.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    recommendRateBucket.set(ip, { count: 1, resetAt: now + RECOMMEND_WINDOW_MS });
    return next();
  }
  if (bucket.count >= RECOMMEND_MAX_REQUESTS) {
    const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.', retryAfter });
  }
  bucket.count += 1;
  return next();
}

// Basic payload validation for recommend route
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === 'string');
}

function validateRecommendPayload(req: Request, res: Response, next: NextFunction) {
  const body = req.body || {};
  const selectedFloor = String(body.selectedFloor || '').toLowerCase();
  const allowedFloors = new Set(['outside', 'ground', 'first', 'all']);
  if (!allowedFloors.has(selectedFloor)) {
    return res.status(400).json({ success: false, message: 'selectedFloor must be one of outside|ground|first|all' });
  }
  if (body.globalTimeBudget != null && typeof body.globalTimeBudget !== 'boolean') {
    return res.status(400).json({ success: false, message: 'globalTimeBudget must be a boolean' });
  }
  const userProfile = body.userProfile || {};
  if (userProfile && typeof userProfile !== 'object') {
    return res.status(400).json({ success: false, message: 'userProfile must be an object' });
  }
  if (userProfile.interests != null && !isStringArray(userProfile.interests)) {
    return res.status(400).json({ success: false, message: 'userProfile.interests must be an array of strings' });
  }
  if (userProfile.groupType != null && typeof userProfile.groupType !== 'string') {
    return res.status(400).json({ success: false, message: 'userProfile.groupType must be a string' });
  }
  if (userProfile.ageBand != null && typeof userProfile.ageBand !== 'string') {
    return res.status(400).json({ success: false, message: 'userProfile.ageBand must be a string' });
  }
  if (userProfile.groupSize != null && !Number.isFinite(Number(userProfile.groupSize))) {
    return res.status(400).json({ success: false, message: 'userProfile.groupSize must be a number' });
  }
  next();
}

// Normalize time budget input to minutes
function normalizeTimeBudget(timeInput: string | number): number {
  if (typeof timeInput === 'number') return timeInput;
  const input = String(timeInput || '').toLowerCase().trim();

  // Support option IDs from frontend (ProfileStep4)
  if (input === 'quick') return 20;      // 15-20 minutes → 20
  if (input === 'medium') return 60;     // 30-60 minutes → 60
  if (input === 'long') return 120;      // 1-2 hours → 120
  if (input === 'full') return 180;      // Half-day or more → 180

  // Support human-readable labels
  if (input.includes('1-2') || input.includes('1 to 2') || input.includes('1-2 hour')) return 120; // 2 hours (120 min)
  if (input.includes('15-20') || input.includes('15 to 20') || input.includes('15-20 min')) return 20; // 20 minutes
  if (input.includes('15-30') || input.includes('15 to 30') || input.includes('15-30 min')) return 30; // 30 minutes
  if (input.includes('30-60') || input.includes('30 to 60') || input.includes('30-60 min')) return 60; // 60 minutes
  if (input.includes('half') || input.includes('half day')) return 180; // 3 hours (180 min)

  // Fallback: try to parse number, else default 60
  return Number(timeInput) || 60;
}

// Simple keyword utility
function textIncludes(text: string | null | undefined, term: string): boolean {
  return (text || '').toLowerCase().includes(term.toLowerCase());
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Map common interest keywords to high-level categories
const INTEREST_TO_CATEGORY: Record<string, string[]> = {
  space: ['space-and-astronomy'],
  astronomy: ['space-and-astronomy'],
  planets: ['space-and-astronomy'],
  stars: ['space-and-astronomy'],
  geology: ['earth-science', 'geology'],
  earth: ['earth-science', 'geology'],
  fossils: ['earth-science', 'geology'],
  robotics: ['technology', 'robotics'],
  robot: ['technology', 'robotics'],
  ai: ['technology', 'robotics'],
  'artificial intelligence': ['technology', 'robotics'],
  technology: ['technology', 'physics'],
  physics: ['physics'],
  chemistry: ['chemistry'],
  biology: ['biology'],
  environment: ['environment'],
};

// Interest domain mapping - shared helper
const INTEREST_DOMAINS_SHARED: Record<string, string[]> = {
  'physics': ['physics', 'mechanics', 'electromagnetism', 'optics', 'quantum', 'energy', 'force', 'motion', 'wave', 'light', 'sound'],
  'robotics': ['robot', 'robotics', 'automation', 'ai', 'artificial intelligence', 'machine learning', 'ml', 'technology', 'electronics', 'coding', 'programming'],
  'biology': ['biology', 'life', 'cell', 'organism', 'evolution', 'genetics', 'ecosystem', 'species'],
  'chemistry': ['chemistry', 'molecule', 'atom', 'reaction', 'compound', 'element', 'periodic'],
  'astronomy': ['space', 'astronomy', 'planet', 'star', 'galaxy', 'universe', 'cosmos', 'solar', 'moon', 'telescope'],
  'geology': ['geology', 'rock', 'strata', 'mountain', 'earth', 'dinosaur', 'paleontology', 'fossil', 'cave', 'mineral'],
  'environment': ['environment', 'nature', 'climate', 'ecosystem', 'conservation', 'sustainability', 'wildlife', 'forest', 'ocean'],
  'technology': ['technology', 'engineering', 'innovation', 'computing', 'digital', 'electronic', 'device', 'computer']
};

// Helper to get interest keywords (used in buildUserVector)
function getInterestKeywordsShared(interest: string): string[] {
  const interestLower = interest.toLowerCase().trim();
  const keywords: Set<string> = new Set([interestLower]);

  // Add domain-specific related terms
  for (const [domain, terms] of Object.entries(INTEREST_DOMAINS_SHARED)) {
    if (terms.some(t => interestLower.includes(t) || t.includes(interestLower))) {
      terms.forEach(t => keywords.add(t));
    }
  }

  return Array.from(keywords);
}

function buildUserVector(interests: string[], ageBand?: string, groupType?: string): number[] | null {
  if (!EMBEDDINGS || EMBEDDINGS.length === 0 || VECTOR_DIM === 0) return null;
  if (!interests || interests.length === 0) return null;

  // Build comprehensive user query from all interests, age, and group type
  const queryParts: string[] = [];

  // Add all interests with domain expansion
  for (const interest of interests) {
    const keywords = getInterestKeywordsShared(interest);
    queryParts.push(...keywords);
  }

  // Add age group context
  if (ageBand) {
    queryParts.push(ageBand);
  }

  // Add group type context
  if (groupType) {
    queryParts.push(groupType);
  }

  const queryText = queryParts.join(' ').toLowerCase();

  // Find exhibits that match user interests
  const cats = new Set<string>();
  for (const raw of interests || []) {
    const key = String(raw || '').toLowerCase();
    (INTEREST_TO_CATEGORY[key] || []).forEach(c => cats.add(c));
  }

  // Filter embeddings by matched categories
  const matchedEmbeddings = EMBEDDINGS.filter(e => {
    if (cats.size === 0) return true;
    if (!e.category) return false;
    const exCat = String(e.category).toLowerCase();
    return Array.from(cats).some(cat => exCat.includes(cat.toLowerCase()));
  });

  const pool = matchedEmbeddings.length > 0 ? matchedEmbeddings : EMBEDDINGS;

  // Build weighted average vector (weight by relevance to interests)
  const vec = new Array(VECTOR_DIM).fill(0);
  let totalWeight = 0;

  for (const e of pool) {
    const v = e.vector || [];
    if (!v.length) continue;

    // Calculate weight based on how well exhibit matches user interests
    let weight = 1.0;
    const exText = [
      e.category || '',
      (e as any).averageTime ? '' : ''
    ].join(' ').toLowerCase();

    // Higher weight if exhibit text contains user interest keywords
    let matchCount = 0;
    for (const keyword of queryParts) {
      if (exText.includes(keyword.toLowerCase())) {
        matchCount++;
        weight += 0.5;
      }
    }

    // Weight by match count
    weight += matchCount * 0.3;

    for (let i = 0; i < VECTOR_DIM && i < v.length; i++) {
      vec[i] += Number(v[i] || 0) * weight;
    }
    totalWeight += weight;
  }

  // Normalize
  if (totalWeight > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vec[i] /= totalWeight;
    }
  } else {
    // Fallback: simple average
    const count = pool.length || 1;
    for (let i = 0; i < VECTOR_DIM; i++) {
      vec[i] /= count;
    }
  }

  return vec;
}

function envNum(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// POST /api/tours/recommend - AI server-side recommendations
router.post('/recommend', rateLimitRecommend, validateRecommendPayload, async (req, res) => {
  try {
    const {
      userProfile, // { ageBand, groupType, groupSize, interests: string[], timeBudget, mobility, crowdTolerance, interactivity, accessibility, noiseTolerance }
      selectedFloor, // 'outside' | 'ground' | 'first' | 'all' for global recommendations
      globalTimeBudget // if true, return recommendations across all floors within total budget
    } = req.body || {};

    if (!selectedFloor) {
      return res.status(400).json({ success: false, message: 'selectedFloor is required' });
    }

    const interests: string[] = Array.isArray(userProfile?.interests) ? userProfile.interests : [];
    const ageBand: string = (userProfile?.ageBand || '').toLowerCase();
    const groupType: string = (userProfile?.groupType || '').toLowerCase();
    const groupSize: number = Number(userProfile?.groupSize || 1);
    const timeBudget: number = normalizeTimeBudget(userProfile?.timeBudget || 60);
    console.log(`Time budget input: ${userProfile?.timeBudget}, normalized to: ${timeBudget} minutes`);
    const mobility: string = (userProfile?.mobility || '').toLowerCase(); // e.g., 'wheelchair', 'none'
    const crowdTolerance: string = (userProfile?.crowdTolerance || '').toLowerCase(); // 'low'|'medium'|'high'
    const interactivityPref: string = (userProfile?.interactivity || '').toLowerCase();
    const accessibilityPref: string = (userProfile?.accessibility || '').toLowerCase();
    const noiseTolerance: string = (userProfile?.noiseTolerance || '').toLowerCase();

    const all = await prisma.exhibit.findMany({ where: { isActive: true } });

    // Transform DB exhibits to runtime objects
    let exhibits = all.map((e: any) => ({
      id: e.id,
      name: e.name,
      description: e.description || '',
      category: e.category || '',
      averageTime: e.averageTime || 0,
      rating: e.rating || 0,
      mapLocation: e.coordinates ? JSON.parse(e.coordinates) : null,
      exhibitType: e.exhibitType || '',
      ageRange: e.ageRange || '',
      difficulty: e.difficulty || '',
      interactiveFeatures: (e as any).interactiveFeatures ? JSON.parse((e as any).interactiveFeatures) : [],
      images: e.images ? (() => {
        try {
          const parsed = JSON.parse(e.images);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })() : [],
    }));

    // Hard filters (floor unless global, accessibility, rough time upper bound if extremely over budget)
    exhibits = exhibits.filter((ex: any) => {
      if (!(globalTimeBudget || selectedFloor === 'all')) {
        if (!ex.mapLocation || ex.mapLocation.floor !== selectedFloor) return false;
      }
      if (accessibilityPref.includes('wheelchair')) {
        // If we had explicit accessibility flags in DB, enforce here; keep as soft for now
      }
      const t = Number(ex.averageTime || 5);
      if (t > timeBudget * 3) return false; // drop extreme outliers
      return true;
    });

    // ============================================================================
    // ENHANCED PRECISE RECOMMENDATION ENGINE
    // ============================================================================

    // Interest domain mapping - connects related interests (use shared version)
    const INTEREST_DOMAINS: Record<string, string[]> = INTEREST_DOMAINS_SHARED;

    // Age group mapping for strict filtering
    const AGE_GROUPS: Record<string, { min: number; max: number }> = {
      'kids': { min: 3, max: 12 },
      'children': { min: 3, max: 12 },
      'child': { min: 3, max: 12 },
      'teens': { min: 13, max: 18 },
      'teenagers': { min: 13, max: 18 },
      'adults': { min: 19, max: 64 },
      'adult': { min: 19, max: 64 },
      'seniors': { min: 65, max: 100 },
      'senior': { min: 65, max: 100 }
    };

    // Get all related keywords for an interest (use shared helper)
    function getInterestKeywords(interest: string): string[] {
      return getInterestKeywordsShared(interest);
    }

    // Extract all topics from exhibit text (comprehensive analysis)
    function extractAllTopics(ex: any): string[] {
      const texts = [
        ex.name || '',
        ex.description || '',
        ex.category || '',
        ex.exhibitType || '',
        (ex.interactiveFeatures || []).join(' ')
      ].filter(t => t);

      const combined = texts.join(' ').toLowerCase();
      const topics: Set<string> = new Set();

      // Extract all domain keywords
      Object.values(INTEREST_DOMAINS).flat().forEach(keyword => {
        if (combined.includes(keyword)) {
          topics.add(keyword);
        }
      });

      return Array.from(topics);
    }

    // Check if exhibit STRICTLY matches user interests
    function matchesUserInterests(ex: any, userInterests: string[]): { matches: boolean; matchScore: number; matchedInterests: string[] } {
      if (!userInterests || userInterests.length === 0) {
        return { matches: true, matchScore: 0.5, matchedInterests: [] };
      }

      const exhibitTopics = extractAllTopics(ex);
      const matchedInterests: string[] = [];
      let totalMatchScore = 0;

      for (const interest of userInterests) {
        const interestKeywords = getInterestKeywords(interest);
        let interestMatched = false;
        let bestMatchScore = 0;

        for (const keyword of interestKeywords) {
          const keywordLower = keyword.toLowerCase();

          // Check in exhibit name (strong match)
          if (textIncludes(ex.name, keywordLower)) {
            interestMatched = true;
            bestMatchScore = Math.max(bestMatchScore, 1.0);
          }

          // Check in description (strong match)
          if (textIncludes(ex.description, keywordLower)) {
            interestMatched = true;
            bestMatchScore = Math.max(bestMatchScore, 0.9);
          }

          // Check in category (moderate match)
          if (textIncludes(ex.category, keywordLower)) {
            interestMatched = true;
            bestMatchScore = Math.max(bestMatchScore, 0.7);
          }

          // Check in topics extracted (moderate match)
          if (exhibitTopics.some(t => t.includes(keywordLower) || keywordLower.includes(t))) {
            interestMatched = true;
            bestMatchScore = Math.max(bestMatchScore, 0.6);
          }

          // Check in interactive features
          const features = Array.isArray(ex.interactiveFeatures) ? ex.interactiveFeatures : [];
          if (features.some((f: string) => textIncludes(String(f), keywordLower))) {
            interestMatched = true;
            bestMatchScore = Math.max(bestMatchScore, 0.5);
          }
        }

        if (interestMatched) {
          matchedInterests.push(interest);
          totalMatchScore += bestMatchScore;
        }
      }

      const matchScore = totalMatchScore / userInterests.length;
      // STRICT: At least ONE interest must match clearly (score > 0.4)
      const matches = matchedInterests.length > 0 && matchScore >= 0.4;

      return { matches, matchScore, matchedInterests };
    }

    // Check age appropriateness strictly
    function isAgeAppropriate(ex: any, userAgeBand: string): boolean {
      if (!userAgeBand) return true;

      const userAgeGroup = AGE_GROUPS[userAgeBand.toLowerCase()];
      if (!userAgeGroup) return true;

      const exAgeRange = ex.ageRange || '';
      if (!exAgeRange) return true; // No age restriction = suitable for all

      const exAgeLower = exAgeRange.toLowerCase();

      // Check explicit age matches
      if (userAgeBand.includes('child') || userAgeBand.includes('kid')) {
        return exAgeLower.includes('child') || exAgeLower.includes('kid') ||
          exAgeLower.includes('family') || exAgeLower.includes('all');
      }
      if (userAgeBand.includes('teen')) {
        return exAgeLower.includes('teen') || exAgeLower.includes('adult') ||
          exAgeLower.includes('all');
      }
      if (userAgeBand.includes('adult') && !userAgeBand.includes('senior')) {
        return !exAgeLower.includes('child') || exAgeLower.includes('all');
      }
      if (userAgeBand.includes('senior')) {
        return !exAgeLower.includes('child') || exAgeLower.includes('all');
      }

      return true; // Default allow if unclear
    }

    // Check group type compatibility
    function isGroupTypeCompatible(ex: any, userGroupType: string): boolean {
      if (!userGroupType) return true;

      const groupLower = userGroupType.toLowerCase();
      const exType = (ex.exhibitType || '').toLowerCase();
      const exDesc = (ex.description || '').toLowerCase();

      // Family groups need safe, accessible exhibits
      if (groupLower.includes('family')) {
        if (exDesc.includes('dangerous') || exDesc.includes('hazard')) return false;
        return true; // Most exhibits are family-friendly if not explicitly dangerous
      }

      // Research groups prefer educational exhibits
      if (groupLower.includes('research') || groupLower.includes('student')) {
        return exDesc.includes('educational') || exDesc.includes('learning') ||
          exDesc.includes('research') || exType.includes('interactive') ||
          true; // Allow most exhibits for research
      }

      return true; // Default allow
    }

    function interactivity(cat: string, desc: string): 'interactive' | 'hands-on' | 'passive' | 'unknown' {
      if (cat.includes('hands') || desc.includes('hands-on')) return 'hands-on';
      if (cat.includes('interactive') || desc.includes('interactive')) return 'interactive';
      if (cat.includes('passive') || desc.includes('observational')) return 'passive';
      return 'unknown';
    }

    function noiseLevel(intx: string): 'low' | 'medium' | 'high' {
      if (intx === 'hands-on' || intx === 'interactive') return 'medium';
      return 'low';
    }

    // Check if interests include astronomy/space-related terms
    const hasAstronomyInterest = interests.some((interest: string) => {
      const interestLower = interest.toLowerCase();
      return ['stars', 'star', 'astronomy', 'space', 'planets', 'planet', 'taramandal'].some(
        kw => interestLower.includes(kw)
      );
    });

    // ENHANCED PRECISE SCORING FUNCTION
    function score(ex: any) {
      const name = (ex.name || '').toLowerCase();
      const desc = (ex.description || '').toLowerCase();
      const cat = (ex.category || '').toLowerCase();
      const intx = interactivity(cat, desc);
      const noise = noiseLevel(intx);

      // CRITICAL: Taramandal priority - if astronomy interest exists, give maximum score
      const isTaramandal = name.includes('taramandal') ||
        cat.includes('taramandal') ||
        ex.id === 'cmf97ohja0003snwdwzd9jhb7';

      if (isTaramandal && hasAstronomyInterest) {
        // Maximum priority for Taramandal when astronomy interests are present
        return {
          score: 10000.0,
          reasons: ['Taramandal - Maximum priority for astronomy interests'],
          topics: ['astronomy', 'space', 'stars', 'planets'],
          interestMatch: {
            matches: true, matchScore: 1.0, matchedInterests: interests.filter((i: string) =>
              ['astronomy', 'space', 'stars', 'planets'].some(kw => i.toLowerCase().includes(kw))
            )
          }
        };
      }

      const reasons: string[] = [];
      let s = 0; // Start from 0, strict filtering

      // ========== STRICT FILTERS (Must Pass) ==========

      // CRITICAL: Taramandal bypasses strict interest matching if astronomy interest exists
      const isTaramandalForFilter = name.includes('taramandal') ||
        cat.includes('taramandal') ||
        ex.id === 'cmf97ohja0003snwdwzd9jhb7';

      // 1. STRICT INTEREST MATCHING - Exhibit MUST match at least ONE interest
      // EXCEPTION: Taramandal always passes if astronomy interest exists
      const interestMatch = matchesUserInterests(ex, interests);
      if (!interestMatch.matches && !(isTaramandalForFilter && hasAstronomyInterest)) {
        return { score: -1000, reasons: ['Does not match any user interests'], topics: [] }; // Reject
      }

      // 2. STRICT AGE FILTERING
      if (!isAgeAppropriate(ex, ageBand)) {
        return { score: -500, reasons: [`Not age-appropriate for ${ageBand}`], topics: [] }; // Reject
      }

      // 3. STRICT GROUP TYPE COMPATIBILITY
      if (!isGroupTypeCompatible(ex, groupType)) {
        return { score: -300, reasons: [`Not suitable for ${groupType} groups`], topics: [] }; // Reject
      }

      // ========== SCORING (Only for passing exhibits) ==========

      // Base score for passing filters
      s += 50;
      reasons.push('Passes all filters');

      // Interest matching score (40% weight)
      s += interestMatch.matchScore * 100 * 0.4;
      if (interestMatch.matchedInterests.length > 0) {
        reasons.push(`Strong match for: ${interestMatch.matchedInterests.join(', ')}`);
      }

      // Age appropriateness bonus (15% weight)
      if (isAgeAppropriate(ex, ageBand)) {
        const ageScore = 1.0; // Perfect match if passed filter
        s += ageScore * 100 * 0.15;
        reasons.push(`Perfect for ${ageBand}`);
      }

      // Group type bonus (10% weight)
      const isFamily = groupType.includes('family') || ageBand.includes('child');
      if (isFamily && (intx === 'hands-on' || intx === 'interactive')) {
        s += 15;
        reasons.push('Family-friendly interactive exhibit');
      }

      const isTech = groupType.includes('student') || groupType.includes('tech') ||
        interests.some(i => ['robotics', 'ai', 'technology', 'coding', 'programming'].includes((i || '').toLowerCase()));
      if (isTech && interestMatch.matchedInterests.some(i =>
        ['robotics', 'ai', 'technology', 'coding', 'programming'].includes((i || '').toLowerCase()))) {
        s += 20;
        reasons.push('Perfect for tech interests');
      }

      // Interactivity preference match (10% weight)
      if (interactivityPref && intx === interactivityPref) {
        s += 12;
        reasons.push(`Matches preferred interactivity: ${interactivityPref}`);
      }

      // Time fit (15% weight)
      const avgTime = Number(ex.averageTime || 5);
      const timePerExhibit = timeBudget / Math.max(1, groupSize);
      if (avgTime <= timePerExhibit) {
        s += 15;
        reasons.push('Fits time budget');
      } else if (avgTime <= timePerExhibit * 1.5) {
        s += 8;
        reasons.push('Reasonable time requirement');
      }

      // Accessibility (5% weight)
      if (mobility.includes('wheelchair')) {
        // Check if exhibit has accessibility features
        const hasAccessibility = desc.includes('accessible') || desc.includes('wheelchair') ||
          (ex.accessibility && ex.accessibility.toLowerCase().includes('wheelchair'));
        if (hasAccessibility) {
          s += 8;
          reasons.push('Wheelchair accessible');
        }
      }

      // Noise tolerance (5% weight)
      if (noiseTolerance === 'low' && noise === 'low') {
        s += 8;
        reasons.push('Quiet experience');
      }

      // Quality signals (5% weight)
      const rating = Number(ex.rating || 0);
      s += Math.min(10, rating);
      if (rating > 4) {
        reasons.push(`Highly rated (${rating.toFixed(1)})`);
      }

      // Floor bonus (small)
      if (ex.mapLocation?.floor === selectedFloor || selectedFloor === 'all') {
        s += 5;
        if (!reasons.some(r => r.includes('floor'))) {
          reasons.push('On selected floor');
        }
      }

      return { score: s, reasons, topics: extractAllTopics(ex), interestMatch };
    }

    // If embeddings are available, blend semantic similarity into the score
    let scored: any[];
    let userVec = buildUserVector(interests, ageBand, groupType);

    // Parallel: try Gemma if enabled
    let gemmaItems: Array<{ id: string | number; score: number }> = [];
    try {
      const gh = await gemmaHealth();
      if (gh && gh.indexed) {
        const query = buildGemmaQuery({ ageBand, groupType, interests, timeBudget, interactivity: interactivityPref, accessibility: accessibilityPref, noiseTolerance }, globalTimeBudget || selectedFloor === 'all' ? undefined : selectedFloor);
        gemmaItems = await gemmaRecommend(query, 50);
      }
    } catch { }

    const SIM_WEIGHT = envNum('SIM_WEIGHT', 0.45);
    const RULE_WEIGHT = envNum('RULE_WEIGHT', 0.35);
    const GEMMA_WEIGHT = envNum('GEMMA_WEIGHT', 0.2);

    if (userVec && Array.isArray(userVec) && VECTOR_DIM > 0) {
      const weights = { sim: SIM_WEIGHT, rule: RULE_WEIGHT, gemma: GEMMA_WEIGHT };
      scored = exhibits.map((ex: any) => {
        const rule = score(ex);

        // Skip exhibits that failed strict filters (negative scores)
        if (rule.score < 0) {
          return null;
        }

        const emb = (EMBEDDINGS || []).find(e => e.id === ex.id);
        const sim = emb ? cosine(userVec as number[], emb.vector || []) : 0;
        const gem = gemmaItems.find(g => String(g.id) === String(ex.id));
        const gemScore = gem ? Math.max(0, Number(gem.score || 0)) * 100 : 0;
        const blended = weights.rule * rule.score + weights.sim * Math.max(0, sim * 100) + weights.gemma * gemScore;
        const reasons = [...(rule.reasons || []), `Semantic sim: ${sim.toFixed(2)}`];
        if (gem) reasons.push('Gemma match');
        return { ...ex, reasons, score: blended };
      }).filter((ex: any) => ex !== null && ex.score > 0)
        .sort((a: any, b: any) => b.score - a.score);
    } else {
      const RULE_ONLY = envNum('RULE_ONLY_WEIGHT', 0.7);
      const GEMMA_ONLY = envNum('GEMMA_ONLY_WEIGHT', 0.3);
      const weights = { rule: RULE_ONLY, gemma: GEMMA_ONLY };
      scored = exhibits.map((ex: any) => {
        const rule = score(ex);

        // Skip exhibits that failed strict filters (negative scores)
        if (rule.score < 0) {
          return null;
        }

        const gem = gemmaItems.find(g => String(g.id) === String(ex.id));
        const gemScore = gem ? Math.max(0, Number(gem.score || 0)) * 100 : 0;
        const blended = weights.rule * rule.score + weights.gemma * gemScore;
        const reasons = [...(rule.reasons || [])];
        if (gem) reasons.push('Gemma match');
        return { ...ex, reasons, score: blended };
      })
        .filter((ex: any) => ex !== null && ex.score > 0)
        .sort((a: any, b: any) => b.score - a.score);
    }

    // CRITICAL: Ensure Taramandal is first if astronomy interest exists
    if (hasAstronomyInterest) {
      const taramandalIdx = scored.findIndex((ex: any) => {
        const name = (ex.name || '').toLowerCase();
        const cat = (ex.category || '').toLowerCase();
        return name.includes('taramandal') ||
          cat.includes('taramandal') ||
          ex.id === 'cmf97ohja0003snwdwzd9jhb7';
      });

      if (taramandalIdx > 0) {
        // Move Taramandal to first position
        const taramandal = scored.splice(taramandalIdx, 1)[0];
        scored.unshift(taramandal);
        console.log(`Backend: Moved Taramandal to first position (was at ${taramandalIdx + 1})`);
      } else if (taramandalIdx === 0) {
        console.log(`Backend: Taramandal already at first position`);
      } else {
        console.log(`Backend: WARNING - Astronomy interest present but Taramandal not found in scored results`);
      }
    }

    // Greedy selection under time budget
    let timeUsed = 0;
    const selected: any[] = [];
    for (const ex of scored) {
      const t = Number(ex.averageTime || 5);
      if (timeUsed + t <= timeBudget) {
        selected.push(ex);
        timeUsed += t;
      }
    }

    console.log(`Backend: Returning ${selected.length} recommended exhibits for floor ${selectedFloor}`);
    console.log(`Total time used: ${timeUsed} minutes out of ${timeBudget} minutes budget`);
    console.log('Selected exhibits:', selected.map(e => ({ id: e.id, name: e.name, floor: e.mapLocation?.floor, time: e.averageTime })));

    const recommendedExhibits = selected.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      category: e.category,
      averageTime: e.averageTime,
      rating: e.rating,
      mapLocation: e.mapLocation,
      images: e.images,
      exhibitType: e.exhibitType,
      ageRange: e.ageRange,
      difficulty: e.difficulty,
      interactiveFeatures: e.interactiveFeatures,
      // AI recommendation data
      reasons: e.reasons,
      score: e.score
    }));

    // Save recommended exhibits to temporary file for map access
    if (globalTimeBudget || selectedFloor === 'all') {
      try {
        // Ensure temp directory exists
        const tempDir = path.dirname(TEMP_RECOMMENDATIONS_FILE);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Save to file
        fs.writeFileSync(TEMP_RECOMMENDATIONS_FILE, JSON.stringify({
          timestamp: Date.now(),
          totalTime: timeUsed,
          timeBudget: timeBudget,
          exhibits: recommendedExhibits
        }, null, 2));

        console.log(`Backend: Saved ${recommendedExhibits.length} recommended exhibits to temp file`);
      } catch (error) {
        console.error('Backend: Error saving recommendations to file:', error);
      }
    }

    res.json({
      success: true,
      floor: selectedFloor,
      totalTime: timeUsed,
      timeBudget: timeBudget,
      globalRecommendation: globalTimeBudget || selectedFloor === 'all',
      exhibits: recommendedExhibits
    });
  } catch (error: any) {
    console.error('Recommend tour error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// GET /api/tours/recommendations/file - Read recommended exhibits from temp file
router.get('/recommendations/file', async (req, res) => {
  try {
    if (!fs.existsSync(TEMP_RECOMMENDATIONS_FILE)) {
      return res.json({
        success: false,
        message: 'No recommendations file found',
        exhibits: []
      });
    }

    const fileContent = fs.readFileSync(TEMP_RECOMMENDATIONS_FILE, 'utf8');
    const data = JSON.parse(fileContent);

    console.log(`Backend: Reading ${data.exhibits?.length || 0} recommended exhibits from temp file`);

    res.json({
      success: true,
      timestamp: data.timestamp,
      totalTime: data.totalTime,
      timeBudget: data.timeBudget,
      exhibits: data.exhibits || []
    });
  } catch (error: any) {
    console.error('Error reading recommendations file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error reading recommendations file',
      exhibits: []
    });
  }
});

// DELETE /api/tours/recommendations/file - Delete temp recommendations file
router.delete('/recommendations/file', async (req, res) => {
  try {
    if (fs.existsSync(TEMP_RECOMMENDATIONS_FILE)) {
      fs.unlinkSync(TEMP_RECOMMENDATIONS_FILE);
      console.log('Backend: Deleted temp recommendations file');
    }

    res.json({
      success: true,
      message: 'Recommendations file deleted'
    });
  } catch (error: any) {
    console.error('Error deleting recommendations file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting recommendations file'
    });
  }
});

// Create a new tour
router.post('/', async (req, res) => {
  try {
    const { name, userId, exhibitIds } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ error: 'Tour name and user ID are required' });
    }

    // Create the tour
    const tour = await prisma.tour.create({
      data: {
        name,
        userId
      }
    });

    // Add exhibits to tour if provided
    if (exhibitIds && Array.isArray(exhibitIds) && exhibitIds.length > 0) {
      const tourExhibits = exhibitIds.map((exhibitId: string, index: number) => ({
        tourId: tour.id,
        exhibitId,
        orderIndex: index
      }));

      await prisma.tourExhibit.createMany({
        data: tourExhibits.map((item: any) => ({
          tourId: item.tourId,
          exhibitId: item.exhibitId,
          order: item.orderIndex
        }))
      });
    }

    // Get the complete tour with exhibits
    const completeTour = await prisma.tour.findUnique({
      where: { id: tour.id },
      include: {
        tourExhibits: {
          include: {
            exhibit: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    res.status(201).json({
      message: 'Tour created successfully',
      tour: completeTour
    });
  } catch (error) {
    console.error('Create tour error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tour by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tour = await prisma.tour.findUnique({
      where: { id },
      include: {
        tourExhibits: {
          include: {
            exhibit: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    res.json({ tour });
  } catch (error) {
    console.error('Get tour error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tour
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, exhibitIds } = req.body;

    // Check if tour exists
    const existingTour = await prisma.tour.findUnique({
      where: { id }
    });

    if (!existingTour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Update tour name if provided
    if (name) {
      await prisma.tour.update({
        where: { id },
        data: { name }
      });
    }

    // Update tour exhibits if provided
    if (exhibitIds && Array.isArray(exhibitIds)) {
      // Remove existing exhibits
      await prisma.tourExhibit.deleteMany({
        where: { tourId: id }
      });

      // Add new exhibits
      if (exhibitIds.length > 0) {
        const tourExhibits = exhibitIds.map((exhibitId: string, index: number) => ({
          tourId: id,
          exhibitId,
          order: index
        }));

        await prisma.tourExhibit.createMany({
          data: tourExhibits
        });
      }
    }

    // Get the updated tour
    const updatedTour = await prisma.tour.findUnique({
      where: { id },
      include: {
        tourExhibits: {
          include: {
            exhibit: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    res.json({
      message: 'Tour updated successfully',
      tour: updatedTour
    });
  } catch (error) {
    console.error('Update tour error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete tour
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tour exists
    const tour = await prisma.tour.findUnique({
      where: { id }
    });

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Delete tour (cascade will delete tour exhibits)
    await prisma.tour.delete({
      where: { id }
    });

    res.json({ message: 'Tour deleted successfully' });
  } catch (error) {
    console.error('Delete tour error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add exhibit to tour
router.post('/:id/exhibits', async (req, res) => {
  try {
    const { id } = req.params;
    const { exhibitId } = req.body;

    if (!exhibitId) {
      return res.status(400).json({ error: 'Exhibit ID is required' });
    }

    // Check if tour exists
    const tour = await prisma.tour.findUnique({
      where: { id }
    });

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Get current order index
    const currentExhibits = await prisma.tourExhibit.findMany({
      where: { tourId: id },
      orderBy: { order: 'desc' },
      take: 1
    });

    const orderIndex = currentExhibits.length > 0 ? currentExhibits[0].order + 1 : 0;

    // Add exhibit to tour
    await prisma.tourExhibit.create({
      data: {
        tourId: id,
        exhibitId,
        order: orderIndex
      }
    });

    res.json({ message: 'Exhibit added to tour successfully' });
  } catch (error) {
    console.error('Add exhibit to tour error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove exhibit from tour
router.delete('/:id/exhibits/:exhibitId', async (req, res) => {
  try {
    const { id, exhibitId } = req.params;

    // Check if tour exhibit exists
    const tourExhibit = await prisma.tourExhibit.findUnique({
      where: {
        tourId_exhibitId: {
          tourId: id,
          exhibitId
        }
      }
    });

    if (!tourExhibit) {
      return res.status(404).json({ error: 'Exhibit not found in tour' });
    }

    // Remove exhibit from tour
    await prisma.tourExhibit.delete({
      where: {
        tourId_exhibitId: {
          tourId: id,
          exhibitId
        }
      }
    });

    res.json({ message: 'Exhibit removed from tour successfully' });
  } catch (error) {
    console.error('Remove exhibit from tour error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tours/recommend/report - Detailed per-exhibit report for a floor
router.get('/recommend/report', async (req, res) => {
  try {
    const selectedFloor = String(req.query.floor || '').toLowerCase() as 'outside' | 'ground' | 'first';
    if (!selectedFloor) {
      return res.status(400).json({ success: false, message: 'floor is required' });
    }

    // Optional user profile via query (JSON) to mirror POST format
    const profileJson = (req.query.profile as string) || '{}';
    const userProfile = JSON.parse(profileJson);
    const interests: string[] = Array.isArray(userProfile?.interests) ? userProfile.interests : [];
    const ageBand: string = (userProfile?.ageBand || '').toLowerCase();
    const groupType: string = (userProfile?.groupType || '').toLowerCase();
    const groupSize: number = Number(userProfile?.groupSize || 1);
    const timeBudget: number = normalizeTimeBudget(userProfile?.timeBudget || 60);
    const mobility: string = (userProfile?.mobility || '').toLowerCase();
    const crowdTolerance: string = (userProfile?.crowdTolerance || '').toLowerCase();

    const all = await prisma.exhibit.findMany({ where: { isActive: true } });
    const exhibits = all.map((e: any) => ({
      id: e.id,
      name: e.name,
      description: e.description || '',
      category: e.category || '',
      averageTime: e.averageTime || 0,
      rating: e.rating || 0,
      mapLocation: e.coordinates ? JSON.parse(e.coordinates) : null,
      exhibitType: e.exhibitType || '',
      ageRange: e.ageRange || '',
      difficulty: e.difficulty || '',
      interactiveFeatures: (e as any).interactiveFeatures ? JSON.parse((e as any).interactiveFeatures) : [],
    }))
      .filter((ex: any) => ex.mapLocation && ex.mapLocation.floor === selectedFloor);

    function extractTopics(texts: string[]): string[] {
      const text = texts.join(' ').toLowerCase();
      const keywords = [
        'geology', 'rock', 'strata', 'mountain', 'earth', 'dinosaur', 'paleontology', 'cave', 'amarnath',
        'robot', 'robotics', 'automation', 'ai', 'artificial intelligence', 'machine learning', 'ml', 'technology', 'electronics', 'coding', 'programming',
        'physics', 'space', 'astronomy', 'planet', 'environment', 'nature', 'biology', 'chemistry', 'history'
      ];
      return keywords.filter(k => text.includes(k));
    }
    function interactivity(cat: string, desc: string): 'interactive' | 'hands-on' | 'passive' | 'unknown' {
      if (cat.includes('hands') || desc.includes('hands-on')) return 'hands-on';
      if (cat.includes('interactive') || desc.includes('interactive')) return 'interactive';
      if (cat.includes('passive') || desc.includes('observational')) return 'passive';
      return 'unknown';
    }
    function familyFriendliness(intx: string, desc: string): 'low' | 'medium' | 'high' {
      if (desc.includes('safety') || desc.includes('safe')) return 'high';
      if (intx === 'hands-on') return 'high';
      if (intx === 'interactive') return 'medium';
      return 'medium';
    }
    function noiseLevel(intx: string): 'low' | 'medium' | 'high' {
      if (intx === 'hands-on' || intx === 'interactive') return 'medium';
      return 'low';
    }

    const isFamily = groupType.includes('family') || ageBand.includes('child');
    const isResearch = groupType.includes('research');
    const isTech = groupType.includes('student') || groupType.includes('tech') || interests.some((i: string) => ['robotics', 'ai', 'technology', 'coding', 'programming', 'electronics', 'automation', 'ml', 'machine learning'].includes((i || '').toLowerCase()));

    const detailed = exhibits.map((ex: any) => {
      const name = (ex.name || '').toLowerCase();
      const desc = (ex.description || '').toLowerCase();
      const cat = (ex.category || '').toLowerCase();
      const topics = extractTopics([name, desc, cat]);
      const intx = interactivity(cat, desc);
      const fam = familyFriendliness(intx, desc);
      const noise = noiseLevel(intx);

      const reasons: string[] = ['On current floor'];
      let score = 40;
      if (isFamily) {
        if (intx === 'hands-on') { score += 20; reasons.push('Hands-on for families'); }
        if (intx === 'interactive') { score += 12; reasons.push('Interactive for families'); }
        if (fam === 'high') { score += 6; reasons.push('Family-friendly'); }
      }
      if (isResearch) {
        if (topics.includes('geology') || topics.includes('earth') || topics.includes('physics') || topics.includes('technology')) {
          score += 18; reasons.push('Research topic');
        }
        if ((ex.averageTime || 0) >= 5) { score += 5; reasons.push('Deeper content'); }
      }
      if (isTech) {
        if (topics.some((t: string) => ['robot', 'robotics', 'automation', 'ai', 'artificial intelligence', 'machine learning', 'ml', 'technology', 'electronics', 'coding', 'programming'].includes(t))) {
          score += 28; reasons.push('Technology/Robotics focus');
        }
        if (topics.some((t: string) => ['dinosaur', 'paleontology', 'cave', 'amarnath', 'nature', 'environment'].includes(t))) {
          score -= 24; reasons.push('Not relevant to robotics/AI');
        }
        if (topics.includes('geology') && !interests.includes('geology')) {
          score -= 12; reasons.push('Geology not in interests');
        }
      }
      for (const interest of interests) {
        if (textIncludes(name, interest) || textIncludes(desc, interest) || textIncludes(cat, interest)) {
          score += 6; reasons.push(`Matches interest: ${interest}`);
        }
      }
      const avgTime = Number(ex.averageTime || 5);
      if (avgTime <= Math.max(5, timeBudget / Math.max(1, groupSize))) {
        score += 8; reasons.push('Fits time budget');
      }
      if (mobility.includes('wheelchair')) { score += 4; reasons.push('Accessibility assumed'); }
      if (crowdTolerance === 'low' && noise === 'low') { score += 4; reasons.push('Quiet experience'); }
      score += Math.min(10, Math.max(0, Number(ex.rating || 0)));

      return {
        id: ex.id,
        name: ex.name,
        floor: ex.mapLocation.floor,
        coordinates: { x: ex.mapLocation.x, y: ex.mapLocation.y },
        topics,
        facets: { interactivity: intx, familyFriendliness: fam, noiseLevel: noise, duration: ex.averageTime || null },
        reasons,
        score
      };
    }).sort((a: any, b: any) => b.score - a.score);

    res.json({ success: true, floor: selectedFloor, exhibits: detailed });
  } catch (error: any) {
    console.error('Recommend report error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

export default router; 