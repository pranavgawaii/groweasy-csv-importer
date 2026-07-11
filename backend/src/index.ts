import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { importRouter } from "./routes/import.js";
import { GROQ_MODEL } from "./services/groqClient.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Security: Helmet sets various HTTP headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// Security: Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api", apiLimiter);

// CSVs can be large once parsed to JSON — raise the body limit accordingly.
// Security: Strict CORS (allow only specific origin if set, otherwise true for dev)
app.use(cors({ origin: process.env.CORS_ORIGIN ?? true }));
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    model: GROQ_MODEL,
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
  });
});

app.use("/api", importRouter);

// Catch-all error handler so nothing is ever silently swallowed.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", err);
    if (res.headersSent) return;
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`GrowEasy import API listening on http://localhost:${PORT} (model: ${GROQ_MODEL})`);
});
