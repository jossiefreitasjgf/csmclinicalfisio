import { GoogleGenAI } from "@google/genai";

export interface StudySource {
  title: string;
  uri: string;
}

export interface StudySearchResult {
  responseText: string;
  sources: StudySource[];
}

export function buildStudySearchPrompt(query: string, category?: string): string {
  const cleanQuery = query.trim();
  const cleanCategory = category?.trim();

  return `Aja como um especialista sênior em Fisioterapia Infantil, Neuropediatria e Reabilitação Pediátrica.
Realize uma busca aprofundada na web para responder à seguinte consulta sobre tratamento ou estudo de caso:
Assunto da Busca: "${cleanQuery}"${cleanCategory ? ` (Foco específico em: ${cleanCategory})` : ""}

Forneça um relatório clínico completo em português com as seguintes seções estruturadas em Markdown:
1. **Resumo do Tema e Relevância Clínica** (breve introdução sobre a patologia ou técnica no contexto infantil).
2. **Estudos Clínicos e Evidências Científicas Recentes** (mencione os principais achados, ensaios clínicos, revisões sistemáticas e o nível de evidência se aplicável).
3. **Formas e Protocolos de Tratamento** (abordagens de fisioterapia recomendadas, recursos terapêuticos utilizados, frequência e duração se descrito).
4. **Orientações Práticas e Cuidados** (contraindicações, cuidados no manuseio infantil, envolvimento da família e orientações domiciliares).

Certifique-se de que todas as informações se baseiem nos resultados reais da pesquisa na web (mencionando os estudos originais, PubMed, Scielo, Cochrane, revistas médicas ou diretrizes internacionais de fisioterapia pediátrica).
Por favor, seja extremamente profissional, preciso e prático para auxiliar um fisioterapeuta no atendimento direto.`;
}

export async function runStudySearch(query: string, category?: string): Promise<StudySearchResult> {
  if (!query || !query.trim()) {
    throw new Error("O termo de pesquisa é obrigatório.");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no servidor.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: buildStudySearchPrompt(query, category),
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const responseText = response.text || "";

  const sources: StudySource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (Array.isArray(chunks)) {
    for (const chunk of chunks) {
      if (chunk?.web?.uri) {
        sources.push({
          title: chunk.web.title || "Fonte Científica",
          uri: chunk.web.uri,
        });
      }
    }
  }

  const uniqueSources = Array.from(
    new Map(sources.map((item) => [item.uri, item])).values()
  );

  return {
    responseText,
    sources: uniqueSources,
  };
}
