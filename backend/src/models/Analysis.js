import mongoose from "mongoose";

const sentimentSchema = new mongoose.Schema(
  {
    positive: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    negative: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    label: { type: String, default: "Neutral" }
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    verdict: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 10, required: true },
    reason: { type: String, required: true }
  },
  { _id: false }
);

const fakeReviewSchema = new mongoose.Schema(
  {
    suspiciousCount: { type: Number, default: 0 },
    riskLevel: { type: String, default: "Low" },
    reasons: [{ type: String }]
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    productName: { type: String, default: "Untitled product" },
    sourceUrl: { type: String, default: "" },
    reviewCount: { type: Number, required: true },
    summary: { type: String, required: true },
    keyInsights: [{ type: String }],
    pros: [{ type: String }],
    cons: [{ type: String }],
    sentiment: { type: sentimentSchema, required: true },
    recommendation: { type: recommendationSchema, required: true },
    fakeReviewDetection: { type: fakeReviewSchema, required: true },
    provider: { type: String, default: "local" },
    rawReviewsPreview: [{ type: String }]
  },
  { timestamps: true }
);

analysisSchema.index({ createdAt: -1 });
analysisSchema.index({ productName: "text", summary: "text" });

const Analysis = mongoose.model("Analysis", analysisSchema);

export default Analysis;
