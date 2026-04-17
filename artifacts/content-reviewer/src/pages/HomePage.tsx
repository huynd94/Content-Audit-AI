import { useState } from "react";
import { useLocation } from "wouter";
import { useListCategories, useListReviews, useCreateReview, useGetReviewStats, getListReviewsQueryKey, getGetReviewStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertCircle, ExternalLink, CheckCircle, Clock, XCircle, Loader2, BarChart3, TrendingUp, FileText, ChevronRight } from "lucide-react";

function ScoreCircle({ score, label, size = "sm" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const color = score >= 90 ? "#3b82f6" : score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const sz = size === "lg" ? 80 : 56;
  const stroke = size === "lg" ? 7 : 5;
  const r = (sz / 2) - stroke;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={sz} height={sz} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={sz / 2} cy={sz / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text x={sz / 2} y={sz / 2} textAnchor="middle" dominantBaseline="middle"
          style={{ transform: "rotate(90deg)", transformOrigin: `${sz / 2}px ${sz / 2}px`, fill: color, fontWeight: 700, fontSize: size === "lg" ? 20 : 13 }}>
          {score}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />Hoàn thành</span>;
  if (status === "analyzing") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"><Loader2 className="w-3 h-3 animate-spin" />Đang phân tích</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Lỗi</span>;
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"><Clock className="w-3 h-3" />Chờ</span>;
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const { data: categories } = useListCategories();
  const { data: reviews } = useListReviews({ limit: 5 });
  const { data: stats } = useGetReviewStats();
  const createReview = useCreateReview();

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !url.trim()) return;

    setError("");
    setIsAnalyzing(true);
    setStatusMessage("Đang tạo yêu cầu phân tích...");

    let reviewId: number;
    try {
      const review = await createReview.mutateAsync({
        data: { url: url.trim(), categoryId: selectedCategoryId },
      });
      reviewId = review.id;
    } catch {
      setError("Không thể tạo yêu cầu review. Vui lòng thử lại.");
      setIsAnalyzing(false);
      return;
    }

    // SSE streaming analysis
    try {
      const response = await fetch("/api/reviews/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          categoryId: selectedCategoryId,
          categoryName: selectedCategory!.name,
          categoryGuidelines: selectedCategory!.guidelines,
          reviewId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Kết nối phân tích thất bại");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.done) break;
            if (event.type === "status") setStatusMessage(event.message);
            if (event.type === "error") throw new Error(event.message);
            if (event.type === "complete") {
              queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetReviewStatsQueryKey() });
              navigate(`/reviews/${event.reviewId}`);
              return;
            }
          } catch (parseErr) {
            // skip malformed events
          }
        }
      }
    } catch (streamErr) {
      setError(streamErr instanceof Error ? streamErr.message : "Lỗi khi phân tích nội dung");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3" data-testid="stat-total">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalReviews}</div>
              <div className="text-xs text-muted-foreground">Tổng reviews</div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3" data-testid="stat-completed">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.completedReviews}</div>
              <div className="text-xs text-muted-foreground">Hoàn thành</div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3" data-testid="stat-seo">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stats.avgSeoScore != null ? Math.round(Number(stats.avgSeoScore)) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Avg SEO score</div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3" data-testid="stat-overall">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stats.avgOverallScore != null ? Math.round(Number(stats.avgOverallScore)) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Avg tổng thể</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main form */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl p-6">
            <h1 className="text-xl font-bold mb-1">Phân tích nội dung</h1>
            <p className="text-sm text-muted-foreground mb-5">Chọn danh mục sản phẩm, nhập URL bài viết hoặc landing page cần kiểm tra.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Danh mục sản phẩm</label>
                <div className="grid grid-cols-1 gap-2">
                  {categories?.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      data-testid={`category-${cat.slug}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedCategoryId === cat.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{cat.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{cat.description}</div>
                      </div>
                      {selectedCategoryId === cat.id && (
                        <CheckCircle className="w-4 h-4 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL input */}
              <div>
                <label htmlFor="url-input" className="block text-sm font-medium mb-2">URL bài viết / Landing page</label>
                <div className="flex gap-2">
                  <input
                    id="url-input"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/san-pham/..."
                    required
                    data-testid="input-url"
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <a
                    href={url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors ${!url ? "pointer-events-none opacity-50" : ""}`}
                    title="Mở link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {isAnalyzing && statusMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  {statusMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedCategoryId || !url.trim() || isAnalyzing}
                data-testid="button-submit"
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  "Phân tích ngay"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Recent reviews */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Reviews gần đây</h2>
              <Link href="/history" className="text-xs text-primary hover:underline">Xem tất cả</Link>
            </div>

            {!reviews || reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Chưa có review nào. Thêm URL đầu tiên để bắt đầu!
              </div>
            ) : (
              <div className="space-y-2">
                {reviews.slice(0, 5).map((review) => (
                  <Link
                    key={review.id}
                    href={`/reviews/${review.id}`}
                    className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    data-testid={`review-card-${review.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-xs font-medium truncate flex-1">{review.categoryName ?? "—"}</div>
                      <StatusBadge status={review.status} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate mb-1">{review.url}</div>
                    {review.status === "completed" && review.result && (
                      <div className="flex items-center gap-3 mt-2">
                        {[
                          { label: "SEO", val: (review.result as Record<string, number>)?.seoScore },
                          { label: "Ads", val: (review.result as Record<string, number>)?.adsScore },
                          { label: "Tổng", val: (review.result as Record<string, number>)?.overallScore },
                        ].map(({ label, val }) => {
                          const color = val >= 90 ? "text-blue-600" : val >= 75 ? "text-green-600" : val >= 50 ? "text-yellow-600" : "text-red-600";
                          return (
                            <div key={label} className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">{label}</span>
                              <span className={`text-xs font-bold ${color}`}>{val}</span>
                            </div>
                          );
                        })}
                        <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
