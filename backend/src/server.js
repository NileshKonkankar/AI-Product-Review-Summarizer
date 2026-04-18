import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import { connectDb, getDbStatus } from "./config/db.js";
import analysisRoutes from "./routes/analysisRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(helmet());
app.use(mongoSanitize());
app.use(express.json({ limit: "4mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    database: getDbStatus(),
    provider: process.env.AI_PROVIDER || "local"
  });
});

app.use("/api", analysisRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong on the server" : err.message;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({ message });
});

await connectDb();

app.listen(port, () => {
  console.log(`Review summarizer API listening on port ${port}`);
});
