import { parseContentDispositionFilename } from "./csv";

export async function downloadFromPost(
  url: string,
  body: unknown,
  fallbackFilename: string
): Promise<{ success: boolean; settled: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("Content-Type") ?? "";

    if (!res.ok) {
      if (contentType.includes("application/json")) {
        const data = await res.json();
        return { success: false, settled: false, error: data.error ?? "Request failed" };
      }
      return { success: false, settled: false, error: await res.text() };
    }

    const blob = await res.blob();
    const filename =
      parseContentDispositionFilename(res.headers.get("Content-Disposition")) ??
      fallbackFilename;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);

    return { success: true, settled: true };
  } catch (e) {
    return {
      success: false,
      settled: false,
      error: e instanceof Error ? e.message : "Download failed",
    };
  }
}

export function downloadGet(url: string) {
  window.open(url, "_blank");
}
