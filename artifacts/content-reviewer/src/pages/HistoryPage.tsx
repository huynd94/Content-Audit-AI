import { useState } from "react";
import { useListReviews, useListCategories, useDeleteReview, getListReviewsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle, Clock, Loader2, XCircle, Trash2, ExternalLink, ChevronRight, Filter } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />Hoàn thành</span>;
  if (status === "analyzing") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"><Loader2 className="w-3 h-3 animate-spin" />Đang phân tích</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Lỗi</span>;
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"><Clock className="w-3 h-3" />Chờ</span>;
}

function ScorePill({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? "text-blue-600" : score >= 75 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="flex flex-col items-center">
      <span className={`text-base font-bold ${color}`}>{score}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function HistoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useListReviews();
  const { data: categories } = useListCategories();
  const deleteReview = useDeleteReview();

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Bạn có chắc muốn xóa review này?")) return;
    await deleteReview.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
  };

  const filtered = reviews?.filter((r) => {
    if (selectedCategory !== "all" && r.categoryId !== selectedCategory) return false;
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
    return true;
  }) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Lịch sử phân tích</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} kết quả</p>
        </div>

        <Link href="/" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Phân tích mới
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          Lọc:
        </div>

        <select
          value={selectedCategory === "all" ? "all" : String(selectedCategory)}
          onChange={(e) => setSelectedCategory(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
          data-testid="filter-category"
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Tất cả danh mục</option>
          {categories?.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          data-testid="filter-status"
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="completed">Hoàn thành</option>
          <option value="analyzing">Đang phân tích</option>
          <option value="pending">Chờ</option>
          <option value="failed">Lỗi</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <p>Chưa có review nào phù hợp với bộ lọc.</p>
          <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">Tạo review mới</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => {
            const result = review.result as Record<string, number> | null;
            return (
              <Link
                key={review.id}
                href={`/reviews/${review.id}`}
                className="block bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-all group"
                data-testid={`history-item-${review.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium">{review.categoryName ?? "—"}</span>
                      <StatusBadge status={review.status} />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="truncate">{review.url}</span>
                      <a
                        href={review.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(review.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </div>
                  </div>

                  {result && review.status === "completed" && (
                    <div className="flex items-center gap-5 shrink-0">
                      <ScorePill score={result.seoScore ?? 0} label="SEO" />
                      <ScorePill score={result.adsScore ?? 0} label="Ads" />
                      <ScorePill score={result.overallScore ?? 0} label="Tổng" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(review.id, e)}
                      data-testid={`delete-${review.id}`}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
