import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITE_CONTENT_DEFAULTS } from "@/lib/site-content-defaults";
import { siteContentUpdateSchema } from "@/lib/validation";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blocks = await prisma.siteContentBlock.findMany({
    orderBy: { key: "asc" },
  });

  const byKey = new Map(blocks.map((b) => [b.key, b]));
  const keys = ["PICKLEBALL_PURPOSE", "USAGE_INSTRUCTIONS"] as const;

  return NextResponse.json(
    keys.map((key) => {
      const block = byKey.get(key);
      const defaults = SITE_CONTENT_DEFAULTS[key];
      return {
        key,
        contentZh: block?.contentZh ?? defaults.contentZh,
        contentEn: block?.contentEn ?? defaults.contentEn,
        updatedAt: block?.updatedAt ?? null,
      };
    })
  );
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = siteContentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const results = await Promise.all(
      parsed.data.blocks.map((block) =>
        prisma.siteContentBlock.upsert({
          where: { key: block.key },
          create: {
            key: block.key,
            contentZh: block.contentZh,
            contentEn: block.contentEn,
            updatedByAdminId: session.adminId,
          },
          update: {
            contentZh: block.contentZh,
            contentEn: block.contentEn,
            updatedByAdminId: session.adminId,
          },
        })
      )
    );

    return NextResponse.json(results);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
