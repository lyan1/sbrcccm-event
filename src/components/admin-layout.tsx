"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", labelKey: "dashboard" as const },
  { href: "/admin/members", labelKey: "members" as const },
  { href: "/admin/events", labelKey: "events" as const },
  { href: "/admin/transactions", labelKey: "transactions" as const },
  { href: "/admin/images", labelKey: "images" as const },
  { href: "/admin/promotions", labelKey: "promotions" as const },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="text-lg font-bold text-primary">
            {t("dashboard")}
          </Link>
          <nav className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm hover:bg-accent",
                  pathname === item.href && "bg-accent font-medium"
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              {t("logout")}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
