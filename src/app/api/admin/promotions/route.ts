import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { promotionalCardSchema } from "@/lib/validation";
import { uploadImage, validateImageFile } from "@/lib/supabase";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await prisma.promotionalCard.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      const titleZh = formData.get("titleZh") as string;
      const titleEn = (formData.get("titleEn") as string) || null;
      const descriptionZh = (formData.get("descriptionZh") as string) || null;
      const descriptionEn = (formData.get("descriptionEn") as string) || null;
      const linkUrl = (formData.get("linkUrl") as string) || null;
      const linkLabelZh = (formData.get("linkLabelZh") as string) || null;
      const linkLabelEn = (formData.get("linkLabelEn") as string) || null;
      const startsAt = (formData.get("startsAt") as string) || null;
      const endsAt = (formData.get("endsAt") as string) || null;
      const displayOrder = parseInt((formData.get("displayOrder") as string) || "0", 10);
      const isVisible = formData.get("isVisible") !== "false";

      if (!titleZh) {
        return NextResponse.json({ error: "titleZh is required" }, { status: 400 });
      }

      let imageUrl: string | null = null;
      let storagePath: string | null = null;

      if (file) {
        const validationError = validateImageFile(file);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
        const ext = file.name.split(".").pop() ?? "jpg";
        storagePath = `promotions/${Date.now()}.${ext}`;
        imageUrl = await uploadImage(file, storagePath);
      }

      const card = await prisma.promotionalCard.create({
        data: {
          titleZh,
          titleEn,
          descriptionZh,
          descriptionEn,
          imageUrl,
          storagePath,
          linkUrl,
          linkLabelZh,
          linkLabelEn,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          displayOrder,
          isVisible,
          createdByAdminId: session.adminId,
        },
      });

      return NextResponse.json(card);
    }

    const body = await req.json();
    const parsed = promotionalCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const card = await prisma.promotionalCard.create({
      data: {
        ...parsed.data,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        createdByAdminId: session.adminId,
      },
    });

    return NextResponse.json(card);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
