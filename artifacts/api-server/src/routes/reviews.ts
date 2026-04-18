import { Router, type IRouter } from "express";
import { db, reviewsTable, categoriesTable } from "@workspace/db";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import {
  AnalyzeContentBody,
  CreateReviewBody,
  DeleteReviewParams,
  GetReviewParams,
  ListReviewsQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { appEnv } from "../lib/env";
import { ensureAuditStorage } from "../lib/storage";
import { createRateLimiter } from "../lib/rate-limit";
import { assertHttpUrl, assertSafePublicHttpUrl } from "../lib/ssrf";

const router: IRouter = Router();
const createReviewRateLimiter = createRateLimiter({
  keyPrefix: "create-review",
  windowMs: appEnv.rateLimitWindowMs,
  max: appEnv.createReviewRateLimitMax,
  message: "Bạn đã tạo quá nhiều lượt kiểm duyệt. Vui lòng thử lại sau.",
});
const analyzeReviewRateLimiter = createRateLimiter({
  keyPrefix: "analyze-review",
  windowMs: appEnv.rateLimitWindowMs,
  max: appEnv.analyzeReviewRateLimitMax,
  message: "Bạn đã gửi quá nhiều yêu cầu phân tích. Vui lòng thử lại sau.",
});

type ReviewStatus = "pending" | "analyzing" | "completed" | "failed";

function buildAnalysisPrompt(
  url: string,
  categoryName: string,
  categoryGuidelines: string,
  content: string,
): string {
  return `Bạn là chuyên gia kiểm duyệt nội dung cho SEO và chính sách quảng cáo Google.

URL: ${url}
Danh mục: ${categoryName}

DANH SÁCH KIỂM TRA CHÍNH SÁCH VÀ CHẤT LƯỢNG:
${categoryGuidelines}

NỘI DUNG TRANG:
${content}

Chỉ trả về JSON hợp lệ. Không dùng markdown. Không viết thêm nội dung ngoài JSON.
Toàn bộ giá trị chuỗi trong JSON phải viết bằng tiếng Việt có dấu.

{
  "seoScore": <0-100>,
  "adsScore": <0-100>,
  "shoppingScore": <0-100>,
  "gdnScore": <0-100>,
  "overallScore": <0-100>,
  "summary": "<tóm tắt cấp cao>",
  "issues": [
    {
      "type": "<seo|google_ads|google_shopping|gdn|content_quality|policy_violation>",
      "severity": "<critical|major|minor|suggestion>",
      "title": "<tiêu đề ngắn của vấn đề>",
      "description": "<mô tả cụ thể vấn đề>",
      "location": "<title|meta_description|h1|body|image|url|null nếu không xác định>",
      "recommendation": "<hướng xử lý cụ thể>"
    }
  ],
  "criticalCount": <number>,
  "majorCount": <number>,
  "minorCount": <number>,
  "suggestionCount": <number>
}

Hãy rà soát đầy đủ các hạng mục sau:
- Cấu trúc SEO, metadata, heading, liên kết nội bộ, độ rõ của từ khóa, chất lượng hình ảnh.
- Rủi ro chính sách Google Ads, từ ngữ phóng đại, cách diễn đạt bị hạn chế, nhắm mục tiêu không an toàn.
- Chất lượng tiêu đề và mô tả cho Google Shopping, mức độ đầy đủ của thông tin bắt buộc.
- Mức độ phù hợp với GDN, creative gây hiểu lầm, độ nhạy cảm với đối tượng, hình ảnh minh họa.
- Chất lượng nội dung tổng thể, độ rõ ràng, độ chính xác thực tế và mức độ đầy đủ.

Với mỗi vấn đề, hãy nêu rõ: sai ở đâu, vì sao quan trọng và cần sửa như thế nào.`;
}

function shouldRetryFetch(statusCode?: number, error?: unknown): boolean {
  if (statusCode != null) {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
  }

  if (error instanceof Error) {
    return error.name === "AbortError" || error.name === "TypeError";
  }

  return false;
}

async function fetchPageHtml(targetUrl: URL): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= appEnv.fetchContentMaxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), appEnv.fetchContentTimeoutMs);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        redirect: "error",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ContentReviewer/1.0)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "vi,en;q=0.9",
        },
      });

      if (!response.ok) {
        if (attempt < appEnv.fetchContentMaxAttempts && shouldRetryFetch(response.status)) {
          continue;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;

      if (attempt >= appEnv.fetchContentMaxAttempts || !shouldRetryFetch(undefined, error)) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Không thể tải nội dung trang.");
}

async function fetchUrlContent(targetUrl: URL): Promise<string> {
  const html = await fetchPageHtml(targetUrl);
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);

  const keyElements = [
    titleMatch ? `THẺ TITLE: ${titleMatch[1].trim()}` : "THẺ TITLE: Không tìm thấy",
    metaDescMatch ? `THẺ META DESCRIPTION: ${metaDescMatch[1].trim()}` : "THẺ META DESCRIPTION: Không tìm thấy",
    h1Match ? `H1: ${h1Match[1].trim()}` : "H1: Không tìm thấy",
  ].join("\n");

  return `${keyElements}\n\nNỘI DUNG TRANG:\n${text.slice(0, appEnv.fetchContentMaxChars)}`;
}

