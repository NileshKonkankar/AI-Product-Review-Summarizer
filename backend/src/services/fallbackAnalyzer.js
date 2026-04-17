const positiveSignals = [
  "accurate",
  "amazing",
  "best",
  "comfortable",
  "durable",
  "easy",
  "excellent",
  "fast",
  "favorite",
  "good",
  "great",
  "helpful",
  "impressive",
  "love",
  "perfect",
  "quality",
  "recommend",
  "reliable",
  "smooth",
  "sturdy",
  "useful",
  "value",
  "worth"
];

const negativeSignals = [
  "bad",
  "broken",
  "cheap",
  "confusing",
  "defective",
  "disappointed",
  "expensive",
  "failed",
  "flimsy",
  "issue",
  "late",
  "noisy",
  "poor",
  "problem",
  "refund",
  "slow",
  "terrible",
  "unreliable",
  "waste",
  "weak",
  "worst"
];

const promoSignals = [
  "best ever",
  "buy now",
  "everyone must buy",
  "life changing",
  "miracle",
  "perfect product",
  "sponsored",
  "trust me",
  "unbelievable",
  "you need this"
];

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "because",
  "been",
  "but",
  "can",
  "could",
  "did",
  "does",
  "for",
  "from",
  "get",
  "had",
  "has",
  "have",
  "just",
  "like",
  "more",
  "not",
  "one",
  "only",
  "out",
  "product",
  "really",
  "than",
  "that",
  "the",
  "this",
  "too",
  "use",
  "very",
  "was",
  "with",
  "would",
  "you"
]);

export function createFallbackAnalysis({ productName, reviews }) {
  const scored = reviews.map((review) => scoreReview(review));
  const positive = scored.filter((item) => item.label === "Positive").length;
  const negative = scored.filter((item) => item.label === "Negative").length;
  const neutral = reviews.length - positive - negative;
  const sentimentScore = Math.round(((positive - negative) / reviews.length) * 50 + 50);
  const sentimentLabel = getSentimentLabel(sentimentScore);
  const keywords = getTopKeywords(reviews);
  const pros = extractSignals(reviews, positiveSignals, "positive");
  const cons = extractSignals(reviews, negativeSignals, "negative");
  const fakeReviewDetection = detectSuspiciousReviews(reviews);
  const recommendation = buildRecommendation({
    sentimentScore,
    fakeRisk: fakeReviewDetection.riskLevel,
    positive,
    negative,
    reviewCount: reviews.length
  });

  return {
    provider: "local",
    summary: buildSummary({ productName, reviews, sentimentLabel, keywords, pros, cons }),
    keyInsights: buildInsights({
      keywords,
      pros,
      cons,
      sentimentLabel,
      fakeReviewDetection,
      reviewCount: reviews.length
    }),
    pros,
    cons,
    sentiment: {
      positive,
      neutral,
      negative,
      score: sentimentScore,
      label: sentimentLabel
    },
    recommendation,
    fakeReviewDetection
  };
}

function scoreReview(review) {
  const lower = review.toLowerCase();
  const positiveHits = positiveSignals.filter((word) => lower.includes(word)).length;
  const negativeHits = negativeSignals.filter((word) => lower.includes(word)).length;
  const score = positiveHits - negativeHits;

  if (score > 0) {
    return { label: "Positive", score };
  }

  if (score < 0) {
    return { label: "Negative", score };
  }

  return { label: "Neutral", score };
}

function getSentimentLabel(score) {
  if (score >= 66) {
    return "Positive";
  }

  if (score <= 42) {
    return "Negative";
  }

  return "Mixed";
}

function getTopKeywords(reviews) {
  const counts = new Map();
  const words = reviews.join(" ").toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];

  words.forEach((word) => {
    const clean = word.replace(/^'|'$/g, "");
    if (stopWords.has(clean) || clean.length < 3) {
      return;
    }

    counts.set(clean, (counts.get(clean) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function extractSignals(reviews, signals, tone) {
  const candidates = [];

  reviews.forEach((review) => {
    const sentences = review
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 12);

    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      const hits = signals.filter((word) => lower.includes(word)).length;
      if (hits > 0) {
        candidates.push({
          text: summarizeSentence(sentence, tone),
          score: hits
        });
      }
    });
  });

  return uniqueByText(candidates)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.text);
}

function summarizeSentence(sentence, tone) {
  const clean = sentence.replace(/\s+/g, " ").trim();
  const clipped = clean.length > 120 ? `${clean.slice(0, 117).trim()}...` : clean;
  return tone === "positive" ? clipped : clipped;
}

