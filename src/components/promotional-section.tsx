"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export interface PromoCard {
  id: string;
  titleZh: string;
  titleEn: string | null;
  descriptionZh: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabelZh: string | null;
  linkLabelEn: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

interface PromotionalSectionProps {
  cards: PromoCard[];
}

export function PromotionalSection({ cards }: PromotionalSectionProps) {
  const { t, language } = useI18n();
  const locale = language === "zh" ? "zh-CN" : "en-US";

  if (cards.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("churchAndCommunity")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const title = language === "zh" ? card.titleZh : card.titleEn || card.titleZh;
          const description =
            language === "zh"
              ? card.descriptionZh
              : card.descriptionEn || card.descriptionZh;
          const linkLabel =
            language === "zh"
              ? card.linkLabelZh
              : card.linkLabelEn || card.linkLabelZh;

          const content = (
            <Card className="h-full overflow-hidden">
              {card.imageUrl && (
                <div className="relative h-36 w-full">
                  <Image
                    src={card.imageUrl}
                    alt={title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
                {(card.startsAt || card.endsAt) && (
                  <p className="text-xs text-muted-foreground">
                    {card.startsAt && formatDate(card.startsAt, locale)}
                    {card.startsAt && card.endsAt && " – "}
                    {card.endsAt && formatDate(card.endsAt, locale)}
                  </p>
                )}
              </CardHeader>
              {description && (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {description}
                  {card.linkUrl && linkLabel && (
                    <p className="mt-2 text-primary">{linkLabel} →</p>
                  )}
                </CardContent>
              )}
            </Card>
          );

          if (card.linkUrl) {
            return (
              <Link key={card.id} href={card.linkUrl} target="_blank" rel="noopener noreferrer">
                {content}
              </Link>
            );
          }
          return <div key={card.id}>{content}</div>;
        })}
      </div>
    </section>
  );
}