router.get("/reviews/stats", async (req, res): Promise<void> => {
  try {
    await ensureAuditStorage();
    const total = await db.select({ count: sql<number>`count(*)` }).from(reviewsTable);
    const completed = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "completed"));

    const avgScores = await db
      .select({
        avgSeo: sql<number>`avg((result->>'seoScore')::numeric)`,
        avgAds: sql<number>`avg((result->>'adsScore')::numeric)`,
        avgOverall: sql<number>`avg((result->>'overallScore')::numeric)`,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "completed"));

    const byCategory = await db
      .select({
        categoryName: categoriesTable.name,
        count: sql<number>`count(${reviewsTable.id})`,
      })
      .from(reviewsTable)
      .leftJoin(categoriesTable, eq(reviewsTable.categoryId, categoriesTable.id))
      .groupBy(categoriesTable.name);

    res.json({
      totalReviews: Number(total[0]?.count ?? 0),
      completedReviews: Number(completed[0]?.count ?? 0),
      avgSeoScore: avgScores[0]?.avgSeo ?? null,
      avgAdsScore: avgScores[0]?.avgAds ?? null,
      avgOverallScore: avgScores[0]?.avgOverall ?? null,
      reviewsByCategory: byCategory.map((row) => ({
        categoryName: row.categoryName ?? "Chưa xác định",
        count: Number(row.count),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Không thể lấy thống kê kiểm duyệt");
    res.status(500).json({ error: "Không thể lấy thống kê." });
  }
});

router.get("/reviews", async (req, res): Promise<void> => {
  const parsed = ListReviewsQueryParams.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const queryParams = parsed.data as typeof parsed.data & {
    q?: string | null;
    status?: ReviewStatus | null;
  };

  try {
    await ensureAuditStorage();
    const filters: SQL[] = [];
    const searchTerm = queryParams.q?.trim();

    if (queryParams.categoryId != null) {
      filters.push(eq(reviewsTable.categoryId, queryParams.categoryId));
    }

    if (queryParams.status) {
      filters.push(eq(reviewsTable.status, queryParams.status));
    }

    if (searchTerm) {
      filters.push(
        or(
          ilike(reviewsTable.url, `%${searchTerm}%`),
          ilike(categoriesTable.name, `%${searchTerm}%`),
        )!,
      );
    }

    const baseQuery = db
      .select({
        id: reviewsTable.id,
        url: reviewsTable.url,
        categoryId: reviewsTable.categoryId,
        categoryName: categoriesTable.name,
        title: reviewsTable.title,
        status: reviewsTable.status,
        result: reviewsTable.result,
        createdAt: reviewsTable.createdAt,
        updatedAt: reviewsTable.updatedAt,
      })
      .from(reviewsTable);

    const joinedQuery = baseQuery.leftJoin(
      categoriesTable,
      eq(reviewsTable.categoryId, categoriesTable.id),
    );

    const filteredQuery = filters.length > 0
      ? joinedQuery.where(filters.length === 1 ? filters[0] : and(...filters)!)
      : joinedQuery;

    const orderedQuery = filteredQuery.orderBy(desc(reviewsTable.createdAt));
    const reviews = queryParams.limit != null
      ? await orderedQuery.limit(Math.max(1, Math.min(queryParams.limit, 50)))
      : await orderedQuery;
    res.json(reviews);
  } catch (err) {
    req.log.error({ err }, "Không thể lấy danh sách kiểm duyệt");
    res.status(500).json({ error: "Không thể lấy danh sách kiểm duyệt." });
  }
});

router.post("/reviews", createReviewRateLimiter, async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    await ensureAuditStorage();
    assertHttpUrl(parsed.data.url);

    const [review] = await db
      .insert(reviewsTable)
      .values({
        url: parsed.data.url,
        categoryId: parsed.data.categoryId,
        status: "pending",
      })
      .returning();

    res.status(201).json({
      ...review,
      categoryName: null,
    });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }

    req.log.error({ err }, "Không thể tạo lượt kiểm duyệt");
    res.status(500).json({ error: "Không thể tạo lượt kiểm duyệt." });
  }
});

