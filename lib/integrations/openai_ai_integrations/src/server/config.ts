export function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be set before using OpenAI integrations.`);
  }

  return value;
}

export const openAIClientConfig = {
  apiKey: readRequiredEnv("OPENAI_API_KEY"),
  ...(process.env.OPENAI_BASE_URL?.trim()
    ? { baseURL: process.env.OPENAI_BASE_URL.trim() }
    : {}),
} as const;
