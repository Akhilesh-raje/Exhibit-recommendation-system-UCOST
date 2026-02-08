export const CONFIG = Object.freeze({
  topicConfidenceMin: 0.35,
  maxListItemsDefault: 5,
  singleSummaryMaxChars: 800,  // Increased for more detailed descriptions
  listSummaryMaxChars: 200,    // Increased for better list descriptions
  maxFeatures: 3,
  responseQualityMin: 0.8,
  listConfidenceThreshold: 0.3,
  enableRelatedBackfill: true,
  csvFirst: false,
  // Confidence calculation weights (tuned for production)
  // These weights determine how much each component contributes to final confidence score
  confidenceWeights: {
    gemma: 0.25,      // Weight for Gemma AI score (0-1)
    rerank: 0.60,     // Weight for reranker model score (0-1)
    quality: 0.15,    // Weight for response quality heuristic (0-1)
  },
} as const);
