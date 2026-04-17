import { useParams, useLocation } from "wouter";
import { useGetReview, getGetReviewQueryKey, useDeleteReview, getListReviewsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Trash2, AlertCircle, AlertTriangle, Info, Lightbulb, ChevronDown, ChevronUp, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

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

const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; color: string; bg: string; icon: typeof AlertCircle }> = {
  critical: { label: "Nghiêm trọng", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertCircle },
  major: { label: "Quan trọng", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: AlertTriangle },
  minor: { label: "Nhỏ", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: Info },
  suggestion: { label: "Gợi ý", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Lightbulb },
};

const TYPE_CONFIG: Record<IssueType, { label: string; color: string }> = {
  seo: { label: "SEO", color: "bg-purple-100 text-purple-700" },
  google_ads: { label: "Google Ads", color: "bg-blue-100 text-blue-700" },
  google_shopping: { label: "Google Shopping", color: "bg-green-100 text-green-700" },
  gdn: { label: "GDN", color: "bg-teal-100 text-teal-700" },
  content_quality: { label: "Chất lượng nội dung", color: "bg-gray-100 text-gray-700" },
  policy_violation: { label: "Vi phạm chính sách", color: "bg-red-100 text-red-700" },
};

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? "#3b82f6" : score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl">
      <svg width={88} height={88} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={44} cy={44} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={7} />
        <circle
          cx={44} cy={44} r={r}
          fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
        <text x={44} y={44} textAnchor="middle" dominantBaseline="middle"
          style={{ transform: "rotate(90deg)", transformOrigin: "44px 44px", fill: color, fontWeight: 800, fontSize: 22 }}>
          {score}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

function IssueCard({ issue }: { issue: ReviewIssue }) {
  const [expanded, setExpanded] = useState(false);
  const severity = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.minor;
  const SeverityIcon = severity.icon;
  const type = TYPE_CONFIG[issue.type];

  return (
    <div className={`border rounded-lg overflow-hidden ${severity.bg}`}>
      <button
        type="button"
        className="w-full flex items-start gap-3 p-4 text-left hover:brightness-95 transition-all"
        onClick={() => setExpanded(!expanded)}
        data-testid={`issue-${issue.type}-${issue.severity}`}
      >
        <SeverityIcon className={`w-4 h-4 mt-0.5 shrink-0 ${severity.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${type?.color ?? "bg-gray-100 text-gray-700"}`}>
              {type?.label ?? issue.type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${severity.bg} ${severity.color}`}>
              {severity.label}
            </span>
            {issue.location && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {issue.location}
              </span>
            )}
          </div>
          <div className={`font-medium text-sm ${severity.color}`}>{issue.title}</div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-current/10">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-3">Vấn đề</div>
            <p className="text-sm">{issue.description}</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Cách khắc phục</div>
            <p className="text-sm">{issue.recommendation}</p>
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
    if (!confirm("Bạn có chắc muốn xóa review này?")) return;
    await deleteReview.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Không tìm thấy review</h2>
        <Link href="/" className="text-primary hover:underline text-sm">Quay về trang chủ</Link>
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

  // Group issues by type
  const groupedIssues: Partial<Record<IssueType, ReviewIssue[]>> = {};
  result?.issues?.forEach((issue) => {
    if (!groupedIssues[issue.type]) groupedIssues[issue.type] = [];
    groupedIssues[issue.type]!.push(issue);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Link href="/" className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-muted-foreground">{review.categoryName}</span>
              {review.status === "completed" && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />Hoàn thành</span>}
              {review.status === "analyzing" && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"><Loader2 className="w-3 h-3 animate-spin" />Đang phân tích...</span>}
              {review.status === "failed" && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Lỗi</span>}
              {review.status === "pending" && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"><Clock className="w-3 h-3" />Chờ</span>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground truncate max-w-[400px]">{review.url}</span>
              <a href={review.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={handleDelete}
          data-testid="button-delete"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Xóa
        </button>
      </div>

      {(review.status === "analyzing" || review.status === "pending") && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-blue-700 font-medium">Đang phân tích nội dung...</p>
          <p className="text-blue-500 text-sm mt-1">Trang sẽ tự động cập nhật khi hoàn thành</p>
        </div>
      )}

      {review.status === "failed" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Phân tích thất bại</p>
          <p className="text-red-500 text-sm mt-1">Có lỗi xảy ra trong quá trình phân tích. Vui lòng thử lại.</p>
        </div>
      )}

      {review.status === "completed" && result && (
        <>
          {/* Scores */}
          <div className="mb-6">
            <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Điểm số tổng quan</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ScoreGauge score={result.overallScore} label="Tổng thể" />
              <ScoreGauge score={result.seoScore} label="SEO" />
              <ScoreGauge score={result.adsScore} label="Google Ads" />
              <ScoreGauge score={result.shoppingScore} label="Shopping" />
              <ScoreGauge score={result.gdnScore} label="GDN" />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-sm mb-2">Tóm tắt đánh giá</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: "Nghiêm trọng", count: result.criticalCount, color: "text-red-600 bg-red-50" },
                { label: "Quan trọng", count: result.majorCount, color: "text-orange-600 bg-orange-50" },
                { label: "Nhỏ", count: result.minorCount, color: "text-yellow-600 bg-yellow-50" },
                { label: "Gợi ý", count: result.suggestionCount, color: "text-blue-600 bg-blue-50" },
              ].map(({ label, count, color }) => (
                <div key={label} className={`rounded-lg p-3 text-center ${color}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Issues */}
          <div>
            <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Danh sách vấn đề</h2>

            {result.issues.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                Tuyệt vời! Không tìm thấy vấn đề nào.
              </div>
            ) : (
              <div className="space-y-6">
                {(Object.keys(groupedIssues) as IssueType[]).map((type) => {
                  const issues = groupedIssues[type] ?? [];
                  const typeConfig = TYPE_CONFIG[type];
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${typeConfig?.color ?? "bg-gray-100 text-gray-700"}`}>
                          {typeConfig?.label ?? type}
                        </span>
                        <span className="text-xs text-muted-foreground">{issues.length} vấn đề</span>
                      </div>
                      <div className="space-y-2">
                        {issues
                          .sort((a, b) => {
                            const order = { critical: 0, major: 1, minor: 2, suggestion: 3 };
                            return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
                          })
                          .map((issue, i) => (
                            <IssueCard key={`${type}-${i}`} issue={issue} />
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
