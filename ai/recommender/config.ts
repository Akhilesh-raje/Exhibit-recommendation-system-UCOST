export const recommenderConfig = {
  weights: {
    similarity: 0.6,
    quality: 0.1,
    timeFit: 0.1,
    audienceFit: 0.1,
    interaction: 0.1,
  },
  timeFit: {
    softFactor: 1.0, // averageTime <= timeBudget / softFactor → full credit
  },
};