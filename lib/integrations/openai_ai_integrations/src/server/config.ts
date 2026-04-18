export function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Biến môi trường ${name} là bắt buộc trước khi dùng OpenAI integrations.`);
  }

  return value;
}

export const openAIClientConfig = {
  apiKey: readRequiredEnv("OPENAI_API_KEY"),
  ...(process.env.OPENAI_BASE_URL?.trim()
    ? { baseURL: process.env.OPENAI_BASE_URL.trim() }
    : {}),
} as const;
