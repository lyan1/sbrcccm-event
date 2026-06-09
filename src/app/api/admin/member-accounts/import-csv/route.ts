import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseMemberImportCsv } from "@/lib/csv";
import { importMembersFromParsedCsv } from "@/lib/member-import";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let csvText: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      csvText = await req.text();
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "EMPTY_FILE" }, { status: 400 });
    }

    const parsed = parseMemberImportCsv(csvText);
    const results = await importMembersFromParsedCsv(parsed, session.adminId);

    const summary = {
      created: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return NextResponse.json({ summary, results });
  } catch {
    return NextResponse.json({ error: "IMPORT_FAILED" }, { status: 500 });
  }
}
