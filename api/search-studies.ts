import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runStudySearch } from "../lib/studySearch";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Utilize POST." });
  }

  try {
    const { query, category } = req.body ?? {};
    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "O termo de pesquisa é obrigatório." });
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      return res.status(503).json({
        error: "Pesquisa científica indisponível: GEMINI_API_KEY não configurada.",
      });
    }

    const result = await runStudySearch(
      query,
      typeof category === "string" ? category : undefined
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error("Erro na função serverless search-studies:", error);
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: "Erro interno ao processar a busca de estudos clínicos.",
      details: message,
    });
  }
}
