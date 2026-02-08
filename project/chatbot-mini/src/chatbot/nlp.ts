export type IntentType = 'list' | 'single' | 'location' | 'features' | 'unknown';
export interface ParsedIntent {
  intent: IntentType;
  topic?: string;
  count?: number;
  brevity?: boolean;
  confidence?: number;
  raw: string;
}

export const TOPIC_SYNONYMS: Record<string, string[]> = {
  physics: ['mechanics', 'motion', 'force', 'energy', 'wave', 'pendulum', 'optics', 'light', 'sound', 'quantum', 'raman', 'bose'],
  biology: ['life', 'plants', 'animals', 'genetics', 'dna', 'evolution', 'ecosystem', 'organism', 'genome', 'cell', 'molecular'],
  chemistry: ['chemical', 'materials', 'molecule', 'compound', 'reaction', 'element', 'periodic', 'drug', 'pharmaceutical', 'synthesis'],
  technology: ['tech', 'computing', 'computer', 'ict', 'information technology', 'digital', 'software'],
  'ai-and-robotics': ['ai', 'robotics', 'artificial intelligence', 'robot', 'machine learning', 'ml', 'neural', 'automation', 'image processing', 'computer vision'],
  environment: ['nature', 'earth', 'ecology', 'climate', 'weather', 'ecosystem', 'conservation'],
  astronomy: ['space', 'stars', 'planets', 'galaxy', 'universe', 'taramandal', 'planetarium', 'nasa', 'astronaut', 'satellite', 'solar system', 'cosmos', 'isro', 'rocket', 'mars', 'moon'],
  geography: ['himalaya', 'himalayas', 'himalayan', 'mountain', 'mountains', 'geology', 'earth science', 'geography', 'landform', 'terrain', 'ecosystem'],
  nanoscience: ['nano', 'nanotech', 'nanotechnology', 'nanomaterials', 'nanoscale', 'nanoparticle'],
};

export function normalizeTopic(word: string): string | undefined {
  const w = word.toLowerCase().replace(/[^\w]+$/g, '');
  for (const [canon, syns] of Object.entries(TOPIC_SYNONYMS)) {
    if (w === canon || syns.some(s => w.includes(s))) return canon;
  }
  return undefined;
}

export const STOPWORDS = new Set([
  'what', 'is', 'are', 'the', 'about', 'tell', 'me', 'show', 'explain', 'describe',
  'exhibit', 'exhibits', 'find', 'give', 'list', 'all', 'any', 'a', 'an', 'and',
  'of', 'for', 'to', 'on', 'in', 'at', 'with', 'information', 'details'
]);

