import type { SiteContentKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SITE_CONTENT_DEFAULTS } from "@/lib/site-content-defaults";

export interface SiteContentPublic {
  purpose: { zh: string; en: string };
  usageInstructions: { zh: string; en: string };
}

export interface WechatQrPublic {
  imageUrl: string;
  title: string;
}

function blockToPair(
  key: SiteContentKey,
  contentZh: string,
  contentEn: string
): { zh: string; en: string } {
  const defaults = SITE_CONTENT_DEFAULTS[key];
  return {
    zh: contentZh || defaults.contentZh,
    en: contentEn || defaults.contentEn,
  };
}

export async function getPublicSiteContent(): Promise<SiteContentPublic> {
  const blocks = await prisma.siteContentBlock.findMany();
  const byKey = new Map(blocks.map((b) => [b.key, b]));

  const purposeBlock = byKey.get("PICKLEBALL_PURPOSE");
  const usageBlock = byKey.get("USAGE_INSTRUCTIONS");

  return {
    purpose: purposeBlock
      ? blockToPair("PICKLEBALL_PURPOSE", purposeBlock.contentZh, purposeBlock.contentEn)
      : blockToPair("PICKLEBALL_PURPOSE", "", ""),
    usageInstructions: usageBlock
      ? blockToPair("USAGE_INSTRUCTIONS", usageBlock.contentZh, usageBlock.contentEn)
      : blockToPair("USAGE_INSTRUCTIONS", "", ""),
  };
}

export async function getVisibleWechatQr(): Promise<WechatQrPublic | null> {
  const image = await prisma.appImage.findFirst({
    where: { type: "WECHAT_QR", isVisible: true },
    orderBy: { createdAt: "desc" },
    select: { imageUrl: true, title: true },
  });

  if (!image) return null;
  return { imageUrl: image.imageUrl, title: image.title };
}
