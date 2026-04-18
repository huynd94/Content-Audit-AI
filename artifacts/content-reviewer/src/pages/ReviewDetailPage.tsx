import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetReviewQueryKey, getListReviewsQueryKey, useDeleteReview, useGetReview } from "@workspace/api-client-react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Info,
  Lightbulb,
  LoaderCircle,
  ShieldAlert,
  Trash2,
  ChevronDown,
  ChevronUp,
  XCircle,
} from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { ReviewStatusBadge } from "@/components/reviews/ReviewStatusBadge";

type IssueSeverity = "critical" | "major" | "minor" | "suggestion";
type IssueType = "seo" | "google_ads" | "google_shopping" | "gdn" | "content_quality" | "policy_violation";

interface ReviewIssue {
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  location: string | null;
  recommendation: string;
}

const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; tone: string; icon: typeof AlertCircle }> = {
  critical: { label: "Nghiêm trọng", tone: "border-rose-200 bg-rose-50 text-rose-700", icon: AlertCircle },
  major: { label: "Quan trọng", tone: "border-amber-200 bg-amber-50 text-amber-700", icon: AlertTriangle },
  minor: { label: "Nhỏ", tone: "border-yellow-200 bg-yellow-50 text-yellow-700", icon: Info },
  suggestion: { label: "Gợi ý", tone: "border-sky-200 bg-sky-50 text-sky-700", icon: Lightbulb },
};

const TYPE_LABELS: Record<IssueType, string> = {
  seo: "SEO",
  google_ads: "Google Ads",
  google_shopping: "Google Shopping",
  gdn: "GDN",
  content_quality: "Chất lượng nội dung",
  policy_violation: "Vi phạm chính sách",
};

function ScoreCard({ score, label }: { score: number; label: string }) {
  const tone = score >= 90
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : score >= 75
      ? "text-sky-700 bg-sky-50 border-sky-200"
      : score >= 50
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-rose-700 bg-rose-50 border-rose-200";

  return (
    <div className={`rounded-3xl border px-4 py-4 ${tone}`}>
      <div className="text-[11px] uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-3 text-4xl font-semibold">{score}</div>
    </div>
  );
}

