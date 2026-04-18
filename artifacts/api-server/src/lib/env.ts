function parsePositiveInteger(rawValue: string | undefined, fallback: number): number {
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function parseBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (rawValue == null) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseCsv(rawValue: string | undefined): string[] {
  return (rawValue ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV === "production"
  ? "production"
  : process.env.NODE_ENV === "test"
    ? "test"
    : "development";

export const appEnv = {
  nodeEnv,
  openAIModel: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  openAIMaxCompletionTokens: parsePositiveInteger(process.env.OPENAI_MAX_COMPLETION_TOKENS, 8192),
  fetchContentTimeoutMs: parsePositiveInteger(process.env.FETCH_CONTENT_TIMEOUT_MS, 15000),
  fetchContentMaxAttempts: parsePositiveInteger(process.env.FETCH_CONTENT_MAX_ATTEMPTS, 2),
  fetchContentMaxChars: parsePositiveInteger(process.env.FETCH_CONTENT_MAX_CHARS, 8000),
  corsOrigins: parseCsv(process.env.CORS_ORIGIN),
  trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  createReviewRateLimitMax: parsePositiveInteger(process.env.CREATE_REVIEW_RATE_LIMIT_MAX, 20),
  analyzeReviewRateLimitMax: parsePositiveInteger(process.env.ANALYZE_RATE_LIMIT_MAX, 10),
  rateLimitWindowMs: parsePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
} as const;
