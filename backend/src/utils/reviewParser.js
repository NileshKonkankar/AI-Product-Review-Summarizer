const MAX_REVIEWS = 1000;
const MAX_REVIEW_LENGTH = 1800;

export function normalizeReviews({ reviews, reviewsText }) {
  const fromArray = Array.isArray(reviews) ? reviews : [];
  const fromText = typeof reviewsText === "string" ? splitReviewText(reviewsText) : [];

  return [...fromArray, ...fromText]
    .map((review) => String(review || "").replace(/\s+/g, " ").trim())
    .filter((review) => review.length >= 8)
    .map((review) => review.slice(0, MAX_REVIEW_LENGTH))
    .slice(0, MAX_REVIEWS);
}

function splitReviewText(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const blankLineParts = normalized.split(/\n\s*\n/g).filter(Boolean);
  if (blankLineParts.length > 1) {
    return blankLineParts;
  }

  return normalized
    .split(/\n|(?:^|\s)(?:review\s*\d+[:.)-])/gi)
    .map((part) => part.trim())
    .filter(Boolean);
}