router.post("/reviews/analyze", analyzeReviewRateLimiter, async (req, res): Promise<void> => {
  const parsed = AnalyzeContentBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, categoryName, categoryGuidelines, reviewId } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await ensureAuditStorage();
    const safeUrl = await assertSafePublicHttpUrl(url);

    await db
      .update(reviewsTable)
      .set({ status: "analyzing", updatedAt: new Date() })
      .where(eq(reviewsTable.id, reviewId));

    sendEvent({ type: "status", message: "Đang tải nội dung trang..." });

    let pageContent: string;

    try {
      pageContent = await fetchUrlContent(safeUrl);
    } catch (fetchErr) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      sendEvent({ type: "status", message: `Không thể tải trang: ${errMsg}. Đang phân tích dựa trên URL...` });
      pageContent = `URL: ${url}\n(Không thể tải nội dung trang, hệ thống sẽ phân tích dựa trên URL và danh mục.)`;
    }

    sendEvent({ type: "status", message: "Đang phân tích nội dung với AI..." });

    const prompt = buildAnalysisPrompt(url, categoryName, categoryGuidelines, pageContent);

    const stream = await openai.chat.completions.create({
      model: appEnv.openAIModel,
      max_completion_tokens: appEnv.openAIMaxCompletionTokens,
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia về SEO và chính sách quảng cáo Google. Chỉ trả về JSON hợp lệ với nội dung tiếng Việt có dấu.",
        },
        { role: "user", content: prompt },
      ],
      stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;

      if (!content) {
        continue;
      }

      fullResponse += content;
      sendEvent({ type: "chunk", content });
    }

    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("AI không trả về JSON hợp lệ.");
    }

    const result = JSON.parse(jsonMatch[0]);

    await db
      .update(reviewsTable)
      .set({
        status: "completed",
        result,
        updatedAt: new Date(),
      })
      .where(eq(reviewsTable.id, reviewId));

    sendEvent({ type: "complete", result, reviewId });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Phân tích nội dung thất bại");

    await db
      .update(reviewsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(reviewsTable.id, reviewId))
      .catch(() => {});

    sendEvent({
      type: "error",
      message: err instanceof Error ? err.message : "Lỗi phân tích.",
    });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

router.get("/reviews/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetReviewParams.safeParse({ id: rawId });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    await ensureAuditStorage();
    const [review] = await db
      .select({
        id: reviewsTable.id,
        url: reviewsTable.url,
        categoryId: reviewsTable.categoryId,
        categoryName: categoriesTable.name,
        title: reviewsTable.title,
        status: reviewsTable.status,
        result: reviewsTable.result,
        createdAt: reviewsTable.createdAt,
        updatedAt: reviewsTable.updatedAt,
      })
      .from(reviewsTable)
      .leftJoin(categoriesTable, eq(reviewsTable.categoryId, categoriesTable.id))
      .where(eq(reviewsTable.id, parsed.data.id));

    if (!review) {
      res.status(404).json({ error: "Không tìm thấy lượt kiểm duyệt." });
      return;
    }

    res.json(review);
  } catch (err) {
    req.log.error({ err }, "Không thể lấy chi tiết kiểm duyệt");
    res.status(500).json({ error: "Không thể lấy chi tiết kiểm duyệt." });
  }
});

router.delete("/reviews/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteReviewParams.safeParse({ id: rawId });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    await ensureAuditStorage();
    const [deleted] = await db
      .delete(reviewsTable)
      .where(eq(reviewsTable.id, parsed.data.id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Không tìm thấy lượt kiểm duyệt." });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Không thể xóa lượt kiểm duyệt");
    res.status(500).json({ error: "Không thể xóa lượt kiểm duyệt." });
  }
});

export default router;
