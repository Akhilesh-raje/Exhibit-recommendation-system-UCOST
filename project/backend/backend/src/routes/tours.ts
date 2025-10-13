import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { gemmaHealth, gemmaRecommend, buildGemmaQuery } from '../services/gemmaClient';

const router = Router();
const prisma = new PrismaClient();

// Temporary file path for recommended exhibits
const TEMP_RECOMMENDATIONS_FILE = path.join(__dirname, '../../temp', 'recommended_exhibits.json');

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

function buildUserVector(interests: string[]): number[] | null {
  if (!EMBEDDINGS || EMBEDDINGS.length === 0 || VECTOR_DIM === 0) return null;
  const cats = new Set<string>();
  for (const raw of interests || []) {
    const key = String(raw || '').toLowerCase();
    (INTEREST_TO_CATEGORY[key] || []).forEach(c => cats.add(c));
  }
  const pool = EMBEDDINGS.filter(e => cats.size === 0 ? true : (e.category && cats.has(e.category)));
  const src = pool.length > 0 ? pool : EMBEDDINGS;
  const vec = new Array(VECTOR_DIM).fill(0);
  for (const e of src) {
    const v = e.vector || [];
    for (let i = 0; i < VECTOR_DIM; i++) vec[i] += Number(v[i] || 0);
  }
  const count = src.length || 1;
  for (let i = 0; i < VECTOR_DIM; i++) vec[i] /= count;
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

    // Helper facet estimates (server-side mirror of frontend heuristics)
    function extractTopics(texts: string[]): string[] {
      const text = texts.join(' ').toLowerCase();
      const keywords = [
        'geology','rock','strata','mountain','earth','dinosaur','paleontology','cave','amarnath',
        'robot','robotics','automation','ai','artificial intelligence','machine learning','ml','technology','electronics','coding','programming',
        'physics','space','astronomy','planet','environment','nature','biology','chemistry','history'
      ];
      return keywords.filter(k => text.includes(k));
    }
    function interactivity(cat: string, desc: string): 'interactive'|'hands-on'|'passive'|'unknown' {
      if (cat.includes('hands') || desc.includes('hands-on')) return 'hands-on';
      if (cat.includes('interactive') || desc.includes('interactive')) return 'interactive';
      if (cat.includes('passive') || desc.includes('observational')) return 'passive';
      return 'unknown';
    }
    function familyFriendliness(intx: string, desc: string): 'low'|'medium'|'high' {
      if (desc.includes('safety') || desc.includes('safe')) return 'high';
      if (intx === 'hands-on') return 'high';
      if (intx === 'interactive') return 'medium';
      return 'medium';
    }
    function noiseLevel(intx: string): 'low'|'medium'|'high' {
      if (intx === 'hands-on' || intx === 'interactive') return 'medium';
      return 'low';
    }

    function score(ex: any) {
      const name = (ex.name || '').toLowerCase();
      const desc = (ex.description || '').toLowerCase();
      const cat = (ex.category || '').toLowerCase();
      const topics = extractTopics([name, desc, cat]);
      const intx = interactivity(cat, desc);
      const fam = familyFriendliness(intx, desc);
      const noise = noiseLevel(intx);

      const reasons: string[] = ['On current floor'];
      let s = 40; // floor

      // Group type and age
      const isFamily = groupType.includes('family') || ageBand.includes('child');
      const isResearch = groupType.includes('research');
      const isTech = groupType.includes('student') || groupType.includes('tech') || interests.some(i => ['robotics','ai','technology','coding','programming','electronics','automation','ml','machine learning'].includes((i||'').toLowerCase()));
      if (isFamily) {
        if (intx === 'hands-on') { s += 20; reasons.push('Hands-on for families'); }
        if (intx === 'interactive') { s += 12; reasons.push('Interactive for families'); }
        if (fam === 'high') { s += 6; reasons.push('Family-friendly'); }
      }
      if (isResearch) {
        if (topics.includes('geology') || topics.includes('earth') || topics.includes('physics') || topics.includes('technology')) {
          s += 18; reasons.push('Research topic');
        }
        if ((ex.averageTime || 0) >= 5) { s += 5; reasons.push('Deeper content'); }
      }
      if (isTech) {
        if (topics.some(t => ['robot','robotics','automation','ai','artificial intelligence','machine learning','ml','technology','electronics','coding','programming'].includes(t))) {
          s += 28; reasons.push('Technology/Robotics focus');
        }
        if (topics.some(t => ['dinosaur','paleontology','cave','amarnath','nature','environment'].includes(t))) {
          s -= 24; reasons.push('Not relevant to robotics/AI');
        }
        if (topics.includes('geology') && !interests.includes('geology')) {
          s -= 12; reasons.push('Geology not in interests');
        }
      }

      // Interests
      for (const interest of interests) {
        if (textIncludes(name, interest) || textIncludes(desc, interest) || textIncludes(cat, interest)) {
          s += 6; reasons.push(`Matches interest: ${interest}`);
        }
      }

      // Interactivity preference
      if (interactivityPref && intx === interactivityPref) { s += 6; reasons.push('Interactivity match'); }

      // Time fit (rough)
      const avgTime = Number(ex.averageTime || 5);
      if (avgTime <= Math.max(5, timeBudget / Math.max(1, groupSize))) {
        s += 8; reasons.push('Fits time budget');
      }

      // Mobility / crowd
      if (mobility.includes('wheelchair')) { s += 4; reasons.push('Accessibility assumed'); }
      if (noiseTolerance === 'low' && noise === 'low') { s += 4; reasons.push('Quiet experience'); }

      // Quality signals
      s += Math.min(10, Math.max(0, Number(ex.rating || 0)));

      return { score: s, reasons, topics };
    }

    // If embeddings are available, blend semantic similarity into the score
    let scored: any[];
    let userVec = buildUserVector(interests);

    // Parallel: try Gemma if enabled
    let gemmaItems: Array<{ id: string | number; score: number }> = [];
    try {
      const gh = await gemmaHealth();
      if (gh && gh.indexed) {
        const query = buildGemmaQuery({ ageBand, groupType, interests, timeBudget, interactivity: interactivityPref, accessibility: accessibilityPref, noiseTolerance }, globalTimeBudget || selectedFloor === 'all' ? undefined : selectedFloor);
        gemmaItems = await gemmaRecommend(query, 50);
      }
    } catch {}

    const SIM_WEIGHT = envNum('SIM_WEIGHT', 0.45);
    const RULE_WEIGHT = envNum('RULE_WEIGHT', 0.35);
    const GEMMA_WEIGHT = envNum('GEMMA_WEIGHT', 0.2);

    if (userVec && Array.isArray(userVec) && VECTOR_DIM > 0) {
      const weights = { sim: SIM_WEIGHT, rule: RULE_WEIGHT, gemma: GEMMA_WEIGHT };
      scored = exhibits.map((ex: any) => {
        const rule = score(ex);
        const emb = (EMBEDDINGS || []).find(e => e.id === ex.id);
        const sim = emb ? cosine(userVec as number[], emb.vector || []) : 0;
        const gem = gemmaItems.find(g => String(g.id) === String(ex.id));
        const gemScore = gem ? Math.max(0, Number(gem.score || 0)) * 100 : 0;
        const blended = weights.rule * rule.score + weights.sim * Math.max(0, sim * 100) + weights.gemma * gemScore;
        const reasons = [...(rule.reasons||[]), `Semantic sim: ${sim.toFixed(2)}`];
        if (gem) reasons.push('Gemma match');
        return { ...ex, reasons, score: blended };
      }).filter((ex: any) => ex.score > 0)
        .sort((a: any, b: any) => b.score - a.score);
    } else {
      const RULE_ONLY = envNum('RULE_ONLY_WEIGHT', 0.7);
      const GEMMA_ONLY = envNum('GEMMA_ONLY_WEIGHT', 0.3);
      const weights = { rule: RULE_ONLY, gemma: GEMMA_ONLY };
      scored = exhibits.map((ex: any) => {
        const rule = score(ex);
        const gem = gemmaItems.find(g => String(g.id) === String(ex.id));
        const gemScore = gem ? Math.max(0, Number(gem.score || 0)) * 100 : 0;
        const blended = weights.rule * rule.score + weights.gemma * gemScore;
        const reasons = [...(rule.reasons||[])];
        if (gem) reasons.push('Gemma match');
        return { ...ex, reasons, score: blended };
      })
        .filter((ex: any) => ex.score > 0)
        .sort((a: any, b: any) => b.score - a.score);
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
    const selectedFloor = String(req.query.floor || '').toLowerCase() as 'outside'|'ground'|'first';
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
        'geology','rock','strata','mountain','earth','dinosaur','paleontology','cave','amarnath',
        'robot','robotics','automation','ai','artificial intelligence','machine learning','ml','technology','electronics','coding','programming',
        'physics','space','astronomy','planet','environment','nature','biology','chemistry','history'
      ];
      return keywords.filter(k => text.includes(k));
    }
    function interactivity(cat: string, desc: string): 'interactive'|'hands-on'|'passive'|'unknown' {
      if (cat.includes('hands') || desc.includes('hands-on')) return 'hands-on';
      if (cat.includes('interactive') || desc.includes('interactive')) return 'interactive';
      if (cat.includes('passive') || desc.includes('observational')) return 'passive';
      return 'unknown';
    }
    function familyFriendliness(intx: string, desc: string): 'low'|'medium'|'high' {
      if (desc.includes('safety') || desc.includes('safe')) return 'high';
      if (intx === 'hands-on') return 'high';
      if (intx === 'interactive') return 'medium';
      return 'medium';
    }
    function noiseLevel(intx: string): 'low'|'medium'|'high' {
      if (intx === 'hands-on' || intx === 'interactive') return 'medium';
      return 'low';
    }

    const isFamily = groupType.includes('family') || ageBand.includes('child');
    const isResearch = groupType.includes('research');
    const isTech = groupType.includes('student') || groupType.includes('tech') || interests.some((i: string) => ['robotics','ai','technology','coding','programming','electronics','automation','ml','machine learning'].includes((i||'').toLowerCase()));

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
        if (topics.some((t: string) => ['robot','robotics','automation','ai','artificial intelligence','machine learning','ml','technology','electronics','coding','programming'].includes(t))) {
          score += 28; reasons.push('Technology/Robotics focus');
        }
        if (topics.some((t: string) => ['dinosaur','paleontology','cave','amarnath','nature','environment'].includes(t))) {
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