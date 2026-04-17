import { Router } from "express";
import {
  analyzeReviews,
  deleteAnalysis,
  getAnalysisById,
  listAnalyses
} from "../controllers/analysisController.js";

const router = Router();

router.post("/analyses", analyzeReviews);
router.post("/analyze", analyzeReviews);
router.get("/analyses", listAnalyses);
router.get("/analyses/:id", getAnalysisById);
router.delete("/analyses/:id", deleteAnalysis);

export default router;
