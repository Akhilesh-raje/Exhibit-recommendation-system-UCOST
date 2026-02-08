import { CONFIG } from './config.js';
import { ParsedIntent } from './nlp.js';

export interface Exhibit {
  id: string;
  name: string;
  description?: string;
  category?: string;
  location?: string;
  floor?: string;
  ageRange?: string;
  exhibitType?: string;
  interactiveFeatures?: string[] | string;
  // Extended optional fields populated from CSV/API
  aliases?: string[];
  images?: string[] | string;
  coordinates?: any;
  environment?: string;
  // Optional metadata fields
  rating?: number;
  averageTime?: number;
  difficulty?: string;
}

export function parseJsonField(field: any): any {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
}

export function generateAnswer(
  question: string,
  exhibits: Exhibit[],
  opts?: {
    singleSummaryMaxChars?: number;
    listSummaryMaxChars?: number;
  }
): string {
  const singleMax = opts?.singleSummaryMaxChars ?? CONFIG.singleSummaryMaxChars;
  const listMax = opts?.listSummaryMaxChars ?? CONFIG.listSummaryMaxChars;

  // Helper function to filter out debug/test exhibits
  const isDebugExhibit = (ex: Exhibit): boolean => {
    const name = (ex.name || '').toLowerCase();
    const desc = (ex.description || '').toLowerCase();
    return name.includes('debug') ||
      name.includes('test') ||
      desc.includes('test_exhibits') ||
      desc.includes('inserted via test');
  };

  if (exhibits.length === 0) {
    return "🔍 I couldn't find specific information about that topic in our knowledge base.\n\n💡 Could you please rephrase your question or ask about:\n\n✨ Specific exhibit names\n🔬 Science topics (physics, biology, space, etc.)\n📂 Exhibit categories\n🏛️ Museum information\n🎮 Interactive features";
  }

  const questionLower = question.toLowerCase();
  const isQuestionAboutSpecific = /what is|tell me about|explain|describe|show me|what does|how does/.test(questionLower);
  const isQuestionAboutMultiple = /list|show|find|where|which exhibits|what exhibits|all exhibits|some|tell me about some|exhibits related to|related to/i.test(questionLower);
  const isQuestionAboutLocation = /where|location|floor|find|directions/.test(questionLower);
  const isQuestionAboutFeatures = /features|interactive|what can|how can|activities/.test(questionLower);
  const isQuestionAboutAge = /age|children|kids|adults|suitable|appropriate/.test(questionLower);
  const isQuestionAboutCategory = /category|type|kind|sort/.test(questionLower);

  if (exhibits.length === 1 || isQuestionAboutSpecific) {
    const exhibit = exhibits[0];
    let answer = `🎯 **${exhibit.name || 'Exhibit'}**\n\n`;
    if (exhibit.description) {
      let desc = exhibit.description.trim();
      // Show full description, only truncate if extremely long (over 1200 chars)
      if (desc.length > 1200) {
        desc = desc.substring(0, 1200);
        const lastPeriod = desc.lastIndexOf('.');
        const lastSpace = desc.lastIndexOf(' ');
        if (lastPeriod > 1000) {
          desc = desc.substring(0, lastPeriod + 1);
        } else if (lastSpace > 1000) {
          desc = desc.substring(0, lastSpace) + '...';
        } else {
          desc = desc + '...';
        }
      }
      answer += `📝 ${desc}\n\n`;
    }
    const locationInfo: string[] = [];
    if (exhibit.location && !exhibit.location.includes('Dehradun, Uttarakhand')) {
      locationInfo.push(exhibit.location);
    }
    if (exhibit.floor) {
      const floorLabel = exhibit.floor.toLowerCase().includes('floor')
        ? exhibit.floor
        : `${exhibit.floor} floor`;
      const alreadyHasFloor = locationInfo.some(
        info => info.toLowerCase().replace(/\s+/g, ' ').includes((exhibit.floor || '').toLowerCase())
      );
      if (!alreadyHasFloor) {
        locationInfo.push(floorLabel);
      }
    }
    if (locationInfo.length > 0) {
      const locationText = locationInfo.join(' | ');
      answer += `📍 **Where to find it:** ${locationText}\n\n`;

      // Add map coordinates if available
      if (exhibit.coordinates && typeof exhibit.coordinates === 'object') {
        const coords = exhibit.coordinates as { x?: number; y?: number; floor?: string };
        if (coords.x !== undefined && coords.y !== undefined) {
          answer += `🗺️ Map coordinates: (x: ${coords.x}, y: ${coords.y})\n\n`;
        }
      }
    } else if (isQuestionAboutLocation) {
      answer += `📍 **Where to find it:** Location details are not available right now. Please check with the information desk.\n\n`;
    }
    const infoParts: string[] = [];
    if (exhibit.category) infoParts.push(`📂 ${exhibit.category}`);
    if (isQuestionAboutAge && exhibit.ageRange) infoParts.push(`👥 ${exhibit.ageRange}`);
    if (exhibit.exhibitType && exhibit.exhibitType !== 'passive') infoParts.push(`🎭 ${exhibit.exhibitType}`);

    // Add rating and time if available
    if (exhibit.rating !== undefined) {
      const stars = '⭐'.repeat(Math.floor(exhibit.rating));
      infoParts.push(`${stars} ${exhibit.rating}/5`);
    }
    if (exhibit.averageTime !== undefined) {
      infoParts.push(`⏱️ ${exhibit.averageTime} mins`);
    }
    if (exhibit.difficulty) {
      infoParts.push(`📊 ${exhibit.difficulty}`);
    }

    if (infoParts.length > 0) {
      answer += `ℹ️ ${infoParts.join(' • ')}\n\n`;
    }
    if (isQuestionAboutFeatures || exhibit.interactiveFeatures) {
      const features = parseJsonField(exhibit.interactiveFeatures);
      if (features) {
        if (Array.isArray(features) && features.length > 0) {
          const featureEmojis = ['✨', '🎮', '🔬', '💡', '🎯', '⚡'];
          const featureList = features.slice(0, 3).map((f, i) => `${featureEmojis[i % featureEmojis.length]} ${f}`).join(', ');
          answer += `🎨 **Highlights:** ${featureList}${features.length > 3 ? ' and more' : ''}\n\n`;
        } else if (typeof features === 'string' && features.trim()) {
          answer += `🎨 **Features:** ${features.substring(0, 100)}${features.length > 100 ? '...' : ''}\n\n`;
        } else if (isQuestionAboutFeatures) {
          answer += `🎨 **Features:** Details are not available in our records. You can still explore the exhibit to discover interactive elements.\n\n`;
        }
      } else if (isQuestionAboutFeatures) {
        answer += `🎨 **Features:** Details are not available in our records. You can still explore the exhibit to discover interactive elements.\n\n`;
      }
    }
    return answer.trim();
  }

  const isUnknownLike = !isQuestionAboutMultiple && !isQuestionAboutSpecific && !isQuestionAboutLocation && !isQuestionAboutFeatures && !isQuestionAboutAge && !isQuestionAboutCategory;
  if (isUnknownLike && exhibits.length > 0) {
    const primary = exhibits[0];
    let desc = (primary.description || '').trim();
    // Show more of the description (up to 600 chars)
    const maxChars = 600;
    if (desc.length > maxChars) {
      desc = desc.substring(0, maxChars);
      const lastPeriod = desc.lastIndexOf('.');
      const lastSpace = desc.lastIndexOf(' ');
      if (lastPeriod > maxChars * 0.75) {
        desc = desc.substring(0, lastPeriod + 1);
      } else if (lastSpace > maxChars * 0.75) {
        desc = desc.substring(0, lastSpace) + '...';
      } else {
        desc = desc + '...';
      }
    }
    // Filter out debug exhibits from "You might also like"
    const also = exhibits.slice(1, 10)
      .filter(e => !isDebugExhibit(e))
      .map(e => e.name)
      .filter(Boolean)
      .slice(0, 3);
    const alsoText = also.length ? `\n\n💡 **You might also like:** ${also.join(', ')}` : '';
    return `🎯 **${primary.name}**\n\n📝 ${desc || 'A popular interactive exhibit at the centre.'}${alsoText}`;
  }

  // Filter out debug exhibits first
  const filteredExhibits = exhibits.filter(ex => !isDebugExhibit(ex));

  const maxExhibits = Math.min(filteredExhibits.length, CONFIG.maxListItemsDefault);

  // For "some" queries, ensure we return multiple different exhibits
  const uniqueExhibits = filteredExhibits.filter((ex, idx, self) =>
    idx === self.findIndex(e => e.id === ex.id)
  ).slice(0, maxExhibits);

  let answer = '';
  if (uniqueExhibits.length === 1) {
    // Single exhibit - detailed format
    const exhibit = uniqueExhibits[0];
    answer = `🎯 **${exhibit.name || 'Exhibit'}**\n\n`;
    if (exhibit.description) {
      let desc = exhibit.description.trim();
      if (desc.length > listMax * 2) {
        desc = desc.substring(0, listMax * 2);
        const lastPeriod = desc.lastIndexOf('.');
        if (lastPeriod > listMax) {
          desc = desc.substring(0, lastPeriod + 1);
        } else {
          desc = desc + '...';
        }
      }
      answer += `📝 ${desc}\n\n`;
    }
  } else {
    // Multiple exhibits - list format
    answer = `🎉 **Found ${uniqueExhibits.length} exhibit${uniqueExhibits.length > 1 ? 's' : ''} related to your question:**\n\n`;
    uniqueExhibits.forEach((exhibit, index) => {
      const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const numEmoji = numberEmojis[index] || `${index + 1}.`;
      answer += `${numEmoji} **${exhibit.name || 'Untitled Exhibit'}**\n`;
      if (exhibit.description) {
        let desc = exhibit.description.trim();
        if (desc.length > listMax) {
          desc = desc.substring(0, listMax);
          const lastSpace = desc.lastIndexOf(' ');
          if (lastSpace > listMax * 0.66) {
            desc = desc.substring(0, lastSpace) + '...';
          } else {
            desc = desc + '...';
          }
        }
        answer += `   📝 ${desc}\n`;
      }
      const infoParts: string[] = [];
      if (exhibit.category) {
        infoParts.push(`📂 ${exhibit.category}`);
      }
      if (exhibit.floor) {
        const floorLabel = exhibit.floor.toLowerCase().includes('floor')
          ? exhibit.floor
          : `${exhibit.floor} floor`;
        const locationText = exhibit.location
          ? `${exhibit.location} | ${floorLabel}`
          : floorLabel;
        infoParts.push(`📍 ${locationText}`);
      } else if (exhibit.location) {
        infoParts.push(`📍 ${exhibit.location}`);
      }
      if (exhibit.exhibitType && exhibit.exhibitType !== 'passive') {
        infoParts.push(`🎭 ${exhibit.exhibitType}`);
      }
      if (infoParts.length > 0) {
        answer += `   ${infoParts.join(' • ')}\n`;
      }
      answer += '\n';
    });
  }

  if (exhibits.length > maxExhibits) {
    answer += `\n📊 Showing top ${maxExhibits} of ${exhibits.length} results.\n\n`;
  }

  if (uniqueExhibits.length > 1) {
    answer += `💬 **Want more details?** Just ask about any exhibit by name!`;
  } else if (uniqueExhibits.length === 1) {
    answer += `💬 **Want more details?** Ask about "${uniqueExhibits[0].name}" for more information!`;
  }

  return answer;
}

