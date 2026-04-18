import { ArrowUpRight, History, Home, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/history", label: "Lịch sử", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(248,250,252,0.94))]" />

      <header className="sticky top-0 z-50 border-b border-white/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-sky-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
                <Sparkles className="h-3.5 w-3.5" />
                Content Audit AI
              </div>
              <div className="truncate text-sm text-muted-foreground">
                SEO, Ads, Shopping va GDN review trong mot luong.
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 rounded-full border border-white/70 bg-white/75 p-1 shadow-sm md:flex">
              {navItems.map((item) => {
                const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={`nav-${item.label}`}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {location !== "/" && (
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Audit mới
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-1">{children}</main>

      <footer className="relative border-t border-white/70 bg-white/70 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Content Audit AI giup doi content review thanh checklist co the hanh dong.
          </div>
          <div>
            Tuong thich voi OpenAI key trong <code className="rounded bg-muted px-1.5 py-0.5">.env</code> va deploy VPS ARM64.
          </div>
        </div>
      </footer>
    </div>
  );
}
