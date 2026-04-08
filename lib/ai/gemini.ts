import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

export const AI_MAX_INPUT_TOKENS = Number(
  process.env.AI_MAX_INPUT_TOKENS || 1200
);

export const AI_MAX_OUTPUT_TOKENS = Number(
  process.env.AI_MAX_OUTPUT_TOKENS || 350
);

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function countInputTokens(contents: string) {
  const res = await ai.models.countTokens({
    model: GEMINI_MODEL,
    contents,
  });

  return res.totalTokens ?? 0;
}

export async function generateJson(contents: string) {
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      temperature: 0.2,
      maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    },
  });

  const text =
    res.candidates?.[0]?.content?.parts
      ?.map((part: any) => ("text" in part ? part.text : ""))
      .join("") ?? "";

  return {
    text,
    usage: res.usageMetadata ?? null,
  };
}