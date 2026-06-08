import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { promotionalCardSchema } from "@/lib/validation";
import { uploadImage, validateImageFile, deleteStorageFile } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const existing = await prisma.promotionalCard.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      const data: Record<string, unknown> = {};

      const fields = [
        "titleZh", "titleEn", "descriptionZh", "descriptionEn",
        "linkUrl", "linkLabelZh", "linkLabelEn", "startsAt", "endsAt",
      ] as const;

      for (const field of fields) {
        const val = formData.get(field);
        if (val !== null) data[field] = val === "" ? null : val;
      }

      if (formData.get("displayOrder") !== null) {
        data.displayOrder = parseInt(formData.get("displayOrder") as string, 10);
      }
      if (formData.get("isVisible") !== null) {
        data.isVisible = formData.get("isVisible") !== "false";
      }

      if (data.startsAt) data.startsAt = new Date(data.startsAt as string);
      if (data.endsAt) data.endsAt = new Date(data.endsAt as string);

      if (file) {
        const validationError = validateImageFile(file);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `promotions/${Date.now()}.${ext}`;
        data.imageUrl = await uploadImage(file, path);
        data.storagePath = path;
        if (existing.storagePath) {
          try { await deleteStorageFile(existing.storagePath); } catch { /* ignore */ }
        }
      }

      const updated = await prisma.promotionalCard.update({ where: { id }, data });
      return NextResponse.json(updated);
    }

    const body = await req.json();
    const parsed = promotionalCardSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.promotionalCard.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.startsAt !== undefined
          ? { startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null }
          : {}),
        ...(parsed.data.endsAt !== undefined
          ? { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.promotionalCard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.promotionalCard.update({
    where: { id },
    data: { isVisible: false },
  });

  return NextResponse.json({ success: true });
}
