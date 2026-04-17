import cors from "cors";
import dotenv from "dotenv";
import express from "express";
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

app.use(express.json({ limit: "4mb" }));

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
