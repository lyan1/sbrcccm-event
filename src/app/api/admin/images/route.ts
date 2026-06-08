import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadImage, validateImageFile } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { ImageType } from "@prisma/client";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const images = await prisma.appImage.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const type = formData.get("type") as ImageType;
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || null;
    const isVisible = formData.get("isVisible") !== "false";

    if (!file || !type || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${type.toLowerCase()}/${Date.now()}.${ext}`;
    const imageUrl = await uploadImage(file, path);

    const image = await prisma.appImage.create({
      data: {
        type,
        title,
        description,
        imageUrl,
        storagePath: path,
        isVisible,
        uploadedByAdminId: session.adminId,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "IMAGE_UPLOADED",
      entityType: "AppImage",
      entityId: image.id,
      newValue: image,
    });

    return NextResponse.json(image);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
