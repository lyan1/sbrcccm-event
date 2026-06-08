import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadImage, validateImageFile, deleteStorageFile } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      const title = formData.get("title") as string | null;
      const description = formData.get("description") as string | null;
      const isVisible = formData.get("isVisible");

      const existing = await prisma.appImage.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const data: Record<string, unknown> = {};
      if (title) data.title = title;
      if (description !== null) data.description = description || null;
      if (isVisible !== null) data.isVisible = isVisible !== "false";

      if (file) {
        const validationError = validateImageFile(file);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${existing.type.toLowerCase()}/${Date.now()}.${ext}`;
        const imageUrl = await uploadImage(file, path);
        if (existing.storagePath) {
          try {
            await deleteStorageFile(existing.storagePath);
          } catch {
            /* ignore */
          }
        }
        data.imageUrl = imageUrl;
        data.storagePath = path;
      }

      const updated = await prisma.appImage.update({ where: { id }, data });
      return NextResponse.json(updated);
    }

    const body = await req.json();
    const updated = await prisma.appImage.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isVisible !== undefined ? { isVisible: body.isVisible } : {}),
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
  const existing = await prisma.appImage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.appImage.update({
    where: { id },
    data: { isVisible: false },
  });

  await logAudit({
    actorType: "ADMIN",
    actorId: session.adminId,
    action: "IMAGE_HIDDEN",
    entityType: "AppImage",
    entityId: id,
  });

  return NextResponse.json(updated);
}