function uniqueByText(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = item.text.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function detectSuspiciousReviews(reviews) {
  const normalizedCounts = new Map();
  const reasons = new Set();
  let suspiciousCount = 0;

  reviews.forEach((review) => {
    const lower = review.toLowerCase();
    const normalized = lower.replace(/[^a-z0-9]+/g, " ").trim();
    normalizedCounts.set(normalized, (normalizedCounts.get(normalized) || 0) + 1);

    const hasPromoTone = promoSignals.some((phrase) => lower.includes(phrase));
    const hasExaggeration = (review.match(/!/g) || []).length >= 3;
    const upperChars = review.replace(/[^A-Z]/g, "").length;
    const letterChars = review.replace(/[^A-Za-z]/g, "").length || 1;
    const allCapsRatio = upperChars / letterChars;
    const words = lower.match(/[a-z]{3,}/g) || [];
    const uniqueWordRatio = new Set(words).size / Math.max(words.length, 1);
    const repetitive = words.length >= 12 && uniqueWordRatio < 0.45;

    if (hasPromoTone || hasExaggeration || allCapsRatio > 0.45 || repetitive) {
      suspiciousCount += 1;
    }

    if (hasPromoTone) reasons.add("Promotional phrases appear in some reviews");
    if (hasExaggeration) reasons.add("Several reviews use heavy exaggeration or repeated exclamation marks");
    if (allCapsRatio > 0.45) reasons.add("Some reviews contain unusual capitalization patterns");
    if (repetitive) reasons.add("Some reviews repeat the same words unusually often");
  });

  const duplicateGroups = [...normalizedCounts.values()].filter((count) => count > 1).length;
  if (duplicateGroups > 0) {
    suspiciousCount += duplicateGroups;
    reasons.add("Duplicate or near-duplicate review text was detected");
  }

  const suspiciousRatio = suspiciousCount / reviews.length;
  const riskLevel = suspiciousRatio >= 0.3 ? "High" : suspiciousRatio >= 0.14 ? "Medium" : "Low";

  if (reasons.size === 0) {
    reasons.add("No strong spam patterns were detected by the basic heuristics");
  }

  return {
    suspiciousCount,
    riskLevel,
    reasons: [...reasons].slice(0, 5)
  };
}

function buildSummary({ productName, reviews, sentimentLabel, keywords, pros, cons }) {
  const productLabel = productName || "this product";
  const topicText = keywords.length ? ` Commonly mentioned topics include ${keywords.slice(0, 5).join(", ")}.` : "";
  const proText = pros[0] ? ` Buyers frequently praise: ${pros[0]}` : "";
  const conText = cons[0] ? ` The clearest concern is: ${cons[0]}` : "";

  return `${reviews.length} reviews for ${productLabel} show ${sentimentLabel.toLowerCase()} overall sentiment.${topicText}${proText}${conText}`;
}

function buildInsights({ keywords, pros, cons, sentimentLabel, fakeReviewDetection, reviewCount }) {
  const insights = [
    `Overall feedback is ${sentimentLabel.toLowerCase()} across ${reviewCount} reviews.`,
    keywords.length
      ? `The most repeated topics are ${keywords.slice(0, 4).join(", ")}.`
      : "Review language is varied enough that no single topic dominates.",
    pros.length > cons.length
      ? "Positive themes appear more varied than negative themes."
      : "Negative or cautionary themes deserve attention before purchase.",
    `Suspicious-review risk is ${fakeReviewDetection.riskLevel.toLowerCase()}.`
  ];

  return insights;
}

function buildRecommendation({ sentimentScore, fakeRisk, positive, negative, reviewCount }) {
  const riskPenalty = fakeRisk === "High" ? 2 : fakeRisk === "Medium" ? 1 : 0;
  const confidence = Math.max(1, Math.min(10, Math.round(sentimentScore / 10 - riskPenalty)));
  const positiveShare = positive / reviewCount;
  const negativeShare = negative / reviewCount;

  if (sentimentScore >= 64 && fakeRisk !== "High") {
    return {
      verdict: "Worth buying",
      confidence,
      reason: "Positive signals outweigh complaints, and suspicious-review risk is not high."
    };
  }

  if (positiveShare >= negativeShare && sentimentScore >= 48) {
    return {
      verdict: "Consider with caveats",
      confidence,
      reason: "The product has useful strengths, but the review set includes enough concerns to compare alternatives."
    };
  }

  return {
    verdict: "Not recommended",
    confidence,
    reason: "Negative themes or low confidence signals are strong enough to make this a risky purchase."
  };
}