function IssueCard({ issue }: { issue: ReviewIssue }) {
  const [expanded, setExpanded] = useState(issue.severity === "critical");
  const config = SEVERITY_CONFIG[issue.severity];
  const Icon = config.icon;

  return (
    <div className={`rounded-3xl border ${config.tone}`}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        data-testid={`issue-${issue.type}-${issue.severity}`}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/70">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              {TYPE_LABELS[issue.type]}
            </span>
            <span className="rounded-full border border-current/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              {config.label}
            </span>
            {issue.location && (
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {issue.location}
              </span>
            )}
          </div>
          <div className="mt-3 text-base font-medium">{issue.title}</div>
        </div>
        {expanded ? <ChevronUp className="mt-1 h-4 w-4 shrink-0" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-current/10 px-4 pb-4 pt-4">
          <div className="grid gap-4 rounded-2xl bg-white/60 p-4 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vấn đề</div>
              <p className="mt-2 leading-6">{issue.description}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hướng xử lý</div>
              <p className="mt-2 leading-6">{issue.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: review, isLoading } = useGetReview(id, {
    query: {
      enabled: !!id,
      queryKey: getGetReviewQueryKey(id),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "analyzing" || status === "pending" ? 2000 : false;
      },
    },
  });
  const deleteReview = useDeleteReview();

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa lượt kiểm duyệt này?")) {
      return;
    }

    await deleteReview.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4 py-10">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-10 text-center shadow-lg shadow-slate-100/60">
          <AlertCircle className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">Không tìm thấy lượt kiểm duyệt</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            URL này có thể đã bị xóa hoặc mã định danh không còn hợp lệ.
          </p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" />
            Quay về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const result = review.result as {
    seoScore: number;
    adsScore: number;
    shoppingScore: number;
    gdnScore: number;
    overallScore: number;
    issues: ReviewIssue[];
    summary: string;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    suggestionCount: number;
  } | null;

  const groupedIssues: Partial<Record<IssueType, ReviewIssue[]>> = {};
  result?.issues?.forEach((issue) => {
    if (!groupedIssues[issue.type]) {
      groupedIssues[issue.type] = [];
    }

    groupedIssues[issue.type]!.push(issue);
  });

  const topPriorityIssues = result?.issues.filter((issue) => issue.severity === "critical" || issue.severity === "major") ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-100/60 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link href="/history" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Quay lại lịch sử
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="text-3xl font-semibold text-slate-950">{review.categoryName ?? "Chưa gán danh mục"}</div>
              <ReviewStatusBadge status={review.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="truncate">{review.url}</span>
              <a href={review.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Mở liên kết
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <button
            onClick={handleDelete}
            data-testid="button-delete"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            Xóa lượt kiểm duyệt
          </button>
        </div>
      </section>

      {(review.status === "analyzing" || review.status === "pending") && (
        <section className="rounded-[2rem] border border-sky-200 bg-sky-50 p-8 text-center text-sky-700">
          <LoaderCircle className="mx-auto h-10 w-10 animate-spin" />
          <h2 className="mt-4 text-xl font-semibold">Đang phân tích nội dung</h2>
          <p className="mt-2 text-sm leading-6 text-sky-600">
            Trang này sẽ tự động làm mới để cập nhật kết quả khi AI hoàn tất.
          </p>
        </section>
      )}

      {review.status === "failed" && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
          <XCircle className="mx-auto h-10 w-10" />
          <h2 className="mt-4 text-xl font-semibold">Phân tích thất bại</h2>
          <p className="mt-2 text-sm leading-6 text-rose-600">
            Hãy kiểm tra lại URL, khả năng truy cập trang đích hoặc thử chạy lại sau.
          </p>
        </section>
      )}

      {review.status === "completed" && result && (
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-100/60">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Tóm tắt điều hành</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Tổng kết nhanh</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{result.summary}</p>
            </div>

            {topPriorityIssues.length > 0 && (
              <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-3 text-amber-800">
                  <ShieldAlert className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Nhóm ưu tiên cao</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-700">
                  Có {topPriorityIssues.length} vấn đề ở mức nghiêm trọng hoặc quan trọng. Nên xử lý nhóm này trước khi tối ưu các phần còn lại.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {(Object.keys(groupedIssues) as IssueType[]).map((type) => {
                const issues = groupedIssues[type] ?? [];

                return (
                  <section key={type} className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-100/60">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                        {TYPE_LABELS[type]}
                      </span>
                      <span className="text-sm text-slate-500">{issues.length} vấn đề</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {issues
                        .slice()
                        .sort((left, right) => {
                          const order = { critical: 0, major: 1, minor: 2, suggestion: 3 };
                          return order[left.severity] - order[right.severity];
                        })
                        .map((issue, index) => (
                          <IssueCard key={`${type}-${index}`} issue={issue} />
                        ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-lg shadow-slate-200/70">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Bảng điểm</div>
              <div className="mt-4 grid gap-3">
                <ScoreCard score={result.overallScore} label="Tổng thể" />
                <div className="grid grid-cols-2 gap-3">
                  <ScoreCard score={result.seoScore} label="SEO" />
                  <ScoreCard score={result.adsScore} label="Ads" />
                  <ScoreCard score={result.shoppingScore} label="Shopping" />
                  <ScoreCard score={result.gdnScore} label="GDN" />
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-100/60">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Cơ cấu vấn đề</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Nghiêm trọng", value: result.criticalCount, tone: "bg-rose-50 text-rose-700" },
                  { label: "Quan trọng", value: result.majorCount, tone: "bg-amber-50 text-amber-700" },
                  { label: "Nhỏ", value: result.minorCount, tone: "bg-yellow-50 text-yellow-700" },
                  { label: "Gợi ý", value: result.suggestionCount, tone: "bg-sky-50 text-sky-700" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-3xl px-4 py-4 text-center ${item.tone}`}>
                    <div className="text-[11px] uppercase tracking-[0.18em]">{item.label}</div>
                    <div className="mt-3 text-3xl font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
