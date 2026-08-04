export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Reads OpenAI-compatible LLM configuration from environment.
 * @throws Error when LLM_API_KEY is missing
 */
export function getLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  const apiKey = env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LLM_API_KEY is required. Set LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL in environment.",
    );
  }

  return {
    apiKey,
    baseUrl: env.LLM_BASE_URL ?? "https://api.openai.com/v1",
    model: env.LLM_MODEL ?? "gpt-4o",
  };
}
