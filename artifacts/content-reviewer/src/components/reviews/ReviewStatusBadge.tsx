import { CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";

interface ReviewStatusBadgeProps {
  status: string;
}

const STATUS_MAP = {
  completed: {
    label: "Hoàn thành",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  analyzing: {
    label: "Đang phân tích",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    Icon: LoaderCircle,
  },
  failed: {
    label: "Lỗi",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    Icon: XCircle,
  },
  pending: {
    label: "Chờ xử lý",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    Icon: Clock3,
  },
} as const;

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const config = STATUS_MAP[status as keyof typeof STATUS_MAP] ?? STATUS_MAP.pending;
  const Icon = config.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "analyzing" ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}
