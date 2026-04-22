import OpenAI from 'openai';

export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

export const AI_MAX_INPUT_TOKENS = Number(
  process.env.AI_MAX_INPUT_TOKENS || 1200
);

export const AI_MAX_OUTPUT_TOKENS = Number(
  process.env.AI_MAX_OUTPUT_TOKENS || 350
);

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function countInputTokens(contents: string) {
  // Groq doesn't provide token counting API, so we'll estimate
  // Rough estimation: 1 token ≈ 4 characters for English/Spanish
  return Math.ceil(contents.length / 4);
}

export async function generateJson(contents: string) {
  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente que responde ÚNICAMENTE con JSON válido. No incluyas markdown ni texto adicional.'
        },
        {
          role: 'user',
          content: contents
        }
      ],
      temperature: 0.2,
      max_tokens: AI_MAX_OUTPUT_TOKENS,
      response_format: { type: 'json_object' }
    });

    const text = response.choices[0]?.message?.content ?? '';

    return {
      text,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens ?? null,
        completion_tokens: response.usage?.completion_tokens ?? null,
        total_tokens: response.usage?.total_tokens ?? null,
      }
    };
  } catch (error: any) {
    console.error('Groq API error:', error);
    
    // Handle specific error cases
    if (error.status === 429) {
      throw new Error('Límite de cuota excedido. Por favor, intenta más tarde.');
    }
    
    if (error.status === 401) {
      throw new Error('Error de autenticación con el servicio de IA.');
    }
    
    throw new Error('Error al comunicarse con el servicio de IA.');
  }
}
