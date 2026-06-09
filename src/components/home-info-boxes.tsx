"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import type { SiteContentPublic, WechatQrPublic } from "@/lib/queries/site-content";

interface HomeInfoBoxesProps {
  siteContent: SiteContentPublic | null;
  wechatQr: WechatQrPublic | null;
}

function MultilineText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      {text.split("\n").map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

export function HomeInfoBoxes({ siteContent, wechatQr }: HomeInfoBoxesProps) {
  const { t, language } = useI18n();

  const purposeText =
    language === "zh"
      ? siteContent?.purpose.zh
      : siteContent?.purpose.en ?? siteContent?.purpose.zh;
  const usageText =
    language === "zh"
      ? siteContent?.usageInstructions.zh
      : siteContent?.usageInstructions.en ?? siteContent?.usageInstructions.zh;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("pickleballPurpose")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {purposeText && <MultilineText text={purposeText} />}
          {wechatQr ? (
            <div className="flex flex-col items-center gap-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground">{t("wechatQr")}</p>
              <Image
                src={wechatQr.imageUrl}
                alt={wechatQr.title}
                width={200}
                height={200}
                className="rounded-lg"
                unoptimized
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("notAvailable")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("usageInstructions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {usageText ? (
            <MultilineText text={usageText} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("notAvailable")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
