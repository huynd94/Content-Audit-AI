import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetReviewStatsQueryKey,
  getListReviewsQueryKey,
  useCreateReview,
  useGetReviewStats,
  useListCategories,
  useListReviews,
} from "@workspace/api-client-react";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  LoaderCircle,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { ReviewStatusBadge } from "@/components/reviews/ReviewStatusBadge";

function getUrlPreview(rawValue: string) {
  try {
    const parsed = new URL(rawValue);
    return {
      hostname: parsed.hostname,
      pathname: parsed.pathname === "/" ? "Trang chủ" : parsed.pathname,
      protocol: parsed.protocol.replace(":", "").toUpperCase(),
    };
  } catch {
    return null;
  }
}

function getProgressIndex(statusMessage: string) {
  if (!statusMessage) return 0;
  if (statusMessage.toLowerCase().includes("tao")) return 1;
  if (statusMessage.toLowerCase().includes("tai")) return 2;
  if (statusMessage.toLowerCase().includes("ai")) return 3;
  return 4;
}

const STEPS = [
  { title: "Tạo phiên audit", description: "Khởi tạo request và khóa category." },
  { title: "Lấy nội dung trang", description: "Thu thập title, meta, H1 và body." },
  { title: "Phân tích với AI", description: "Đối chiếu SEO, Ads, Shopping và GDN." },
  { title: "Sinh báo cáo", description: "Xuất issue list và điểm ưu tiên sửa." },
];

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

  const selectedCategory = categories?.find((category) => category.id === selectedCategoryId);
  const urlPreview = getUrlPreview(url.trim());
  const progressIndex = isAnalyzing ? getProgressIndex(statusMessage) : 0;
  const statCards = stats
    ? [
        { label: "Tong review", value: stats.totalReviews, icon: FileText },
        { label: "Da hoan thanh", value: stats.completedReviews, icon: CheckCircle2 },
        {
          label: "Avg SEO",
          value: stats.avgSeoScore != null ? Math.round(Number(stats.avgSeoScore)) : "—",
          icon: Radar,
        },
        {
          label: "Avg tong the",
          value: stats.avgOverallScore != null ? Math.round(Number(stats.avgOverallScore)) : "—",
          icon: ShieldCheck,
        },
      ]
    : [];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedCategoryId || !url.trim() || !selectedCategory) {
      return;
    }

    setError("");
    setIsAnalyzing(true);
    setStatusMessage("Dang tao yeu cau phan tich...");

    let reviewId: number;

    try {
      const review = await createReview.mutateAsync({
        data: { url: url.trim(), categoryId: selectedCategoryId },
      });
      reviewId = review.id;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Khong the tao yeu cau review.");
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await fetch("/api/reviews/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          categoryId: selectedCategoryId,
          categoryName: selectedCategory.name,
          categoryGuidelines: selectedCategory.guidelines,
          reviewId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Ket noi phan tich that bai.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          try {
            const payload = JSON.parse(line.slice(6));

            if (payload.done) {
              break;
            }

            if (payload.type === "status") {
              setStatusMessage(payload.message);
            }

            if (payload.type === "error") {
              throw new Error(payload.message);
            }

            if (payload.type === "complete") {
              queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetReviewStatsQueryKey() });
              navigate(`/reviews/${payload.reviewId}`);
              return;
            }
          } catch (streamError) {
            if (streamError instanceof Error) {
              throw streamError;
            }
          }
        }
      }
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : "Loi khi phan tich noi dung.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-xl shadow-sky-100/50 backdrop-blur-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Audit flow
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Review mot landing page theo SEO, Google Ads, Shopping va GDN trong cung mot luong.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Nhap URL, chon category, va nhan report co diem so, muc do uu tien, va huong sua cu the.
            He thong nay duoc chuan hoa de dung OpenAI key tu <code className="rounded bg-slate-100 px-1.5 py-0.5">.env</code>.
          </p>

          {statCards.length > 0 && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">{card.label}</span>
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-8 text-white shadow-xl shadow-slate-200/60">
          <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Cach app van hanh</div>
          <div className="mt-3 text-2xl font-semibold">3 buoc de ra quyet dinh sua content</div>
          <div className="mt-6 space-y-4">
            {[
              {
                icon: Link2,
                title: "1. Chon category",
                description: "Policy checklist thay doi theo loai san pham, khong review chung chung.",
              },
              {
                icon: Globe,
                title: "2. Quet page",
                description: "Lay title, meta, H1 va noi dung thuc de danh gia rui ro.",
              },
              {
                icon: ShieldCheck,
                title: "3. Uu tien sua",
                description: "Bao cao tra ve severity, score va danh sach viec can lam ngay.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg shadow-sky-100/40 backdrop-blur-xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Task-first input</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Bat dau mot audit moi</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Form nay duoc toi uu cho mot action duy nhat: nhap URL dung, chon policy dung, va chay audit khong bi loang.
              </p>
            </div>

            <Link href="/history" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary hover:text-primary">
              Lich su
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="url-input" className="block text-sm font-medium text-slate-800">
                URL bai viet / landing page
              </label>
              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <input
                    id="url-input"
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com/san-pham/..."
                    required
                    data-testid="input-url"
                    className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                  />
                  <div className="mt-1 text-sm text-slate-500">
                    {urlPreview
                      ? `${urlPreview.protocol} · ${urlPreview.hostname} · ${urlPreview.pathname}`
                      : "Nhap URL cong khai de he thong tai noi dung va phan tich."}
                  </div>
                </div>
                <a
                  href={url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary ${
                    !urlPreview ? "pointer-events-none opacity-50" : ""
                  }`}
                  title="Mo link"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-800">Danh muc san pham</label>
              <div className="grid gap-3 md:grid-cols-2">
                {categories?.map((category) => {
                  const isSelected = selectedCategoryId === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      data-testid={`category-${category.slug}`}
                      className={`rounded-3xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md shadow-sky-100"
                          : "border-slate-200 bg-slate-50/70 hover:border-primary/40 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{category.icon}</div>
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-slate-900">{category.name}</div>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{category.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isAnalyzing && statusMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                <LoaderCircle className="h-4 w-4 animate-spin shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm leading-6 text-slate-500">
                Server key duoc cau hinh tai backend qua <code className="rounded bg-slate-100 px-1.5 py-0.5">OPENAI_API_KEY</code>.
              </div>

              <button
                type="submit"
                disabled={!selectedCategoryId || !urlPreview || isAnalyzing}
                data-testid="button-submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Dang phan tich
                  </>
                ) : (
                  <>
                    Chay audit ngay
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg shadow-emerald-100/40 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Live context</div>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Preview truoc khi chay</h3>
              </div>
              {selectedCategory && <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">{selectedCategory.icon} {selectedCategory.name}</span>}
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Domain preview</div>
                <div className="mt-2 text-lg font-medium text-slate-950">{urlPreview?.hostname ?? "Chua co domain hop le"}</div>
                <div className="mt-1 text-sm text-slate-500">{urlPreview?.pathname ?? "Nhap URL de kiem tra du lieu nguon."}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Policy focus</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedCategory
                    ? selectedCategory.guidelines.split("\n").filter(Boolean).slice(0, 3).join(" ")
                    : "Chon category de hien thi bo guideline duoc dung trong prompt."}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-lg shadow-slate-200/70">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Tien do audit</div>
            <div className="mt-2 text-xl font-semibold">Mot luong, bon checkpoint</div>
            <div className="mt-6 space-y-3">
              {STEPS.map((step, index) => {
                const isDone = progressIndex > index + 1;
                const isCurrent = progressIndex === index + 1;

                return (
                  <div
                    key={step.title}
                    className={`rounded-2xl border px-4 py-3 ${
                      isCurrent
                        ? "border-sky-300 bg-sky-400/10"
                        : isDone
                          ? "border-emerald-300/40 bg-emerald-400/10"
                          : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        isCurrent
                          ? "bg-sky-300 text-slate-950"
                          : isDone
                            ? "bg-emerald-300 text-slate-950"
                            : "bg-white/10 text-slate-300"
                      }`}>
                        {isCurrent ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span className="text-sm font-semibold">{index + 1}</span>}
                      </div>
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="text-sm text-slate-300">{step.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-100/60 backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Recent output</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Nhin nhanh 5 audit gan day</h2>
          </div>
          <Link href="/history" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary hover:text-primary">
            Mo lich su
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {!reviews || reviews.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center text-sm text-slate-500">
            Chua co audit nao. Nhap URL dau tien de bat dau.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {reviews.map((review) => {
              const result = review.result as Record<string, number> | undefined;

              return (
                <Link
                  key={review.id}
                  href={`/reviews/${review.id}`}
                  data-testid={`review-card-${review.id}`}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{review.categoryName ?? "Chua gan category"}</div>
                      <div className="mt-1 truncate text-sm text-slate-500">{review.url}</div>
                    </div>
                    <ReviewStatusBadge status={review.status} />
                  </div>

                  {review.status === "completed" && result && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { label: "SEO", value: result.seoScore },
                        { label: "Ads", value: result.adsScore },
                        { label: "Tong", value: result.overallScore },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
