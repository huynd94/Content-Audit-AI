import { Router, type IRouter } from "express";
import { db, reviewsTable, categoriesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import {
  CreateReviewBody,
  ListReviewsQueryParams,
  GetReviewParams,
  DeleteReviewParams,
  AnalyzeContentBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// Build the AI analysis prompt based on category guidelines
function buildAnalysisPrompt(url: string, categoryName: string, categoryGuidelines: string, content: string): string {
  return `Bạn là chuyên gia phân tích nội dung và chính sách quảng cáo Google. Hãy review nội dung bài viết sau đây theo chuẩn SEO và chính sách Google (Google Ads, Google Shopping, GDN).

URL: ${url}
Danh mục sản phẩm: ${categoryName}

CHÍNH SÁCH VÀ TIÊU CHUẨN CẦN KIỂM TRA:
${categoryGuidelines}

NỘI DUNG BÀI VIẾT/TRANG SẢN PHẨM:
${content}

Hãy phân tích và trả về kết quả theo format JSON sau (CHỈ trả về JSON, không có text khác):

{
  "seoScore": <0-100>,
  "adsScore": <0-100>,
  "shoppingScore": <0-100>,
  "gdnScore": <0-100>,
  "overallScore": <0-100>,
  "summary": "<Tóm tắt tổng quan về chất lượng nội dung>",
  "issues": [
    {
      "type": "<seo|google_ads|google_shopping|gdn|content_quality|policy_violation>",
      "severity": "<critical|major|minor|suggestion>",
      "title": "<Tiêu đề vấn đề ngắn gọn>",
      "description": "<Mô tả chi tiết vấn đề cụ thể trong bài viết>",
      "location": "<Vị trí trong bài viết: title, meta_description, h1, body, image, url hoặc null>",
      "recommendation": "<Hướng dẫn sửa chữa cụ thể, chi tiết>"
    }
  ],
  "criticalCount": <số lỗi critical>,
  "majorCount": <số lỗi major>,
  "minorCount": <số lỗi minor>,
  "suggestionCount": <số gợi ý>
}

Hãy phân tích toàn diện:
- SEO: Title, meta description, H1, cấu trúc nội dung, từ khóa, liên kết, hình ảnh
- Google Ads: Vi phạm chính sách, tuyên bố quá mức, từ ngữ bị cấm
- Google Shopping: Tên sản phẩm, mô tả, thông tin bắt buộc
- GDN: Hình ảnh, nội dung gây hiểu nhầm, đối tượng mục tiêu
- Chất lượng nội dung chung: Tính chính xác, đầy đủ, rõ ràng

Với mỗi vấn đề tìm thấy, hãy chỉ rõ:
- Chính xác vấn đề là gì
- Tại sao đây là vấn đề
- Cần sửa cụ thể như thế nào`;
}

// Helper to fetch URL content with timeout
async function fetchUrlContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContentReviewer/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "vi,en;q=0.9",
      }
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    // Strip HTML tags and get text content (simple approach)
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
    
    // Extract key elements from raw HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    
    const keyElements = [
      titleMatch ? `TITLE TAG: ${titleMatch[1].trim()}` : "TITLE TAG: Không tìm thấy",
      metaDescMatch ? `META DESCRIPTION: ${metaDescMatch[1].trim()}` : "META DESCRIPTION: Không tìm thấy",
      h1Match ? `H1: ${h1Match[1].trim()}` : "H1: Không tìm thấy",
    ].join("\n");
    
    // Limit content to avoid token limits
    const truncatedContent = text.slice(0, 8000);
    
    return `${keyElements}\n\nNỘI DUNG TRANG:\n${truncatedContent}`;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// GET /reviews/stats (must be before /reviews/:id)
router.get("/reviews/stats", async (req, res): Promise<void> => {
  try {
    const total = await db.select({ count: sql<number>`count(*)` }).from(reviewsTable);
    const completed = await db.select({ count: sql<number>`count(*)` })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "completed"));
    
    const avgScores = await db.select({
      avgSeo: sql<number>`avg((result->>'seoScore')::numeric)`,
      avgAds: sql<number>`avg((result->>'adsScore')::numeric)`,
      avgOverall: sql<number>`avg((result->>'overallScore')::numeric)`,
    }).from(reviewsTable).where(eq(reviewsTable.status, "completed"));

    const byCategory = await db.select({
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
      reviewsByCategory: byCategory.map(r => ({
        categoryName: r.categoryName ?? "Unknown",
        count: Number(r.count),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get review stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// GET /reviews
router.get("/reviews", async (req, res): Promise<void> => {
  const parsed = ListReviewsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    let query = db
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
      .orderBy(desc(reviewsTable.createdAt));

    const reviews = await query;
    res.json(reviews);
  } catch (err) {
    req.log.error({ err }, "Failed to list reviews");
    res.status(500).json({ error: "Failed to list reviews" });
  }
});

// POST /reviews
router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [review] = await db.insert(reviewsTable).values({
      url: parsed.data.url,
      categoryId: parsed.data.categoryId,
      status: "pending",
    }).returning();

    res.status(201).json({
      ...review,
      categoryName: null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create review");
    res.status(500).json({ error: "Failed to create review" });
  }
});

// POST /reviews/analyze - SSE streaming analysis
router.post("/reviews/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, categoryId, categoryName, categoryGuidelines, reviewId } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Update status to analyzing
    await db.update(reviewsTable)
      .set({ status: "analyzing", updatedAt: new Date() })
      .where(eq(reviewsTable.id, reviewId));

    sendEvent({ type: "status", message: "Đang tải nội dung trang..." });

    // Fetch page content
    let pageContent: string;
    try {
      pageContent = await fetchUrlContent(url);
    } catch (fetchErr) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      sendEvent({ type: "status", message: `Không thể tải trang: ${errMsg}. Đang phân tích URL...` });
      pageContent = `URL: ${url}\n(Không thể tải nội dung trang - phân tích dựa trên URL và danh mục)`;
    }

    sendEvent({ type: "status", message: "Đang phân tích nội dung với AI..." });

    const prompt = buildAnalysisPrompt(url, categoryName, categoryGuidelines, pageContent);

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia SEO và chính sách quảng cáo Google với 10 năm kinh nghiệm. Phân tích nội dung và trả về JSON hợp lệ."
        },
        { role: "user", content: prompt }
      ],
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        sendEvent({ type: "chunk", content });
      }
    }

    // Parse the JSON response
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI không trả về JSON hợp lệ");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Save result to DB
    await db.update(reviewsTable)
      .set({
        status: "completed",
        result: result,
        updatedAt: new Date(),
      })
      .where(eq(reviewsTable.id, reviewId));

    sendEvent({ type: "complete", result, reviewId });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Analysis failed");
    
    await db.update(reviewsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(reviewsTable.id, reviewId))
      .catch(() => {});

    sendEvent({ type: "error", message: err instanceof Error ? err.message : "Lỗi phân tích" });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

// GET /reviews/:id
router.get("/reviews/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetReviewParams.safeParse({ id: rawId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
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
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.json(review);
  } catch (err) {
    req.log.error({ err }, "Failed to get review");
    res.status(500).json({ error: "Failed to get review" });
  }
});

// DELETE /reviews/:id
router.delete("/reviews/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteReviewParams.safeParse({ id: rawId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [deleted] = await db.delete(reviewsTable)
      .where(eq(reviewsTable.id, parsed.data.id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Failed to delete review");
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