export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .filter(w => w.length > 1);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter(x => b.has(x))).size;
  const uni = new Set([...a, ...b]).size || 1;
  return inter / uni;
}

export function semanticScore(question: string, ex: Exhibit): number {
  const qset = new Set(tokenize(question));
  const tset = new Set(tokenize(`${ex.name || ''} ${ex.description || ''} ${ex.category || ''}`));
  return jaccard(qset, tset);
}

export function rerankBySemantic(question: string, exhibits: Exhibit[]): Exhibit[] {
  return [...exhibits]
    .map(ex => ({ ex, s: semanticScore(question, ex) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.ex);
}

// --- Lightweight TF-IDF reranker over current candidate set ---
function buildTf(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function cosineSim(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  for (const k of allKeys) {
    const av = a.get(k) || 0;
    const bv = b.get(k) || 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function rerankByTfidf(question: string, exhibits: Exhibit[]): Exhibit[] {
  if (!exhibits.length) return exhibits;
  const docs = exhibits.map(ex => `${ex.name || ''} ${ex.description || ''} ${ex.category || ''}`.toLowerCase());
  const tokenized = docs.map(d => d.split(/[^a-z0-9]+/i).filter(Boolean));
  const qTokens = question.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
  const df = new Map<string, number>();
  for (const toks of tokenized) {
    const uniq = new Set(toks);
    for (const t of uniq) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = exhibits.length;
  function tfidf(tokens: string[]): Map<string, number> {
    const tf = buildTf(tokens);
    const v = new Map<string, number>();
    for (const [t, f] of tf.entries()) {
      const idf = Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;
      v.set(t, f * idf);
    }
    return v;
  }
  const qVec = tfidf(qTokens);
  const scored = exhibits.map((ex, i) => {
    const dVec = tfidf(tokenized[i]);
    return { ex, s: cosineSim(qVec, dVec) };
  }).sort((a, b) => b.s - a.s);
  return scored.map(x => x.ex);
}

export function computeResponseQuality(exhibits: Exhibit[], parsed: ParsedIntent): number {
  if (!exhibits || exhibits.length === 0) return 0;
  let topicRatio = 1;
  if (parsed.topic) {
    const topicKey: string = parsed.topic as string;
    const syns = new Set<string>([topicKey]);
    const matches = exhibits.filter(ex => {
      const name = (ex.name || '').toLowerCase();
      const cat = (ex.category || '').toLowerCase();
      const desc = (ex.description || '').toLowerCase();
      let ok = false;
      syns.forEach(s => {
        if (s && (cat.includes(s) || name.includes(s) || desc.includes(s))) ok = true;
      });
      return ok;
    }).length;
    topicRatio = matches / exhibits.length;
  }
  const desired = parsed.count || CONFIG.maxListItemsDefault;
  const countScore = Math.min(1, exhibits.length / Math.max(1, desired));
  const withDesc = exhibits.filter(ex => (ex.description || '').trim().length > 0).length;
  const descRatio = withDesc / exhibits.length;
  return Math.max(0, Math.min(1, topicRatio * 0.5 + countScore * 0.2 + descRatio * 0.3));
}


