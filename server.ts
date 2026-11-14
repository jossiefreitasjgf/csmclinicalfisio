import fs from "fs";
import path from "path";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { runStudySearch } from "./lib/studySearch";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

function buildCorsOptions(): cors.CorsOptions {
  const rawOrigin = process.env.CORS_ORIGIN?.trim();
  if (!rawOrigin) {
    return { origin: true, credentials: true };
  }
  const allowedOrigins = rawOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  };
}

app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "csm-clinical-backend",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/search-studies", async (req, res) => {
  try {
    const { query, category } = req.body ?? {};
    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "O termo de pesquisa é obrigatório." });
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      return res.status(503).json({
        error: "Pesquisa científica indisponível: GEMINI_API_KEY não configurada no servidor.",
      });
    }

    const result = await runStudySearch(
      query,
      typeof category === "string" ? category : undefined
    );

    return res.json(result);
  } catch (error: unknown) {
    console.error("Erro na API de busca de estudos:", error);
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: "Erro interno ao processar a busca de estudos clínicos. Verifique a chave de API ou tente novamente.",
      details: message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const indexHtmlPath = path.join(distPath, "index.html");

    if (fs.existsSync(indexHtmlPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(indexHtmlPath);
      });
    } else {
      app.get("/", (_req, res) => {
        res.json({
          status: "ok",
          service: "csm-clinical-backend",
          message: "API backend em execução (Render). Frontend servido separadamente (Vercel).",
        });
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
