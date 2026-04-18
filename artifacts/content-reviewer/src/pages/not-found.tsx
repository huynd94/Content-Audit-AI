import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl rounded-[2rem] border-white/70 bg-white/85 shadow-xl shadow-slate-100/60 backdrop-blur-xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-slate-950">404 - Khong tim thay trang</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Duong dan nay khong ton tai trong ung dung hien tai. Quay ve trang chu de tao audit moi hoac mo lich su.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Ve trang chu
            </Link>
            <Link href="/history" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-primary hover:text-primary">
              Mo lich su
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