export function significantTokens(tokens: string[]): string[] {
  return tokens
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function fuzzyIncludes(hay: string, needle: string, maxDist = 2): boolean {
  hay = hay.toLowerCase(); needle = needle.toLowerCase();
  if (hay.includes(needle)) return true;
  const parts = hay.split(/[^a-z0-9]+/i).filter(Boolean);
  return parts.some(p => levenshtein(p, needle) <= maxDist);
}

export function extractCount(text: string): number | undefined {
  const m = text.match(/\b(top|list|show)?\s*(\d{1,2})\b/i);
  if (m) {
    const n = parseInt(m[2], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

export function parseIntent(question: string): ParsedIntent {
  const q = question.toLowerCase();
  const count = extractCount(q);
  const brevity = /brief|short|concise|limit conversation|be brief/i.test(question);

  let intent: IntentType = 'unknown';
  // treat 'top', 'best', 'all' as list intent signals
  if (/\b(top|best|all)\b/.test(q)) intent = 'list';
  let signalCount = 0;
  if (/\bwhere\b|location|find\b.*(where|location)/i.test(q)) intent = 'location';
  else if (/\bfeatures?\b|interactive\b/i.test(q)) intent = 'features';
  else if (/\blist\b|\bshow\b|\bgive\b|\bwhich exhibits\b|\bwhat exhibits\b/i.test(q)) intent = 'list';
  else if (/\btell me about\b|\bwhat is\b|\babout\b/i.test(q)) intent = 'single';
  // basic intent confidence based on keyword presence
  if (/\bwhere\b|location|floor|find|directions/i.test(q)) signalCount++;
  if (/\bfeatures?\b|interactive|what can|how can|activities/i.test(q)) signalCount++;
  if (/\blist\b|\bshow\b|\bgive\b|\bwhich exhibits\b|\bwhat exhibits\b|top|best|all\b/i.test(q)) signalCount++;
  if (/\btell me about\b|\bwhat is\b|\babout\b/i.test(q)) signalCount++;

  const tokens = q.split(/[^a-z0-9]+/i).filter(Boolean);
  let topic: string | undefined;
  
  // First, check for person names (CV Raman, Satyendra Nath Bose)
  const fullQueryLower = q.toLowerCase();
  if (/cv\s*raman|c\s*v\s*raman|raman/i.test(fullQueryLower)) {
    topic = 'physics'; // CV Raman is physics/optics related
  } else if (/satyendra\s*nath\s*bose|satyandra\s*nath\s*bose|s\s*n\s*bose|bose\s*einstein/i.test(fullQueryLower)) {
    topic = 'physics'; // Satyendra Nath Bose is physics/quantum related
  } else {
    // Then check for topics
    for (const t of tokens) {
      const norm = normalizeTopic(t);
      if (norm) {
        topic = norm;
        break;
      }
      for (const key of Object.keys(TOPIC_SYNONYMS)) {
        if (fuzzyIncludes(t, key, 1)) {
          topic = key;
          break;
        }
      }
      if (topic) break;
    }
    
    // Also check multi-word topic phrases
    if (!topic) {
      const topicPhrases: Record<string, string> = {
        'himalayan': 'geography',
        'himalayas': 'geography',
        'himalaya': 'geography',
        'cv raman': 'physics',
        'c v raman': 'physics',
        'satyendra nath bose': 'physics',
        'satyandra nath bose': 'physics',
        's n bose': 'physics',
        'nasa': 'astronomy',
        'nanotech': 'nanoscience',
        'nanotechnology': 'nanoscience',
        'chemistry': 'chemistry',
        'chemical': 'chemistry',
      };
      for (const [phrase, topicKey] of Object.entries(topicPhrases)) {
        if (fullQueryLower.includes(phrase)) {
          topic = topicKey;
          break;
        }
      }
    }
  }

  const confidence = intent === 'unknown' ? 0.3 : Math.min(1, 0.4 + signalCount * 0.2);
  return { intent, topic, count, brevity, confidence, raw: question };
}

export function isGreetingOrCasual(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const greetings = new Set([
    'hi', 'hii', 'hello', 'hey', 'hola', 'namaste', 'namaskar',
    'morning', 'afternoon', 'evening',
    'thanks', 'thank', 'bye', 'goodbye', 'see', 'sup'
  ]);
  const hasTaskWords = /\b(what|where|when|why|how|tell|show|explain|find|list|about|exhibit|exhibits)\b/i.test(normalized);
  if (tokens.length === 1 && greetings.has(tokens[0])) return true;
  if (tokens.length <= 3 && greetings.has(tokens[0]) && !hasTaskWords) return true;
  if (/\b(bye|goodbye|see you|farewell)\b/i.test(normalized)) return true;
  if (/\b(thanks|thank you|thankyou)\b/i.test(normalized) && tokens.length <= 4) return true;
  return false;
}

export function getGreetingResponse(message: string): string {
  const normalized = message.toLowerCase().trim();
  if (/bye|goodbye|see you|farewell/i.test(normalized)) {
    return '👋 **Goodbye!** Feel free to ask me about exhibits anytime. Have a great visit! 🌟';
  }
  if (/thanks|thank you|thankyou/i.test(normalized)) {
    return "😊 **You're welcome!** Is there anything else you'd like to know about our exhibits? 💡";
  }
  if (/how are you|how do you do/i.test(normalized)) {
    return "🤖 **I'm doing great, thank you!** I'm here to help you explore the Regional Science Centre. What would you like to know about our exhibits? 🔬";
  }
  return "👋 **Hello! I'm your Science Assistant!** 🎓\n\nI can help you:\n\n✨ Find exhibits by topic or name\n📚 Learn about specific exhibits\n📍 Get location and feature information\n🏛️ Answer questions about the museum\n\n**What would you like to explore today?** 🌟";
}

export const QUERY_ALIASES: Record<string, string> = {
  dinasaur: 'dinosaur',
  dinosour: 'dinosaur',
  dinosar: 'dinosaur',
  dinosaur: 'dinosaur',
  taramandal: 'planetarium',
  tengential: 'tangential',
  tangential: 'tangential',
  exibit: 'exhibit',
  exibits: 'exhibits',
  exhbits: 'exhibits',
  exhbit: 'exhibit',
  himaliyan: 'himalayan',
  himalayan: 'himalayan',
  himalayas: 'himalayan',
  nanotech: 'nanotechnology',
  nano: 'nanotechnology',
  cv: 'cv raman',
  'c v': 'cv raman',
  'c.v.': 'cv raman',
  'c.v': 'cv raman',
  raman: 'cv raman',
  'satyendra nath': 'satyendra nath bose',
  'satyandra nath': 'satyendra nath bose',
  's n bose': 'satyendra nath bose',
  's.n. bose': 'satyendra nath bose',
  bose: 'satyendra nath bose',
  nasa: 'nasa space',
  'space nasa': 'nasa space',
};

export function normalizeToken(token: string): string {
  const t = token.toLowerCase().trim();
  if (QUERY_ALIASES[t]) return QUERY_ALIASES[t];
  if (t.endsWith('s') && t.length > 3) return t.slice(0, -1);
  return t;
}

export function normalizeQuery(text: string): { normalized: string; tokens: string[] } {
  const lowered = text.toLowerCase();
  const rawTokens = lowered.split(/[^a-z0-9]+/i).filter(Boolean);
  const tokens = rawTokens.map(normalizeToken);
  return { normalized: tokens.join(' '), tokens };
}


