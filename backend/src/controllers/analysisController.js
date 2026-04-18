import crypto from "crypto";
import Analysis from "../models/Analysis.js";
import { runReviewAnalysis } from "../services/aiService.js";
import { isDbConnected } from "../config/db.js";
import { normalizeReviews } from "../utils/reviewParser.js";

const memoryStore = [];

function toClientRecord(record) {
  const plain = typeof record.toObject === "function" ? record.toObject() : record;
  return {
    ...plain,
    id: plain._id?.toString?.() || plain.id,
    _id: undefined
  };
}

export async function analyzeReviews(req, res, next) {
  try {
    const productName = (req.body.productName || "Untitled product").trim();
    const sourceUrl = (req.body.sourceUrl || "").trim();
    const reviews = normalizeReviews({
      reviews: req.body.reviews,
      reviewsText: req.body.reviewsText
    });

    if (!sourceUrl) {
      res.status(400).json({
        message: "Please provide a Source URL."
      });
      return;
    }

    if (reviews.length < 2) {
      res.status(400).json({
        message: "Please provide at least two reviews so the analysis has enough signal."
      });
      return;
    }

    const result = await runReviewAnalysis({ productName, sourceUrl, reviews });
    const payload = {
      productName,
      sourceUrl,
      reviewCount: reviews.length,
      ...result,
      rawReviewsPreview: reviews.slice(0, 5)
    };

    if (isDbConnected()) {
      const saved = await Analysis.create(payload);
      res.status(201).json(toClientRecord(saved));
      return;
    }

    const memoryRecord = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryStore.unshift(memoryRecord);
    memoryStore.splice(25);
    res.status(201).json(memoryRecord);
  } catch (error) {
    next(error);
  }
}

export async function listAnalyses(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    if (isDbConnected()) {
      const records = await Analysis.find().sort({ createdAt: -1 }).limit(limit);
      res.json(records.map(toClientRecord));
      return;
    }

    res.json(memoryStore.slice(0, limit));
  } catch (error) {
    next(error);
  }
}

export async function getAnalysisById(req, res, next) {
  try {
    if (isDbConnected()) {
      const record = await Analysis.findById(req.params.id);
      if (!record) {
        res.status(404).json({ message: "Analysis not found" });
        return;
      }

      res.json(toClientRecord(record));
      return;
    }

    const record = memoryStore.find((item) => item.id === req.params.id);
    if (!record) {
      res.status(404).json({ message: "Analysis not found in this session" });
      return;
    }

    res.json(record);
  } catch (error) {
    next(error);
  }
}

export async function deleteAnalysis(req, res, next) {
  try {
    if (isDbConnected()) {
      const deleted = await Analysis.findByIdAndDelete(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Analysis not found" });
        return;
      }

      res.status(204).send();
      return;
    }

    const index = memoryStore.findIndex((item) => item.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: "Analysis not found in this session" });
      return;
    }

    memoryStore.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
