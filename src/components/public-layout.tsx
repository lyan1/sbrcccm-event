"use client";

import Link from "next/link";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="max-w-[calc(100%-5.5rem)] text-sm font-bold leading-snug text-primary sm:text-base"
          >
            {t("appTitle")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-lg px-4 py-8 text-center text-sm text-muted-foreground">
        <Link href="/admin/login" className="hover:underline">
          {t("adminLogin")}
        </Link>
      </footer>
    </div>
  );
}
