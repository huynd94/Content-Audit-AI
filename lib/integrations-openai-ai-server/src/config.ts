export interface OpenAIClientConfig {
  apiKey: string;
  baseURL?: string;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  return value;
}

export const openAIClientConfig: OpenAIClientConfig = {
  apiKey: readRequiredEnv("OPENAI_API_KEY"),
  ...(process.env.OPENAI_BASE_URL?.trim()
    ? { baseURL: process.env.OPENAI_BASE_URL.trim() }
    : {}),
};
