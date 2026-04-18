import { useDeferredValue, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListReviewsQueryKey, useDeleteReview, useListCategories, useListReviews } from "@workspace/api-client-react";
import { ExternalLink, Filter, LoaderCircle, Search, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { ReviewStatusBadge } from "@/components/reviews/ReviewStatusBadge";

type ReviewStatusFilter = "all" | "pending" | "analyzing" | "completed" | "failed";

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatusFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data: categories } = useListCategories();
  const { data: reviews, isLoading } = useListReviews({
    categoryId: selectedCategory === "all" ? undefined : selectedCategory,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    q: deferredSearch.trim() || undefined,
    limit: 50,
  });
  const deleteReview = useDeleteReview();

  const handleDelete = async (id: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!confirm("Ban co chac muon xoa review nay?")) {
      return;
    }

    await deleteReview.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-100/60 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Review log</div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Lich su audit</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Tim nhanh theo domain, category, trang thai, va mo lai cac report can sua tiep.
            </p>
          </div>

          <Link href="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Audit moi
          </Link>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr]">
          <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tim theo domain, URL, category..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </label>

          <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory === "all" ? "all" : String(selectedCategory)}
              onChange={(event) => setSelectedCategory(event.target.value === "all" ? "all" : parseInt(event.target.value, 10))}
              data-testid="filter-category"
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="all">Tat ca category</option>
              {categories?.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as ReviewStatusFilter)}
              data-testid="filter-status"
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="all">Tat ca trang thai</option>
              <option value="completed">Hoan thanh</option>
              <option value="analyzing">Dang phan tich</option>
              <option value="pending">Cho xu ly</option>
              <option value="failed">Loi</option>
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm">
              <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : !reviews || reviews.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/75 p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <LoaderCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Khong tim thay review phu hop</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Thu xoa bot bo loc hoac bat dau mot audit moi de tao du lieu dau vao.
          </p>
          <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            Tao audit moi
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => {
            const result = review.result as Record<string, number> | undefined;

            return (
              <Link
                key={review.id}
                href={`/reviews/${review.id}`}
                data-testid={`history-item-${review.id}`}
                className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-md shadow-slate-100/50 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-lg font-medium text-slate-950">{review.categoryName ?? "Chua gan category"}</div>
                      <ReviewStatusBadge status={review.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                        {getHostname(review.url)}
                      </span>
                      <span className="truncate">{review.url}</span>
                      <a
                        href={review.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Mo link
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {review.status === "completed" && result && (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "SEO", value: result.seoScore },
                          { label: "Ads", value: result.adsScore },
                          { label: "Tong", value: result.overallScore },
                        ].map((item) => (
                          <div key={item.label} className="min-w-24 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                            <div className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(event) => handleDelete(review.id, event)}
                      data-testid={`delete-${review.id}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
